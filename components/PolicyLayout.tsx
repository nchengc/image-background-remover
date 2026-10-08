import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";

/** 政策类页面的统一外壳：面包屑 + 标题 + 更新时间 + 正文 + 底部互链 */
export default function PolicyLayout({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro: string;
  updated?: string;
  children: React.ReactNode;
}) {
  const others = [
    { href: "/about", label: "关于我们" },
    { href: "/privacy", label: "隐私政策" },
    { href: "/terms", label: "使用条款" },
    { href: "/contact", label: "联系我们" },
  ].filter((o) => !title.includes(o.label));

  return (
    <>
      <Header />
      <main className="px-4 py-12 sm:px-6">
        <article className="mx-auto max-w-3xl">
          {/* 面包屑：既是可用导航，也会被 Google 识别为 Breadcrumb */}
          <nav aria-label="面包屑" className="mb-6 text-xs text-slate-400">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-brand-600">
                  首页
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-slate-600">{title}</li>
            </ol>
          </nav>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{intro}</p>
          {updated && (
            <p className="mt-2 text-xs text-slate-400">最后更新：{updated}</p>
          )}

          <div className="mt-10 space-y-8 text-[15px] leading-7 text-slate-600">
            {children}
          </div>

          <hr className="my-10 border-slate-200" />

          <nav className="flex flex-wrap gap-3">
            {others.map((o) => (
              <Link
                key={o.href}
                href={o.href}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-600"
              >
                {o.label}
              </Link>
            ))}
          </nav>
        </article>
      </main>
      <Footer />
    </>
  );
}

/** 正文小标题 */
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-slate-900">{children}</h2>;
}

/** 正文段落 */
export function P({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-[15px] leading-7 text-slate-600 ${className}`}>{children}</p>
  );
}
