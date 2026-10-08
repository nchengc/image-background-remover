import type { Metadata } from "next";
import PolicyLayout, { H2, P } from "@/components/PolicyLayout";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "关于我们",
  description:
    "BgRemover 是一个免注册、免安装的在线图片去背景工具：图片仅在内存中处理、不落盘不存储，输出带透明通道的 PNG。",
  alternates: { canonical: `${SITE.url}/about` },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return (
    <PolicyLayout title="关于我们" intro={`${SITE.name} 想解决的问题很简单：把「抠图」这件小事，做到不用装软件、不用注册、也不必担心隐私。`}>
      <section>
        <H2>我们是谁</H2>
        <P>
          {SITE.name} 是一个轻量级的在线图片去背景工具，面向电商卖家、设计师、
          内容创作者以及任何偶尔需要「把主体抠出来」的普通用户。
          它不需要下载安装，也不需要注册账号——打开网页、上传图片、下载结果，三步完成。
        </P>
      </section>

      <section>
        <H2>我们坚持的三条原则</H2>
        <ul className="ml-5 list-disc space-y-3">
          <li>
            <strong className="font-semibold text-slate-800">隐私优先</strong>
            ：图片仅在服务器内存中转发处理，不写入磁盘、不入库、不留副本，处理完立即释放。
            这是我们选择「内存转发」架构而非「先上传存储再处理」的原因。
          </li>
          <li>
            <strong className="font-semibold text-slate-800">零门槛</strong>
            ：免注册、免安装、无需绑定支付方式，每月 50 张免费额度，随用随走。
          </li>
          <li>
            <strong className="font-semibold text-slate-800">结果诚实</strong>
            ：免费档位会把输出限制在约 25 万像素，我们选择在页面上明确告知，
            而不是让你下载后才发现图片变小了。
          </li>
        </ul>
      </section>

      <section>
        <H2>技术架构</H2>
        <P>
          前端使用 Next.js 构建并静态导出；去背景请求经由同源的边缘函数代理转发给
          remove.bg，密钥只保存在服务端环境变量中，不会暴露给浏览器；
          整个链路在 Cloudflare 的全球网络上运行，图片全程不落盘。
        </P>
      </section>

      <section>
        <H2>开源</H2>
        <P>
          本项目的源码公开托管在 GitHub，欢迎查阅实现细节、提出建议或提交改进：
        </P>
        <P>
          <a
            href={SITE.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            {SITE.repo}
          </a>
        </P>
      </section>
    </PolicyLayout>
  );
}
