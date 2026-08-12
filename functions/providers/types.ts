/**
 * 去背景服务端共享类型与错误模型。
 *
 * 该文件是「代理端点」与「各 Provider 实现」之间唯一的契约来源：
 * - ApiErrorCode / ApiErrorBody：对前端暴露的错误协议（JSON）
 * - BackgroundRemovalProvider：可替换的去背景能力抽象
 * - ProviderError：贯穿服务端的受控异常，携带错误码与是否可重试
 */

/** 对前端暴露的稳定错误码。 */
export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_TYPE'
  | 'UPLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL';

/** 错误码 → HTTP 状态码映射（单一事实来源，前后端一致）。 */
export const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  INVALID_INPUT: 400,
  UNSUPPORTED_TYPE: 415,
  UPLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  PROVIDER_ERROR: 502,
  TIMEOUT: 504,
  INTERNAL: 500,
};

/** 默认是否可重试。可被 Provider 覆盖（例如余额不足属于不可重试的 502）。 */
export const DEFAULT_RETRYABLE_BY_CODE: Record<ApiErrorCode, boolean> = {
  INVALID_INPUT: false,
  UNSUPPORTED_TYPE: false,
  UPLOAD_TOO_LARGE: false,
  RATE_LIMITED: true,
  PROVIDER_ERROR: true,
  TIMEOUT: true,
  INTERNAL: true,
};

/** 失败时返回给前端的 JSON 结构。 */
export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
}

/** Provider 输入：纯内存字节，不落盘。 */
export interface RemovalInput {
  /** 原始图片字节。 */
  buffer: Uint8Array;
  /** 原始 MIME，如 image/jpeg。 */
  mimeType: string;
  /** 原始文件名，仅用于 multipart 字段，可缺省。 */
  fileName?: string;
}

/** Provider 输出：带 alpha 通道的 PNG 字节。 */
export interface RemovalOutput {
  pngBuffer: Uint8Array;
}

/** 去背景能力抽象。新增供应商只需实现该接口并在工厂中注册。 */
export interface BackgroundRemovalProvider {
  /** Provider 标识，用于日志与调试。 */
  readonly name: string;
  /** 执行去背景，成功返回透明 PNG 字节，失败抛出 ProviderError。 */
  remove(input: RemovalInput): Promise<RemovalOutput>;
}

/** 服务端受控异常：任何抛给代理层的错误都应是它。 */
export class ProviderError extends Error {
  readonly code: ApiErrorCode;
  readonly retryable: boolean;
  readonly httpStatus: number;
  /** 上游返回的原始片段，仅用于服务端日志，不下发给前端。 */
  readonly detail: string | undefined;

  constructor(
    code: ApiErrorCode,
    message: string,
    retryable: boolean = DEFAULT_RETRYABLE_BY_CODE[code],
    detail?: string,
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.message = message;
    this.retryable = retryable;
    this.httpStatus = HTTP_STATUS_BY_CODE[code];
    this.detail = detail;
  }

  /** 转换为下发给前端的 JSON 体（不含 detail）。 */
  toBody(): ApiErrorBody {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

/** 判断任意异常是否为 ProviderError（跨模块 instanceof 的安全版本）。 */
export function isProviderError(error: unknown): error is ProviderError {
  return (
    error instanceof ProviderError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { name?: string }).name === 'ProviderError' &&
      typeof (error as { code?: unknown }).code === 'string')
  );
}

/**
 * 函数运行时环境变量。
 * 全部为字符串（Cloudflare Pages 注入的形态），由代理层解析成数值。
 */
export interface ProviderEnv {
  /** remove.bg API Key，仅存在于服务端。 */
  REMOVE_BG_API_KEY?: string;
  /** Provider 选择，默认 removebg。 */
  PROVIDER?: string;
  /** 最大并发，默认 2。 */
  MAX_CONCURRENCY?: string;
  /** 调用上游的超时时间（毫秒），默认 30000。 */
  PROVIDER_TIMEOUT_MS?: string;
  /** 允许的最大文件体积（MB），默认 10。 */
  ALLOWED_MAX_MB?: string;
  /** 允许的 MIME 白名单，逗号分隔。 */
  ALLOWED_TYPES?: string;
  /** remove.bg 输出尺寸参数，默认 auto（免费档实际返回预览分辨率）。 */
  REMOVE_BG_SIZE?: string;
}

/**
 * Cloudflare Pages Functions 上下文的最小可用子集。
 *
 * 这里不引入 @cloudflare/workers-types，避免它与 tsconfig 的 DOM lib
 * 产生 Request/Response 重复声明冲突；运行时字段完全兼容。
 */
export interface PagesFunctionContext<Env = ProviderEnv> {
  request: Request;
  env: Env;
  waitUntil?: (promise: Promise<unknown>) => void;
}

/** Pages Functions 处理器签名。 */
export type PagesFunctionHandler<Env = ProviderEnv> = (
  context: PagesFunctionContext<Env>,
) => Response | Promise<Response>;
