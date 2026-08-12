/**
 * 预览与下载工具集。
 *
 * 两件事：
 * 1. 棋盘格底纹：让透明区域「看得见」，这是去背景效果的唯一可视凭证。
 * 2. objectURL 生命周期管理 + 透明 PNG 下载文件名生成。
 *
 * 约定：凡是 createPreviewUrl 产生的 URL，都必须在替换/重置/卸载时
 * 调用 releasePreviewUrl 回收，否则会造成 blob 内存泄漏。
 */

import type { CSSProperties } from 'react';

/** 棋盘格单格边长（px）。20px 在移动端与桌面端都清晰可辨。 */
export const CHECKER_SIZE = 20;

const CHECKER_LIGHT = '#e2e8f0';
const CHECKER_DARK = '#c3ccda';

/**
 * 棋盘格背景样式（纯 CSS 渐变实现，无需图片资源）。
 * 用法：<div style={checkerboardStyle}><img src={pngUrl} /></div>
 */
export const checkerboardStyle: CSSProperties = {
  backgroundColor: CHECKER_LIGHT,
  backgroundImage: `linear-gradient(45deg, ${CHECKER_DARK} 25%, transparent 25%, transparent 75%, ${CHECKER_DARK} 75%, ${CHECKER_DARK}),
linear-gradient(45deg, ${CHECKER_DARK} 25%, transparent 25%, transparent 75%, ${CHECKER_DARK} 75%, ${CHECKER_DARK})`,
  backgroundSize: `${CHECKER_SIZE * 2}px ${CHECKER_SIZE * 2}px`,
  backgroundPosition: `0 0, ${CHECKER_SIZE}px ${CHECKER_SIZE}px`,
};

/** 为 Blob / File 创建预览用 objectURL。 */
export function createPreviewUrl(source: Blob): string {
  return URL.createObjectURL(source);
}

/** 回收 objectURL；对 null / undefined / 空串安全。 */
export function releasePreviewUrl(url: string | null | undefined): void {
  if (!url) {
    return;
  }
  try {
    URL.revokeObjectURL(url);
  } catch {
    // 某些环境重复 revoke 会抛错，忽略即可，不影响业务。
  }
}

/**
 * 生成下载文件名：`原名_nobg.png`。
 * - 去掉原扩展名，统一 .png（保留 alpha 通道的唯一常用格式）
 * - 过滤文件系统非法字符，避免下载失败
 */
export function buildDownloadFileName(originalName: string, suffix = '_nobg'): string {
  const fallback = 'image';
  const trimmed = (originalName || '').trim();
  const withoutExt = trimmed.replace(/\.[^./\\]+$/, '');
  const safeBase = withoutExt.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || fallback;
  return `${safeBase}${suffix}.png`;
}

/** 人类可读的体积格式化，用于结果信息展示。 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
