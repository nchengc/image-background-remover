/* eslint-disable @next/next/no-img-element */
import { AuthButton } from "@/components/AuthButton";

/** 站点 Logo 标记（内联 SVG，无需资源文件） */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lg-logo" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="11" fill="url(#lg-logo)" />
      {/* 主体圆 + 抠掉的右上角（示意去背景） */}
      <circle cx="19" cy="22" r="9.5" fill="white" fillOpacity="0.95" />
      <path
        d="M27 8.5c3 1.6 4.9 4 5.6 7.2L26 13.2c-.3-1.9.2-3.5 1-4.7Z"
        fill="white"
        fillOpacity="0.55"
      />
      <circle cx="16" cy="19" r="3" fill="#6366f1" fillOpacity="0.35" />
    </svg>
  );
}

const NAV = [
  { href: "#tool", label: "在线工具" },
  { href: "#usecases", label: "使用场景" },
  { href: "#showcase", label: "效果展示" },
  { href: "#features", label: "服务能力" },
  { href: "#faq", label: "常见问题" },
];

/**
 * 场景落地页用的导航：这些页面上不存在首页的锚点区块，
 * 若沿用首页锚点会产生无效链接，因此改为指向真实页面的入口。
 */
const NAV_SCENARIO = [
  { href: "/#tool", label: "在线工具" },
  { href: "/#usecases", label: "全部场景" },
  { href: "/#faq", label: "常见问题" },
];

export default function Header({ variant = "home" }: { variant?: "home" | "scenario" }) {
  const items = variant === "scenario" ? NAV_SCENARIO : NAV;
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            BgRemover
            <span className="ml-1.5 hidden text-sm font-medium text-slate-400 sm:inline">
              图片去背景
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AuthButton />
          <a
            href="#tool"
            className="rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 active:scale-95"
          >
            立即去背景
          </a>
        </div>
      </div>
    </header>
  );
}
