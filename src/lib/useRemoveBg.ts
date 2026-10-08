import { useCallback, useState } from "react";

export type Status = "idle" | "loading-model" | "processing" | "done" | "error";

export function useRemoveBg() {
  const [status, setStatus] = useState<Status>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(async (file: File) => {
    setStatus("processing");
    setError(null);
    setResultUrl(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const resp = await fetch("/api/remove-bg", { method: "POST", body: fd });
      if (!resp.ok) {
        let msg = "处理失败";
        try {
          const data = (await resp.json()) as { error?: string };
          if (data.error) msg = data.error;
        } catch {
          /* 响应非 JSON，保留默认文案 */
        }
        throw new Error(msg);
      }
      const blob = await resp.blob();
      setResultUrl(URL.createObjectURL(blob));
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setStatus("idle");
    setResultUrl(null);
    setError(null);
  }, [resultUrl]);

  return { status, resultUrl, error, process, reset };
}
