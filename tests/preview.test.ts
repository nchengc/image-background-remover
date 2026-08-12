/**
 * preview.ts 工具集单元测试。
 *
 * 覆盖：
 * - checkerboardStyle：返回合法可用的 CSS 属性（透明度可视化的唯一凭证）
 * - createPreviewUrl / releasePreviewUrl：objectURL 生命周期与容错
 * - buildDownloadFileName：扩展名归一 + 非法字符过滤 + 兜底
 * - formatFileSize：B / KB / MB 分档与非法输入
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CHECKER_SIZE,
  buildDownloadFileName,
  checkerboardStyle,
  createPreviewUrl,
  formatFileSize,
  releasePreviewUrl,
} from '@/lib/preview';

type UrlWithObjectApi = {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

/** Node 环境没有 objectURL API，用桩替换后再还原。 */
function stubObjectUrl() {
  const target = URL as unknown as UrlWithObjectApi;
  const create = vi.fn((_blob: Blob) => 'blob:stub-url');
  const revoke = vi.fn((_url: string) => undefined);
  target.createObjectURL = create;
  target.revokeObjectURL = revoke;
  return { create, revoke };
}

function clearObjectUrl(): void {
  const target = URL as unknown as UrlWithObjectApi;
  delete target.createObjectURL;
  delete target.revokeObjectURL;
}

afterEach(() => {
  clearObjectUrl();
});

describe('checkerboardStyle', () => {
  it('包含棋盘格所需的全部 CSS 字段', () => {
    expect(checkerboardStyle.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(typeof checkerboardStyle.backgroundImage).toBe('string');
    expect(checkerboardStyle.backgroundSize).toBe(`${CHECKER_SIZE * 2}px ${CHECKER_SIZE * 2}px`);
    expect(checkerboardStyle.backgroundPosition).toBe(`0 0, ${CHECKER_SIZE}px ${CHECKER_SIZE}px`);
  });

  it('backgroundImage 是两层 45deg 线性渐变且括号闭合', () => {
    const image = String(checkerboardStyle.backgroundImage);
    const gradients = image.split('linear-gradient').length - 1;
    expect(gradients).toBe(2);
    expect(image).toContain('45deg');
    // 括号必须配平，否则整条 CSS 声明会被浏览器丢弃
    expect((image.match(/\(/g) ?? []).length).toBe((image.match(/\)/g) ?? []).length);
    // 必须含 transparent，否则看不到「透明格」
    expect(image).toContain('transparent');
  });

  it('CHECKER_SIZE 是正整数', () => {
    expect(Number.isInteger(CHECKER_SIZE)).toBe(true);
    expect(CHECKER_SIZE).toBeGreaterThan(0);
  });
});

describe('createPreviewUrl / releasePreviewUrl', () => {
  it('createPreviewUrl 透传 Blob 给 URL.createObjectURL', () => {
    const { create } = stubObjectUrl();
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

    expect(createPreviewUrl(blob)).toBe('blob:stub-url');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(blob);
  });

  it('releasePreviewUrl 对有效 URL 调用 revokeObjectURL', () => {
    const { revoke } = stubObjectUrl();
    releasePreviewUrl('blob:abc');
    expect(revoke).toHaveBeenCalledWith('blob:abc');
  });

  it.each([null, undefined, ''])('releasePreviewUrl 对空值 %p 安全跳过', (value) => {
    const { revoke } = stubObjectUrl();
    expect(() => releasePreviewUrl(value)).not.toThrow();
    expect(revoke).not.toHaveBeenCalled();
  });

  it('releasePreviewUrl 吞掉底层异常（重复 revoke 不应中断业务）', () => {
    const target = URL as unknown as UrlWithObjectApi;
    target.revokeObjectURL = () => {
      throw new Error('already revoked');
    };
    expect(() => releasePreviewUrl('blob:abc')).not.toThrow();
  });

  it('运行环境缺少 revokeObjectURL 时也不抛错', () => {
    clearObjectUrl();
    expect(() => releasePreviewUrl('blob:abc')).not.toThrow();
  });
});

describe('buildDownloadFileName', () => {
  it.each([
    ['cat.jpg', 'cat_nobg.png'],
    ['cat.jpeg', 'cat_nobg.png'],
    ['cat.PNG', 'cat_nobg.png'],
    ['photo.webp', 'photo_nobg.png'],
    ['no-extension', 'no-extension_nobg.png'],
    ['my.photo.v2.jpg', 'my.photo.v2_nobg.png'],
    ['  spaced.png  ', 'spaced_nobg.png'],
    ['中文名称.png', '中文名称_nobg.png'],
  ])('%s → %s', (input, expected) => {
    expect(buildDownloadFileName(input)).toBe(expected);
  });

  it.each([null, undefined, '', '   '])('空文件名 %p 兜底为 image_nobg.png', (value) => {
    expect(buildDownloadFileName(value as unknown as string)).toBe('image_nobg.png');
  });

  it('过滤 Windows / POSIX 文件系统非法字符', () => {
    const result = buildDownloadFileName('a\\b/c:d*e?f"g<h>i|j.png');
    expect(result).toBe('a_b_c_d_e_f_g_h_i_j_nobg.png');
    // 结果里不允许再出现任何非法字符
    expect(result).not.toMatch(/[\\/:*?"<>|]/);
  });

  it('仅由非法字符构成的名字仍能生成可用文件名', () => {
    // '???' 三个非法字符 → 三个下划线，再拼后缀 '_nobg' → 共 4 个下划线；
    // 结果非空串，因此保留下划线而不是走 fallback
    const result = buildDownloadFileName('???.png');
    expect(result).toBe('____nobg.png');
    expect(result.endsWith('.png')).toBe(true);
    expect(result).not.toMatch(/[\\/:*?"<>|]/);
  });

  it('超长文件名截断到 80 字符以内（不含后缀）', () => {
    const long = `${'a'.repeat(200)}.png`;
    const result = buildDownloadFileName(long);
    expect(result).toBe(`${'a'.repeat(80)}_nobg.png`);
    expect(result.length).toBeLessThanOrEqual(80 + '_nobg.png'.length);
  });

  it('支持自定义后缀', () => {
    expect(buildDownloadFileName('cat.jpg', '-transparent')).toBe('cat-transparent.png');
    expect(buildDownloadFileName('cat.jpg', '')).toBe('cat.png');
  });

  it('结果始终以 .png 结尾（保留 alpha 的唯一常用格式）', () => {
    for (const name of ['a.jpg', 'b.webp', 'c', 'd.png', '中文.jpeg', '']) {
      expect(buildDownloadFileName(name).endsWith('.png')).toBe(true);
    }
  });
});

describe('formatFileSize', () => {
  it.each([
    [0, '0 KB'],
    [-1, '0 KB'],
    [1, '1 B'],
    [512, '512 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [2048, '2 KB'],
    [1024 * 1023, '1023 KB'],
    [1024 * 1024, '1.00 MB'],
    [1024 * 1024 * 2.5, '2.50 MB'],
    [10 * 1024 * 1024, '10.00 MB'],
  ])('%d 字节 → %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    '非法数值 %p 兜底为 0 KB',
    (value) => {
      expect(formatFileSize(value)).toBe('0 KB');
    },
  );

  it('KB / MB 分档边界行为（1MB 差 1 字节时四舍五入显示 1024 KB，仅为观感问题）', () => {
    expect(formatFileSize(1024 * 1024 - 1)).toBe('1024 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
  });
});
