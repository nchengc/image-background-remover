// @vitest-environment jsdom
/**
 * useRemoveBg Hook 端到端行为测试（mock fetch，不发真实网络）。
 *
 * 覆盖不变量：
 * - 前端预校验失败不发请求
 * - 瞬时网络错误静默重试 1 次；第二次仍失败才进 error
 * - 非瞬时错误（4xx）不重试
 * - loading 期间拒绝新的 submit / retry
 * - retry 复用 lastFile
 * - objectURL 在替换 / reset / 卸载时全部回收
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRemoveBg } from '@/lib/useRemoveBg';

type UrlWithObjectApi = {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

let createdUrls: string[] = [];
let revokedUrls: string[] = [];
let urlSeq = 0;

function makeFile(name = 'cat.png', type = 'image/png', size = 2048): File {
  return new File([new Uint8Array(size)], name, { type });
}

/** 成功的 PNG 响应。 */
function pngResponse(bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])): Response {
  return new Response(bytes, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  });
}

/** 服务端 JSON 错误响应。 */
function errorResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  createdUrls = [];
  revokedUrls = [];
  urlSeq = 0;

  const target = URL as unknown as UrlWithObjectApi;
  target.createObjectURL = () => {
    urlSeq += 1;
    const url = `blob:url-${urlSeq}`;
    createdUrls.push(url);
    return url;
  };
  target.revokeObjectURL = (url: string) => {
    revokedUrls.push(url);
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useRemoveBg / 成功路径', () => {
  it('submit 合法文件后进入 loading，成功后到 done', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(pngResponse()));
    const { result } = renderHook(() => useRemoveBg());

    expect(result.current.status).toBe('idle');
    expect(result.current.isBusy).toBe(false);

    await act(async () => {
      result.current.submit(makeFile('cat.png'));
    });

    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.resultUrl).toBeTruthy();
    expect(result.current.resultSize).toBeGreaterThan(0);
    expect(result.current.fileName).toBe('cat.png');
    expect(result.current.error).toBeNull();
    expect(result.current.isBusy).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('以 multipart 的 image 字段提交到 /api/remove-bg', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(pngResponse()));
    const { result } = renderHook(() => useRemoveBg());
    const file = makeFile('dog.webp', 'image/webp');

    await act(async () => {
      result.current.submit(file);
    });
    await waitFor(() => expect(result.current.status).toBe('done'));

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/remove-bg');
    expect(init.method).toBe('POST');
    const form = init.body as FormData;
    expect(form.get('image')).toBeTruthy();
    expect((form.get('image') as File).name).toBe('dog.webp');
    expect(init.signal).toBeDefined();
  });

  it('成功后 reset 回到 idle 并回收所有 objectURL', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(pngResponse()));
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });
    await waitFor(() => expect(result.current.status).toBe('done'));

    const created = [...createdUrls];
    expect(created).toHaveLength(2); // 原图 + 结果

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.originalUrl).toBeNull();
    expect(result.current.resultUrl).toBeNull();
    for (const url of created) {
      expect(revokedUrls).toContain(url);
    }
  });

  it('连续提交两张图时回收上一轮的 objectURL', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(pngResponse()));
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile('first.png'));
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
    const firstRound = [...createdUrls];

    await act(async () => {
      result.current.submit(makeFile('second.png'));
    });
    await waitFor(() => expect(result.current.status).toBe('done'));

    expect(result.current.fileName).toBe('second.png');
    for (const url of firstRound) {
      expect(revokedUrls).toContain(url);
    }
  });

  it('卸载时回收全部 objectURL（无内存泄漏）', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(pngResponse()));
    const { result, unmount } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
    const created = [...createdUrls];

    unmount();

    for (const url of created) {
      expect(revokedUrls).toContain(url);
    }
  });
});

describe('useRemoveBg / 前端预校验', () => {
  it('非法格式直接进 error，不发请求', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(pngResponse()));
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile('a.gif', 'image/gif'));
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error?.code).toBe('UNSUPPORTED_TYPE');
    expect(result.current.error?.retryable).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('超大文件直接进 error，不发请求', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(pngResponse()));
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile('big.png', 'image/png', 10 * 1024 * 1024 + 1));
    });

    expect(result.current.error?.code).toBe('UPLOAD_TOO_LARGE');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('预校验失败时 lastFile 为空，retry 无效（避免死循环）', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(pngResponse()));
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile('a.gif', 'image/gif'));
    });
    act(() => {
      result.current.retry();
    });

    expect(result.current.status).toBe('error');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('useRemoveBg / 服务端错误', () => {
  it('415 UNSUPPORTED_TYPE 不重试，直接进 error', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        errorResponse(415, { code: 'UNSUPPORTED_TYPE', message: '格式不支持', retryable: false }),
      );
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error?.code).toBe('UNSUPPORTED_TYPE');
    expect(result.current.error?.retryable).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('502 PROVIDER_ERROR 透传服务端文案与 retryable', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      errorResponse(502, {
        code: 'PROVIDER_ERROR',
        message: '去背景服务暂时不可用，请稍后重试',
        retryable: true,
      }),
    );
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error).toMatchObject({
      code: 'PROVIDER_ERROR',
      message: '去背景服务暂时不可用，请稍后重试',
      retryable: true,
    });
  });

  it('响应体不是 JSON 时按状态码兜底映射错误码', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response('<html>Gateway Timeout</html>', {
        status: 504,
        headers: { 'Content-Type': 'text/html' },
      }),
    );
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error?.code).toBe('TIMEOUT');
    expect(result.current.error?.retryable).toBe(true);
  });

  it('200 但 Content-Type 不是图片 → BAD_RESPONSE', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error?.code).toBe('BAD_RESPONSE');
    expect(result.current.error?.retryable).toBe(true);
  });

  it('200 但图片体积为 0 → BAD_RESPONSE', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(new Uint8Array(0), { status: 200, headers: { 'Content-Type': 'image/png' } }),
    );
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error?.code).toBe('BAD_RESPONSE');
  });
});

