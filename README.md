# image-background-remover

零门槛在线图片去背景工具：上传图片即得到可下载的透明 PNG。
技术栈 **Next.js 14 (App Router) + Tailwind CSS 3 + TypeScript**，去背景由 **remove.bg API** 完成，部署到 **Cloudflare Pages**（经 `@cloudflare/next-on-pages`，原生 GitHub 集成）。

## 设计要点
- 图片仅在服务端**内存中转发** remove.bg，**不写磁盘、不存储**，符合隐私预期。
- remove.bg API Key 只存在于环境变量 / `.env.local`，不进代码、不提交仓库。
- 前端 `/api/remove-bg` 同源调用，无 CORS 问题。

## 本地运行
```bash
npm install
cp .env.local.example .env.local   # 填入 REMOVE_BG_API_KEY
npm run dev                        # http://localhost:3000
```
打开页面，点击/拖拽上传 PNG 或 JPG，即可得到透明 PNG 并下载（`<原名>-nobg.png`）。

## 部署到 Cloudflare Pages（原生 GitHub 集成，已启用）
在 Cloudflare 仪表盘完成一次 GitHub 授权后，Pages 项目已绑定 `nchengc/image-background-remover`，构建配置：

| 项 | 值 |
|---|---|
| 构建命令 | `npx @cloudflare/next-on-pages@1` |
| 构建输出目录 | `.vercel/output/static` |
| 生产分支 | `main` |

每次 `git push` 到 `main` 会自动触发构建部署。API 路由已声明 `runtime = "edge"`，符合 next-on-pages 要求。

环境变量需在 Pages 项目「设置 → 变量和机密」中配置 `REMOVE_BG_API_KEY`。

> 注意：`@cloudflare/next-on-pages` 固定为 `1.13.5`（更高版本要求 Next ≥14.3，与本项目 Next 14.2 不兼容），请勿随意升级。

## 说明
- remove.bg 免费额度 50 张/月，规模化需付费。
- 未配置 Key 或 remove.bg 调用失败时，前端会显示明确错误而非白屏。
