const FAQS = [
  {
    q: "我的图片会被保存吗？",
    a: "不会。图片上传后仅在服务端内存中转发给去背景引擎，处理完立即释放，不写磁盘、不入数据库。刷新页面后服务端不保留任何副本。",
  },
  {
    q: "免费能用多少张？",
    a: "本站由 remove.bg 提供去背景能力，免费额度为每月 50 张，个人和轻量使用通常足够。额度耗尽时接口会返回明确提示，下月自动恢复。",
  },
  {
    q: "为什么导出的图片分辨率比原图小？",
    a: "免费档位的输出被限制在约 25 万像素（例如 1600×1200 的原图会等比缩小到约 577×433），这是上游服务的套餐限制。如需高清输出，需要升级 remove.bg 的付费额度。",
  },
  {
    q: "支持哪些格式？最大多大？",
    a: "PNG、JPG、WebP 等常见格式均可，单张不超过 10MB。手机照片建议先压缩后再上传，成功率更高。",
  },
  {
    q: "抠图效果不理想怎么办？",
    a: "主体与背景对比越明显，效果越好。可以尝试：换一张主体居中、背景不太复杂的图片；避免与主体颜色过于接近的背景。",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-slate-50/80 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <span className="section-kicker">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            常见问题
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            你可能想问
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft transition open:border-brand-200 open:shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                {f.q}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