describe('useRemoveBg / 瞬时错误静默重试', () => {
  it('首次网络异常后自动重试 1 次并成功（用户无感知）', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(() => Promise.resolve(pngResponse()));
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });

    await waitFor(() => expect(result.current.status).toBe('done'), { timeout: 5_000 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // 中途不应闪现 error
    expect(result.current.error).toBeNull();
  });

  it('两次网络异常后进 error，且只重试 1 次', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });

    await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 5_000 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current.error?.code).toBe('NETWORK_ERROR');
    expect(result.current.error?.retryable).toBe(true);
  });

  it('504 TIMEOUT 同样触发一次静默重试', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async () =>
        errorResponse(504, { code: 'TIMEOUT', message: '处理超时', retryable: true }),
      )
      .mockImplementation(() => Promise.resolve(pngResponse()));
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });

    await waitFor(() => expect(result.current.status).toBe('done'), { timeout: 5_000 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('429 不触发静默重试（交给用户手动重试，避免加剧限流）', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () =>
        errorResponse(429, { code: 'RATE_LIMITED', message: '请求过于频繁', retryable: true }),
      );
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.error?.code).toBe('RATE_LIMITED');
    expect(result.current.error?.retryable).toBe(true);
  });
});

describe('useRemoveBg / 手动重试与防重复提交', () => {
  it('error 后 retry 复用 lastFile 并成功', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async () =>
        errorResponse(502, { code: 'PROVIDER_ERROR', message: '上游挂了', retryable: true }),
      )
      .mockImplementation(() => Promise.resolve(pngResponse()));
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile('retry-me.png'));
    });
    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.status).toBe('done'));

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current.fileName).toBe('retry-me.png');
    // 第二次请求用的是同一个文件名
    const secondForm = (fetchSpy.mock.calls[1][1] as RequestInit).body as FormData;
    expect((secondForm.get('image') as File).name).toBe('retry-me.png');
  });

  it('retry 期间保留 originalUrl（不白屏）', async () => {
    let resolveSecond: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async () =>
        errorResponse(502, { code: 'PROVIDER_ERROR', message: '上游挂了', retryable: true }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    const { result } = renderHook(() => useRemoveBg());

    await act(async () => {
      result.current.submit(makeFile());
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    const originalUrl = result.current.originalUrl;

    act(() => {
      result.current.retry();
    });

    expect(result.current.status).toBe('loading');
    expect(result.current.originalUrl).toBe(originalUrl);

    await act(async () => {
      resolveSecond?.(pngResponse());
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
  });

  it('loading 期间的 submit 被忽略（防重复提交）', async () => {
    let resolveFirst: ((response: Response) => void) | undefined;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const { result } = renderHook(() => useRemoveBg());

    act(() => {
      result.current.submit(makeFile('first.png'));
    });
    expect(result.current.status).toBe('loading');
    expect(result.current.isBusy).toBe(true);

    act(() => {
      result.current.submit(makeFile('second.png'));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.fileName).toBe('first.png');

    await act(async () => {
      resolveFirst?.(pngResponse());
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
  });

  it('loading 期间的 retry 被忽略', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => new Promise<Response>(() => undefined));
    const { result } = renderHook(() => useRemoveBg());

    act(() => {
      result.current.submit(makeFile());
    });
    act(() => {
      result.current.retry();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('loading');
  });

  it('reset 后在途响应被丢弃（requestId 失效），状态保持 idle', async () => {
    let resolveFirst: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const { result } = renderHook(() => useRemoveBg());

    act(() => {
      result.current.submit(makeFile());
    });
    expect(result.current.status).toBe('loading');

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe('idle');

    // 迟到的成功响应不应把状态改回 done
    await act(async () => {
      resolveFirst?.(pngResponse());
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.resultUrl).toBeNull();
  });
});
