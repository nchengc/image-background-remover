/**
 * preview — 预览与下载工具函数。
 *
 * 'use client' 边界：操作 Blob / URL.createObjectURL / <a download>。
 */

"use client";

// -------------------------------------------------------------------
// 棋盘格
// -------------------------------------------------------------------

/** 棋盘格 CSS 字符串（作为内联 background 使用） */
export function checkerboardStyle(): string {
  return "repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%) 50% / 20px 20px";
}

// -------------------------------------------------------------------
// 预览 URL 管理
// -------------------------------------------------------------------

/**
 * 从 Blob 创建预览 URL。
 * 实际上等价于 URL.createObjectURL，但作为语义封装使用。
 */
export function createPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * 释放预览 URL。
 */
export function releasePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------------
// 下载文件名
// -------------------------------------------------------------------

/**
 * 构造下载文件名：`原名_nobg.png`。
 *
 * - 过滤非法字符 `\/:*?"<>|`
 * - 截断至 80 字符
 * - 空名兜底为 `image_nobg.png`
 */
export function buildDownloadFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, ""); // 去除扩展名
  const cleaned = base.replace(/[\\/:*?"<>|]/g, "_").trim();
  const safe = cleaned.length > 0 ? cleaned : "image";
  const truncated = safe.length > 80 ? safe.slice(0, 80) : safe;
  return `${truncated}_nobg.png`;
}

// -------------------------------------------------------------------
// 文件大小格式化
// -------------------------------------------------------------------

/**
 * 格式化文件大小为可读字符串。
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
