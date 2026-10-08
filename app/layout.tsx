import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BgRemover · 一键去除图片背景，秒得透明 PNG",
    template: "%s · BgRemover",
  },
  description:
    "在线图片去背景工具：上传图片，AI 自动识别主体，秒得透明背景 PNG。图片仅在内存中处理，不落盘、不存储，免注册即用。",
  keywords: [
    "去背景",
    "抠图",
    "透明背景",
    "透明 PNG",
    "图片背景消除",
    "background remover",
  ],
  openGraph: {
    title: "BgRemover · 一键去除图片背景",
    description:
      "上传图片，AI 自动识别主体并抠出，秒得透明背景 PNG。图片仅在内存中处理，不存储。",
    type: "website",
    locale: "zh_CN",
    images: ["/demo/object-after.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-white text-slate-800 antialiased selection:bg-brand-200/70 selection:text-brand-900">
        {children}
      </body>
    </html>
  );
}
