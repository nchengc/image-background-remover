/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useRef, useState } from "react";

/** 拖动对比滑块：左侧原图，右侧去背景结果（棋盘格衬底示意透明） */
function CompareSlider({
  before,
  after,
  name,
}: {
  before: string;
  after: string;
  name: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [pos, setPos] = useState(50);

  const update = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  return (
    <figure className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-glow">
      <div
        ref={ref}
        role="slider"
        aria-label={`${name} 前后对比滑块`}
        aria-valuenow={Math.round(pos)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
          if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
        }}
        className="relative aspect-square w-full cursor-ew-resize touch-none select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) update(e.clientX);
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {/* 左：原图 */}
        <img
          src={before}
          alt={`${name} 原图，带背景`}
          width={600}
          height={600}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* 右：去背景结果（棋盘格衬底） */}
        <div className="checkerboard absolute inset-0">
          <img
            src={after}
            alt={`${name} 去背景后的透明 PNG`}
            width={500}
            height={500}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover"
            style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
          />
        </div>

        {/* 分割线 + 手柄 */}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,.25)]"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </div>
        </div>

        {/* 角标 */}
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          原图
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-brand-600/90 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          透明 PNG
        </span>
      </div>
      <figcaption className="px-5 py-4 text-center text-sm font-semibold text-slate-700">
        {name}
      </figcaption>
    </figure>
  );
}

const DEMOS = [
  { name: "电商商品", before: "/demo/object-before.png", after: "/demo/object-after.png" },
  { name: "人物头像", before: "/demo/portrait-before.png", after: "/demo/portrait-after.png" },
  { name: "产品主图", before: "/demo/product-before.png", after: "/demo/product-after.png" },
];

export default function Showcase() {
  return (
    <section id="showcase" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <span className="section-kicker">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            效果展示
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            拖动滑块，看看抠图效果
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
            以下均为本站线上接口的真实输出（免费额度档位），左右拖动即可对比
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEMOS.map((d) => (
            <CompareSlider key={d.name} {...d} />
          ))}
        </div>
      </div>
    </section>
  );
}
