import type { Metadata } from "next";
import PolicyLayout, { H2, P } from "@/components/PolicyLayout";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "联系我们",
  description:
    "联系 BgRemover：功能建议、问题反馈、侵权投诉与商务合作的处理方式与响应说明。",
  alternates: { canonical: `${SITE.url}/contact` },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <PolicyLayout
      title="联系我们"
      intro="无论是发现了问题、想提需求，还是涉及权利投诉，都欢迎通过下面的方式找到我们。"
    >
      <section>
        <H2>问题反馈与功能建议</H2>
        <P>
          本站是开源项目，最有效的反馈方式是在 GitHub 仓库提交 Issue——
          这样问题、讨论和解决过程都能被完整记录和追踪：
        </P>
        <P>
          <a
            href={`${SITE.repo}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            {SITE.repo}/issues
          </a>
        </P>
        <P className="text-sm text-slate-500">
          提交问题时，如果能附上出问题的图片格式与大小、浏览器版本、以及页面上的提示文字，
          会大幅加快我们定位问题的速度。
        </P>
      </section>

      <section>
        <H2>邮件联系</H2>
        {SITE.email ? (
          <P>
            你也可以通过邮件联系我们：
            <a
              href={`mailto:${SITE.email}`}
              className="mx-1 break-all text-brand-600 underline underline-offset-2 hover:text-brand-700"
            >
              {SITE.email}
            </a>
          </P>
        ) : (
          <P>
            邮件联系方式正在配置中。在此之前，请优先使用上面 GitHub Issues 的方式与我们联系。
          </P>
        )}
      </section>

      <section>
        <H2>权利投诉</H2>
        <P>
          如果你认为本站上的内容侵犯了你的合法权益，请通过上述方式联系我们，
          并在说明中提供：权利归属证明、涉嫌侵权内容的具体位置、以及你的联系方式。
          我们会在核实后尽快处理。
        </P>
      </section>

      <section>
        <H2>响应时间</H2>
        <P>
          本站由个人维护，我们通常会在数个工作日内回复，但不承诺固定的响应时限，
          感谢你的理解。
        </P>
      </section>
    </PolicyLayout>
  );
}
