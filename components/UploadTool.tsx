/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "processing" | "done" | "error";

/** remove.bg 单张上传上限约 10MB，超了直接拒绝，省一次无谓往返 */
const MAX_BYTES = 10 * 1024 * 1024;

/** 处理中的分阶段文案（仅作进度感知，非真实阶段） */
const STAGE_MESSAGES = [
  "正在上传图片…",
  "AI 正在识别画面主体…",
  "正在抠取主体、分离背景…",
  "正在生成透明 PNG…",
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** 用 Image 读取图片真实像素尺寸 */
function readSize(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(`${img.naturalWidth} × ${img.naturalHeight}`);
    img.onerror = () => resolve("—");
    img.src = src;
  });
}

export default function UploadTool() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string>("");
  const [fileSizePx, setFileSizePx] = useState<string>("—");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSizePx, setResultSizePx] = useState<string>("—");
  const [resultBytes, setResultBytes] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearAll = useCallback(() => {
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFileUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    clearAll();
    setFile(null);
    setFileSize("");
    setFileSizePx("—");
    setResultSizePx("—");
    setResultBytes("");
    setStatus("idle");
    setErrorMsg("");
    setStage(0);
  }, [clearAll]);

  const processFile = useCallback(
    async (f: File) => {
      clearAll();
      setFile(f);
      setFileSize(formatBytes(f.size));
      setFileUrl(URL.createObjectURL(f));
      setErrorMsg("");
      setResultSizePx("—");
      setResultBytes("");
      readSize(URL.createObjectURL(f)).then((s) => {
        setFileSizePx(s);
      });

      if (f.size > MAX_BYTES) {
        setErrorMsg(
          `图片过大（${formatBytes(f.size)}），remove.bg 单张上限约 10MB，请压缩后再试`
        );
        setStatus("error");
        return;
      }

      setStatus("processing");
      setStage(0);
      const timer = setInterval(
        () => setStage((s) => (s + 1) % STAGE_MESSAGES.length),
        1400
      );

      try {
        const fd = new FormData();
        fd.append("image", f, f.name || "image.png");
        const resp = await fetch("/api/remove-bg", { method: "POST", body: fd });
        if (!resp.ok) {
          let msg = `请求失败（${resp.status}）`;
          try {
            const j = (await resp.json()) as { error?: string };
            if (j?.error) msg = j.error;
          } catch {
            /* 保留默认文案 */
          }
          throw new Error(msg);
        }
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setResultBytes(formatBytes(blob.size));
        readSize(url).then(setResultSizePx);
        setStatus("done");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "处理失败，请重试");
        setStatus("error");
      } finally {
        clearInterval(timer);
      }
    },
    [clearAll]
  );

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) processFile(f);
  };

  // 支持 Ctrl/Cmd+V 直接粘贴剪贴板图片
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/")
      );
      const f = item?.getAsFile();
      if (f) processFile(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processFile]);

  const downloadName =
    (file?.name?.replace(/\.[^.]+$/, "") || "image") + "-nobg.png";

  return (
    <section id="tool" className="scroll-mt-20 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <span className="section-kicker">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            在线工具
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            上传图片，即刻处理
          </h2>
        </div>

        <div className="glass rounded-3xl p-4 sm:p-8">
          {/* ---------- 空态：上传 / 拖拽 / 粘贴 ---------- */}
          {status === "idle" && (
            <div
              role="button"
              tabIndex={0}
              aria-label="上传图片"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`group flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition sm:p-16 ${
                dragOver
                  ? "scale-[1.01] border-brand-500 bg-brand-50/80"
                  : "border-slate-300 bg-white/70 hover:border-brand-400 hover:bg-brand-50/40"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onSelect}
              />
              <div className="relative">
                <div className="absolute inset-0 -z-10 rounded-full bg-brand-200/50 blur-2xl transition group-hover:bg-brand-300/60" />
                <svg
                  className="h-14 w-14 text-brand-500 transition group-hover:-translate-y-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              <p className="mt-5 text-lg font-semibold text-slate-800">
                点击选择、拖拽图片到这里
              </p>
              <p className="mt-2 text-sm text-slate-500">
                或直接按 <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-600">Ctrl</kbd>
                {" + "}
                <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs text-slate-600">V</kbd>
                {" "}粘贴剪贴板图片
              </p>
              <p className="mt-4 text-xs text-slate-400">
                支持 PNG / JPG / WebP 等常见格式 · 单张 ≤ 10MB
              </p>
            </div>
          )}

          {/* ---------- 处理中 ---------- */}
          {status === "processing" && (
            <div className="flex w-full flex-col items-center rounded-2xl border border-slate-200 bg-white/80 p-10 sm:p-14">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 animate-spin-slow rounded-full border-4 border-brand-100" />
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brand-600" />
              </div>
              <p className="mt-6 text-base font-semibold text-slate-800">
                {STAGE_MESSAGES[stage]}
              </p>
              <p className="mt-1.5 text-xs text-slate-400">
                {file?.name} · {fileSize}
              </p>
              {/* 进度条（ shimmer 动效） */}
              <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-brand-500 via-violet-500 to-brand-500" />
              </div>
              <button
                onClick={reset}
                className="mt-7 text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              >
                取消并返回
              </button>
            </div>
          )}

          {/* ---------- 结果：原图 / 结果对比 ---------- */}
          {status === "done" && resultUrl && (
            <div className="w-full">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* 原图 */}
                <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex h-56 items-center justify-center bg-slate-50 p-3 sm:h-64">
                    {fileUrl && (
                      <img
                        src={fileUrl}
                        alt="原图"
                        className="max-h-full max-w-full rounded-lg object-contain"
                      />
                    )}
                  </div>
                  <figcaption className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs">
                    <span className="font-semibold text-slate-700">原图</span>
                    <span className="text-slate-400">
                      {fileSizePx} · {fileSize}
                    </span>
                  </figcaption>
                </figure>

                {/* 结果（棋盘格示意透明） */}
                <figure className="overflow-hidden rounded-2xl border border-brand-200 bg-white">
                  <div className="checkerboard flex h-56 items-center justify-center p-3 sm:h-64">
                    <img
                      src={resultUrl}
                      alt="去背景结果"
                      className="max-h-full max-w-full rounded-lg object-contain drop-shadow-md"
                    />
                  </div>
                  <figcaption className="flex items-center justify-between border-t border-brand-100 bg-brand-50/60 px-4 py-2.5 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-brand-700">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      透明背景
                    </span>
                    <span className="text-brand-600/70">
                      {resultSizePx} · {resultBytes}
                    </span>
                  </figcaption>
                </figure>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href={resultUrl}
                  download={downloadName}
                  className="flex-1 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-3.5 text-center text-sm font-semibold text-white shadow-glow transition hover:opacity-90 active:scale-95"
                >
                  ⬇ 下载 {downloadName}
                </a>
                <button
                  onClick={reset}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                >
                  换一张
                </button>
              </div>

              <p className="mt-4 text-center text-xs text-slate-400">
                免费额度下 remove.bg 会把输出限制在约 25 万像素（如 577×433），原图更大时会被等比缩小
              </p>
            </div>
          )}

          {/* ---------- 失败 ---------- */}
          {status === "error" && (
            <div className="w-full rounded-2xl border border-red-200 bg-red-50/80 p-8 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium leading-relaxed text-red-700">{errorMsg}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                {file && (
                  <button
                    onClick={() => processFile(file)}
                    className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-95"
                  >
                    重试
                  </button>
                )}
                <button
                  onClick={reset}
                  className="rounded-xl border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
                >
                  重新上传
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
