/**
 * validateImageFile 前端预校验单元测试。
 *
 * 目的：把明显非法的文件挡在网络请求之前，节省上游额度。
 * 三条主路径：合法 / 超大 / 错误 MIME，另加空文件与缺失文件。
 */

import { describe, expect, it } from 'vitest';

import {
  ALLOWED_MAX_BYTES,
  ALLOWED_MAX_MB,
  ALLOWED_TYPES,
  RemoveBgRequestError,
  validateImageFile,
} from '@/lib/useRemoveBg';

/** 构造指定体积与 MIME 的 File（内容为零字节填充，不落盘）。 */
function makeFile(size: number, type: string, name = 'sample'): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('validateImageFile / 常量契约', () => {
  it('白名单与服务端默认值一致', () => {
    expect([...ALLOWED_TYPES]).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });

  it('体积上限换算正确', () => {
    expect(ALLOWED_MAX_MB).toBe(10);
    expect(ALLOWED_MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe('validateImageFile / 合法路径', () => {
  it.each([...ALLOWED_TYPES])('接受白名单格式 %s', (type) => {
    expect(validateImageFile(makeFile(2048, type))).toBeNull();
  });

  it('MIME 大写也能通过（浏览器差异容错）', () => {
    expect(validateImageFile(makeFile(2048, 'IMAGE/PNG'))).toBeNull();
  });

  it('正好等于上限的文件通过（边界包含）', () => {
    expect(validateImageFile(makeFile(ALLOWED_MAX_BYTES, 'image/png'))).toBeNull();
  });

  it('1 字节的最小合法文件通过', () => {
    expect(validateImageFile(makeFile(1, 'image/jpeg'))).toBeNull();
  });
});

describe('validateImageFile / 超大文件', () => {
  it('超过上限 1 字节即拒绝，返回 UPLOAD_TOO_LARGE 且不可重试', () => {
    const error = validateImageFile(makeFile(ALLOWED_MAX_BYTES + 1, 'image/png'));

    expect(error).not.toBeNull();
    expect(error?.code).toBe('UPLOAD_TOO_LARGE');
    expect(error?.retryable).toBe(false);
    expect(error?.message).toContain(`${ALLOWED_MAX_MB}MB`);
  });

  it('返回的是 RemoveBgRequestError 实例（可被 toAppError 直接识别）', () => {
    const error = validateImageFile(makeFile(ALLOWED_MAX_BYTES + 1, 'image/png'));
    expect(error).toBeInstanceOf(RemoveBgRequestError);
  });
});

describe('validateImageFile / 错误 MIME', () => {
  it.each(['image/gif', 'image/bmp', 'image/svg+xml', 'application/pdf', 'text/plain', 'video/mp4'])(
    '拒绝非白名单格式 %s',
    (type) => {
      const error = validateImageFile(makeFile(2048, type));
      expect(error?.code).toBe('UNSUPPORTED_TYPE');
      expect(error?.retryable).toBe(false);
      expect(error?.message).toContain(type);
    },
  );

  it('空 MIME（部分系统拖拽场景）也被拒绝且文案不带括号', () => {
    const error = validateImageFile(makeFile(2048, ''));
    expect(error?.code).toBe('UNSUPPORTED_TYPE');
    expect(error?.message).not.toContain('（）');
  });

  it('格式校验优先于体积校验（超大 GIF 报格式错误，提示更准确）', () => {
    const error = validateImageFile(makeFile(ALLOWED_MAX_BYTES + 1, 'image/gif'));
    expect(error?.code).toBe('UNSUPPORTED_TYPE');
  });
});

describe('validateImageFile / 空与缺失', () => {
  it.each([null, undefined])('缺少文件 %p 返回 INVALID_INPUT', (value) => {
    const error = validateImageFile(value);
    expect(error?.code).toBe('INVALID_INPUT');
    expect(error?.retryable).toBe(false);
  });

  it('0 字节文件返回 INVALID_INPUT', () => {
    const error = validateImageFile(makeFile(0, 'image/png'));
    expect(error?.code).toBe('INVALID_INPUT');
    expect(error?.retryable).toBe(false);
  });
});

describe('RemoveBgRequestError', () => {
  it('未给 message 时按错误码取默认文案', () => {
    const error = new RemoveBgRequestError('TIMEOUT');
    expect(error.message).toBe('处理超时，请稍后重试');
    expect(error.retryable).toBe(true);
  });

  it('未知错误码兜底文案与不可重试推断', () => {
    const error = new RemoveBgRequestError('SOMETHING_NEW');
    expect(error.message).toBe('处理失败，请重试');
    expect(error.retryable).toBe(false);
  });

  it('显式 retryable 覆盖默认推断', () => {
    expect(new RemoveBgRequestError('PROVIDER_ERROR', 'x', false).retryable).toBe(false);
    expect(new RemoveBgRequestError('INVALID_INPUT', 'x', true).retryable).toBe(true);
  });

  it('是标准 Error 子类，name 正确', () => {
    const error = new RemoveBgRequestError('INTERNAL');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RemoveBgRequestError');
  });
});
