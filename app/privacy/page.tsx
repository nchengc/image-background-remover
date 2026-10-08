import type { Metadata } from "next";
import PolicyLayout, { H2, P } from "@/components/PolicyLayout";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "隐私政策",
  description:
    "BgRemover 隐私政策：说明我们如何处理图片、使用哪些 Cookie、第三方（含 Google）如何投放广告，以及你如何选择退出个性化广告。",
  alternates: { canonical: `${SITE.url}/privacy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <PolicyLayout
      title="隐私政策"
      intro={`本政策说明 ${SITE.name}（下称「本站」）在你使用在线图片去背景服务时如何处理信息。我们使用本服务即表示你已阅读并同意本政策。`}
      updated={SITE.updatedAt}
    >
      <section>
        <H2>一、我们如何处理你上传的图片</H2>
        <P>
          这是本站最重要的承诺：你上传的图片
          <strong className="font-semibold text-slate-800">不会被保存</strong>
          。图片通过加密连接（HTTPS）上传后，仅在服务器内存中转发给去背景技术进行处理，
          处理完成即刻返回结果并从内存中释放。我们
          <strong className="font-semibold text-slate-800">
            不写入磁盘、不建立图片库、不保留副本
          </strong>
          ，也不会将你的图片用于模型训练或其他用途。
        </P>
        <P>
          为保障服务稳定与安全，我们的基础设施提供方（Cloudflare）可能会在处理过程中产生常规的
          网络日志（如请求时间、IP、状态码），这些日志由提供方按其自身策略短期保留。
        </P>
      </section>

      <section>
        <H2>二、我们收集的信息</H2>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong className="font-semibold text-slate-800">你主动提供的信息</strong>
            ：仅为你上传的图片文件本身，不要求注册账号，也不收集姓名、手机号等身份信息。
          </li>
          <li>
            <strong className="font-semibold text-slate-800">自动收集的技术信息</strong>
            ：浏览器类型与版本、操作系统、来源页面、访问时间等，用于排查故障与优化体验。
          </li>
          <li>
            <strong className="font-semibold text-slate-800">Cookie 与类似技术</strong>
            ：用于记住你的偏好、统计访问情况，以及（如启用广告后）投放广告。
          </li>
        </ul>
      </section>

      <section>
        <H2>三、Cookie 与第三方广告（Google）</H2>
        <P>
          本站可能会接入 Google 提供的广告服务（Google AdSense）。Google
          等第三方供应商会使用 Cookie（包括 Google 的 DoubleClick DART Cookie）
          根据你访问本站及其他网站的记录来投放广告。
        </P>
        <P>
          <strong className="font-semibold text-slate-800">你的选择：</strong>
          你可以访问
          <a
            href="https://adssettings.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-1 text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            Google 广告设置
          </a>
          选择退出基于兴趣的个性化广告；也可以访问
          <a
            href="https://www.aboutads.info/choices/"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-1 text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            aboutads.info
          </a>
          了解并选择退出第三方供应商的 Cookie 投放。
        </P>
        <P>
          你也可以在浏览器中禁用 Cookie，但这可能导致本站的部分功能无法正常使用。
          更多 Google 如何处理广告数据的说明，请参阅
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-1 text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            Google 广告隐私政策
          </a>
          。
        </P>
      </section>

      <section>
        <H2>四、去背景能力的第三方处理方</H2>
        <P>
          本站的去背景能力由 remove.bg 提供。为完成处理，你的图片会被传输至该服务的接口，
          并依照其隐私政策进行处理与短期留存。我们选择该服务时已确认其不在处理结束后长期保留用户图片。
        </P>
      </section>

      <section>
        <H2>五、信息共享</H2>
        <P>
          除下列情形外，我们不会向任何第三方出售、出租或共享你的个人信息：
        </P>
        <ul className="ml-5 list-disc space-y-2">
          <li>为完成去背景处理，向技术处理方传输图片（见第四条）；</li>
          <li>依据法律法规要求，或为保护本站及用户合法权益的必要披露；</li>
          <li>经你明确同意的其他情形。</li>
        </ul>
      </section>

      <section>
        <H2>六、儿童隐私</H2>
        <P>
          本站面向一般用户，不会有意收集 13 岁以下儿童的个人信息。
          若你是监护人并发现被监护人向我们提供了信息，请通过下方方式联系我们，我们会尽快删除。
        </P>
      </section>

      <section>
        <H2>七、政策更新</H2>
        <P>
          本站可能随时更新本政策，更新后的版本将在本页公布并修改「最后更新」日期。
          重大变更时我们会在首页显著位置提示。
        </P>
      </section>

      <section>
        <H2>八、联系我们</H2>
        <P>
          如对本政策有任何疑问，请通过
          <a
            href="/contact"
            className="mx-1 text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            联系我们
          </a>
          页面提供的方式与我们取得联系。
        </P>
      </section>
    </PolicyLayout>
  );
}
