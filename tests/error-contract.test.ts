/**
 * 错误码契约一致性测试（前后端唯一事实来源校验）。
 *
 * 服务端 HTTP_STATUS_BY_CODE 与前端 CODE_BY_STATUS 必须互逆，
 * 否则「响应体丢失时按状态码兜底」会把错误码映射错，
 * 直接影响 StatusBlock 是否显示「重试」按钮。
 */

import { describe, expect, it } from 'vitest';

import { API_ERROR_CODES } from '../functions/api/remove-bg';
import {
  DEFAULT_RETRYABLE_BY_CODE,
  HTTP_STATUS_BY_CODE,
  type ApiErrorCode,
} from '../functions/providers/types';
import { CODE_BY_STATUS, RemoveBgRequestError } from '@/lib/useRemoveBg';

const EXPECTED_CODES: readonly ApiErrorCode[] = [
  'INVALID_INPUT',
  'UNSUPPORTED_TYPE',
  'UPLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'PROVIDER_ERROR',
  'TIMEOUT',
  'INTERNAL',
];

describe('错误码全集', () => {
  it('共 7 个错误码，三张表覆盖完全一致', () => {
    expect(EXPECTED_CODES).toHaveLength(7);
    expect(Object.keys(HTTP_STATUS_BY_CODE).sort()).toEqual([...EXPECTED_CODES].sort());
    expect(Object.keys(DEFAULT_RETRYABLE_BY_CODE).sort()).toEqual([...EXPECTED_CODES].sort());
    expect([...API_ERROR_CODES].sort()).toEqual([...EXPECTED_CODES].sort());
  });

  it('HTTP 状态码映射符合设计文档', () => {
    expect(HTTP_STATUS_BY_CODE).toEqual({
      INVALID_INPUT: 400,
      UNSUPPORTED_TYPE: 415,
      UPLOAD_TOO_LARGE: 413,
      RATE_LIMITED: 429,
      PROVIDER_ERROR: 502,
      TIMEOUT: 504,
      INTERNAL: 500,
    });
  });

  it('状态码无重复（保证可逆映射）', () => {
    const statuses = Object.values(HTTP_STATUS_BY_CODE);
    expect(new Set(statuses).size).toBe(statuses.length);
  });
});

describe('前后端映射互逆', () => {
  it.each(EXPECTED_CODES)('%s：CODE_BY_STATUS[HTTP_STATUS_BY_CODE[code]] === code', (code) => {
    const status = HTTP_STATUS_BY_CODE[code];
    expect(CODE_BY_STATUS[status]).toBe(code);
  });

  it('前端每个兜底状态码都能映射到已知错误码', () => {
    for (const [status, code] of Object.entries(CODE_BY_STATUS)) {
      expect(EXPECTED_CODES).toContain(code as ApiErrorCode);
      expect(Number(status)).toBeGreaterThanOrEqual(400);
    }
  });

  it('405（兜底 onRequest）映射为 INVALID_INPUT', () => {
    // 服务端 onRequest 用 INVALID_INPUT + HTTP 405，前端需要能识别
    expect(CODE_BY_STATUS[405]).toBe('INVALID_INPUT');
  });

  it('未知状态码在前端兜底为 INTERNAL', () => {
    expect(CODE_BY_STATUS[418]).toBeUndefined();
    expect(new RemoveBgRequestError(CODE_BY_STATUS[418] ?? 'INTERNAL').code).toBe('INTERNAL');
  });
});

describe('retryable 语义前后端一致', () => {
  it.each(EXPECTED_CODES)('%s 的默认 retryable 前后端一致', (code) => {
    const frontend = new RemoveBgRequestError(code);
    expect(frontend.retryable).toBe(DEFAULT_RETRYABLE_BY_CODE[code]);
  });

  it('入参类错误一律不可重试（重试同一份输入无意义）', () => {
    expect(DEFAULT_RETRYABLE_BY_CODE.INVALID_INPUT).toBe(false);
    expect(DEFAULT_RETRYABLE_BY_CODE.UNSUPPORTED_TYPE).toBe(false);
    expect(DEFAULT_RETRYABLE_BY_CODE.UPLOAD_TOO_LARGE).toBe(false);
  });

  it('服务端/上游类错误可重试', () => {
    expect(DEFAULT_RETRYABLE_BY_CODE.RATE_LIMITED).toBe(true);
    expect(DEFAULT_RETRYABLE_BY_CODE.PROVIDER_ERROR).toBe(true);
    expect(DEFAULT_RETRYABLE_BY_CODE.TIMEOUT).toBe(true);
    expect(DEFAULT_RETRYABLE_BY_CODE.INTERNAL).toBe(true);
  });
});

describe('错误文案', () => {
  it.each(EXPECTED_CODES)('%s 有非空且非兜底的中文文案', (code) => {
    const error = new RemoveBgRequestError(code);
    expect(error.message.length).toBeGreaterThan(0);
    expect(error.message).not.toBe('处理失败，请重试');
    // 不得把错误码本身暴露在文案里
    expect(error.message).not.toContain(code);
  });

  it.each(['NETWORK_ERROR', 'BAD_RESPONSE'])('客户端专属错误码 %s 也有文案', (code) => {
    const error = new RemoveBgRequestError(code);
    expect(error.message).not.toBe('处理失败，请重试');
    expect(error.retryable).toBe(true);
  });
});
