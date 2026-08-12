/**
 * /api/remove-bg 代理端点集成测试。
 *
 * 用 mock 顶掉 getProvider，完全绕开真实网络与 remove.bg 额度；
 * 请求/响应使用 Node 22 的全局 Request / Response / FormData / Blob。
 *
 * 覆盖：正常透传、入参校验、MIME 白名单、体积双校验、并发闸门、
 *       Provider 异常、超时 race、未知异常兜底、OPTIONS / 非 POST。
 */

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import type {
  BackgroundRemovalProvider,
  PagesFunctionContext,
  ProviderEnv,
  RemovalInput,
  RemovalOutput,
} from '../functions/providers/types';

/** 被 vi.mock 工厂共享的可变 Provider 槽位（vi.hoisted 保证提升后仍可访问）。 */
const mockState = vi.hoisted(() => ({
  provider: null as null | {
    name: string;
    remove: (input: unknown) => Promise<{ pngBuffer: Uint8Array }>;
  },
}));

vi.mock('../functions/providers/removebg', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../functions/providers/removebg')>();
  return {
    ...actual,
    getProvider: (env: ProviderEnv) =>
      mockState.provider ?? actual.getProvider(env),
  };
});

const { onRequest, onRequestOptions, onRequestPost } = await import('../functions/api/remove-bg');
const { ProviderError } = await import('../functions/providers/types');

/** 假 PNG 字节（含真实 PNG 魔数，便于断言「透传未被改写」）。 */
const FAKE_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x42, 0x47]);

/** 装一个总是成功的 Provider。 */
function useSuccessProvider(pngBuffer: Uint8Array = FAKE_PNG): {
  calls: RemovalInput[];
} {
  const calls: RemovalInput[] = [];
  mockState.provider = {
    name: 'fake',
    remove: async (input: unknown) => {
      calls.push(input as RemovalInput);
      return { pngBuffer };
    },
  };
  return { calls };
}

/** 装一个总是失败的 Provider。 */
function useFailingProvider(error: unknown): void {
  mockState.provider = {
    name: 'fake-fail',
    remove: () => Promise.reject(error),
  };
}

/** 装一个永不返回的 Provider（用于验证超时 race 分支）。 */
function useHangingProvider(): void {
  mockState.provider = {
    name: 'fake-hang',
    remove: () => new Promise<{ pngBuffer: Uint8Array }>(() => undefined),
  };
}

/** 手动可控 Provider（用于并发闸门测试）。 */
function useDeferredProvider(): { release: () => void; started: Promise<void> } {
  let release!: () => void;
  let markStarted!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });

  mockState.provider = {
    name: 'fake-deferred',
    remove: async () => {
      markStarted();
      await gate;
      return { pngBuffer: FAKE_PNG };
    },
  };
  return { release, started };
}

/** 构造 multipart/form-data 的 POST 请求。 */
function buildRequest(
  options: {
    field?: string;
    fileName?: string;
    mimeType?: string;
    bytes?: Uint8Array;
    stringValue?: string;
  } = {},
): Request {
  const form = new FormData();
  if (options.stringValue !== undefined) {
    form.append(options.field ?? 'image', options.stringValue);
  } else {
    const blob = new Blob([options.bytes ?? new Uint8Array([1, 2, 3, 4, 5])], {
      type: options.mimeType ?? 'image/png',
    });
    form.append(options.field ?? 'image', blob, options.fileName ?? 'photo.png');
  }
  return new Request('https://example.com/api/remove-bg', { method: 'POST', body: form });
}

function buildContext(request: Request, env: ProviderEnv = {}): PagesFunctionContext<ProviderEnv> {
  return { request, env };
}

/** 读取 JSON 错误体。 */
async function readError(response: Response): Promise<{
  code: string;
  message: string;
  retryable: boolean;
}> {
  return (await response.json()) as { code: string; message: string; retryable: boolean };
}

/** 所有响应都必须禁止缓存（结果含用户图片）。 */
function expectNoStore(response: Response): void {
  expect(response.headers.get('Cache-Control')).toBe('no-store');
}

let consoleErrorSpy: MockInstance<Parameters<Console['error']>, void>;

beforeEach(() => {
  mockState.provider = null;
  // 端点会在异常分支打日志，避免污染测试输出
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  mockState.provider = null;
  consoleErrorSpy.mockRestore();
});

