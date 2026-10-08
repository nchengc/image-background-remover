"use client";

import { useEffect } from "react";
import { SITE } from "@/lib/site";

/**
 * Google AdSense 广告位。
 *
 * 设计要点：
 * 1. 未配置 NEXT_PUBLIC_ADSENSE_CLIENT 时直接返回 null —— 不留空白占位、不加载第三方脚本，
 *    既不影响首屏体验，也不会在提交 AdSense 审核前出现"空广告框"（这是常见的审核减分项）。
 * 2. 容器预留 minHeight，广告加载后不会把下方内容顶走，避免 CLS（Core Web Vitals 硬指标）。
 * 3. 非生产环境自动加 data-ad-test="on"，避免开发期点击产生无效流量。
 */
export default function AdSlot({
  slot,
  minHeight = 120,
  className = "",
}: {
  /** AdSense 广告单元 ID（在 AdSense 后台「广告单元」里创建后获得） */
  slot: string;
  /** 预留高度，单位 px */
  minHeight?: number;
  className?: string;
}) {
  const enabled = Boolean(SITE.adsenseClient && slot);

  useEffect(() => {
    if (!enabled) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // 重复推送、脚本被拦截等情况静默忽略，不影响页面主功能
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className={`mx-auto w-full overflow-hidden ${className}`}
      style={{ minHeight }}
      aria-hidden="true"
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={SITE.adsenseClient}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        {...(process.env.NODE_ENV !== "production" ? { "data-ad-test": "on" } : {})}
      />
    </div>
  );
}
