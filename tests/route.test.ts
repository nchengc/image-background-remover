/**
 * route.test.ts — Route Handler 集成测试（mock provider，无真实网络）
 *
 * 使用 MockRequest 直接注入 FormData（绕过 Node 22 Request.formData() 返回 Blob 的限制）。
 * mock getProvider 返回 fakeProvider，避免烧真实 remove.bg 额度。
 *
 * 注意：active/MAX_CONCURRENCY/PROVIDER_TIMEOUT_MS 均为模块级常量，
 * 并发/超时测试使用 vi.resetModules() + 动态重导入以设置不同的 env 值。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ------------------------------------------------------------------
// Mock provider 模块
// ------------------------------------------------------------------

const fakeProvider = {
  name: "fake",
  remove: vi.fn(),
};

vi.mock("@/lib/providers/removebg", () => ({
  __esModule: true,
  getProvider: vi.fn(() => fakeProvider),
  ProviderError: class ProviderError extends Error {
    code: string;
    retryable: boolean;
    httpStatus: number;
    detail?: string;
    constructor(
      code: string,
      message: string,
      retryable: boolean,
      httpStatus: number,
      detail?: string
    ) {
      super(message);
      this.name = "ProviderError";
      this.code = code;
      this.retryable = retryable;
      this.httpStatus = httpStatus;
      this.detail = detail;
    }
  },
}));

import { POST, OPTIONS } from "@/../app/api/remove-bg/route";
import { ErrorCodes } from "@/lib/types";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const PNG_MAGIC = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13,
]);

function makePNGBuffer(): Uint8Array {
  return new Uint8Array(PNG_MAGIC);
}

function makeFile(
  name: string,
  type: string,
  size: number,
  content?: Uint8Array
): File {
  const data = content ?? new Uint8Array(size);
  return new File([data], name, { type });
}

/** Mock Request: formData() 直接返回已构造的 FormData */
function mockFormDataRequest(formData: FormData): Request {
  return {
    formData: async () => formData,
    headers: new Headers(),
  } as unknown as Request;
}

// ------------------------------------------------------------------
// POST — 基本场景（默认 env, MAX_CONCURRENCY=2）
// ------------------------------------------------------------------

