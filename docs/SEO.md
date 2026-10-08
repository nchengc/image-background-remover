# SEO 与 Google AdSense 合规梳理

> 版本 v1.0 · 2026-10-09 · 站点：https://image-background-remover-259.pages.dev
> 目标：① 提升自然搜索可见性 ② 满足 **Google AdSense / Google Ads** 的站点政策要求，随时可提交审核

---

## 一、改造前的问题清单（审计结果）

| # | 问题 | 影响 | 状态 |
|---|---|---|---|
| 1 | 无 `canonical`，多域名/多路径会分散权重 | 重复内容 | ✅ 已修 |
| 2 | 无 `robots.txt`、无 `sitemap.xml` | 爬虫效率低、收录慢 | ✅ 已修 |
| 3 | 无站点图标（favicon） | 搜索结果/书签无品牌标识 | ✅ 已修（`app/icon.svg`） |
| 4 | 无结构化数据 | 拿不到富媒体结果（FAQ 展开等） | ✅ 已修（WebSite / Organization / WebApplication / FAQPage） |
| 5 | 无 Open Graph / Twitter Card | 分享出去是裸链接 | ✅ 已修 |
| 6 | 无 `robots` 元指令、`max-image-preview` 未声明 | 图片结果缩略图受限 | ✅ 已修 |
| 7 | **无隐私政策页** | **AdSense 审核硬性缺失，直接拒审** | ✅ 已修 |
| 8 | 无使用条款、关于、联系页 | 站点可信度不足，审核减分 | ✅ 已修 |
| 9 | 无 `ads.txt` | 无法声明授权发布商 | ✅ 占位已建（待填发布商 ID） |
| 10 | 无联系方式入口 | 审核要求站点可联系 | ✅ 已修（GitHub Issues 为主） |
| 11 | 图片无 `width/height`、无懒加载 | CLS 抖动、首屏加载慢 | ✅ 已修 |
| 12 | 无 404 页 | 死链体验差 | ✅ 已修 |
| 13 | 无 Search Console 验证位 | 无法提交收录 | ✅ 预留环境变量 |

---

## 二、已落地的技术 SEO

### 2.1 元数据（`app/layout.tsx`）
- `metadataBase` + `alternates.canonical`：统一绝对地址，杜绝重复内容
- `title` 模板（`%s · BgRemover`）+ 分页面标题
- `description` / `keywords` / `applicationName`
- `robots`：`index, follow`；`googleBot.max-image-preview: large`
- Open Graph（`og:title/description/url/image/image:width/locale/siteName`）
- Twitter Card：`summary_large_image`
- `viewport.themeColor`、`lang="zh-CN"`

### 2.2 结构化数据（JSON-LD）
| 位置 | 类型 | 作用 |
|---|---|---|
| 首页 | `WebSite` | 站点实体、站内搜索候选 |
| 首页 | `Organization` | 品牌实体 |
| 首页 | `WebApplication` | 工具属性、免费声明、功能列表、截图 |
| FAQ 区 | `FAQPage` | 搜索结果中直接展开问答（富媒体结果） |

### 2.3 抓取与索引
- `public/robots.txt`：`User-agent: * / Allow: /` + Sitemap 指向
- `public/sitemap.xml`：5 个页面，含 `lastmod` / `changefreq` / `priority`
- `app/not-found.tsx`：404 页带回首页与直达工具入口

### 2.4 性能与体验（影响排名的 Core Web Vitals）
- 展示图补 `width` / `height`，从布局上消除 CLS
- 首屏外图片 `loading="lazy"` + `decoding="async"`
- 广告位容器预留 `min-height`，广告加载不顶动页面
- 全站静态导出（Cloudflare CDN 边缘分发），无服务端渲染等待

---

## 三、AdSense / Google Ads 合规准备

### 3.1 已补齐的必备页面
| 页面 | 路径 | 关键内容 |
|---|---|---|
| 隐私政策 | `/privacy` | 图片不存储承诺；Cookie 说明；**第三方（含 Google）使用 DoubleClick DART Cookie 投放广告**；退出入口（`adssettings.google.com`、`aboutads.info`）；第三方处理方 remove.bg；儿童隐私；政策更新；联系方式 |
| 使用条款 | `/terms` | 服务说明、免费额度与限制、可接受使用规范、知识产权、免责声明 |
| 关于我们 | `/about` | 定位、三条原则、技术架构、开源仓库 |
| 联系我们 | `/contact` | GitHub Issues 主入口、邮件（配置后显示）、权利投诉、响应时间 |

