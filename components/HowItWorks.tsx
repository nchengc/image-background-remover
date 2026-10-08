const STEPS = [
  {
    title: "上传图片",
    desc: "点击选择、拖拽进来，或直接 Ctrl+V 粘贴剪贴板里的截图。",
  },
  {
    title: "AI 自动抠图",
    desc: "云端模型识别画面主体并分离背景，全程在内存中完成。",
  },
  {
    title: "下载透明 PNG",
    desc: "棋盘格区域即透明区域，一键导出 <原名>-nobg.png 直接使用。",
  },
];

export default function HowItWorks() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <span className="section-kicker">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            使用步骤
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            三步搞定，零学习成本
          </h2>
        </div>

        <ol className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
          {/* 连接线（仅桌面端） */}
          <div
            aria-hidden="true"
            className="absolute left-[16.6%] right-[16.6%] top-7 hidden border-t-2 border-dashed border-brand-200 sm:block"
          />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-xl font-bold text-white shadow-glow">
                {i + 1}
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                {s.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
