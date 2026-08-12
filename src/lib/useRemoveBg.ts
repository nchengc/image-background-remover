/**
 * 去背景四态状态机 Hook + 代理客户端。
 *
 * 状态机：idle → loading → done / error；error 可 RETRY（复用 lastFile）或 RESET。
 * 事件：SUBMIT(file) / SUCCESS(blob) / FAIL(error) / RETRY / RESET
 *
 * 关键不变量：
 * - loading 态拒绝新的 SUBMIT/RETRY，防重复提交
 * - RETRY 保留 originalUrl 与 lastFile，不会白屏
 * - 每次替换结果或重置都回收旧 objectURL，卸载时一并清理
 * - 迟到的响应用 requestId 丢弃，避免旧结果覆盖新状态
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';

import { createPreviewUrl, releasePreviewUrl } from '@/lib/preview';

/** 代理端点（同源，密钥只在服务端）。 */
export const API_ENDPOINT = '/api/remove-bg';

/** 与服务端 ALLOWED_TYPES 保持一致的前端白名单。 */
export const ALLOWED_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** 与服务端 ALLOWED_MAX_MB 保持一致的体积上限。 */
export const ALLOWED_MAX_MB = 10;
export const ALLOWED_MAX_BYTES = ALLOWED_MAX_MB * 1024 * 1024;

/** 可读的格式提示文案。 */
export const ALLOWED_TYPES_LABEL = 'JPG / PNG / WebP';

/** 自动重试：仅对网络类瞬时故障做 1 次静默重试。 */
const AUTO_RETRY_MAX = 1;
const AUTO_RETRY_DELAY_MS = 800;

/** 四态。 */
export type AppStatus = 'idle' | 'loading' | 'done' | 'error';

/** 前端错误模型，与服务端 ApiErrorBody 对齐（额外允许客户端码）。 */
export interface AppError {
  code: string;
  message: string;
  retryable: boolean;
}

/** 服务端错误码 → 是否可重试（服务端未给 retryable 时的兜底）。 */
const RETRYABLE_CODES: ReadonlySet<string> = new Set([
  'RATE_LIMITED',
  'PROVIDER_ERROR',
  'TIMEOUT',
  'INTERNAL',
  'NETWORK_ERROR',
  'BAD_RESPONSE',
]);

/** HTTP 状态码 → 错误码（响应体缺失时的兜底映射）。 */
export const CODE_BY_STATUS: Record<number, string> = {
  400: 'INVALID_INPUT',
  405: 'INVALID_INPUT',
  413: 'UPLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_TYPE',
  429: 'RATE_LIMITED',
  500: 'INTERNAL',
  502: 'PROVIDER_ERROR',
  504: 'TIMEOUT',
};

const MESSAGE_BY_CODE: Record<string, string> = {
  INVALID_INPUT: '上传内容有误，请重新选择图片',
  UNSUPPORTED_TYPE: `不支持的图片格式，请上传 ${ALLOWED_TYPES_LABEL}`,
  UPLOAD_TOO_LARGE: `图片超过 ${ALLOWED_MAX_MB}MB，请压缩后重试`,
  RATE_LIMITED: '请求过于频繁，请稍后重试',
  PROVIDER_ERROR: '去背景服务暂时不可用，请稍后重试',
  TIMEOUT: '处理超时，请稍后重试',
  INTERNAL: '服务开小差了，请稍后重试',
  NETWORK_ERROR: '网络异常，请检查网络后重试',
  BAD_RESPONSE: '返回结果异常，请重试',
};

/** 客户端请求异常。 */
export class RemoveBgRequestError extends Error implements AppError {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message?: string, retryable?: boolean) {
    const finalMessage = message || MESSAGE_BY_CODE[code] || '处理失败，请重试';
    super(finalMessage);
    this.name = 'RemoveBgRequestError';
    this.code = code;
    this.message = finalMessage;
    this.retryable = retryable ?? RETRYABLE_CODES.has(code);
  }
}

/** 状态机内部状态。 */
export interface RemoveBgState {
  status: AppStatus;
  error: AppError | null;
  /** 原图预览 URL（objectURL）。 */
  originalUrl: string | null;
  /** 结果预览 URL（objectURL，透明 PNG）。 */
  resultUrl: string | null;
  /** 结果体积（字节），用于结果信息展示。 */
  resultSize: number;
  /** 当前处理的文件名，用于下载命名与提示。 */
  fileName: string;
  /** 最近一次提交的文件，RETRY 复用它。 */
  lastFile: File | null;
}

