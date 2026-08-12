/**
 * useRemoveBg 状态机（纯 reducer）单元测试。
 *
 * 契约（来自系统设计）：
 *   idle  --SUBMIT-->  loading
 *   loading --SUCCESS--> done
 *   loading --FAIL-->    error
 *   error --RETRY-->     loading（复用 lastFile / originalUrl / fileName）
 *   error|done --RESET--> idle（全部字段回到初始值）
 *   loading 态必须拒绝 RETRY（防重复提交）
 */

import { describe, expect, it } from 'vitest';

import { initialState, reducer, type RemoveBgState } from '@/lib/useRemoveBg';

/** 构造一个可控的 File，避免依赖真实文件系统。 */
function makeFile(name = 'cat.png', type = 'image/png', size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

/** 走一遍 idle → loading，返回 loading 态与所用 file。 */
function toLoading(fileName = 'cat.png'): { state: RemoveBgState; file: File } {
  const file = makeFile(fileName);
  const state = reducer(initialState, {
    type: 'SUBMIT',
    file,
    originalUrl: 'blob:original-1',
  });
  return { state, file };
}

/** 走到 error 态。 */
function toError(): { state: RemoveBgState; file: File } {
  const { state: loading, file } = toLoading();
  const state = reducer(loading, {
    type: 'FAIL',
    error: { code: 'PROVIDER_ERROR', message: '上游挂了', retryable: true },
  });
  return { state, file };
}

describe('reducer / 初始状态', () => {
  it('初始状态为 idle 且各字段为空', () => {
    expect(initialState).toEqual({
      status: 'idle',
      error: null,
      originalUrl: null,
      resultUrl: null,
      resultSize: 0,
      fileName: '',
      lastFile: null,
    });
  });

  it('未知 action 返回原状态引用（不产生无意义重渲染）', () => {
    // 故意越过类型约束，模拟运行时收到未知事件
    const next = reducer(initialState, { type: 'UNKNOWN' } as never);
    expect(next).toBe(initialState);
  });
});

describe('reducer / SUBMIT', () => {
  it('idle --SUBMIT--> loading，记录 originalUrl / fileName / lastFile', () => {
    const { state, file } = toLoading('my-photo.jpg');

    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();
    expect(state.originalUrl).toBe('blob:original-1');
    expect(state.fileName).toBe('my-photo.jpg');
    expect(state.lastFile).toBe(file);
    expect(state.resultUrl).toBeNull();
    expect(state.resultSize).toBe(0);
  });

  it('done --SUBMIT--> loading，清空上一轮结果', () => {
    const { state: loading } = toLoading();
    const done = reducer(loading, {
      type: 'SUCCESS',
      resultUrl: 'blob:result-1',
      resultSize: 999,
    });

    const nextFile = makeFile('second.webp', 'image/webp');
    const next = reducer(done, {
      type: 'SUBMIT',
      file: nextFile,
      originalUrl: 'blob:original-2',
    });

    expect(next.status).toBe('loading');
    expect(next.resultUrl).toBeNull();
    expect(next.resultSize).toBe(0);
    expect(next.fileName).toBe('second.webp');
    expect(next.lastFile).toBe(nextFile);
    expect(next.originalUrl).toBe('blob:original-2');
  });

  it('error --SUBMIT--> loading，清空错误', () => {
    const { state: errorState } = toError();
    const next = reducer(errorState, {
      type: 'SUBMIT',
      file: makeFile(),
      originalUrl: 'blob:original-3',
    });

    expect(next.status).toBe('loading');
    expect(next.error).toBeNull();
  });

  it('reducer 是纯函数：不修改传入的 state', () => {
    const snapshot = { ...initialState };
    reducer(initialState, { type: 'SUBMIT', file: makeFile(), originalUrl: 'blob:x' });
    expect(initialState).toEqual(snapshot);
  });
});

describe('reducer / SUCCESS', () => {
  it('loading --SUCCESS--> done，写入结果并保留原图信息', () => {
    const { state: loading, file } = toLoading('dog.png');
    const next = reducer(loading, {
      type: 'SUCCESS',
      resultUrl: 'blob:result-1',
      resultSize: 20_480,
    });

    expect(next.status).toBe('done');
    expect(next.error).toBeNull();
    expect(next.resultUrl).toBe('blob:result-1');
    expect(next.resultSize).toBe(20_480);
    // 原图与文件信息必须保留，否则「对比视图 / 下载命名」会失效
    expect(next.originalUrl).toBe('blob:original-1');
    expect(next.fileName).toBe('dog.png');
    expect(next.lastFile).toBe(file);
  });
});

describe('reducer / FAIL', () => {
  it('loading --FAIL--> error，保留 originalUrl 与 lastFile 供重试', () => {
    const { state, file } = toError();

    expect(state.status).toBe('error');
    expect(state.error).toEqual({
      code: 'PROVIDER_ERROR',
      message: '上游挂了',
      retryable: true,
    });
    expect(state.originalUrl).toBe('blob:original-1');
    expect(state.lastFile).toBe(file);
  });

  it('idle --FAIL--> error（前端预校验失败，未进入 loading 也能报错）', () => {
    const next = reducer(initialState, {
      type: 'FAIL',
      error: { code: 'UNSUPPORTED_TYPE', message: '格式不支持', retryable: false },
    });

    expect(next.status).toBe('error');
    expect(next.error?.retryable).toBe(false);
    expect(next.lastFile).toBeNull();
  });
});

describe('reducer / RETRY', () => {
  it('error --RETRY--> loading，复用 lastFile 且不白屏', () => {
    const { state: errorState, file } = toError();
    const next = reducer(errorState, { type: 'RETRY' });

    expect(next.status).toBe('loading');
    expect(next.error).toBeNull();
    expect(next.lastFile).toBe(file); // 关键：复用同一个 File
    expect(next.originalUrl).toBe('blob:original-1'); // 关键：不白屏
    expect(next.fileName).toBe('cat.png');
    expect(next.resultUrl).toBeNull();
    expect(next.resultSize).toBe(0);
  });

  it('loading 态忽略 RETRY（防重复提交）', () => {
    const { state: loading } = toLoading();
    expect(reducer(loading, { type: 'RETRY' })).toBe(loading);
  });

  it('idle 态忽略 RETRY', () => {
    expect(reducer(initialState, { type: 'RETRY' })).toBe(initialState);
  });

  it('done 态忽略 RETRY', () => {
    const { state: loading } = toLoading();
    const done = reducer(loading, { type: 'SUCCESS', resultUrl: 'blob:r', resultSize: 1 });
    expect(reducer(done, { type: 'RETRY' })).toBe(done);
  });

  it('error 但缺少 lastFile 时忽略 RETRY（无图可重试）', () => {
    const errorWithoutFile = reducer(initialState, {
      type: 'FAIL',
      error: { code: 'INVALID_INPUT', message: '没有图片', retryable: false },
    });
    expect(reducer(errorWithoutFile, { type: 'RETRY' })).toBe(errorWithoutFile);
  });
});

describe('reducer / RESET', () => {
  it('done --RESET--> idle，全部字段回到初始值', () => {
    const { state: loading } = toLoading();
    const done = reducer(loading, { type: 'SUCCESS', resultUrl: 'blob:r', resultSize: 5 });
    expect(reducer(done, { type: 'RESET' })).toEqual(initialState);
  });

  it('error --RESET--> idle', () => {
    const { state: errorState } = toError();
    expect(reducer(errorState, { type: 'RESET' })).toEqual(initialState);
  });

  it('RESET 返回新对象而非共享的 initialState 引用（避免被后续修改污染）', () => {
    const { state: errorState } = toError();
    expect(reducer(errorState, { type: 'RESET' })).not.toBe(initialState);
  });
});

describe('reducer / 完整链路', () => {
  it('idle → loading → error → loading(RETRY) → done → idle(RESET)', () => {
    const file = makeFile('flow.png');
    let state = reducer(initialState, { type: 'SUBMIT', file, originalUrl: 'blob:o' });
    expect(state.status).toBe('loading');

    state = reducer(state, {
      type: 'FAIL',
      error: { code: 'TIMEOUT', message: '超时', retryable: true },
    });
    expect(state.status).toBe('error');

    state = reducer(state, { type: 'RETRY' });
    expect(state.status).toBe('loading');
    expect(state.lastFile).toBe(file);

    state = reducer(state, { type: 'SUCCESS', resultUrl: 'blob:r', resultSize: 100 });
    expect(state.status).toBe('done');

    state = reducer(state, { type: 'RESET' });
    expect(state).toEqual(initialState);
  });
});
