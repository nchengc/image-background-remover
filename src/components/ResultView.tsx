/**
 * ResultView — 去背结果预览 + 下载组件。
 *
 * 三视图切换：「去背景」「原图」「对比」
 * 棋盘格 CSS 透出 alpha 通道。
 * <a download> 原生下载保留透明通道。
 */

"use client";

import { useState, useMemo } from "react";
import { checkerboardStyle, buildDownloadFileName } from "@/lib/preview";

export interface ResultViewProps {
  /** 结果图 objectURL（透明 PNG blob） */
  resultUrl: string;
  /** 原图 objectURL（可能为 null） */
  originalUrl: string | null;
  /** 原始文件名 */
  fileName: string;
  /** 回到 idle 回调 */
  onReset: () => void;
}

type ViewMode = "result" | "original" | "compare";

export default function ResultView({
  resultUrl,
  originalUrl,
  fileName,
  onReset,
}: ResultViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("result");

  const downloadName = useMemo(
    () => buildDownloadFileName(fileName),
    [fileName]
  );

  const hasOriginal = originalUrl !== null;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* ---- 视图切换器 ---- */}
      {hasOriginal && (
        <div className="flex rounded-lg bg-gray-100 p-0.5" role="tablist">
          {(
            [
              ["result", "去背景"],
              ["original", "原图"],
              ["compare", "对比"],
            ] as [ViewMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              role="tab"
              aria-selected={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                ${viewMode === mode
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ---- 预览区 ---- */}
      <div className="w-full max-w-[720px]">
        {viewMode === "result" && (
          <div
            className="w-full rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center p-4"
            style={{ background: checkerboardStyle() }}
          >
            <img
              src={resultUrl}
              alt="去背景结果"
              className="max-w-full max-h-[60vh] object-contain"
            />
          </div>
        )}

        {viewMode === "original" && originalUrl && (
          <div className="w-full rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center p-4 bg-white">
            <img
              src={originalUrl}
              alt="原始图片"
              className="max-w-full max-h-[60vh] object-contain"
            />
          </div>
        )}

        {viewMode === "compare" && originalUrl && (
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {/* 桌面：并排；移动（sm 以下）：堆叠 */}
            <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 flex flex-col items-center bg-white">
              <p className="text-xs text-gray-400 py-1.5">原图</p>
              <div className="flex items-center justify-center p-3 w-full">
                <img
                  src={originalUrl}
                  alt="原始图片"
                  className="max-w-full max-h-[40vh] object-contain"
                />
              </div>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 flex flex-col items-center">
              <p className="text-xs text-gray-400 py-1.5">去背景</p>
              <div
                className="flex items-center justify-center p-3 w-full"
                style={{ background: checkerboardStyle() }}
              >
                <img
                  src={resultUrl}
                  alt="去背景结果"
                  className="max-w-full max-h-[40vh] object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- 操作按钮 ---- */}
      <div className="flex gap-3 flex-wrap justify-center">
        {/* 下载按钮 */}
        <a
          href={resultUrl}
          download={downloadName}
          className="px-6 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium
                     hover:bg-blue-600 active:bg-blue-700 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
                     no-underline inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          下载透明 PNG
        </a>

        {/* 换一张 */}
        <button
          onClick={onReset}
          className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium
                     hover:bg-gray-50 active:bg-gray-100 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
        >
          再传一张
        </button>
      </div>
    </div>
  );
}
