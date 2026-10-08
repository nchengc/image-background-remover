"use client";

import { useCallback, useRef, useState } from "react";

type Status = "idle" | "processing" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearResult = useCallback(() => {
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    clearResult();
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
  }, [clearResult]);

  const processFile = useCallback(
    async (f: File) => {
      clearResult();
      setFile(f);
      setStatus("processing");
      setErrorMsg("");
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
            /* ignore parse error, keep default msg */
          }
          throw new Error(msg);
        }
        const blob = await resp.blob();
        setResultUrl(URL.createObjectURL(blob));
        setStatus("done");
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "处理失败，请重试");
        setStatus("error");
      }
    },
    [clearResult]
  );

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) processFile(f);
  };

  const downloadName =
    (file?.name?.replace(/\.[^.]+$/, "") || "image") + "-nobg.png";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">图片去背景</h1>
        <p className="mt-2 text-sm text-slate-500">
          上传图片，秒得透明背景 PNG · 图片仅在内存中处理，不存储
        </p>
      </header>

      {status === "idle" && (
        <div
          role="button"
          tabIndex={0}
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
          className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition ${
            dragOver
              ? "border-indigo-500 bg-indigo-50"
              : "border-slate-300 bg-white hover:border-indigo-400"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={onSelect}
          />
          <svg
            className="h-12 w-12 text-slate-400"
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
          <p className="mt-4 text-base font-medium text-slate-700">
            点击选择 或 拖拽图片到此处
          </p>
          <p className="mt-1 text-xs text-slate-400">支持 PNG、JPG</p>
        </div>
      )}

      {status === "processing" && (
        <div className="flex w-full flex-col items-center rounded-2xl border border-slate-200 bg-white p-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="mt-4 text-sm text-slate-600">处理中…</p>
        </div>
      )}

      {status === "done" && resultUrl && (
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6">
          <div className="checkerboard flex items-center justify-center rounded-xl p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultUrl}
              alt="去背景结果"
              className="max-h-80 w-auto"
            />
          </div>
          <div className="mt-6 flex gap-3">
            <a
              href={resultUrl}
              download={downloadName}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
            >
              下载 PNG
            </a>
            <button
              onClick={reset}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              换一张
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">{errorMsg}</p>
          <div className="mt-4 flex gap-3">
            {file && (
              <button
                onClick={() => processFile(file)}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                重试
              </button>
            )}
            <button
              onClick={reset}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-white"
            >
              重新上传
            </button>
          </div>
        </div>
      )}

      <footer className="mt-10 text-xs text-slate-400">
        由 remove.bg 提供去背景能力 · 部署于 Cloudflare
      </footer>
    </main>
  );
}