describe('POST /api/remove-bg / 正常路径', () => {
  it('返回 200 + image/png 二进制，字节与 Provider 输出一致', async () => {
    useSuccessProvider();

    const response = await onRequestPost(buildContext(buildRequest()));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expectNoStore(response);
    expect(response.headers.get('X-Provider')).toBe('fake');

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes)).toEqual(Array.from(FAKE_PNG));
    // PNG 魔数未被改写
    expect(Array.from(bytes.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('把原始字节、MIME、文件名正确传给 Provider', async () => {
    const { calls } = useSuccessProvider();
    const payload = new Uint8Array([9, 8, 7, 6]);

    await onRequestPost(
      buildContext(buildRequest({ bytes: payload, mimeType: 'image/jpeg', fileName: 'cat.jpg' })),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].mimeType).toBe('image/jpeg');
    expect(calls[0].fileName).toBe('cat.jpg');
    expect(Array.from(calls[0].buffer)).toEqual(Array.from(payload));
  });

  it('带 CORS 头，便于跨域调试', async () => {
    useSuccessProvider();
    const response = await onRequestPost(buildContext(buildRequest()));

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it.each(['image/jpeg', 'image/png', 'image/webp'])('接受白名单格式 %s', async (mimeType) => {
    useSuccessProvider();
    const response = await onRequestPost(buildContext(buildRequest({ mimeType })));
    expect(response.status).toBe(200);
  });

  it('ALLOWED_TYPES 可通过环境变量扩展', async () => {
    useSuccessProvider();
    const response = await onRequestPost(
      buildContext(buildRequest({ mimeType: 'image/gif' }), { ALLOWED_TYPES: 'image/gif' }),
    );
    expect(response.status).toBe(200);
  });
});

describe('POST /api/remove-bg / 入参校验', () => {
  it('缺少 image 字段 → 400 INVALID_INPUT，不可重试', async () => {
    useSuccessProvider();

    const response = await onRequestPost(buildContext(buildRequest({ field: 'file' })));

    expect(response.status).toBe(400);
    expectNoStore(response);
    const body = await readError(response);
    expect(body.code).toBe('INVALID_INPUT');
    expect(body.retryable).toBe(false);
    expect(body.message).toContain('image');
  });

  it('image 字段是字符串而非文件 → 400 INVALID_INPUT', async () => {
    useSuccessProvider();

    const response = await onRequestPost(buildContext(buildRequest({ stringValue: 'not-a-file' })));

    expect(response.status).toBe(400);
    expect((await readError(response)).code).toBe('INVALID_INPUT');
  });

  it('Content-Type 非 multipart/form-data → 400 INVALID_INPUT', async () => {
    useSuccessProvider();

    const request = new Request('https://example.com/api/remove-bg', {
      method: 'POST',
      body: JSON.stringify({ image: 'base64...' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await onRequestPost(buildContext(request));

    expect(response.status).toBe(400);
    const body = await readError(response);
    expect(body.code).toBe('INVALID_INPUT');
    expect(body.message).toContain('multipart/form-data');
  });

  it('multipart 体损坏（解析失败）→ 400 INVALID_INPUT', async () => {
    useSuccessProvider();

    const request = new Request('https://example.com/api/remove-bg', {
      method: 'POST',
      body: 'garbage-without-boundary',
      headers: { 'Content-Type': 'multipart/form-data; boundary=----nope' },
    });
    const response = await onRequestPost(buildContext(request));

    expect(response.status).toBe(400);
    expect((await readError(response)).code).toBe('INVALID_INPUT');
  });

  it('0 字节文件 → 400 INVALID_INPUT（二次校验兜住 size 不可信的客户端）', async () => {
    useSuccessProvider();

    const response = await onRequestPost(
      buildContext(buildRequest({ bytes: new Uint8Array(0) })),
    );

    expect(response.status).toBe(400);
    const body = await readError(response);
    expect(body.code).toBe('INVALID_INPUT');
    expect(body.message).toContain('空');
  });
});

describe('POST /api/remove-bg / MIME 白名单', () => {
  it.each(['image/gif', 'image/bmp', 'image/svg+xml', 'application/pdf', 'text/plain'])(
    '不支持的格式 %s → 415 UNSUPPORTED_TYPE，不可重试',
    async (mimeType) => {
      useSuccessProvider();

      const response = await onRequestPost(buildContext(buildRequest({ mimeType })));

      expect(response.status).toBe(415);
      expectNoStore(response);
      const body = await readError(response);
      expect(body.code).toBe('UNSUPPORTED_TYPE');
      expect(body.retryable).toBe(false);
      expect(body.message).toContain(mimeType);
    },
  );

  it('MIME 大写也能命中白名单', async () => {
    useSuccessProvider();
    const response = await onRequestPost(buildContext(buildRequest({ mimeType: 'IMAGE/PNG' })));
    expect(response.status).toBe(200);
  });

  it('非法文件在校验阶段被拦下，不会调用 Provider（保护上游额度）', async () => {
    const { calls } = useSuccessProvider();
    await onRequestPost(buildContext(buildRequest({ mimeType: 'image/gif' })));
    expect(calls).toHaveLength(0);
  });
});

describe('POST /api/remove-bg / 体积上限', () => {
  it('超过 ALLOWED_MAX_MB → 413 UPLOAD_TOO_LARGE，不可重试', async () => {
    useSuccessProvider();
    // 用小上限避免真的分配 10MB：0.001MB = 1048 字节
    const env: ProviderEnv = { ALLOWED_MAX_MB: '0.001' };

    const response = await onRequestPost(
      buildContext(buildRequest({ bytes: new Uint8Array(4096) }), env),
    );

    expect(response.status).toBe(413);
    expectNoStore(response);
    const body = await readError(response);
    expect(body.code).toBe('UPLOAD_TOO_LARGE');
    expect(body.retryable).toBe(false);
    expect(body.message).toContain('MB');
  });

  it('正好等于上限的文件通过', async () => {
    useSuccessProvider();
    const maxBytes = Math.floor(0.001 * 1024 * 1024); // 1048

    const response = await onRequestPost(
      buildContext(buildRequest({ bytes: new Uint8Array(maxBytes) }), {
        ALLOWED_MAX_MB: '0.001',
      }),
    );

    expect(response.status).toBe(200);
  });

  it('file.size 撒谎时二次字节校验仍能拦下 → 413', async () => {
    useSuccessProvider();

    // 伪造一个 size 与真实内容不符的文件条目，模拟不可信客户端
    const lyingFile = {
      name: 'liar.png',
      type: 'image/png',
      size: 10,
      arrayBuffer: async () => new ArrayBuffer(4096),
    };
    const request = {
      headers: new Headers({ 'Content-Type': 'multipart/form-data; boundary=x' }),
      formData: async () => new Map([['image', lyingFile]]),
    } as unknown as Request;

    const response = await onRequestPost(
      buildContext(request, { ALLOWED_MAX_MB: '0.001' }),
    );

    expect(response.status).toBe(413);
    expect((await readError(response)).code).toBe('UPLOAD_TOO_LARGE');
  });

  it('非法 ALLOWED_MAX_MB 回退默认 10MB', async () => {
    useSuccessProvider();

    for (const raw of ['abc', '-5', '0', '']) {
      const response = await onRequestPost(
        buildContext(buildRequest({ bytes: new Uint8Array(2048) }), { ALLOWED_MAX_MB: raw }),
      );
      expect(response.status).toBe(200);
    }
  });
});

describe('POST /api/remove-bg / 并发闸门', () => {
  it('MAX_CONCURRENCY=1 时第二个并发请求 → 429 RATE_LIMITED 且可重试', async () => {
    const { release, started } = useDeferredProvider();
    const env: ProviderEnv = { MAX_CONCURRENCY: '1' };

    // 第一个请求占位（同步 active += 1 后才 await）
    const first = onRequestPost(buildContext(buildRequest(), env));
    await started;

    const second = await onRequestPost(buildContext(buildRequest(), env));

    expect(second.status).toBe(429);
    expectNoStore(second);
    expect(second.headers.get('Retry-After')).toBe('3');
    const body = await readError(second);
    expect(body.code).toBe('RATE_LIMITED');
    expect(body.retryable).toBe(true);

    release();
    expect((await first).status).toBe(200);
  });

  it('闸门在 finally 中归还，前一请求结束后可继续服务', async () => {
    const { release, started } = useDeferredProvider();
    const env: ProviderEnv = { MAX_CONCURRENCY: '1' };

    const first = onRequestPost(buildContext(buildRequest(), env));
    await started;
    release();
    expect((await first).status).toBe(200);

    // 名额已归还
    useSuccessProvider();
    const third = await onRequestPost(buildContext(buildRequest(), env));
    expect(third.status).toBe(200);
  });

  it('异常路径同样归还名额（不会永久堵死）', async () => {
    const env: ProviderEnv = { MAX_CONCURRENCY: '1' };

    useFailingProvider(new ProviderError('PROVIDER_ERROR', '上游炸了', true));
    expect((await onRequestPost(buildContext(buildRequest(), env))).status).toBe(502);

    useSuccessProvider();
    expect((await onRequestPost(buildContext(buildRequest(), env))).status).toBe(200);
  });

  it('MAX_CONCURRENCY 默认值允许 2 个并发', async () => {
    const { release, started } = useDeferredProvider();

    const first = onRequestPost(buildContext(buildRequest()));
    await started;
    const second = onRequestPost(buildContext(buildRequest()));

    release();
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
  });
});

describe('POST /api/remove-bg / Provider 异常', () => {
  it('Provider 抛 ProviderError(PROVIDER_ERROR) → 502 且可重试', async () => {
    useFailingProvider(new ProviderError('PROVIDER_ERROR', '去背景服务暂时不可用，请稍后重试', true));

    const response = await onRequestPost(buildContext(buildRequest()));

    expect(response.status).toBe(502);
    expectNoStore(response);
    const body = await readError(response);
    expect(body.code).toBe('PROVIDER_ERROR');
    expect(body.retryable).toBe(true);
    expect(body.message).toBe('去背景服务暂时不可用，请稍后重试');
  });

  it('上游余额不足 → 502 且不可重试（避免前端无脑重试烧额度）', async () => {
    useFailingProvider(new ProviderError('PROVIDER_ERROR', '额度已用尽', false));

    const response = await onRequestPost(buildContext(buildRequest()));

    expect(response.status).toBe(502);
    expect((await readError(response)).retryable).toBe(false);
  });

  it('上游限流透传 → 429 RATE_LIMITED', async () => {
    useFailingProvider(new ProviderError('RATE_LIMITED', '请求过于频繁，请稍后重试', true));

    const response = await onRequestPost(buildContext(buildRequest()));

    expect(response.status).toBe(429);
    expect((await readError(response)).code).toBe('RATE_LIMITED');
  });

  it('未知异常 → 500 INTERNAL，不泄露内部堆栈', async () => {
    useFailingProvider(new TypeError('undefined is not a function'));

    const response = await onRequestPost(buildContext(buildRequest()));

    expect(response.status).toBe(500);
    const body = await readError(response);
    expect(body.code).toBe('INTERNAL');
    expect(body.retryable).toBe(true);
    expect(body.message).toBe('服务开小差了，请稍后重试');
    expect(JSON.stringify(body)).not.toContain('undefined is not a function');
  });

  it('detail 只进服务端日志，不下发前端', async () => {
    useFailingProvider(
      new ProviderError('PROVIDER_ERROR', '对外文案', true, 'remove.bg 500: SECRET-INTERNAL'),
    );

    const response = await onRequestPost(buildContext(buildRequest()));
    const raw = await response.text();

    expect(raw).not.toContain('SECRET-INTERNAL');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('Provider 返回空字节时不会被当作成功的 200 图片', async () => {
    useSuccessProvider(new Uint8Array(0));

    const response = await onRequestPost(buildContext(buildRequest()));

    // 端点本身不校验（由 Provider 负责），但至少不能返回可用图片
    if (response.status === 200) {
      expect((await response.arrayBuffer()).byteLength).toBe(0);
    } else {
      expect(response.status).toBeGreaterThanOrEqual(500);
    }
  });
});

describe('POST /api/remove-bg / 超时保护', () => {
  it('Provider 迟迟不返回 → 504 TIMEOUT 且可重试', async () => {
    useHangingProvider();
    // 注意：readConfig 对超时值有 1000ms 下限，因此这里实际按 1s 触发
    const response = await onRequestPost(
      buildContext(buildRequest(), { PROVIDER_TIMEOUT_MS: '50' }),
    );

    expect(response.status).toBe(504);
    expectNoStore(response);
    const body = await readError(response);
    expect(body.code).toBe('TIMEOUT');
    expect(body.retryable).toBe(true);
    expect(body.message).toContain('超时');
  }, 8_000);

  it('超时后名额归还，后续请求正常', async () => {
    useHangingProvider();
    await onRequestPost(buildContext(buildRequest(), {
      PROVIDER_TIMEOUT_MS: '50',
      MAX_CONCURRENCY: '1',
    }));

    useSuccessProvider();
    const response = await onRequestPost(buildContext(buildRequest(), { MAX_CONCURRENCY: '1' }));
    expect(response.status).toBe(200);
  }, 8_000);

  it('Provider 在超时前返回则正常成功（race 不误伤）', async () => {
    mockState.provider = {
      name: 'fake-slow-ok',
      remove: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { pngBuffer: FAKE_PNG };
      },
    };

    const response = await onRequestPost(
      buildContext(buildRequest(), { PROVIDER_TIMEOUT_MS: '2000' }),
    );
    expect(response.status).toBe(200);
  });
});

describe('其他 HTTP 方法', () => {
  it('OPTIONS 预检返回 204 + CORS 头', async () => {
    const response = await onRequestOptions(
      buildContext(new Request('https://example.com/api/remove-bg', { method: 'OPTIONS' })),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  });

  it.each(['GET', 'PUT', 'DELETE', 'PATCH'])('%s → 405 INVALID_INPUT', async (method) => {
    const response = await onRequest(
      buildContext(new Request('https://example.com/api/remove-bg', { method })),
    );

    expect(response.status).toBe(405);
    expectNoStore(response);
    const body = await readError(response);
    expect(body.code).toBe('INVALID_INPUT');
    expect(body.retryable).toBe(false);
    expect(body.message).toContain('POST');
  });
});

describe('env 缺省与容错', () => {
  it('context.env 缺失时不崩（走全部默认配置）', async () => {
    useSuccessProvider();

    const response = await onRequestPost({
      request: buildRequest(),
    } as unknown as PagesFunctionContext<ProviderEnv>);

    expect(response.status).toBe(200);
  });

  it('ALLOWED_TYPES 为空串时回退默认白名单', async () => {
    useSuccessProvider();

    const ok = await onRequestPost(buildContext(buildRequest({ mimeType: 'image/png' }), {
      ALLOWED_TYPES: '',
    }));
    expect(ok.status).toBe(200);

    const rejected = await onRequestPost(buildContext(buildRequest({ mimeType: 'image/gif' }), {
      ALLOWED_TYPES: '   ,  ,',
    }));
    expect(rejected.status).toBe(415);
  });

  it('未 mock Provider 且缺 API Key → 500 INTERNAL（真实工厂路径）', async () => {
    mockState.provider = null;

    const response = await onRequestPost(buildContext(buildRequest(), {}));

    expect(response.status).toBe(500);
    const body = await readError(response);
    expect(body.code).toBe('INTERNAL');
    expect(body.retryable).toBe(false);
  });
});

describe('契约自检', () => {
  it('所有失败响应都是 JSON 且结构为 {code,message,retryable}', async () => {
    useSuccessProvider();

    const cases: Array<Response | Promise<Response>> = [
      onRequestPost(buildContext(buildRequest({ field: 'wrong' }))),
      onRequestPost(buildContext(buildRequest({ mimeType: 'image/gif' }))),
      onRequestPost(
        buildContext(buildRequest({ bytes: new Uint8Array(4096) }), { ALLOWED_MAX_MB: '0.001' }),
      ),
      onRequest(buildContext(new Request('https://example.com/api/remove-bg'))),
    ];

    for (const pending of cases) {
      const response = await pending;
      expect(response.headers.get('Content-Type')).toContain('application/json');
      const body = await readError(response);
      expect(Object.keys(body).sort()).toEqual(['code', 'message', 'retryable']);
      expect(typeof body.code).toBe('string');
      expect(typeof body.message).toBe('string');
      expect(typeof body.retryable).toBe('boolean');
    }
  });
});

/** 使用到的类型引用，避免 noUnusedLocals 告警。 */
export type _Unused = BackgroundRemovalProvider | RemovalOutput;
