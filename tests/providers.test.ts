/**
 * providers.test.ts — ProviderError / getProvider 工厂 / toProviderError 映射
 *
 * 覆盖：ProviderError 构造、getProvider 默认/fallback、
 * RemoveBgProvider 请求构造、错误映射。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProviderError, RemoveBgProvider, getProvider } from "@/lib/providers/removebg";
import { ErrorCodes } from "@/lib/types";

// ---------------------------------------------------------------
// ProviderError
// ---------------------------------------------------------------

describe("ProviderError", () => {
  it("构造包含全部字段", () => {
    const err = new ProviderError(
      ErrorCodes.RATE_LIMITED,
      "当前请求较多",
      true,
      429,
      "detail text"
    );

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ProviderError");
    expect(err.code).toBe(ErrorCodes.RATE_LIMITED);
    expect(err.message).toBe("当前请求较多");
    expect(err.retryable).toBe(true);
    expect(err.httpStatus).toBe(429);
    expect(err.detail).toBe("detail text");
  });

  it("detail 可选（默认 undefined）", () => {
    const err = new ProviderError(
      ErrorCodes.INVALID_INPUT,
      "文件无效",
      false,
      400
    );
    expect(err.detail).toBeUndefined();
  });

  it("detail 截断测试（长文本不会影响构造）", () => {
    const long = "x".repeat(5000);
    const err = new ProviderError(
      ErrorCodes.PROVIDER_ERROR,
      "处理失败",
      false,
      502,
      long
    );
    expect(err.detail).toBe(long);
  });
});

// ---------------------------------------------------------------
// getProvider 工厂
// ---------------------------------------------------------------

describe("getProvider", () => {
  const env = { REMOVE_BG_API_KEY: "test-key" };

  it("默认返回 RemoveBgProvider（无 PROVIDER 环境变量）", () => {
    const provider = getProvider({ ...env });
    expect(provider.name).toBe("removebg");
    expect(provider).toBeInstanceOf(RemoveBgProvider);
  });

  it("PROVIDER=removebg → RemoveBgProvider", () => {
    const provider = getProvider({ ...env, PROVIDER: "removebg" });
    expect(provider.name).toBe("removebg");
    expect(provider).toBeInstanceOf(RemoveBgProvider);
  });

  it("PROVIDER=RemoveBg（大小写）→ 仍 fallback 到 RemoveBgProvider", () => {
    const provider = getProvider({ ...env, PROVIDER: "RemoveBg" });
    expect(provider).toBeInstanceOf(RemoveBgProvider);
  });

  it("未知 PROVIDER → fallback 到 RemoveBgProvider", () => {
    const provider = getProvider({ ...env, PROVIDER: "unknown" });
    expect(provider).toBeInstanceOf(RemoveBgProvider);
  });

  it("缺少 REMOVE_BG_API_KEY 时 RemoveBgProvider 构造抛出 ProviderError", () => {
    expect(() => new RemoveBgProvider({})).toThrow(ProviderError);
    expect(() => new RemoveBgProvider({})).toThrow("服务配置异常");
  });

  it("有 REMOVE_BG_API_KEY 时构造成功", () => {
    const p = new RemoveBgProvider({ REMOVE_BG_API_KEY: "test-key" });
    expect(p.name).toBe("removebg");
  });
});

// ---------------------------------------------------------------
// RemoveBgProvider.remove 错误映射（mock fetch）
// ---------------------------------------------------------------

describe("RemoveBgProvider 错误映射", () => {
  let provider: RemoveBgProvider;

  beforeEach(() => {
    provider = new RemoveBgProvider({ REMOVE_BG_API_KEY: "test-key" });
  });

  function mockFetch(status: number, body: unknown) {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  it("成功 200 → 返回 pngBuffer", async () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(png.buffer, { status: 200 })
    );

    const output = await provider.remove({
      buffer: new Uint8Array(4),
      mimeType: "image/png",
    });

    expect(output.pngBuffer).toEqual(png);
  });

  it("401 → PROVIDER_ERROR retryable:false", async () => {
    mockFetch(401, { errors: [{ title: "Unauthorized" }] });
    await expect(
      provider.remove({ buffer: new Uint8Array(4), mimeType: "image/png" })
    ).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_ERROR,
      retryable: false,
      httpStatus: 502,
    });
  });

  it("403 → PROVIDER_ERROR retryable:false", async () => {
    mockFetch(403, { errors: [{ title: "Forbidden" }] });
    await expect(
      provider.remove({ buffer: new Uint8Array(4), mimeType: "image/png" })
    ).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_ERROR,
      retryable: false,
    });
  });

  it("402 → PROVIDER_ERROR retryable:false（额度用尽）", async () => {
    mockFetch(402, { errors: [{ title: "Payment Required" }] });
    await expect(
      provider.remove({ buffer: new Uint8Array(4), mimeType: "image/png" })
    ).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_ERROR,
      retryable: false,
      message: "去背额度已用尽",
    });
  });

  it("429 → RATE_LIMITED retryable:true", async () => {
    mockFetch(429, { errors: [{ title: "Rate limited" }] });
    await expect(
      provider.remove({ buffer: new Uint8Array(4), mimeType: "image/png" })
    ).rejects.toMatchObject({
      code: ErrorCodes.RATE_LIMITED,
      retryable: true,
      httpStatus: 429,
    });
  });

  it("5xx → PROVIDER_ERROR retryable:true", async () => {
    mockFetch(500, { errors: [{ title: "Internal error" }] });
    await expect(
      provider.remove({ buffer: new Uint8Array(4), mimeType: "image/png" })
    ).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_ERROR,
      retryable: true,
      httpStatus: 502,
    });
  });

  it("503 → PROVIDER_ERROR retryable:true", async () => {
    mockFetch(503, { errors: [{ title: "Service Unavailable" }] });
    await expect(
      provider.remove({ buffer: new Uint8Array(4), mimeType: "image/png" })
    ).rejects.toMatchObject({
      code: ErrorCodes.PROVIDER_ERROR,
      retryable: true,
    });
  });

  it("网络错误（fetch reject）→ TIMEOUT retryable:true", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    await expect(
      provider.remove({ buffer: new Uint8Array(4), mimeType: "image/png" })
    ).rejects.toMatchObject({
      code: ErrorCodes.TIMEOUT,
      retryable: true,
      httpStatus: 504,
    });
  });

  it("400 + image_file_missing → INVALID_INPUT retryable:false", async () => {
    mockFetch(400, {
      errors: [{ code: "image_file_missing", title: "Missing file" }],
    });
    await expect(
      provider.remove({ buffer: new Uint8Array(4), mimeType: "image/png" })
    ).rejects.toMatchObject({
      code: ErrorCodes.INVALID_INPUT,
      retryable: false,
      httpStatus: 400,
    });
  });

  it("400 + unsupported_image_type → UNSUPPORTED_TYPE retryable:false", async () => {
    mockFetch(400, {
      errors: [{ code: "unsupported_image_type", title: "Unsupported" }],
    });
    await expect(
      provider.remove({ buffer: new Uint8Array(4), mimeType: "image/png" })
    ).rejects.toMatchObject({
      code: ErrorCodes.UNSUPPORTED_TYPE,
      retryable: false,
      httpStatus: 415,
    });
  });

  it("400 + 其他错误码 → INVALID_INPUT retryable:false", async () => {
    mockFetch(400, {
      errors: [{ code: "unknown_error", title: "Something wrong" }],
    });
    await expect(
      provider.remove({ buffer: new Uint8Array(4), mimeType: "image/png" })
    ).rejects.toMatchObject({
      code: ErrorCodes.INVALID_INPUT,
      retryable: false,
      httpStatus: 400,
    });
  });

  it("请求正确构造：FormData 含 image_file / size / X-Api-Key", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([137, 80, 78, 71]).buffer, { status: 200 })
    );

    await provider.remove({
      buffer: new Uint8Array([1, 2, 3]),
      mimeType: "image/jpeg",
      fileName: "photo.jpg",
    });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.remove.bg/v1.0/removebg");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)?.["X-Api-Key"]).toBe("test-key");
  });
});
