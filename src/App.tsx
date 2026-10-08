import { useState } from "react";
import { Uploader } from "./components/Uploader";
import { StatusBlock } from "./components/StatusBlock";
import { ResultView } from "./components/ResultView";
import { useRemoveBg } from "./lib/useRemoveBg";

export default function App() {
  const { status, resultUrl, error, process, reset } = useRemoveBg();
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    process(file);
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 bg-slate-50">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">图片去背景</h1>
        <p className="text-slate-500 mt-2">
          上传图片，服务端调用 remove.bg 去背景，图片不存储
        </p>
      </header>

      <section className="w-full max-w-xl bg-white rounded-2xl shadow p-6">
        {status === "idle" && <Uploader onFile={handleFile} />}

        {(status === "loading-model" || status === "processing") && (
          <StatusBlock status={status} fileName={fileName} />
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="text-red-600 mb-4">处理失败：{error}</p>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              重试
            </button>
          </div>
        )}

        {status === "done" && resultUrl && (
          <ResultView
            resultUrl={resultUrl}
            fileName={fileName}
            onReset={reset}
          />
        )}
      </section>
    </main>
  );
}
