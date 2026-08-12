/**
 * Uploader — 图片上传组件。
 *
 * 支持点击、拖拽、Ctrl+V 粘贴三种上传入口。
 * 前端预校验（类型/大小），非法文件就地报错不进状态机。
 * loading 态禁用全部入口。
 */

"use client";

import { useRef, useState, useCallback, type DragEvent, type ClipboardEvent } from "react";
import type { AppError } from "@/lib/types";
import { ALLOWED_TYPES_STRING } from "@/lib/types";
import { validateImageFile } from "@/lib/useRemoveBg";

export interface UploaderProps {
  /** 是否禁用（loading 时为 true） */
  disabled: boolean;
  /** 文件选择回调 */
  onFile: (file: File) => void;
  /** 外部错误（如 done/error 态重置后清空） */
  error?: AppError | null;
}

/**
 * 上传组件。键盘可达，支持屏幕阅读器。
 */
export default function Uploader({ disabled, onFile, error }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<AppError | null>(null);

  const displayError = error ?? localError;

  /** 处理文件：校验 → 成功则回调，失败则显示本地错误 */
  const handleFile = useCallback(
    (file: File) => {
      if (disabled) return;
      setLocalError(null);

      const validationError = validateImageFile(file);
      if (validationError) {
        setLocalError(validationError);
        return; // 不进状态机
      }

      onFile(file);
    },
    [disabled, onFile]
  );

  // ---- 点击 ----

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleInputChange = () => {
    const files = inputRef.current?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
      // 清空 value 保证同图可重选
      inputRef.current!.value = "";
    }
  };

  // ---- 拖拽 ----

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  // ---- 粘贴 ----

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    },
    [disabled, handleFile]
  );

  // ---- 键盘 ----

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const borderColor = isDragging
    ? "border-blue-500 bg-blue-50"
    : displayError
      ? "border-red-400 bg-red-50"
      : "border-gray-300 bg-white hover:border-gray-400";

  return (
    <div className="w-full" onPaste={handlePaste}>
      {/* 隐藏的文件 input */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES_STRING}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
        aria-hidden="true"
      />

      {/* 上传区域 */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="上传图片区域，点击选择文件或拖拽图片到此处"
        aria-disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-[200px] rounded-xl border-2 border-dashed
          transition-colors duration-200 cursor-pointer
          select-none outline-none
          focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${borderColor}
        `}
      >
        {/* 拖拽蒙层 */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-blue-100/80 z-10">
            <p className="text-blue-600 font-semibold text-lg">
              松手上传
            </p>
          </div>
        )}

        {/* 图标 */}
        <svg
          className={`w-12 h-12 mb-3 ${displayError ? "text-red-400" : "text-gray-400"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>

        {/* 提示文案 */}
        <p className="text-gray-500 text-sm mb-1">
          点击上传、拖拽图片到此处，或{" "}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">
            Ctrl+V
          </kbd>{" "}
          粘贴
        </p>
        <p className="text-gray-400 text-xs">
          支持 JPG / PNG / WEBP，最大 4MB
        </p>

        {/* 本地校验错误 */}
        {displayError && !isDragging && (
          <p className="mt-3 text-red-500 text-sm font-medium" role="alert">
            {displayError.message}
          </p>
        )}
      </div>
    </div>
  );
}
