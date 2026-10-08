/* eslint-disable @next/next/no-img-element */

const STATS = [
  { value: "秒级", label: "单张处理速度" },
  { value: "0", label: "图片存储（内存处理）" },
  { value: "50 张/月", label: "免费额度" },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* 背景装饰：渐变光斑 + 网格 */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-200/60 via-violet-200/60 to-fuchsia-200/60 blur-3xl" />
        <div className="absolute right-[-6rem] top-40 h-64 w-64 rounded-full bg-fuchsia-200/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(226 232 240 / .55) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / .55) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 55% at 50% 0%, black 55%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 55% at 50% 0%, black 55%, transparent 100%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
        <span className="animate-fade-up section-kicker">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          免注册 · 免安装 · 打开即用
        </span>

        <h1 className="animate-fade-up mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.15]">
          一键去除图片背景
          <br />
          <span className="text-gradient">秒得透明 PNG</span>
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
          上传图片，AI 自动识别主体并抠出，输出带透明通道的 PNG。
          图片全程仅在内存中处理，
          <span className="font-medium text-slate-700">不落盘、不存储</span>
          ，隐私无忧。
        </p>

        <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#tool"
            className="w-full rounded-2xl bg-gradient-to-r from-brand-600 to-violet-600 px-8 py-3.5 text-base font-semibold text-white shadow-glow transition hover:opacity-90 active:scale-95 sm:w-auto"
          >
            上传图片，立即体验
          </a>
          <a
            href="#showcase"
            className="w-full rounded-2xl border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 shadow-soft transition hover:border-slate-300 hover:bg-slate-50 active:scale-95 sm:w-auto"
          >
            先看效果 →
          </a>
        </div>

        <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="glass rounded-2xl px-2 py-4">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-xl font-bold text-slate-900 sm:text-2xl">{s.value}</dd>
              <dd className="mt-1 text-xs text-slate-500 sm:text-sm">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