describe("POST /api/remove-bg（基本场景）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeProvider.remove.mockResolvedValue({
      pngBuffer: makePNGBuffer(),
    });
  });

  // ----- 正常流 -----

  it("① 正常：200 + image/png + Cache-Control:no-store + body 匹配", async () => {
    const file = makeFile("photo.jpg", "image/jpeg", 1024);
    const fd = new FormData();
    fd.append("image", file);
    const req = mockFormDataRequest(fd);

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const body = new Uint8Array(await res.arrayBuffer());
    expect(body).toEqual(makePNGBuffer());
  });

  it("png MIME 也正常", async () => {
    const file = makeFile("icon.png", "image/png", 512);
    const fd = new FormData();
    fd.append("image", file);
    const req = mockFormDataRequest(fd);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("webp MIME 也正常", async () => {
    const file = makeFile("img.webp", "image/webp", 512);
    const fd = new FormData();
    fd.append("image", file);
    const req = mockFormDataRequest(fd);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  // ----- 错误流 -----

  it("② 缺文件(image) → 400 INVALID_INPUT retryable:false", async () => {
    const fd = new FormData();
    const req = mockFormDataRequest(fd);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe(ErrorCodes.INVALID_INPUT);
    expect(json.retryable).toBe(false);
  });

  it("③ 错误 MIME(text/plain) → 415 UNSUPPORTED_TYPE retryable:false", async () => {
    const file = makeFile("doc.txt", "text/plain", 1024);
    const fd = new FormData();
    fd.append("image", file);
    const req = mockFormDataRequest(fd);
    const res = await POST(req);
    expect(res.status).toBe(415);
    const json = await res.json();
    expect(json.code).toBe(ErrorCodes.UNSUPPORTED_TYPE);
    expect(json.retryable).toBe(false);
  });

  it("③ 错误 MIME(image/gif) → 415 UNSUPPORTED_TYPE", async () => {
    const file = makeFile("anim.gif", "image/gif", 1024);
    const fd = new FormData();
    fd.append("image", file);
    const req = mockFormDataRequest(fd);
    const res = await POST(req);
    expect(res.status).toBe(415);
  });

  it("④ 超大文件(>4MB) → 413 UPLOAD_TOO_LARGE retryable:false", async () => {
    const tooBig = 5 * 1024 * 1024;
    const file = makeFile("big.jpg", "image/jpeg", tooBig);
    const fd = new FormData();
    fd.append("image", file);
    const req = mockFormDataRequest(fd);
    const res = await POST(req);
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.code).toBe(ErrorCodes.UPLOAD_TOO_LARGE);
    expect(json.retryable).toBe(false);
  });

  it("⑥ fakeProvider 抛 ProviderError → 502 PROVIDER_ERROR", async () => {
    const providerMod = await import("@/lib/providers/removebg");
    fakeProvider.remove.mockRejectedValueOnce(
      new providerMod.ProviderError(
        ErrorCodes.PROVIDER_ERROR,
        "服务配置异常",
        false,
        502
      )
    );

    const file = makeFile("a.png", "image/png", 1024);
    const fd = new FormData();
    fd.append("image", file);
    const req = mockFormDataRequest(fd);
    const res = await POST(req);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.code).toBe(ErrorCodes.PROVIDER_ERROR);
    expect(json.retryable).toBe(false);
  });

  // ----- 额外用例 -----

  it("formData 解析异常 → 400 INVALID_INPUT", async () => {
    const req = {
      formData: async () => {
        throw new Error("Parse error");
      },
      headers: new Headers(),
    } as unknown as Request;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe(ErrorCodes.INVALID_INPUT);
  });

  it("0 字节文件 → 正常进入 provider", async () => {
    const file = makeFile("empty.jpg", "image/jpeg", 0, new Uint8Array(0));
    const fd = new FormData();
    fd.append("image", file);
    const req = mockFormDataRequest(fd);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("字段名错误（file 而非 image）→ 400 INVALID_INPUT", async () => {
    const file = makeFile("a.jpg", "image/jpeg", 1024);
    const fd = new FormData();
    fd.append("file", file);
    const req = mockFormDataRequest(fd);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe(ErrorCodes.INVALID_INPUT);
  });

  it("字段值为字符串而非 File → 400 INVALID_INPUT", async () => {
    const fd = new FormData();
    fd.append("image", "not-a-file");
    const req = mockFormDataRequest(fd);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ------------------------------------------------------------------
// OPTIONS
// ------------------------------------------------------------------

describe("OPTIONS /api/remove-bg", () => {
  it("返回 204 + CORS 头", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain(
      "Content-Type"
    );
  });

  it("OPTIONS 体为空", async () => {
    const res = await OPTIONS();
    const text = await res.text();
    expect(text).toBe("");
  });
});

// ------------------------------------------------------------------
// POST — 需重置模块的动态场景
// ------------------------------------------------------------------

describe("POST — 并发控制（需重置模块）", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    fakeProvider.remove.mockReset();
  });

  it("⑤ 并发满(MAX_CONCURRENCY=1) → 第二个 429 RATE_LIMITED", async () => {
    // 设置 env 再重新导入模块
    vi.stubEnv("MAX_CONCURRENCY", "1");
    const routeMod = await import("@/../app/api/remove-bg/route");

    fakeProvider.remove.mockResolvedValue({ pngBuffer: makePNGBuffer() });

    // 第一个请求占用并发槽
    let resolveFirst: (v: unknown) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    fakeProvider.remove.mockImplementationOnce(() => firstPromise);

    const file1 = makeFile("a.jpg", "image/jpeg", 1024);
    const fd1 = new FormData();
    fd1.append("image", file1);
    const req1 = mockFormDataRequest(fd1);
    const res1Promise = routeMod.POST(req1);

    // 第二个请求应被限流
    const file2 = makeFile("b.jpg", "image/jpeg", 1024);
    const fd2 = new FormData();
    fd2.append("image", file2);
    const req2 = mockFormDataRequest(fd2);
    const res2 = await routeMod.POST(req2);

    expect(res2.status).toBe(429);
    const json2 = await res2.json();
    expect(json2.code).toBe(ErrorCodes.RATE_LIMITED);
    expect(json2.retryable).toBe(true);

    // 释放第一个请求
    resolveFirst!({ pngBuffer: makePNGBuffer() });
    const res1 = await res1Promise;
    expect(res1.status).toBe(200);

    vi.unstubAllEnvs();
  });

  it("⑤ 并发异常路径也 finally 归还名额", async () => {
    vi.stubEnv("MAX_CONCURRENCY", "1");
    const routeMod = await import("@/../app/api/remove-bg/route");

    const providerMod = await import("@/lib/providers/removebg");
    fakeProvider.remove.mockRejectedValueOnce(
      new providerMod.ProviderError(ErrorCodes.TIMEOUT, "超时", true, 504)
    );

    const file1 = makeFile("a.jpg", "image/jpeg", 1024);
    const fd1 = new FormData();
    fd1.append("image", file1);
    const req1 = mockFormDataRequest(fd1);
    const res1 = await routeMod.POST(req1);
    expect(res1.status).toBe(504);

    // 槽位归还，第二个请求成功
    fakeProvider.remove.mockResolvedValueOnce({
      pngBuffer: makePNGBuffer(),
    });
    const file2 = makeFile("b.jpg", "image/jpeg", 1024);
    const fd2 = new FormData();
    fd2.append("image", file2);
    const req2 = mockFormDataRequest(fd2);
    const res2 = await routeMod.POST(req2);
    expect(res2.status).toBe(200);

    vi.unstubAllEnvs();
  });
});
