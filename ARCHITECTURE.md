# bg-remover · 架构 Prompt（项目流程资产）

> 本文件是 Vibe Coding 流程的 Phase 4 产出：把"选架构 → 拆任务 → 落地"的所有决策收敛成一份可直接用于编码的约束。
> 后续任何一次 AI 辅助编码，都应以本文件为输入，避免架构漂移。
> 修订：MVP 阶段先用纯前端 @imgly 跑通流程；部署阶段改为 Cloudflare Pages Functions + remove.bg 同源代理（见第 4/5/10 节）。架构可在跑通 MVP 后按需演进。

## 1. 项目背景
做一个"图片去背景"网站，作为练手 / 验证想法的项目，同时沉淀一套可复用的项目流程。不追求一步到位，先跑通 MVP。

## 2. 目标用户
普通用户（非技术）：上传一张带背景的图片，得到透明背景的 PNG，能下载。

## 3. 核心需求（按优先级）
1. 上传 / 拖拽图片（PNG / JPG）
2. 浏览器本地去背景，输出透明 PNG
3. 展示结果 + 下载
4. 处理中状态 / 进度 / 失败重试

## 4. 架构设定
- 产品形态：**Web 网站**
- 架构模式：**前端 + Cloudflare Pages Functions 同源代理**（无独立服务器、无数据库；去背景在边缘函数内内存完成，不落盘）
- 运行环境：**Cloudflare Pages 静态托管 + 边缘函数**

## 5. 技术约束（含版本号）
- 语言：TypeScript 5.x
- 框架：React 18.3 + Vite 5.4
- 样式：Tailwind CSS 3.4
- 去背景核心：服务端调用 **remove.bg API**（密钥仅存 Cloudflare 环境变量，不进代码）；经 **Cloudflare Pages Functions** 同源代理，图片内存转发、不存储
- 部署：静态构建产物（`vite build` → `dist/`）

## 6. 非功能需求
- 性能：首次加载模型有几 MB~几十 MB 下载，之后单张处理在秒级
- 安全 / 隐私：图片经 Cloudflare 边缘函数内存处理，不落盘、不存储；remove.bg 仅用于本次去背景
- 兼容性：现代 Chromium / Firefox / Safari
- 可扩展：目录结构预留"多模型切换 / 批量处理 / 后端代理"扩展位

## 7. 实施计划（分阶段）
- 模块 1：项目骨架（Vite + React + TS + Tailwind，基础页面布局）
- 模块 2：核心去背景能力（`useRemoveBg` hook：加载模型、推理、进度）
- 模块 3：交互闭环（Uploader → 处理中 → ResultView，含下载 / 重试）
- 模块 4：样式打磨 + 本地跑通 + build 验证
- 模块 5（可选）：静态托管上线

## 8. 输出要求
每一步 AI 输出：可运行代码 + 简短说明 + 验证方式（dev / build / typecheck）。

## 9. 验收标准
- `npm run dev` 能起本地服务，页面可打开
- 上传图片后能在本地点"去背景"并得到透明 PNG
- `npm run build` 通过（tsc 无类型错误 + 产物生成）
- 下载的 PNG 背景透明

## 10. 限制条件（不要做什么）
- 不引入后端 / 数据库 / 用户系统
- 使用 remove.bg 免费额度（每月 50 张），超出按量计费；密钥只放 Cloudflare 环境变量 / .dev.vars，禁止写进代码或提交仓库
- 不过度设计（不做账号、批量、付费墙等）
- 不随意更换已锁定的技术栈（React+Vite+TS+Tailwind+@imgly）
- 不写超出 MVP 范围的文档
