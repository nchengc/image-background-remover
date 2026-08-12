/**
 * ===== 共享类型契约 =====
 *
 * 本文件仅供类型/接口/常量导入。Route Handler 与 Provider（服务端）
 * 和 Client Component（前端）均可安全导入，但不得在此定义运行时代码。
 * 服务端模块（route.ts / providers/*.ts）不加 'use client'。
 */

// -------------------------------------------------------------------
// Provider 接口（可插拔）
// -------------------------------------------------------------------

/** 去背景输入 */
export interface RemoveBgInput {
  /** 原始图片字节 */
  buffer: Uint8Array;
  /** MIME 类型，如 image/jpeg */
  mimeType: string;
  /** 原始文件名（可选） */
  fileName?: string;
}

/** 去背景输出 */
export interface RemoveBgOutput {
  /** 含 alpha 的透明 PNG 字节 */
  pngBuffer: Uint8Array;
}

/** 可插拔的去背景 Provider 接口 */
export interface BackgroundRemovalProvider {
  readonly name: string;
  remove(input: RemoveBgInput): Promise<RemoveBgOutput>;
}

// -------------------------------------------------------------------
// 应用错误 & 状态
// -------------------------------------------------------------------

/** 统一应用错误 */
export interface AppError {
  /** 错误码（见 ErrorCodes） */
  code: string;
  /** 中文展示文案 */
  message: string;
  /** 是否允许前端重试 */
  retryable: boolean;
}

/** 应用四态 */
export type AppStatus = "idle" | "loading" | "done" | "error";

/** 状态机事件 */
export type RemoveBgEvent =
  | { type: "SUBMIT"; file: File }
  | { type: "SUCCESS"; result: Blob }
  | { type: "FAIL"; error: AppError }
  | { type: "RETRY" }
  | { type: "RESET" };

// -------------------------------------------------------------------
// 错误码枚举 & 映射表（单一事实来源）
// -------------------------------------------------------------------

export const ErrorCodes = {
  INVALID_INPUT: "INVALID_INPUT",
  UNSUPPORTED_TYPE: "UNSUPPORTED_TYPE",
  UPLOAD_TOO_LARGE: "UPLOAD_TOO_LARGE",
  RATE_LIMITED: "RATE_LIMITED",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  TIMEOUT: "TIMEOUT",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** 错误码 → HTTP 状态码 */
export const ERROR_HTTP_STATUS: Record<string, number> = {
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.UNSUPPORTED_TYPE]: 415,
  [ErrorCodes.UPLOAD_TOO_LARGE]: 413,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.PROVIDER_ERROR]: 502,
  [ErrorCodes.TIMEOUT]: 504,
  [ErrorCodes.INTERNAL]: 500,
};

/** 错误码 → 默认是否可重试 */
export const DEFAULT_RETRYABLE_BY_CODE: Record<string, boolean> = {
  [ErrorCodes.INVALID_INPUT]: false,
  [ErrorCodes.UNSUPPORTED_TYPE]: false,
  [ErrorCodes.UPLOAD_TOO_LARGE]: false,
  [ErrorCodes.RATE_LIMITED]: true,
  [ErrorCodes.PROVIDER_ERROR]: true,
  [ErrorCodes.TIMEOUT]: true,
  [ErrorCodes.INTERNAL]: true,
};

/** HTTP 状态码 → 错误码（反向查表） */
export const HTTP_TO_ERROR_CODE: Record<number, string> = {
  400: ErrorCodes.INVALID_INPUT,
  415: ErrorCodes.UNSUPPORTED_TYPE,
  413: ErrorCodes.UPLOAD_TOO_LARGE,
  429: ErrorCodes.RATE_LIMITED,
  502: ErrorCodes.PROVIDER_ERROR,
  504: ErrorCodes.TIMEOUT,
  500: ErrorCodes.INTERNAL,
};

/** 错误码 → 中文展示文案 */
export const ERROR_MESSAGES: Record<string, string> = {
  [ErrorCodes.INVALID_INPUT]: "文件无效，请上传有效的图片文件",
  [ErrorCodes.UNSUPPORTED_TYPE]: "不支持的文件类型，请上传 JPG、PNG 或 WEBP 格式的图片",
  [ErrorCodes.UPLOAD_TOO_LARGE]: "文件过大，请上传不超过 4MB 的图片",
  [ErrorCodes.RATE_LIMITED]: "当前请求较多，请稍后重试",
  [ErrorCodes.PROVIDER_ERROR]: "处理失败，请重试",
  [ErrorCodes.TIMEOUT]: "处理超时，请重试",
  [ErrorCodes.INTERNAL]: "服务器内部错误，请重试",
};

// -------------------------------------------------------------------
// 编译期常量（客户端可用，不暴露服务端 env）
// -------------------------------------------------------------------

/** 允许的文件 MIME 类型 */
export const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** 允许的最大文件大小（MB） */
export const ALLOWED_MAX_MB = 4;

/** 允许的文件类型字符串（用于 <input accept>） */
export const ALLOWED_TYPES_STRING = ALLOWED_TYPES.join(",");

// -------------------------------------------------------------------
// 状态机状态
// -------------------------------------------------------------------

/** 状态机完整状态 */
export interface RemoveBgState {
  status: AppStatus;
  error: AppError | null;
  lastFile: File | null;
  resultUrl: string | null;
  originalUrl: string | null;
  fileName: string;
}

/** 初始状态 */
export const INITIAL_STATE: RemoveBgState = {
  status: "idle",
  error: null,
  lastFile: null,
  resultUrl: null,
  originalUrl: null,
  fileName: "",
};
