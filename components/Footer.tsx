import Link from "next/link";
import { LogoMark } from "./Header";
import { SCENARIOS } from "@/lib/scenarios";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm text-center sm:text-left">
          <div className="flex items-center justify-center gap-2.5 sm:justify-start">
            <LogoMark className="h-7 w-7" />
            <span className="text-base font-bold text-slate-900">BgRemover</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            在线图片去背景工具。图片仅在内存中处理，不落盘、不存储。
          </p>
        </div>

        {/* 政策与关于页入口：AdSense 审核会检查站点是否提供这些内容 */}
        <nav
          aria-label="政策与关于"
          className="grid grid-cols-2 gap-x-12 gap-y-2 text-center text-sm sm:text-left"
        >
          <Link href="/about" className="text-slate-500 transition hover:text-brand-600">
            关于我们
          </Link>
          <Link href="/contact" className="text-slate-500 transition hover:text-brand-600">
            联系我们
          </Link>
          <Link href="/privacy" className="text-slate-500 transition hover:text-brand-600">
            隐私政策
          </Link>
          <Link href="/terms" className="text-slate-500 transition hover:text-brand-600">
            使用条款
          </Link>
        </nav>

        {/* 场景长尾页入口：全站内链，加快新页面被抓取与索引 */}
        <nav
          aria-label="使用场景"
          className="grid grid-cols-2 gap-x-12 gap-y-2 text-center text-sm sm:text-left"
        >
          {SCENARIOS.map((s) => (
            <Link
              key={s.slug}
              href={`/${s.slug}`}
              className="text-slate-500 transition hover:text-brand-600"
            >
              {s.crumb}
            </Link>
          ))}
          <Link href="/" className="text-slate-500 transition hover:text-brand-600">
            通用去背景
          </Link>
        </nav>

        <div className="text-center text-xs leading-relaxed text-slate-400 sm:text-right">
          <p>
            去背景能力由{" "}
            <a
              href="https://www.remove.bg"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
            >
              remove.bg
            </a>{" "}
            提供
          </p>
          <p className="mt-1">
            部署于{" "}
            <a
              href="https://pages.cloudflare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
            >
              Cloudflare Pages
            </a>
          </p>
          <p className="mt-3">© {new Date().getFullYear()} BgRemover</p>
        </div>
      </div>
    </footer>
  );
}
