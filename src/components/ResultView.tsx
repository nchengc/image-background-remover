/**
 * 结果区：棋盘格预览 + 原图/结果切换 + 并排对比 + 透明 PNG 下载。
 *
 * 透明度可见性依赖 preview.ts 的 checkerboardStyle；
 * 下载使用原生 <a download>，直接指向结果 blob URL，完整保留 alpha 通道。
 */

import { useMemo, useState } from 'react';

import { buildDownloadFileName, checkerboardStyle, formatFileSize } from '@/lib/preview';

type ViewMode = 'result' | 'original' | 'compare';

export interface ResultViewProps {
  /** 结果图（透明 PNG）的 objectURL。 */
  resultUrl: string;
  /** 原图 objectURL，可能为空（例如刷新后仅剩结果）。 */
  originalUrl: string | null;
  /** 原始文件名，用于生成下载名。 */
  fileName: string;
  /** 结果体积（字节）。 */
  resultSize: number;
  /** 再处理一张。 */
  onReset: () => void;
}

const MODE_LABELS: Array<{ value: ViewMode; label: string }> = [
  { value: 'result', label: '去背景' },
  { value: 'original', label: '原图' },
  { value: 'compare', label: '对比' },
];

export default function ResultView({
  resultUrl,
  originalUrl,
  fileName,
  resultSize,
  onReset,
}: ResultViewProps) {
  const [mode, setMode] = useState<ViewMode>('result');

  const downloadName = useMemo(() => buildDownloadFileName(fileName), [fileName]);
  const modes = useMemo(
    () => (originalUrl ? MODE_LABELS : MODE_LABELS.filter((item) => item.value === 'result')),
    [originalUrl],
  );

  // 原图缺失时强制回落到结果视图，避免空白画面。
  const effectiveMode: ViewMode = originalUrl ? mode : 'result';

  return (
    <section className="animate-fade-in space-y-5">
      {/* 视图切换 */}
      {modes.length > 1 ? (
        <div
          role="tablist"
          aria-label="预览模式"
          className="mx-auto flex w-full max-w-xs rounded-xl border border-slate-700 bg-slate-900/60 p-1"
        >
          {modes.map((item) => {
            const isActive = effectiveMode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setMode(item.value)}
                className={[
                  'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-brand-500 text-white shadow-card' : 'text-slate-300 hover:text-white',
                ].join(' ')}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* 预览区 */}
      {effectiveMode === 'compare' && originalUrl ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PreviewCard title="原图" src={originalUrl} alt="原始图片" checker={false} />
          <PreviewCard title="去背景" src={resultUrl} alt="去除背景后的透明 PNG" checker />
        </div>
      ) : (
        <PreviewCard
          title={effectiveMode === 'original' ? '原图' : '去背景'}
          src={effectiveMode === 'original' && originalUrl ? originalUrl : resultUrl}
          alt={effectiveMode === 'original' ? '原始图片' : '去除背景后的透明 PNG'}
          checker={effectiveMode !== 'original'}
        />
      )}

      {/* 结果信息 */}
      <p className="text-center text-xs text-slate-500">
        {downloadName}
        {resultSize > 0 ? ` · ${formatFileSize(resultSize)}` : ''} · 透明底 PNG
      </p>

      {/* 操作区 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href={resultUrl}
          download={downloadName}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 active:bg-brand-600 sm:w-auto"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path d="M12 4v12" />
            <path d="m7 11 5 5 5-5" />
            <path d="M4 20h16" />
          </svg>
          下载透明 PNG
        </a>
        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white sm:w-auto"
        >
          再处理一张
        </button>
      </div>
    </section>
  );
}

interface PreviewCardProps {
  title: string;
  src: string;
  alt: string;
  /** 是否铺棋盘格（透明区域可见）。 */
  checker: boolean;
}

function PreviewCard({ title, src, alt, checker }: PreviewCardProps) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60">
      <figcaption className="border-b border-slate-700/80 px-4 py-2 text-xs font-medium text-slate-400">
        {title}
      </figcaption>
      <div
        className="flex h-[240px] items-center justify-center p-3 sm:h-[360px]"
        style={checker ? checkerboardStyle : undefined}
      >
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
      </div>
    </figure>
  );
}
