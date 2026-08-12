import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "去背景 - 上传图片，3 秒拿到透明 PNG",
  description:
    "免费在线图片去背景工具，支持 JPG/PNG/WEBP，拖拽上传，一键下载透明 PNG。图片仅在去背时上传，处理完即丢弃，不存储。",
};

/**
 * 根布局组件（服务端组件，不加 'use client'）。
 * 引入全局样式 globals.css，设置 lang="zh-CN" 与基础 body 样式。
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
