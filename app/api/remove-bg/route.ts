/**
 * Route Handler — POST /api/remove-bg
 *
 * 代理核心：校验 → 信号量(≤2) → Provider → 超时 race → 200 image/png / 错误 JSON。
 * OPTIONS 返回 204 + CORS 头（Preflight 兼容）。
 *
 * 运行时：Node.js（需要 Buffer / 流式处理二进制）
 * 缓存策略：force-dynamic（每次请求实时处理，不缓存去背结果）
 * 超时上限：30s（Vercel 兼容；自托管无害）
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { getProvider, ProviderError } from "@/lib/providers/removebg";
import {
  AppError,
  ErrorCodes,
  ERROR_HTTP_STATUS,
  ERROR_MESSAGES,
  DEFAULT_RETRYABLE_BY_CODE,
} from "@/lib/types";

// -------------------------------------------------------------------
// 模块级并发信号量（进程内近似全局；演示流量可控）
// -------------------------------------------------------------------

let active = 0;
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY ?? 2);
const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS ?? 30000);
const ALLOWED_MAX_MB_SERVER = Number(process.env.ALLOWED_MAX_MB ?? 4);
const ALLOWED_TYPES_SERVER = (
  process.env.ALLOWED_TYPES ?? "image/jpeg,image/png,image/webp"
)
  .split(",")
  .map((s) => s.trim());

// -------------------------------------------------------------------
// 工具函数
// -------------------------------------------------------------------

/** 构造统一 AppError */
function makeError(
  code: string,
  message?: string
): AppError {
  return {
    code,
    message: message ?? ERROR_MESSAGES[code] ?? "未知错误",
    retryable: DEFAULT_RETRYABLE_BY_CODE[code] ?? true,
  };
}

/** 返回 JSON 错误响应 */
function jsonError(data: AppError, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** 超时 Promise */
function timeout(ms: number): Promise<never> {
  return new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(makeError(ErrorCodes.TIMEOUT, "处理超时，请重试")),
      ms
    )
  );
}

// -------------------------------------------------------------------
// OPTIONS — Preflight 兼容
// -------------------------------------------------------------------

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// -------------------------------------------------------------------
// POST — 代理核心
// -------------------------------------------------------------------

export async function POST(req: Request): Promise<Response> {
  // ----- 并发控制 -----
  if (active >= MAX_CONCURRENCY) {
    return jsonError(
      makeError(ErrorCodes.RATE_LIMITED),
      ERROR_HTTP_STATUS[ErrorCodes.RATE_LIMITED]
    );
  }

  active++;
  try {
    // ----- 解析 multipart -----
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return jsonError(
        makeError(ErrorCodes.INVALID_INPUT),
        ERROR_HTTP_STATUS[ErrorCodes.INVALID_INPUT]
      );
    }

    const imageField = formData.get("image");
    if (!imageField || !(imageField instanceof File)) {
      return jsonError(
        makeError(ErrorCodes.INVALID_INPUT),
        ERROR_HTTP_STATUS[ErrorCodes.INVALID_INPUT]
      );
    }

    // ----- MIME 白名单 -----
    const mimeType = imageField.type;
    if (!ALLOWED_TYPES_SERVER.includes(mimeType)) {
      return jsonError(
        makeError(ErrorCodes.UNSUPPORTED_TYPE),
        ERROR_HTTP_STATUS[ErrorCodes.UNSUPPORTED_TYPE]
      );
    }

    // ----- 体积校验 -----
    const maxBytes = ALLOWED_MAX_MB_SERVER * 1024 * 1024;
    if (imageField.size > maxBytes) {
      return jsonError(
        makeError(ErrorCodes.UPLOAD_TOO_LARGE),
        ERROR_HTTP_STATUS[ErrorCodes.UPLOAD_TOO_LARGE]
      );
    }

    const buffer = new Uint8Array(await imageField.arrayBuffer());

    // ----- Provider + 超时竞速 -----
    const provider = getProvider(
      process.env as Record<string, string | undefined>
    );

    const result = await Promise.race([
      provider.remove({
        buffer,
        mimeType,
        fileName: imageField.name,
      }),
      timeout(PROVIDER_TIMEOUT_MS),
    ]);

    // ----- 成功：返回透明 PNG -----
    const fileName = imageField.name.replace(/\.[^.]+$/, "");
    // Buffer.from 确保 Node.js 环境下 Uint8Array 可被 Response 构造函数接受
    return new Response(Buffer.from(result.pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${fileName}_nobg.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    // ----- 错误透传 -----
    if (err instanceof ProviderError) {
      // detail 仅服务端日志，不下发前端
      console.error(
        `ProviderError [${err.code}] HTTP ${err.httpStatus}:`,
        err.detail ?? err.message
      );
      const appErr: AppError = {
        code: err.code,
        message: err.message,
        retryable: err.retryable,
      };
      const httpStatus = ERROR_HTTP_STATUS[err.code] ?? 500;
      return jsonError(appErr, httpStatus);
    }

    // AppError（如 TIMEOUT from Promise.race）
    if (err && typeof err === "object" && "code" in err) {
      const appErr = err as AppError;
      const httpStatus = ERROR_HTTP_STATUS[appErr.code] ?? 500;
      return jsonError(appErr, httpStatus);
    }

    console.error("Unhandled error in /api/remove-bg:", err);
    return jsonError(
      makeError(ErrorCodes.INTERNAL),
      ERROR_HTTP_STATUS[ErrorCodes.INTERNAL]
    );
  } finally {
    active--;
  }
}
