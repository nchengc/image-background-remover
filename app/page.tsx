import Header from "@/components/Header";
import Hero from "@/components/Hero";
import UploadTool from "@/components/UploadTool";
import Showcase from "@/components/Showcase";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import UseCases from "@/components/UseCases";
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
            {
              "@type": "HowTo",
              "@id": absUrl("/#howto"),
              name: "如何在线去除图片背景",
              description:
                "上传图片，AI 自动识别主体并分离背景，几秒后下载带透明通道的 PNG。",
              inLanguage: "zh-CN",
              totalTime: "PT1M",
              supply: [{ "@type": "HowToSupply", name: "待去背景的图片" }],
              tool: [{ "@type": "HowToTool", name: "可联网的现代浏览器" }],
              step: [
                {
                  "@type": "HowToStep",
                  position: 1,
                  name: "上传图片",
                  text: "点击选择文件、拖拽到上传框，或直接 Ctrl+V 粘贴剪贴板里的截图。支持 PNG、JPG、WebP 等常见格式，单张不超过 10MB。",
                },
                {
                  "@type": "HowToStep",
                  position: 2,
                  name: "AI 自动抠图",
                  text: "云端模型识别画面主体并分离背景，全程在内存中完成，不落盘、不存储。",
                },
                {
                  "@type": "HowToStep",
                  position: 3,
                  name: "下载透明 PNG",
                  text: "棋盘格区域即透明区域，确认无误后一键导出 <原名>-nobg.png。",
                },
              ],
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
        {/* 主题集群枢纽：把内链权重导向各场景长尾页 */}
        <UseCases />
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
