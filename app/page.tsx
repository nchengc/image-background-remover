import Header from "@/components/Header";
import Hero from "@/components/Hero";
import UploadTool from "@/components/UploadTool";
import Showcase from "@/components/Showcase";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import AdSlot from "@/components/AdSlot";
import JsonLd from "@/components/JsonLd";
import { SITE, absUrl } from "@/lib/site";

export default function Home() {
  return (
    <>
      {/* 站点 + 应用结构化数据，供 Google 搜索富媒体结果识别 */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": absUrl("/#website"),
              url: absUrl("/"),
              name: SITE.name,
              description: SITE.description,
              inLanguage: "zh-CN",
              publisher: { "@id": absUrl("/#organization") },
            },
            {
              "@type": "Organization",
              "@id": absUrl("/#organization"),
              name: SITE.name,
              url: absUrl("/"),
              description: `${SITE.name} 提供在线图片去背景服务`,
            },
            {
              "@type": "WebApplication",
              "@id": absUrl("/#app"),
              name: `${SITE.name} 图片去背景`,
              url: absUrl("/"),
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "任意（浏览器）",
              browserRequirements: "需要现代浏览器（Chrome / Edge / Firefox / Safari）",
              inLanguage: "zh-CN",
              isAccessibleForFree: true,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "CNY",
                description: "每月 50 张免费额度",
              },
              featureList: [
                "上传图片自动去除背景",
                "输出带透明通道的 PNG",
                "图片仅在内存中处理，不存储",
                "免注册、免安装",
              ],
              screenshot: absUrl("/demo/object-after.png"),
            },
          ],
        }}
      />

      <Header />
      <main>
        <Hero />
        <UploadTool />
        <Showcase />
        {/* 广告位 A：效果展示下方（未配置 AdSense 时自动不渲染） */}
        <div className="px-4 sm:px-6">
          <AdSlot slot={SITE.adSlots.homeMid} minHeight={120} className="max-w-3xl" />
        </div>
        <Features />
        <HowItWorks />
        {/* 广告位 B：使用步骤与常见问题之间 */}
        <div className="px-4 sm:px-6">
          <AdSlot slot={SITE.adSlots.homeBottom} minHeight={120} className="max-w-3xl" />
        </div>
        <Faq />
      </main>
      <Footer />
    </>
  );
}
