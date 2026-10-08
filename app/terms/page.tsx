import type { Metadata } from "next";
import PolicyLayout, { H2, P } from "@/components/PolicyLayout";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "使用条款",
  description:
    "BgRemover 使用条款：服务说明、免费额度、可接受使用规范、知识产权归属与免责声明。",
  alternates: { canonical: `${SITE.url}/terms` },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <PolicyLayout
      title="使用条款"
      intro={`欢迎使用 ${SITE.name}。以下条款构成你与本站之间关于使用本服务的约定，请在使用前仔细阅读。`}
      updated={SITE.updatedAt}
    >
      <section>
        <H2>一、服务说明</H2>
        <P>
          {SITE.name} 是一个在线图片去背景工具。你上传图片后，我们通过第三方去背景技术
          自动识别画面主体并分离背景，输出带透明通道的 PNG 供你下载。
          服务以「现状」提供，我们不对处理结果的质量作任何保证——
          抠图效果取决于图片本身的主体清晰度、与背景的对比度等因素。
        </P>
      </section>

      <section>
        <H2>二、免费额度与限制</H2>
        <ul className="ml-5 list-disc space-y-2">
          <li>本站依托第三方服务，免费额度为每月 50 张，额度耗尽后需等待下月恢复或升级套餐。</li>
          <li>单张图片大小上限约 10MB，支持 PNG / JPG / WebP 等常见格式。</li>
          <li>
            免费档位下，输出图片的分辨率会被限制在约 25 万像素（例如 1600×1200
            的原图会等比缩小到约 577×433），这是上游服务的套餐限制。
          </li>
          <li>我们保留在必要时调整额度与限制的权利，重大调整会在首页公告。</li>
        </ul>
      </section>

      <section>
        <H2>三、你的权利与义务</H2>
        <P>
          你上传的图片应为你本人拥有权利或已获得合法授权的内容。
          使用本服务，即表示你确认不会上传以下任一内容：
        </P>
        <ul className="ml-5 list-disc space-y-2">
          <li>侵犯他人著作权、商标权、肖像权或其他合法权益的内容；</li>
          <li>违反中华人民共和国法律法规，或含有淫秽、暴力、恐怖、煽动性内容；</li>
          <li>含有病毒、恶意代码或以任何方式损害本站及他人系统的内容。</li>
        </ul>
        <P>
          因你上传的内容引发的纠纷、索赔或损失，由你自行承担；
          若因此给本站造成损失，你应承担相应赔偿责任。
        </P>
      </section>

      <section>
        <H2>四、知识产权</H2>
        <P>
          你上传图片的著作权归你或原权利人所有，本站不主张任何权利。
          本站的界面设计、标识、文案与代码归本站所有，未经许可不得复制、修改或用于商业用途。
        </P>
      </section>

      <section>
        <H2>五、免责声明</H2>
        <P>
          在法律允许的最大范围内，本站不对以下情形承担责任：
          因网络中断、第三方服务不可用、不可抗力导致的服务中断或延迟；
          因你自身操作或设备环境导致的数据损失；
          使用本服务产生的任何间接损失。
        </P>
      </section>

      <section>
        <H2>六、条款变更</H2>
        <P>
          我们可能不时修订本条款，修订后将在本页公布并更新「最后更新」日期。
          继续使用本服务即视为接受修订后的条款。
        </P>
      </section>
    </PolicyLayout>
  );
}
