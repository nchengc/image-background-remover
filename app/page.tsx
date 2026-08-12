/**
 * 首页 — bg_remover 主页面。
 *
 * 'use client'：组合 Uploader / StatusBlock / ResultView，依 useRemoveBg 四态驱动。
 * 标题「去背景」+ 副标题「上传图片，3 秒拿到透明 PNG」+ 隐私页脚。
 */

"use client";

import { useRemoveBg } from "@/lib/useRemoveBg";
import Uploader from "@/components/Uploader";
import StatusBlock from "@/components/StatusBlock";
import ResultView from "@/components/ResultView";

export default function HomePage() {
  const { state, submit, retry, reset } = useRemoveBg();

  return (
    <div className="flex flex-col min-h-screen">
      {/* ============================================================ */}
      {/* 页眉                                                          */}
      {/* ============================================================ */}
      <header className="text-center pt-10 pb-4 px-4">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          去背景
        </h1>
        <p className="mt-2 text-gray-500 text-sm">
          上传图片，3 秒拿到透明 PNG
        </p>
      </header>

      {/* ============================================================ */}
      {/* 主体（四态视图）                                               */}
      {/* ============================================================ */}
      <main className="flex-1 w-full max-w-[720px] mx-auto px-4 pb-8">
        {/* idle → 上传区 */}
        {state.status === "idle" && (
          <Uploader
            disabled={false}
            onFile={submit}
          />
        )}

        {/* loading / error → 状态块（loading 时含原图缩略） */}
        {(state.status === "loading" || state.status === "error") && (
          <>
            <Uploader
              disabled={state.status === "loading"}
              onFile={submit}
              error={state.error}
            />
            <div className="mt-6">
              <StatusBlock
                status={state.status}
                error={state.error}
                originalUrl={state.originalUrl}
                onRetry={retry}
                onReset={reset}
              />
            </div>
          </>
        )}

        {/* done → 结果视图 */}
        {state.status === "done" && state.resultUrl && (
          <ResultView
            resultUrl={state.resultUrl}
            originalUrl={state.originalUrl}
            fileName={state.fileName}
            onReset={reset}
          />
        )}
      </main>

      {/* ============================================================ */}
      {/* 隐私页脚                                                      */}
      {/* ============================================================ */}
      <footer className="text-center py-6 px-4 border-t border-gray-200">
        <p className="text-gray-400 text-xs">
          图片仅在去背时上传，处理完即丢弃，不存储
        </p>
      </footer>
    </div>
  );
}
