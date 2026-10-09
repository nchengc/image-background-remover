/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";
import UploadTool from "./UploadTool";
import JsonLd from "./JsonLd";
import { SCENARIOS, SCENARIO_DEMO, type Scenario } from "@/lib/scenarios";
import { SITE, absUrl } from "@/lib/site";

/**
 * 场景长尾落地页共用模板。
 *
 * 每个场景页输出三份结构化数据：BreadcrumbList（面包屑富媒体结果）、
 * HowTo（步骤富媒体结果）、FAQPage（问答直接展开）。
 * 三者与页面可见内容一一对应，符合 Google 结构化数据政策（不得标记不可见内容）。
 */
export default function ScenarioPage({ scenario }: { scenario: Scenario }) {
  const url = absUrl(`/${scenario.slug}`);
  const related = SCENARIOS.filter((s) => s.slug !== scenario.slug);
  const demo = SCENARIO_DEMO[scenario.slug];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "首页", item: absUrl("/") },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: scenario.crumb,
                  item: url,
                },
              ],
            },
            {
              "@type": "WebPage",
              "@id": `${url}#webpage`,
              url,
              name: scenario.title,
              description: scenario.description,
              inLanguage: "zh-CN",
              isPartOf: { "@id": absUrl("/#website") },
              about: { "@id": absUrl("/#organization") },
            },
            {
              "@type": "HowTo",
              name: scenario.crumb,
              description: scenario.description,
              inLanguage: "zh-CN",
              totalTime: "PT1M",
              supply: [{ "@type": "HowToSupply", name: "待处理的图片" }],
              tool: [{ "@type": "HowToTool", name: "可联网的浏览器" }],
              step: scenario.steps.map((s, i) => ({
                "@type": "HowToStep",
                position: i + 1,
                name: s.name,
                text: s.text,
              })),
            },
            {
              "@type": "FAQPage",
              mainEntity: scenario.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }}
      />

      <Header variant="scenario" />
      <main>
        {/* 面包屑：同时是返回首页的内链 */}
        <nav aria-label="面包屑" className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            <li>
              <Link href="/" className="transition hover:text-brand-600">
                首页
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-slate-600">{scenario.crumb}</li>
          </ol>
        </nav>

        {/* H1 + 导语：主关键词必须在前 100 字内出现 */}
        <section className="mx-auto max-w-3xl px-4 pb-6 pt-6 sm:px-6">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            {scenario.h1}
          </h1>
          {scenario.intro.map((p, i) => (
            <p key={i} className="mt-4 text-[15px] leading-7 text-slate-600">
              {p}
            </p>
          ))}
        </section>

        {/* 效果示例：场景相关的前后对比，强化内容厚度、E-E-A-T 与图片搜索流量 */}
        {demo && (
          <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              效果示例
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="checkerboard aspect-[4/3] p-3">
                  <img
                    src={demo.before}
                    alt={demo.alt}
                    loading="lazy"
                    className="mx-auto h-full w-full object-contain"
                  />
                </div>
                <figcaption className="border-t border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
                  处理前
                </figcaption>
              </figure>
              <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="checkerboard aspect-[4/3] p-3">
                  <img
                    src={demo.after}
                    alt={demo.alt}
                    loading="lazy"
                    className="mx-auto h-full w-full object-contain"
                  />
                </div>
                <figcaption className="border-t border-slate-100 px-3 py-2 text-center text-xs text-slate-500">
                  处理后（透明 PNG）
                </figcaption>
              </figure>
            </div>
          </section>
        )}

        {/* 工具本体：复用首页同一组件，保证功能一致性 */}
        <UploadTool />

        {/* 规则表格：结构化呈现，利于精选摘要与 AI 概览抓取 */}
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {scenario.rulesTitle}
          </h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {scenario.rules.map((r) => (
                  <tr key={r.label} className="bg-white">
                    <th
                      scope="row"
                      className="w-1/3 whitespace-nowrap px-4 py-3 font-semibold text-slate-800"
                    >
                      {r.label}
                    </th>
                    <td className="px-4 py-3 text-slate-600">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 操作步骤：与 HowTo 结构化数据一一对应 */}
        <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            怎么操作
          </h2>
          <ol className="mt-5 space-y-3">
            {scenario.steps.map((s, i) => (
              <li
                key={s.name}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-violet-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{s.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 实操要点 */}
        <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            让效果更好的几个要点
          </h2>
          <dl className="mt-5 space-y-3">
            {scenario.tips.map((t) => (
              <div
                key={t.t}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <dt className="text-sm font-bold text-slate-900">{t.t}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">{t.d}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 场景专属 FAQ：与 FAQPage 结构化数据一一对应 */}
        <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            常见问题
          </h2>
          <div className="mt-5 space-y-3">
            {scenario.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft transition open:border-brand-200"
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 相关场景：主题集群内链，把权重导向同簇页面 */}
        <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            相关场景
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {related.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition hover:border-brand-300 hover:shadow-card"
              >
                <span className="text-sm font-semibold text-slate-900 transition group-hover:text-brand-700">
                  {s.crumb}
                </span>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {s.description}
                </p>
                <span className="mt-2 inline-block text-xs font-medium text-brand-600">
                  去看看 →
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-slate-400">
            更多用法见
            <Link href="/" className="mx-1 text-brand-600 underline-offset-2 hover:underline">
              {SITE.name} 首页
            </Link>
            ，或在
            <a
              href={SITE.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 text-brand-600 underline-offset-2 hover:underline"
            >
              GitHub
            </a>
            查看本项目源码。
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
