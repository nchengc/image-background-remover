/**
 * POST /api/remove-bg —— 同源代理端点（Cloudflare Pages Functions）。
 *
 * 职责：
 * 1. 校验入参（multipart/form-data 的 image 字段、MIME 白名单、体积上限）
 * 2. 并发闸门（模块级计数，超出直接 429，保护上游额度）
 * 3. 超时保护（Promise.race，默认 30s）
 * 4. 调用 Provider（默认 remove.bg），成功透传 image/png 二进制
 * 5. 失败统一为 JSON {code, message, retryable}
 *
 * 隐私：图片仅在内存中流转，不写盘、不留存、不打印图片内容。
 */

import { getProvider } from '../providers/removebg';
import {
  ProviderError,
  isProviderError,
  type ApiErrorBody,
  type ApiErrorCode,
  type PagesFunctionContext,
  type PagesFunctionHandler,
  type ProviderEnv,
} from '../providers/types';

const DEFAULT_MAX_CONCURRENCY = 2;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_MB = 10;
const DEFAULT_ALLOWED_TYPES = 'image/jpeg,image/png,image/webp';
const FORM_FIELD = 'image';

/**
 * 模块级并发计数：同一 isolate 内共享。
 * Cloudflare 会按流量水平扩容 isolate，因此这是「尽力而为」的软闸门，
 * 目的是拦住单用户连点造成的额度浪费，而非严格全局限流。
 */
let active = 0;

/** 运行时配置，按请求从 env 解析，避免部署后需要改代码。 */
interface RuntimeConfig {
  maxConcurrency: number;
  timeoutMs: number;
  maxBytes: number;
  maxMb: number;
  allowedTypes: string[];
}

/** OPTIONS 预检：同源部署下通常不会触发，保留以支持跨域调试。 */
export const onRequestOptions: PagesFunctionHandler = () =>
  new Response(null, { status: 204, headers: corsHeaders() });

/** 其他方法一律 405，避免暴露非预期行为。 */
export const onRequest: PagesFunctionHandler = () =>
  jsonError(
    { code: 'INVALID_INPUT', message: '仅支持 POST 请求', retryable: false },
    405,
  );

/** 主处理器。 */
export const onRequestPost: PagesFunctionHandler = async (
  context: PagesFunctionContext<ProviderEnv>,
): Promise<Response> => {
  const env: ProviderEnv = context.env ?? {};
  const config = readConfig(env);

  // 并发闸门：先判断再占位，占位后必须在 finally 归还。
  if (active >= config.maxConcurrency) {
    return jsonError(
      { code: 'RATE_LIMITED', message: '当前处理人数较多，请稍后重试', retryable: true },
      429,
      { 'Retry-After': '3' },
    );
  }

  active += 1;
  try {
    const file = await readImageFile(context.request);
    validateFile(file, config);

    const buffer = new Uint8Array(await file.arrayBuffer());
    if (buffer.byteLength === 0) {
      throw new ProviderError('INVALID_INPUT', '图片内容为空，请重新选择文件', false);
    }
    // 二次校验：部分客户端的 file.size 不可信。
    if (buffer.byteLength > config.maxBytes) {
      throw new ProviderError(
        'UPLOAD_TOO_LARGE',
        `图片超过 ${config.maxMb}MB，请压缩后重试`,
        false,
      );
    }

    const provider = getProvider(env);
    const { pngBuffer } = await withTimeout(
      provider.remove({
        buffer,
        mimeType: file.type,
        fileName: file.name || 'upload',
      }),
      config.timeoutMs,
    );

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'image/png',
        // Content-Length 交给运行时计算，避免与压缩/分块传输冲突。
        // 结果含用户图片，禁止任何层级缓存。
        'Cache-Control': 'no-store',
        'X-Provider': provider.name,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  } finally {
    active = Math.max(0, active - 1);
  }
};

/** 解析 multipart/form-data，取出 image 字段。 */
async function readImageFile(request: Request): Promise<File> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    throw new ProviderError(
      'INVALID_INPUT',
      '请求格式有误，请使用 multipart/form-data 上传图片',
      false,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    throw new ProviderError(
      'INVALID_INPUT',
      '上传内容解析失败，请重新选择文件',
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  const entry = form.get(FORM_FIELD);
  if (!entry || typeof entry === 'string') {
    throw new ProviderError('INVALID_INPUT', `缺少图片字段 ${FORM_FIELD}`, false);
  }
  return entry as File;
}

/** MIME 白名单 + 体积上限校验。 */
function validateFile(file: File, config: RuntimeConfig): void {
  const mimeType = (file.type || '').toLowerCase();
  if (!config.allowedTypes.includes(mimeType)) {
    throw new ProviderError(
      'UNSUPPORTED_TYPE',
      `不支持的图片格式${mimeType ? `（${mimeType}）` : ''}，请上传 JPG / PNG / WebP`,
      false,
    );
  }
  if (file.size > config.maxBytes) {
    throw new ProviderError('UPLOAD_TOO_LARGE', `图片超过 ${config.maxMb}MB，请压缩后重试`, false);
  }
}

/** 超时保护：到点即拒，让前端拿到 504 TIMEOUT。 */
async function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new ProviderError('TIMEOUT', '处理超时，请稍后重试', true));
    }, timeoutMs);
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/** 从环境变量解析运行时配置，非法值回退默认。 */
function readConfig(env: ProviderEnv): RuntimeConfig {
  const maxMb = positiveNumber(env.ALLOWED_MAX_MB, DEFAULT_MAX_MB);
  const allowedTypes = (env.ALLOWED_TYPES ?? DEFAULT_ALLOWED_TYPES)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);

  return {
    maxConcurrency: Math.max(1, Math.floor(positiveNumber(env.MAX_CONCURRENCY, DEFAULT_MAX_CONCURRENCY))),
    timeoutMs: Math.max(1_000, Math.floor(positiveNumber(env.PROVIDER_TIMEOUT_MS, DEFAULT_TIMEOUT_MS))),
    maxMb,
    maxBytes: Math.floor(maxMb * 1024 * 1024),
    allowedTypes: allowedTypes.length > 0 ? allowedTypes : DEFAULT_ALLOWED_TYPES.split(','),
  };
}

/** 字符串 → 正数，失败回退默认值。 */
function positiveNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** 统一异常出口：ProviderError 透传错误码，未知异常统一 500。 */
function toErrorResponse(error: unknown): Response {
  if (isProviderError(error)) {
    if (error.detail) {
      // 仅服务端日志，不下发给前端。
      console.error(`[remove-bg] ${error.code} ${error.detail}`);
    }
    return jsonError(error.toBody(), error.httpStatus);
  }

  console.error('[remove-bg] INTERNAL', error instanceof Error ? error.stack : error);
  return jsonError(
    { code: 'INTERNAL', message: '服务开小差了，请稍后重试', retryable: true },
    500,
  );
}

/** 构造 JSON 错误响应。 */
function jsonError(
  body: ApiErrorBody,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

/** CORS 头：同源部署时冗余，跨域调试时必需。 */
function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

/** 便于测试与复用的错误码常量表（与前端映射保持一致）。 */
export const API_ERROR_CODES: readonly ApiErrorCode[] = [
  'INVALID_INPUT',
  'UNSUPPORTED_TYPE',
  'UPLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'PROVIDER_ERROR',
  'TIMEOUT',
  'INTERNAL',
];
