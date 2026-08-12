/**
 * Provider 层单元测试：错误映射 + 工厂 + ProviderError 模型。
 *
 * 关键契约（来自系统设计）：
 * - 400 / 401 / 403 / 402  → PROVIDER_ERROR 且 retryable: false（重试无意义）
 * - 429                    → RATE_LIMITED   且 retryable: true
 * - 其他 4xx / 5xx         → PROVIDER_ERROR 且 retryable: true
 * - detail 只进服务端日志，绝不出现在下发前端的 body 里
 */

import { describe, expect, it, vi } from 'vitest';

import { RemoveBgProvider, getProvider, toProviderError } from '../functions/providers/removebg';
import {
  DEFAULT_RETRYABLE_BY_CODE,
  HTTP_STATUS_BY_CODE,
  ProviderError,
  isProviderError,
} from '../functions/providers/types';

/** 构造一个 remove.bg 风格的失败响应。 */
function errorResponse(status: number, body = ''): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
}

const REMOVE_BG_ERROR_JSON = JSON.stringify({
  errors: [{ title: '无法识别前景', detail: '请换一张主体更清晰的图片', code: 'unknown_foreground' }],
});

describe('toProviderError / 不可重试的上游错误', () => {
  it.each([
    [400, 'PROVIDER_ERROR'],
    [401, 'PROVIDER_ERROR'],
    [402, 'PROVIDER_ERROR'],
    [403, 'PROVIDER_ERROR'],
  ] as const)('上游 %d → %s 且 retryable: false', async (status, code) => {
    const error = await toProviderError(errorResponse(status, REMOVE_BG_ERROR_JSON));

    expect(error).toBeInstanceOf(ProviderError);
    expect(error.code).toBe(code);
    expect(error.retryable).toBe(false);
    expect(error.httpStatus).toBe(502);
  });

  it('400 携带上游可读文案', async () => {
    const error = await toProviderError(errorResponse(400, REMOVE_BG_ERROR_JSON));
    expect(error.message).toBe('无法识别前景：请换一张主体更清晰的图片');
  });

  it('400 且上游无 JSON 时使用兜底换图文案', async () => {
    const error = await toProviderError(errorResponse(400, 'Bad Request'));
    expect(error.message).toContain('换一张');
  });

  it('401 / 403 统一为鉴权失败文案（不泄露 Key 信息）', async () => {
    for (const status of [401, 403]) {
      const error = await toProviderError(errorResponse(status, REMOVE_BG_ERROR_JSON));
      expect(error.message).toBe('去背景服务鉴权失败，请联系站点管理员');
      expect(error.message).not.toContain('Api-Key');
    }
  });

  it('402 为额度用尽文案', async () => {
    const error = await toProviderError(errorResponse(402));
    expect(error.message).toContain('额度已用尽');
    expect(error.retryable).toBe(false);
  });
});

describe('toProviderError / 可重试的上游错误', () => {
  it('上游 429 → RATE_LIMITED 且 retryable: true，HTTP 429', async () => {
    const error = await toProviderError(errorResponse(429));

    expect(error.code).toBe('RATE_LIMITED');
    expect(error.retryable).toBe(true);
    expect(error.httpStatus).toBe(429);
    expect(error.message).toBe('请求过于频繁，请稍后重试');
  });

  it.each([404, 405, 408, 409, 418, 500, 502, 503, 504])(
    '上游 %d → PROVIDER_ERROR 且 retryable: true',
    async (status) => {
      const error = await toProviderError(errorResponse(status));

      expect(error.code).toBe('PROVIDER_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.httpStatus).toBe(502);
    },
  );

  it('5xx 若上游给了文案则透传', async () => {
    const error = await toProviderError(errorResponse(503, REMOVE_BG_ERROR_JSON));
    expect(error.message).toBe('无法识别前景：请换一张主体更清晰的图片');
  });

  it('5xx 无文案时用兜底文案', async () => {
    const error = await toProviderError(errorResponse(503, '<html>oops</html>'));
    expect(error.message).toBe('去背景服务暂时不可用，请稍后重试');
  });
});

describe('toProviderError / detail 与隐私', () => {
  it('detail 记录上游状态与片段，但不出现在 toBody 里', async () => {
    const error = await toProviderError(errorResponse(500, 'internal boom'));

    expect(error.detail).toContain('remove.bg 500');
    expect(error.detail).toContain('internal boom');
    expect(error.toBody()).toEqual({
      code: 'PROVIDER_ERROR',
      message: '去背景服务暂时不可用，请稍后重试',
      retryable: true,
    });
    expect(Object.keys(error.toBody())).not.toContain('detail');
  });

  it('detail 截断到 500 字符，避免日志爆炸', async () => {
    const error = await toProviderError(errorResponse(500, 'x'.repeat(2000)));
    expect(error.detail).toBeDefined();
    expect(error.detail!.length).toBeLessThanOrEqual('remove.bg 500: '.length + 500);
  });

  it('响应体读取失败时不中断错误映射链', async () => {
    const broken = {
      status: 500,
      text: () => Promise.reject(new Error('stream closed')),
    } as unknown as Response;

    const error = await toProviderError(broken);
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.retryable).toBe(true);
  });

  it('JSON 结构异常（errors 为空数组）时退回兜底文案', async () => {
    const error = await toProviderError(errorResponse(500, JSON.stringify({ errors: [] })));
    expect(error.message).toBe('去背景服务暂时不可用，请稍后重试');
  });
});

