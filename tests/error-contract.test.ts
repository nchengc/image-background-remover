/**
 * error-contract.test.ts — 错误码/HTTP状态码映射契约测试
 *
 * 覆盖：ERROR_HTTP_STATUS 映射一致性、HTTP_TO_ERROR_CODE 逆映射、
 * ERROR_MESSAGES 中文文案完整性。
 */

import { describe, it, expect } from "vitest";
import {
  ErrorCodes,
  ERROR_HTTP_STATUS,
  HTTP_TO_ERROR_CODE,
  ERROR_MESSAGES,
  DEFAULT_RETRYABLE_BY_CODE,
} from "@/lib/types";

// 全部 7 个错误码
const ALL_CODES = Object.values(ErrorCodes);

describe("错误码契约", () => {
  it("ErrorCodes 包含全部 7 个错误码", () => {
    expect(ALL_CODES).toHaveLength(7);
    expect(ALL_CODES).toEqual(
      expect.arrayContaining([
        "INVALID_INPUT",
        "UNSUPPORTED_TYPE",
        "UPLOAD_TOO_LARGE",
        "RATE_LIMITED",
        "PROVIDER_ERROR",
        "TIMEOUT",
        "INTERNAL",
      ])
    );
  });
});

describe("ERROR_HTTP_STATUS 映射", () => {
  it("7 个错误码全部有 HTTP 状态码", () => {
    for (const code of ALL_CODES) {
      expect(ERROR_HTTP_STATUS).toHaveProperty(code);
      expect(typeof ERROR_HTTP_STATUS[code]).toBe("number");
    }
  });

  it("具体映射值正确", () => {
    expect(ERROR_HTTP_STATUS.INVALID_INPUT).toBe(400);
    expect(ERROR_HTTP_STATUS.UNSUPPORTED_TYPE).toBe(415);
    expect(ERROR_HTTP_STATUS.UPLOAD_TOO_LARGE).toBe(413);
    expect(ERROR_HTTP_STATUS.RATE_LIMITED).toBe(429);
    expect(ERROR_HTTP_STATUS.PROVIDER_ERROR).toBe(502);
    expect(ERROR_HTTP_STATUS.TIMEOUT).toBe(504);
    expect(ERROR_HTTP_STATUS.INTERNAL).toBe(500);
  });

  it("所有状态码在有效 HTTP 错误范围内", () => {
    for (const code of ALL_CODES) {
      expect(ERROR_HTTP_STATUS[code]).toBeGreaterThanOrEqual(400);
      expect(ERROR_HTTP_STATUS[code]).toBeLessThan(600);
    }
  });
});

describe("HTTP_TO_ERROR_CODE 逆映射", () => {
  it("7 个 HTTP 状态码全部可逆查", () => {
    const httpCodes = [400, 413, 415, 429, 500, 502, 504];
    expect(Object.keys(HTTP_TO_ERROR_CODE).map(Number).sort()).toEqual(
      httpCodes.sort()
    );
  });

  it("正向逆一致：ERROR_HTTP_STATUS → HTTP_TO_ERROR_CODE", () => {
    for (const code of ALL_CODES) {
      const httpStatus = ERROR_HTTP_STATUS[code];
      expect(HTTP_TO_ERROR_CODE[httpStatus]).toBe(code);
    }
  });
});

describe("ERROR_MESSAGES 中文文案", () => {
  it("7 个错误码全部有中文文案", () => {
    for (const code of ALL_CODES) {
      expect(ERROR_MESSAGES).toHaveProperty(code);
      const msg = ERROR_MESSAGES[code];
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("文案均为中文字符（含中文标点）", () => {
    for (const code of ALL_CODES) {
      const msg = ERROR_MESSAGES[code];
      // 至少包含一个中文字符或中文标点
      expect(msg).toMatch(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/);
    }
  });
});

describe("DEFAULT_RETRYABLE_BY_CODE", () => {
  it("7 个错误码全部有默认可重试标志", () => {
    for (const code of ALL_CODES) {
      expect(DEFAULT_RETRYABLE_BY_CODE).toHaveProperty(code);
      expect(typeof DEFAULT_RETRYABLE_BY_CODE[code]).toBe("boolean");
    }
  });

  it("INVALID_INPUT / UNSUPPORTED_TYPE / UPLOAD_TOO_LARGE 不可重试", () => {
    expect(DEFAULT_RETRYABLE_BY_CODE.INVALID_INPUT).toBe(false);
    expect(DEFAULT_RETRYABLE_BY_CODE.UNSUPPORTED_TYPE).toBe(false);
    expect(DEFAULT_RETRYABLE_BY_CODE.UPLOAD_TOO_LARGE).toBe(false);
  });

  it("RATE_LIMITED / PROVIDER_ERROR / TIMEOUT / INTERNAL 可重试", () => {
    expect(DEFAULT_RETRYABLE_BY_CODE.RATE_LIMITED).toBe(true);
    expect(DEFAULT_RETRYABLE_BY_CODE.PROVIDER_ERROR).toBe(true);
    expect(DEFAULT_RETRYABLE_BY_CODE.TIMEOUT).toBe(true);
    expect(DEFAULT_RETRYABLE_BY_CODE.INTERNAL).toBe(true);
  });
});
