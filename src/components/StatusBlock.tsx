/**
 * 处理中 / 失败 区块。
 *
 * - loading：spinner + 原图缩略图（有则显示），明确「正在处理哪一张」
 * - error：错误文案 + 操作出口
 *     · 可重试（429/502/504/500/网络异常）→ 显示「重试」，复用 lastFile
 *     · 不可重试（400/415/413）→ 只显示「换一张图片」
 */

import { checkerboardStyle } from '@/lib/preview';
import type { AppError, AppStatus } from '@/lib/useRemoveBg';

export interface StatusBlockProps {
  /** 仅在 loading / error 两态渲染。 */
  status: Extract<AppStatus, 'loading' | 'error'>;
  /** error 态的错误信息。 */
  error: AppError | null;
  /** 原图预览 URL，用于 loading 占位，避免白屏。 */
  originalUrl: string | null;
  /** 当前文件名。 */
  fileName: string;
  /** 复用 lastFile 重试。 */
  onRetry: () => void;
  /** 回到 idle 重新选图。 */
  onReset: () => void;
}

export default function StatusBlock({
  status,
  error,
  originalUrl,
  fileName,
  onRetry,
  onReset,
}: StatusBlockProps) {
  const isLoading = status === 'loading';
  const canRetry = !isLoading && Boolean(error?.retryable);

  return (
    <section
      aria-live="polite"
      aria-busy={isLoading}
      className="animate-fade-in rounded-2xl border border-slate-700 bg-slate-900/50 px-5 py-8 sm:px-8 sm:py-10"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        {originalUrl ? (
          <div
            className="h-28 w-28 overflow-hidden rounded-xl border border-slate-700 sm:h-32 sm:w-32"
            style={checkerboardStyle}
          >
            <img
              src={originalUrl}
              alt="待处理的原图缩略图"
              className={[
                'h-full w-full object-contain transition',
                isLoading ? 'animate-pulse opacity-80' : 'opacity-60',
              ].join(' ')}
            />
          </div>
        ) : null}

        {isLoading ? (
          <>
            <Spinner />
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-100">正在去除背景…</p>
              <p className="text-sm text-slate-400">
                {fileName ? `处理中：${fileName}` : '通常需要 3~10 秒，请勿关闭页面'}
              </p>
            </div>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </span>

            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-100">处理失败</p>
              <p role="alert" className="max-w-md text-sm text-rose-200">
                {error?.message ?? '未知错误，请重试'}
              </p>
              {error?.code ? (
                <p className="text-xs text-slate-500">错误码：{error.code}</p>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {canRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="w-full rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 active:bg-brand-600 sm:w-auto"
                >
                  重试
                </button>
              ) : null}
              <button
                type="button"
                onClick={onReset}
                className="w-full rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white sm:w-auto"
              >
                换一张图片
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/** 轻量 spinner，避免引入额外依赖。 */
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-700 border-t-brand-400"
    />
  );
}
