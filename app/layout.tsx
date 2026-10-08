import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "图片去背景 · 在线工具",
  description: "上传图片，秒得透明背景 PNG。图片仅在内存中处理，不存储，隐私友好。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
