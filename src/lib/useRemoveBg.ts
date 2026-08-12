/**
 * useRemoveBg — 四态状态机 Hook + 代理客户端。
 *
 * 'use client' 边界：本 Hook 管理浏览器端 File/Blob/objectURL，
 * 通过 fetch('/api/remove-bg') 与同源 Route Handler 通信。
 */

"use client";

import { useReducer, useCallback, useRef, useEffect } from "react";
import type { AppError } from "@/lib/types";
import {
  ErrorCodes,
  ALLOWED_TYPES,
  ALLOWED_MAX_MB,
  INITIAL_STATE,
} from "@/lib/types";
import type { RemoveBgState, RemoveBgEvent } from "@/lib/types";
import { releasePreviewUrl } from "@/lib/preview";

// -------------------------------------------------------------------
// 纯函数 reducer（无副作用）
// -------------------------------------------------------------------

function reducer(
  state: RemoveBgState,
  event: RemoveBgEvent
): RemoveBgState {
  switch (state.status) {
    case "idle":
      if (event.type === "SUBMIT") {
        const originalUrl = URL.createObjectURL(event.file);
        return {
          ...state,
          status: "loading",
          lastFile: event.file,
          originalUrl,
          fileName: event.file.name,
          error: null,
        };
      }
      break;

    case "loading":
      if (event.type === "SUCCESS") {
        const resultUrl = URL.createObjectURL(event.result);
        return {
          ...state,
          status: "done",
          resultUrl,
          error: null,
        };
      }
      if (event.type === "FAIL") {
        return {
          ...state,
          status: "error",
          error: event.error,
        };
      }
      // loading 态忽略 SUBMIT / RETRY（防重复提交）
      break;

    case "error":
      if (event.type === "RETRY") {
        return {
          ...state,
          status: "loading",
          error: null,
        };
      }
      if (event.type === "RESET") {
        return { ...INITIAL_STATE };
      }
      break;

    case "done":
      if (event.type === "RESET") {
        return { ...INITIAL_STATE };
      }
      break;
  }
  return state;
}

// -------------------------------------------------------------------
// 前端校验
// -------------------------------------------------------------------

/**
 * 前端预校验图片文件（类型 + 大小）。
 * 通过返回 null，失败返回 AppError。
 */
export function validateImageFile(file: File): AppError | null {
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return {
      code: ErrorCodes.UNSUPPORTED_TYPE,
      message:
        "不支持的文件类型，请上传 JPG、PNG 或 WEBP 格式的图片",
      retryable: false,
    };
  }
  const maxBytes = ALLOWED_MAX_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      code: ErrorCodes.UPLOAD_TOO_LARGE,
      message: `文件过大，请上传不超过 ${ALLOWED_MAX_MB}MB 的图片`,
      retryable: false,
    };
  }
  return null;
}

// -------------------------------------------------------------------
// useRemoveBg Hook
// -------------------------------------------------------------------

export function useRemoveBg() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  /** 请求序号（丢弃迟到响应） */
  const requestIdRef = useRef(0);
  /** 当前请求的 AbortController */
  const abortRef = useRef<AbortController | null>(null);
  /** 追踪进入 loading 态是否需要触发 fetch */
  const pendingFileRef = useRef<File | null>(null);

  // -----------------------------------------------------------------
  // 核心 fetch 逻辑
  // -----------------------------------------------------------------

  const doFetch = useCallback(async (file: File) => {
    const requestId = ++requestIdRef.current;
    const abortController = new AbortController();
    abortRef.current = abortController;

    const formData = new FormData();
    formData.append("image", file);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch("/api/remove-bg", {
          method: "POST",
          body: formData,
          signal: abortController.signal,
        });

        // 丢弃迟到响应（新请求已发起）
        if (requestId !== requestIdRef.current) return;

        if (response.ok) {
          const blob = await response.blob();
          if (requestId !== requestIdRef.current) return;
          dispatch({ type: "SUCCESS", result: blob });
          return;
        }

        // 解析错误 JSON
        let errorData: AppError;
        try {
          errorData = (await response.json()) as AppError;
        } catch {
          errorData = {
            code: ErrorCodes.INTERNAL,
            message: "服务器返回异常，请重试",
            retryable: true,
          };
        }

        if (requestId !== requestIdRef.current) return;
        dispatch({ type: "FAIL", error: errorData });
        return;
      } catch (err: unknown) {
        // 用户主动取消
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        // 瞬时网络错误 → 静默重试一次
        const isNetworkError =
          err instanceof TypeError &&
          (err.message.includes("fetch") ||
            err.message.includes("network") ||
            err.message.includes("Failed to fetch"));
        if (isNetworkError && attempt === 0) {
          continue;
        }

        if (requestId !== requestIdRef.current) return;
        dispatch({
          type: "FAIL",
          error: {
            code: ErrorCodes.TIMEOUT,
            message: "网络错误，请重试",
            retryable: true,
          },
        });
        return;
      }
    }
  }, []);

  // -----------------------------------------------------------------
  // 公开 API
  // -----------------------------------------------------------------

  /** 提交新文件 */
  const submit = useCallback(
    (file: File) => {
      if (state.status === "loading") return;

      // 前端预校验
      const validationError = validateImageFile(file);
      if (validationError) {
        dispatch({ type: "FAIL", error: validationError });
        return;
      }

      pendingFileRef.current = file;
      dispatch({ type: "SUBMIT", file });
    },
    [state.status]
  );

  /** 重试（复用 lastFile，仅 error 态可用） */
  const retry = useCallback(() => {
    if (state.status !== "error" || !state.lastFile) return;
    pendingFileRef.current = state.lastFile;
    dispatch({ type: "RETRY" });
  }, [state.status, state.lastFile]);

  /** 重置回 idle */
  const reset = useCallback(() => {
    // 取消进行中的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = null;

    // 清理 objectURL
    if (state.originalUrl) {
      URL.revokeObjectURL(state.originalUrl);
    }
    if (state.resultUrl) {
      releasePreviewUrl(state.resultUrl);
    }

    dispatch({ type: "RESET" });
    pendingFileRef.current = null;
  }, [state.originalUrl, state.resultUrl]);

  // -----------------------------------------------------------------
  // Effect: 进入 loading 态时自动发起 fetch
  // -----------------------------------------------------------------

  useEffect(() => {
    if (state.status === "loading" && pendingFileRef.current) {
      const file = pendingFileRef.current;
      pendingFileRef.current = null;
      doFetch(file);
    }
  }, [state.status, doFetch]);

  return { state, submit, retry, reset };
}
