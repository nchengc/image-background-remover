import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SITE, absUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  // metadataBase 让 openGraph / canonical 里的相对路径能解析成绝对地址
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} · 一键去除图片背景，秒得透明 PNG`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "去背景",
    "抠图",
    "在线抠图",
    "透明背景",
    "透明 PNG",
    "图片背景消除",
    "remove background",
    "background remover",
  ],
  authors: [{ name: SITE.name, url: SITE.repo }],
  creator: SITE.name,
  publisher: SITE.name,
  alternates: { canonical: absUrl("/") },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large", // 让 Google 搜索/图片结果展示大图预览
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: absUrl("/"),
    title: `${SITE.name} · 一键去除图片背景`,
    description:
      "上传图片，AI 自动识别主体并抠出，秒得透明背景 PNG。图片仅在内存中处理，不存储。",
    images: [
      {
        url: absUrl("/demo/object-after.png"),
        width: 500,
        height: 500,
        alt: "去背景效果示例：透明背景的产品图",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} · 一键去除图片背景`,
    description: "上传图片，AI 自动识别主体并抠出，秒得透明背景 PNG。免注册即用。",
    images: [absUrl("/demo/object-after.png")],
  },
  // 通过 Google Search Console 验证后，构建时设置 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION 即可
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
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
        {/* 仅当配置了 AdSense 发布商 ID 时才加载广告脚本 */}
        {SITE.adsenseClient ? (
          <Script
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}`}
          />
        ) : null}
      </body>
    </html>
  );
}
