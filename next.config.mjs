/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages 原生部署：前端静态导出到 out/，
  // 去背景代理由 functions/api/remove-bg.ts（Pages Function）提供，
  // 密钥仅在服务端，图片内存转发、不落盘。
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
