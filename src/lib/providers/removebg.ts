/**
 * remove.bg Provider 实现 + getProvider() 工厂。
 *
 * 服务端模块，不加 'use client'。仅 Route Handler 通过 process.env 实例化。
 * 实现 BackgroundRemovalProvider 接口，调用 remove.bg API 完成去背。
 */

import type {
  BackgroundRemovalProvider,
  RemoveBgInput,
  RemoveBgOutput,
} from "@/lib/types";
import { ErrorCodes } from "@/lib/types";

// -------------------------------------------------------------------
// 自定义 Provider 错误（携带 HTTP 状态码与 detail，detail 不下发前端）
// -------------------------------------------------------------------

export class ProviderError extends Error {
  code: string;
  retryable: boolean;
  httpStatus: number;
  /** 仅用于服务端日志，不下发给前端 */
  detail?: string;

  constructor(
    code: string,
    message: string,
    retryable: boolean,
    httpStatus: number,
    detail?: string
  ) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = retryable;
    this.httpStatus = httpStatus;
    this.detail = detail;
  }
}

// -------------------------------------------------------------------
// RemoveBgProvider — remove.bg API 封装
// -------------------------------------------------------------------

export class RemoveBgProvider implements BackgroundRemovalProvider {
  readonly name = "removebg";
  private apiKey: string;

  constructor(env: Record<string, string | undefined>) {
    const key = env.REMOVE_BG_API_KEY;
    if (!key) {
      throw new ProviderError(
        ErrorCodes.PROVIDER_ERROR,
        "服务配置异常",
        false,
        502,
        "REMOVE_BG_API_KEY is not set"
      );
    }
    this.apiKey = key;
  }

  /**
   * 调用 remove.bg API 完成去背。
   *
   * @param input - 包含原始图片字节与 MIME 类型
   * @returns 透明 PNG 字节包装
   * @throws ProviderError（统一错误码 + HTTP 状态码）
   */
  async remove(input: RemoveBgInput): Promise<RemoveBgOutput> {
    const formData = new FormData();
    // input.buffer 为 Uint8Array，需显式断言以兼容 TS 5.5+ 的 ArrayBufferLike 类型变化
    const blob = new Blob([input.buffer as BlobPart], { type: input.mimeType });
    formData.append("image_file", blob, input.fileName ?? "image.png");
    formData.append("size", "auto");

    let response: Response;
    try {
      response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": this.apiKey },
        body: formData,
      });
    } catch (err: unknown) {
      console.error("remove.bg 网络异常:", err);
      throw new ProviderError(
        ErrorCodes.TIMEOUT,
        "处理超时，请重试",
        true,
        504,
        `Network error: ${String(err)}`
      );
    }

    // 成功 → 直返 PNG 字节
    if (response.ok) {
      const buffer = new Uint8Array(await response.arrayBuffer());
      return { pngBuffer: buffer };
    }

    // 解析 remove.bg 错误响应
    let errorData: Record<string, unknown> | undefined;
    try {
      errorData = (await response.json()) as Record<string, unknown>;
    } catch {
      // 响应体非 JSON，透传 HTTP 状态
    }

    const errors = errorData?.errors;
    const firstError: Record<string, unknown> | null =
      Array.isArray(errors) && errors.length > 0
        ? (errors[0] as Record<string, unknown>)
        : null;
    const errorCode = String(firstError?.code ?? "");
    const detail: string =
      (firstError?.detail as string) ??
      (firstError?.title as string) ??
      JSON.stringify(errorData ?? {});

    console.error(`remove.bg HTTP ${response.status}:`, detail);

    // remove.bg 错误 → 统一错误码映射（见 system_design_nextjs.md §3.3）
    switch (response.status) {
      case 400:
        if (errorCode === "image_file_missing") {
          throw new ProviderError(
            ErrorCodes.INVALID_INPUT,
            "文件无效，请上传有效的图片文件",
            false,
            400,
            detail
          );
        }
        if (errorCode === "unsupported_image_type" || errorCode === "unsupported") {
          throw new ProviderError(
            ErrorCodes.UNSUPPORTED_TYPE,
            "不支持的文件类型，请上传 JPG、PNG 或 WEBP 格式的图片",
            false,
            415,
            detail
          );
        }
        throw new ProviderError(
          ErrorCodes.INVALID_INPUT,
          "文件无效，请上传有效的图片文件",
          false,
          400,
          detail
        );

      case 401:
      case 403:
        throw new ProviderError(
          ErrorCodes.PROVIDER_ERROR,
          "服务配置异常",
          false,
          502,
          detail
        );

      case 402:
        throw new ProviderError(
          ErrorCodes.PROVIDER_ERROR,
          "去背额度已用尽",
          false,
          502,
          detail
        );

      case 429:
        throw new ProviderError(
          ErrorCodes.RATE_LIMITED,
          "当前请求较多，请稍后重试",
          true,
          429,
          detail
        );

      default:
        // 5xx 或其他 → PROVIDER_ERROR
        throw new ProviderError(
          ErrorCodes.PROVIDER_ERROR,
          "处理失败，请重试",
          true,
          502,
          detail
        );
    }
  }
}

// -------------------------------------------------------------------
// getProvider 工厂
// -------------------------------------------------------------------

/**
 * 根据环境变量创建 Provider 实例。
 * 当前仅支持 removebg；可通过 PROVIDER 环境变量扩展其他实现。
 */
export function getProvider(
  env: Record<string, string | undefined>
): BackgroundRemovalProvider {
  const name = (env.PROVIDER ?? "removebg").toLowerCase();
  switch (name) {
    case "removebg":
    default:
      return new RemoveBgProvider(env);
  }
}
