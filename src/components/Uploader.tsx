/**
 * 上传区：点击选择 / 拖拽 / 粘贴（Ctrl+V）三种入口。
 *
 * 职责边界：
 * - 只负责「拿到一个合法 File 并交给 onSelect」
 * - 非法文件在本组件内就地提示，不进入状态机，减少一次无效往返
 * - loading 期间 disabled，配合状态机的防重复提交
 */

import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';

import { formatFileSize } from '@/lib/preview';
import { ALLOWED_MAX_MB, ALLOWED_TYPES, ALLOWED_TYPES_LABEL, validateImageFile } from '@/lib/useRemoveBg';

export interface UploaderProps {
  /** 校验通过后回调，交给状态机的 submit。 */
  onSelect: (file: File) => void;
  /** 处理中时禁用所有交互。 */
  disabled?: boolean;
}

export default function Uploader({ onSelect, disabled = false }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const dragDepth = useRef(0);

  /** 统一入口：校验 → 提示或提交。 */
  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (disabled) {
        return;
      }
      if (!file) {
        setLocalError('没有读取到图片，请重新选择');
        return;
      }
      const error = validateImageFile(file);
      if (error) {
        setLocalError(error.message);
        return;
      }
      setLocalError(null);
      onSelect(file);
    },
    [disabled, onSelect],
  );

  const openPicker = useCallback(() => {
    if (disabled) {
      return;
    }
    inputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPicker();
      }
    },
    [openPicker],
  );

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled) {
        return;
      }
      dragDepth.current += 1;
      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    // 必须阻止默认行为，否则浏览器会直接打开图片
    event.preventDefault();
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      if (disabled) {
        return;
      }
      const file = event.dataTransfer?.files?.[0] ?? null;
      handleFile(file);
    },
    [disabled, handleFile],
  );

  // 粘贴上传：监听全局 paste，从剪贴板取第一张图片
  useEffect(() => {
    if (disabled) {
      return undefined;
    }
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            handleFile(file);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [disabled, handleFile]);

  return (
    <section className="animate-fade-in">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={`上传图片，支持 ${ALLOWED_TYPES_LABEL}，最大 ${ALLOWED_MAX_MB}MB`}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-5 py-12 text-center transition-colors sm:px-10 sm:py-16',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-brand-400 hover:bg-slate-900/60',
          isDragging ? 'border-brand-400 bg-brand-500/10' : 'border-slate-700 bg-slate-900/40',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15 text-brand-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </span>

        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-100 sm:text-lg">
            点击上传，或把图片拖到这里
          </p>
          <p className="text-sm text-slate-400">
            也可以直接 <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">Ctrl</kbd> +{' '}
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">V</kbd> 粘贴截图
          </p>
        </div>

        <p className="text-xs text-slate-500">
          支持 {ALLOWED_TYPES_LABEL}，单张不超过 {formatFileSize(ALLOWED_MAX_MB * 1024 * 1024)}
        </p>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_TYPES.join(',')}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            handleFile(file);
            // 清空 value，保证同一文件可再次选择触发 change
            event.target.value = '';
          }}
        />
      </div>

      {localError ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {localError}
        </p>
      ) : null}
    </section>
  );
}
