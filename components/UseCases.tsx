import Link from "next/link";
import { SCENARIOS } from "@/lib/scenarios";

/**
 * 主题集群枢纽：首页 → 各场景长尾页的内链入口。
 *
 * 作用有二：
 * 1. 内链权重分配——场景页无外链入口会成为孤儿页，无从被抓取与排序；
 * 2. 锚文本覆盖长尾关键词——每个入口的可见文字即该页目标词。
 */
export default function UseCases() {
  return (
    <section id="usecases" className="scroll-mt-20 bg-slate-50/80 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <span className="section-kicker">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            使用场景
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            按你要做的事，选对应入口
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
            不同场景对背景、尺寸、格式的要求差别很大。下面每个入口都写了该场景的
            具体规范和避坑要点，照着做一次就能过。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((s) => (
            <Link
              key={s.slug}
              href={`/${s.slug}`}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card"
            >
              <h3 className="text-base font-bold text-slate-900 transition group-hover:text-brand-700">
                {s.crumb}
              </h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-500">
                {s.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                立即处理
                <span className="transition group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}

          {/* 兜底入口：不确定自己属于哪类，回首页工具 */}
          <Link
            href="/#tool"
            className="group flex flex-col justify-center rounded-2xl border border-dashed border-brand-300 bg-brand-50/40 p-5 transition hover:border-brand-400 hover:bg-brand-50"
          >
            <h3 className="text-base font-bold text-brand-900">其他图片</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-800/70">
              不属于上面任何一类也没关系，通用去背景工具支持 PNG、JPG、WebP
              等常见格式，单张 10MB 以内。
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
              用通用工具
              <span className="transition group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
