import { useRef, useState, type DragEvent } from "react";

export function Uploader({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    pick(e.dataTransfer.files);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`cursor-pointer border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
        dragOver
          ? "border-indigo-500 bg-indigo-50"
          : "border-slate-300 hover:border-indigo-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      <div className="text-4xl mb-3">🖼️</div>
      <p className="text-slate-600">点击选择图片，或拖拽到此处</p>
      <p className="text-slate-400 text-sm mt-1">
        支持 PNG / JPG，图片只在本地浏览器处理
      </p>
    </div>
  );
}
