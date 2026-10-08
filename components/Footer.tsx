import Link from "next/link";
import { LogoMark } from "./Header";

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

        <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-center text-sm sm:text-left">
          <a href="#tool" className="text-slate-500 transition hover:text-brand-600">在线工具</a>
          <a href="#showcase" className="text-slate-500 transition hover:text-brand-600">效果展示</a>
          <a href="#features" className="text-slate-500 transition hover:text-brand-600">服务能力</a>
          <a href="#faq" className="text-slate-500 transition hover:text-brand-600">常见问题</a>
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
