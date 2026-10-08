import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "页面不存在",
  description: "你访问的页面不存在或已被移动。",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-md text-center">
          <p className="text-7xl font-extrabold text-gradient">404</p>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">页面走丢了</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            你访问的页面不存在或已被移动。不如回到首页，直接试试去背景？
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-2xl bg-gradient-to-r from-brand-600 to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 active:scale-95"
            >
              回到首页
            </Link>
            <Link
              href="/#tool"
              className="rounded-2xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-slate-700 shadow-soft transition hover:bg-slate-50 active:scale-95"
            >
              直接去背景
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
