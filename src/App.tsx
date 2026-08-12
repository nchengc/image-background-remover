/**
 * 顶层页面：页眉（标题/副标题）+ 状态机驱动的主体 + 隐私页脚。
 *
 * 主体按四态渲染，保证任何时刻只有一个主视图：
 *   idle    → Uploader
 *   loading → StatusBlock(loading)
 *   error   → StatusBlock(error)（可重试则给重试入口）
 *   done    → ResultView
 */

import ResultView from '@/components/ResultView';
import StatusBlock from '@/components/StatusBlock';
import Uploader from '@/components/Uploader';
import { ALLOWED_MAX_MB, ALLOWED_TYPES_LABEL, useRemoveBg } from '@/lib/useRemoveBg';

export default function App() {
  const {
    status,
    error,
    originalUrl,
    resultUrl,
    resultSize,
    fileName,
    submit,
    retry,
    reset,
    isBusy,
  } = useRemoveBg();

  return (
    <div className="flex min-h-full flex-col bg-slate-950 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(49,121,251,0.18),transparent)]">
      <header className="container pt-10 text-center sm:pt-14">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">一键去背景</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
          上传图片，几秒钟得到透明底 PNG。支持 {ALLOWED_TYPES_LABEL}，单张不超过 {ALLOWED_MAX_MB}MB。
        </p>
      </header>

      <main className="container flex-1 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-3xl">
          {status === 'idle' ? <Uploader onSelect={submit} disabled={isBusy} /> : null}

          {status === 'loading' || status === 'error' ? (
            <StatusBlock
              status={status}
              error={error}
              originalUrl={originalUrl}
              fileName={fileName}
              onRetry={retry}
              onReset={reset}
            />
          ) : null}

          {status === 'done' && resultUrl ? (
            <ResultView
              resultUrl={resultUrl}
              originalUrl={originalUrl}
              fileName={fileName}
              resultSize={resultSize}
              onReset={reset}
            />
          ) : null}
        </div>
      </main>

      <footer className="container pb-safe pb-8 text-center text-xs leading-relaxed text-slate-500">
        <p>图片仅在处理期间留在内存中，处理完即释放，服务端不落盘、不留存、不用于任何其他用途。</p>
        <p className="mt-1">去背景由第三方 AI 服务完成，密钥仅保存在服务端环境变量中。</p>
      </footer>
    </div>
  );
}
