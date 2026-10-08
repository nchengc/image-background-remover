/**
 * 站点级常量：SEO 元数据、结构化数据、站点地图、页脚政策链接统一从这里取值。
 *
 * 换成自定义域名后，构建时设置环境变量即可，无需改代码：
 *   NEXT_PUBLIC_SITE_URL=https://your-domain.com
 *   NEXT_PUBLIC_CONTACT_EMAIL=you@example.com
 *   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-xxxxxxxxxxxxxxxx
 */
const DEFAULT_URL = "https://image-background-remover-259.pages.dev";

export const SITE = {
  name: "BgRemover",
  nameZh: "图片去背景",
  /** 站点根地址（不带结尾斜杠），用于 canonical / sitemap / OG */
  url: (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_URL).replace(/\/$/, ""),
  description:
    "在线图片去背景工具：上传图片，AI 自动识别主体，秒得透明背景 PNG。图片仅在内存中处理，不落盘、不存储，免注册即用。",
  /** 项目仓库，同时作为公开的联系方式入口 */
  repo: "https://github.com/nchengc/image-background-remover",
  /** 联系邮箱：未配置时不展示邮箱入口（避免展示无法接收的假地址） */
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  /** AdSense 发布商 ID（ca-pub-xxxxxxxxxxxxxxxx），未配置时广告位不渲染 */
  adsenseClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "",
  /** 各广告位对应的广告单元 ID，未配置则对应位置不渲染广告 */
  adSlots: {
    homeMid: process.env.NEXT_PUBLIC_AD_SLOT_HOME_MID || "",
    homeBottom: process.env.NEXT_PUBLIC_AD_SLOT_HOME_BOTTOM || "",
  },
  /** 政策类文档的最后更新日期，sitemap 与页面同步使用 */
  updatedAt: "2026-10-09",
  locale: "zh_CN",
} as const;

/** 拼绝对路径，避免各处手写 URL 出现漏斜杠 */
export function absUrl(path: string): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** 需要被搜索引擎收录的页面清单（同时用于 sitemap 与页脚） */
export const PAGES = [
  { path: "/", title: "首页 · 在线图片去背景", priority: "1.0", changefreq: "weekly" },
  { path: "/about", title: "关于我们", priority: "0.6", changefreq: "monthly" },
  { path: "/privacy", title: "隐私政策", priority: "0.5", changefreq: "yearly" },
  { path: "/terms", title: "使用条款", priority: "0.5", changefreq: "yearly" },
  { path: "/contact", title: "联系我们", priority: "0.5", changefreq: "yearly" },
] as const;