页脚已加入四页入口（审核会检查政策页是否可达）。

### 3.2 广告接入（已预埋，未启用）
`components/AdSlot.tsx` 的行为：

- **未配置发布商 ID 时返回 `null`** —— 不留空广告框，不会因「空白广告位」被判低质量
- 配置后自动渲染 `ins.adsbygoogle` 并推送队列
- 容器预留 `min-height` 防 CLS
- 非生产环境自动加 `data-ad-test="on"`，避免开发期误点产生无效流量
- 广告脚本仅在配置后加载（`next/script`，`afterInteractive`，不阻塞首屏）

首页已预留两个广告位：效果展示下方、使用步骤与常见问题之间。

---

## 四、上线前待办（需你操作的部分）

> 以下步骤都有明确顺序，建议按序完成。

### 4.1 换自定义域名（强烈建议）
`*.pages.dev` 是 Cloudflare 的项目子域，AdSense 通常**不接受子域托管类域名**作为主站申请。
1. 在 Cloudflare Pages 项目 → 自定义域 → 绑定你自己的域名
2. 构建环境变量设置 `NEXT_PUBLIC_SITE_URL=https://你的域名`
3. 同步修改 `public/robots.txt` 与 `public/sitemap.xml` 里的域名（这两个是静态文件，不读环境变量）
4. 重新部署

### 4.2 配置联系邮箱
- 构建环境变量 `NEXT_PUBLIC_CONTACT_EMAIL=你的邮箱`
- 未配置时联系页会显示「邮件联系方式正在配置中」，不影响审核但不理想

### 4.3 提交收录
1. [Google Search Console](https://search.google.com/search-console) 添加站点
2. 拿到验证码后设置 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
3. 重新部署 → 完成验证 → 在「站点地图」提交 `https://你的域名/sitemap.xml`
4. 「网址检查」逐个提交首页与四个政策页，请求编入索引

### 4.4 申请 AdSense（建议在收录稳定后）
1. 申请并过审
2. 拿到发布商 ID（`pub-xxxxxxxxxxxxxxxx`）
3. **启用 `public/ads.txt`**：把 `pub-0000000000000000` 换成真实 ID 并去掉行首 `#`
4. 在 AdSense 后台创建两个广告单元，拿到广告单元 ID
5. 构建环境变量：
   - `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx`
   - `NEXT_PUBLIC_AD_SLOT_HOME_MID=广告单元ID1`
   - `NEXT_PUBLIC_AD_SLOT_HOME_BOTTOM=广告单元ID2`
6. 重新部署，广告即上线（无需改代码）

### 4.5 内容侧加分项（非硬性，但影响审核与排名）
- 增加「使用教程」「抠图技巧」等原创长文页，提升站点内容厚度
- 博客型内容注意：AdSense 对「内容稀薄站点」审核严格，宁缺毋滥
- 定期用 PageSpeed Insights / Lighthouse 复查 LCP、CLS、INP

---

## 五、环境变量总表

| 变量 | 用途 | 未配置时 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | canonical / OG / sitemap 域名 | 回退 `https://image-background-remover-259.pages.dev` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | 联系页邮箱 | 不展示邮箱入口 |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console 验证 | 不输出验证标签 |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | AdSense 发布商 ID | 广告脚本与广告位均不渲染 |
| `NEXT_PUBLIC_AD_SLOT_HOME_MID` | 首页中部广告单元 | 该位置不渲染 |
| `NEXT_PUBLIC_AD_SLOT_HOME_BOTTOM` | 首页下部广告单元 | 该位置不渲染 |

> 在 Cloudflare Pages → 项目 → 设置 → 环境变量和机密 中添加。
> 注意：变量名必须以 `NEXT_PUBLIC_` 开头，否则静态导出时不会被内联进前端产物。

---

## 六、验证记录（2026-10-09）

- 类型检查：`tsc --noEmit` 零错误
- 本地：首页 / 隐私 / 条款 / 关于 / 联系 = 200；不存在路径 = 404（走自定义 404 页）
- `robots.txt` / `sitemap.xml` / `ads.txt` = 200
- 首页 HTML 已确认含：`canonical`、`og:*`、`twitter:card`、`robots`、favicon
- 首页 JSON-LD 已确认含：`WebSite`、`Organization`、`WebApplication`、`FAQPage`
- 隐私页已确认含：DoubleClick、`adssettings.google.com`、`aboutads.info`