export type RemoveBgAction =
  | { type: 'SUBMIT'; file: File; originalUrl: string }
  | { type: 'RETRY' }
  | { type: 'SUCCESS'; resultUrl: string; resultSize: number }
  | { type: 'FAIL'; error: AppError }
  | { type: 'RESET' };

export const initialState: RemoveBgState = {
  status: 'idle',
  error: null,
  originalUrl: null,
  resultUrl: null,
  resultSize: 0,
  fileName: '',
  lastFile: null,
};

/** 纯函数 reducer：不产生任何副作用（objectURL 由调用方预先创建）。 */
export function reducer(state: RemoveBgState, action: RemoveBgAction): RemoveBgState {
  switch (action.type) {
    case 'SUBMIT':
      return {
        status: 'loading',
        error: null,
        originalUrl: action.originalUrl,
        resultUrl: null,
        resultSize: 0,
        fileName: action.file.name,
        lastFile: action.file,
      };
    case 'RETRY':
      // 保留 originalUrl / fileName / lastFile，避免重试时白屏。
      if (state.status !== 'error' || !state.lastFile) {
        return state;
      }
      return { ...state, status: 'loading', error: null, resultUrl: null, resultSize: 0 };
    case 'SUCCESS':
      return {
        ...state,
        status: 'done',
        error: null,
        resultUrl: action.resultUrl,
        resultSize: action.resultSize,
      };
    case 'FAIL':
      return { ...state, status: 'error', error: action.error };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

/** 前端预校验：格式与体积。合法返回 null，非法返回 AppError。 */
export function validateImageFile(file: File | null | undefined): AppError | null {
  if (!file) {
    return new RemoveBgRequestError('INVALID_INPUT', '没有读取到图片，请重新选择', false);
  }
  const mimeType = (file.type || '').toLowerCase();
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return new RemoveBgRequestError(
      'UNSUPPORTED_TYPE',
      `不支持的格式${mimeType ? `（${mimeType}）` : ''}，请上传 ${ALLOWED_TYPES_LABEL}`,
      false,
    );
  }
  if (file.size <= 0) {
    return new RemoveBgRequestError('INVALID_INPUT', '图片内容为空，请重新选择', false);
  }
  if (file.size > ALLOWED_MAX_BYTES) {
    return new RemoveBgRequestError(
      'UPLOAD_TOO_LARGE',
      `图片超过 ${ALLOWED_MAX_MB}MB，请压缩后重试`,
      false,
    );
  }
  return null;
}

/** 单次代理请求：成功返回透明 PNG Blob。 */
async function postRemoveBg(file: File, signal: AbortSignal): Promise<Blob> {
  const form = new FormData();
  form.append('image', file, file.name || 'upload.png');

  let response: Response;
  try {
    response = await fetch(API_ENDPOINT, { method: 'POST', body: form, signal });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new RemoveBgRequestError('NETWORK_ERROR', undefined, true);
  }

  if (!response.ok) {
    throw await readErrorBody(response);
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.startsWith('image/')) {
    throw new RemoveBgRequestError('BAD_RESPONSE', undefined, true);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new RemoveBgRequestError('BAD_RESPONSE', undefined, true);
  }
  return blob;
}

/** 解析服务端 JSON 错误体，缺失时按状态码兜底。 */
async function readErrorBody(response: Response): Promise<RemoveBgRequestError> {
  const fallbackCode = CODE_BY_STATUS[response.status] ?? 'INTERNAL';
  try {
    const body = (await response.json()) as Partial<AppError> | null;
    const code = typeof body?.code === 'string' && body.code ? body.code : fallbackCode;
    const message = typeof body?.message === 'string' && body.message ? body.message : undefined;
    const retryable = typeof body?.retryable === 'boolean' ? body.retryable : undefined;
    return new RemoveBgRequestError(code, message, retryable);
  } catch {
    return new RemoveBgRequestError(fallbackCode);
  }
}

/** 带自动重试的请求：仅对网络/超时类瞬时错误重试一次。 */
export async function requestRemoveBg(file: File, signal: AbortSignal): Promise<Blob> {
  let attempt = 0;

  for (;;) {
    try {
      return await postRemoveBg(file, signal);
    } catch (error) {
      if (isAbortError(error) || signal.aborted) {
        throw error;
      }
      const shouldAutoRetry =
        attempt < AUTO_RETRY_MAX &&
        error instanceof RemoveBgRequestError &&
        (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT');

      if (!shouldAutoRetry) {
        throw error;
      }
      attempt += 1;
      await delay(AUTO_RETRY_DELAY_MS);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException ? error.name === 'AbortError' : false;
}

/** 未知异常 → AppError。 */
function toAppError(error: unknown): AppError {
  if (error instanceof RemoveBgRequestError) {
    return error;
  }
  if (error instanceof Error) {
    return new RemoveBgRequestError('INTERNAL', error.message || undefined, true);
  }
  return new RemoveBgRequestError('INTERNAL', undefined, true);
}

/** Hook 对外暴露的接口。 */
export interface UseRemoveBgResult extends RemoveBgState {
  /** 提交新文件（含前端预校验）。 */
  submit: (file: File) => void;
  /** 复用 lastFile 重试。 */
  retry: () => void;
  /** 回到 idle，清理所有 objectURL。 */
  reset: () => void;
  /** loading 中，UI 用于禁用交互。 */
  isBusy: boolean;
}

export function useRemoveBg(): UseRemoveBgResult {
  const [state, dispatch] = useReducer(reducer, initialState);

  const originalUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const statusRef = useRef<AppStatus>('idle');

  // 用 ref 镜像状态，供事件回调同步判断，避免闭包过期。
  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  const clearResultUrl = useCallback(() => {
    releasePreviewUrl(resultUrlRef.current);
    resultUrlRef.current = null;
  }, []);

  const clearOriginalUrl = useCallback(() => {
    releasePreviewUrl(originalUrlRef.current);
    originalUrlRef.current = null;
  }, []);

  /** 真正发起请求并按 requestId 校验时序。 */
  const run = useCallback(
    async (file: File, requestId: number) => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const blob = await requestRemoveBg(file, controller.signal);
        if (requestId !== requestIdRef.current) {
          return; // 迟到响应，丢弃
        }
        clearResultUrl();
        const url = createPreviewUrl(blob);
        resultUrlRef.current = url;
        dispatch({ type: 'SUCCESS', resultUrl: url, resultSize: blob.size });
      } catch (error) {
        if (requestId !== requestIdRef.current || isAbortError(error)) {
          return;
        }
        dispatch({ type: 'FAIL', error: toAppError(error) });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [clearResultUrl],
  );

  const submit = useCallback(
    (file: File) => {
      if (statusRef.current === 'loading') {
        return; // 防重复提交
      }

      const validationError = validateImageFile(file);
      if (validationError) {
        dispatch({ type: 'FAIL', error: validationError });
        return;
      }

      abortRef.current?.abort();
      clearOriginalUrl();
      clearResultUrl();

      const originalUrl = createPreviewUrl(file);
      originalUrlRef.current = originalUrl;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      statusRef.current = 'loading';

      dispatch({ type: 'SUBMIT', file, originalUrl });
      void run(file, requestId);
    },
    [clearOriginalUrl, clearResultUrl, run],
  );

  const retry = useCallback(() => {
    const file = state.lastFile;
    if (!file || statusRef.current === 'loading') {
      return;
    }

    abortRef.current?.abort();
    clearResultUrl();

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    statusRef.current = 'loading';

    dispatch({ type: 'RETRY' });
    void run(file, requestId);
  }, [clearResultUrl, run, state.lastFile]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    // 让所有在途响应失效
    requestIdRef.current += 1;
    clearOriginalUrl();
    clearResultUrl();
    statusRef.current = 'idle';
    dispatch({ type: 'RESET' });
  }, [clearOriginalUrl, clearResultUrl]);

  // 卸载清理：中断请求 + 回收全部 objectURL
  useEffect(
    () => () => {
      abortRef.current?.abort();
      releasePreviewUrl(originalUrlRef.current);
      releasePreviewUrl(resultUrlRef.current);
      originalUrlRef.current = null;
      resultUrlRef.current = null;
    },
    [],
  );

  return {
    ...state,
    submit,
    retry,
    reset,
    isBusy: state.status === 'loading',
  };
}