describe('getProvider 工厂', () => {
  it.each(['', undefined, 'removebg', 'remove.bg', 'REMOVEBG', '  removebg  '])(
    'PROVIDER=%p 时返回 RemoveBgProvider',
    (name) => {
      const provider = getProvider({ PROVIDER: name, REMOVE_BG_API_KEY: 'test-key' });
      expect(provider).toBeInstanceOf(RemoveBgProvider);
      expect(provider.name).toBe('removebg');
    },
  );

  it('未知 PROVIDER 抛 INTERNAL（不可重试，配置问题）', () => {
    try {
      getProvider({ PROVIDER: 'magic-ai', REMOVE_BG_API_KEY: 'k' });
      expect.unreachable('应当抛出 ProviderError');
    } catch (error) {
      expect(isProviderError(error)).toBe(true);
      const providerError = error as ProviderError;
      expect(providerError.code).toBe('INTERNAL');
      expect(providerError.retryable).toBe(false);
      expect(providerError.httpStatus).toBe(500);
      expect(providerError.detail).toContain('magic-ai');
    }
  });

  it('缺少 API Key 时抛 INTERNAL 且文案面向用户友好', () => {
    try {
      getProvider({});
      expect.unreachable('应当抛出 ProviderError');
    } catch (error) {
      const providerError = error as ProviderError;
      expect(providerError.code).toBe('INTERNAL');
      expect(providerError.retryable).toBe(false);
      expect(providerError.message).toContain('站点管理员');
      expect(providerError.detail).toBe('REMOVE_BG_API_KEY is missing');
    }
  });
});

describe('RemoveBgProvider.remove', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

  it('成功时返回 PNG 字节，并按协议发送 X-Api-Key / image_file / size', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(pngBytes, { status: 200, headers: { 'Content-Type': 'image/png' } }),
    );

    const provider = new RemoveBgProvider('secret-key', 'auto');
    const result = await provider.remove({
      buffer: new Uint8Array([1, 2, 3]),
      mimeType: 'image/jpeg',
      fileName: 'cat.jpg',
    });

    expect(Array.from(result.pngBuffer)).toEqual(Array.from(pngBytes));

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.remove.bg/v1.0/removebg');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('secret-key');

    const form = init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('size')).toBe('auto');
    const uploaded = form.get('image_file');
    expect(uploaded).toBeInstanceOf(Blob);
    expect((uploaded as File).name).toBe('cat.jpg');
  });

  it('REMOVE_BG_SIZE 可配置输出尺寸', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(pngBytes, { status: 200 }));

    await new RemoveBgProvider('k', 'full').remove({
      buffer: new Uint8Array([1]),
      mimeType: 'image/png',
    });

    const form = (fetchSpy.mock.calls[0][1] as RequestInit).body as FormData;
    expect(form.get('size')).toBe('full');
  });

  it('网络层异常 → PROVIDER_ERROR 且可重试', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      new RemoveBgProvider('k').remove({ buffer: new Uint8Array([1]), mimeType: 'image/png' }),
    ).rejects.toMatchObject({ code: 'PROVIDER_ERROR', retryable: true });
  });

  it('上游返回空 body → PROVIDER_ERROR 且可重试', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array(0), { status: 200 }),
    );

    await expect(
      new RemoveBgProvider('k').remove({ buffer: new Uint8Array([1]), mimeType: 'image/png' }),
    ).rejects.toMatchObject({ code: 'PROVIDER_ERROR', retryable: true });
  });

  it('上游 402 透传为不可重试的 PROVIDER_ERROR', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(402));

    await expect(
      new RemoveBgProvider('k').remove({ buffer: new Uint8Array([1]), mimeType: 'image/png' }),
    ).rejects.toMatchObject({ code: 'PROVIDER_ERROR', retryable: false });
  });
});

describe('ProviderError 模型', () => {
  it('未显式给 retryable 时取 DEFAULT_RETRYABLE_BY_CODE', () => {
    for (const code of Object.keys(DEFAULT_RETRYABLE_BY_CODE) as Array<
      keyof typeof DEFAULT_RETRYABLE_BY_CODE
    >) {
      const error = new ProviderError(code, 'msg');
      expect(error.retryable).toBe(DEFAULT_RETRYABLE_BY_CODE[code]);
      expect(error.httpStatus).toBe(HTTP_STATUS_BY_CODE[code]);
    }
  });

  it('isProviderError 能识别跨模块的鸭子类型', () => {
    expect(isProviderError(new ProviderError('TIMEOUT', 'x'))).toBe(true);
    expect(isProviderError({ name: 'ProviderError', code: 'TIMEOUT' })).toBe(true);
    expect(isProviderError(new Error('plain'))).toBe(false);
    expect(isProviderError(null)).toBe(false);
    expect(isProviderError('ProviderError')).toBe(false);
    expect(isProviderError({ name: 'ProviderError' })).toBe(false);
  });
});
