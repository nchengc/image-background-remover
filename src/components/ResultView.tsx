export function ResultView({
  resultUrl,
  fileName,
  onReset,
}: {
  resultUrl: string;
  fileName: string | null;
  onReset: () => void;
}) {
  const downloadName =
    (fileName ?? "image").replace(/\.[^.]+$/, "") + "-nobg.png";
  return (
    <div className="text-center">
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          backgroundImage:
            "linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0,0 10px,10px -10px,-10px 0",
        }}
      >
        <img
          src={resultUrl}
          alt="去背景结果"
          className="mx-auto max-h-80 object-contain"
        />
      </div>
      <div className="flex gap-3 justify-center">
        <a
          href={resultUrl}
          download={downloadName}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          下载 PNG
        </a>
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          再试一张
        </button>
      </div>
    </div>
  );
}
