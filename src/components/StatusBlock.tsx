import type { Status } from "../lib/useRemoveBg";

const TEXT: Record<string, string> = {
  "loading-model": "正在准备…",
  processing: "正在去背景…",
};

export function StatusBlock({
  status,
  fileName,
}: {
  status: Status;
  fileName: string | null;
}) {
  return (
    <div className="text-center py-6">
      <div className="mx-auto mb-3 h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      <p className="text-slate-700">{TEXT[status] ?? "处理中…"}</p>
      {fileName && (
        <p className="text-slate-400 text-sm mt-1 truncate">{fileName}</p>
      )}
    </div>
  );
}
