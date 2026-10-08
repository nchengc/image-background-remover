const FEATURES = [
  {
    title: "秒级出图",
    desc: "云端 AI 自动识别画面主体，单张图片秒级返回，无需等待本地模型加载。",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    ),
    tint: "from-amber-400 to-orange-500",
  },
  {
    title: "隐私优先 · 零存储",
    desc: "图片仅在边缘函数内存中转发处理，不落盘、不建库、不留副本，处理完即释放。",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    ),
    tint: "from-emerald-400 to-teal-500",
  },
  {
    title: "真透明 PNG",
    desc: "输出带完整 Alpha 通道的 PNG，可直接用于电商上架、PPT、海报合成。",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    ),
    tint: "from-brand-500 to-violet-500",
  },
  {
    title: "免注册即用",
    desc: "无需账号、无需安装，打开网页上传即可，也支持 Ctrl+V 直接粘贴截图。",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    ),
    tint: "from-sky-400 to-blue-500",
  },
  {
    title: "多格式支持",
    desc: "PNG、JPG、WebP 等常见格式均可上传，手机照片、截图、商品图通通适用。",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    ),
    tint: "from-fuchsia-400 to-pink-500",
  },
  {
    title: "免费上手",
    desc: "每月 50 张免费额度，个人与轻量使用完全够用，无需绑定支付方式。",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9.375 21l-.438-5.096a2.25 2.25 0 00-.988-1.682L3.6 11.25l5.349-2.972A2.25 2.25 0 009.937 6.6L10.375 1.5l.438 5.099a2.25 2.25 0 00.988 1.682l4.349 2.972-5.349 2.972a2.25 2.25 0 00-.988 1.681z" />
    ),
    tint: "from-rose-400 to-red-500",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-slate-50/80 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <span className="section-kicker">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            服务能力
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            为「能用、好用、放心用」而设计
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-card"
            >
              <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.tint} text-white shadow-md transition group-hover:scale-110`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
                  {f.icon}
                </svg>
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
