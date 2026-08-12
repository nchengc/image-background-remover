/**
 * StatusBlock — loading / error 状态区块。
 *
 * loading：spinner 动画 + 原图缩略（不白屏）
 * error：错误文案 + 错误码展示 + 重试按钮
 */

"use client";

import type { AppError, AppStatus } from "@/lib/types";

export interface StatusBlockProps {
  /** 当前应用状态 */
  status: AppStatus;
  /** 错误详情（仅 error 态使用） */
  error: AppError | null;
  /** 原图 objectURL（loading 时展示缩略） */
  originalUrl: string | null;
  /** 重试回调 */
  onRetry: () => void;
  /** 换一张回调 */
  onReset: () => void;
}

export default function StatusBlock({
  status,
  error,
  originalUrl,
  onRetry,
  onReset,
}: StatusBlockProps) {
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div
            className="absolute inset-0 rounded-full border-4 border-gray-200"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
            aria-hidden="true"
          />
        </div>

        <p className="text-gray-600 text-sm font-medium">正在去背景…</p>

        {/* 原图缩略（不白屏） */}
        {originalUrl && (
          <div className="mt-2">
            <p className="text-gray-400 text-xs mb-1">原图</p>
            <img
              src={originalUrl}
              alt="正在处理的原始图片"
              className="max-w-[200px] max-h-[150px] rounded-lg border border-gray-200 object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        {/* 错误图标 */}
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* 错误文案 */}
        <p className="text-red-600 text-sm font-medium text-center" role="alert">
          {error.message}
        </p>

        {/* 错误码（调试用，非技术用户可忽略） */}
        <p className="text-gray-400 text-xs font-mono">
          错误码：{error.code}
        </p>

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-2">
          {error.retryable && (
            <button
              onClick={onRetry}
              className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium
                         hover:bg-blue-600 active:bg-blue-700 transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              重试
            </button>
          )}
          <button
            onClick={onReset}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2
                       ${error.retryable
                         ? "border border-gray-300 text-gray-600 hover:bg-gray-50"
                         : "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
                       }`}
          >
            换一张图片
          </button>
        </div>
      </div>
    );
  }

  // 非 loading / error 不渲染
  return null;
}
