/**
 * reducer.test.ts — useRemoveBg reducer 状态机单元测试
 *
 * 覆盖：全部合法状态转移、loading 态禁止 SUBMIT/RETRY、
 * RETRY 复用 lastFile、RESET 引用安全。
 */

import { describe, it, expect, vi } from "vitest";
import { INITIAL_STATE } from "@/lib/types";
import type { RemoveBgState, RemoveBgEvent } from "@/lib/types";

// ------------------------------------------------------------------
// 复制 reducer（纯函数，不依赖 React）
// ------------------------------------------------------------------

function reducer(state: RemoveBgState, event: RemoveBgEvent): RemoveBgState {
  switch (state.status) {
    case "idle":
      if (event.type === "SUBMIT") {
        const originalUrl = URL.createObjectURL(event.file);
        return {
          ...state,
          status: "loading",
          lastFile: event.file,
          originalUrl,
          fileName: event.file.name,
          error: null,
        };
      }
      break;

    case "loading":
      if (event.type === "SUCCESS") {
        const resultUrl = URL.createObjectURL(event.result);
        return {
          ...state,
          status: "done",
          resultUrl,
          error: null,
        };
      }
      if (event.type === "FAIL") {
        return {
          ...state,
          status: "error",
          error: event.error,
        };
      }
      break;

    case "error":
      if (event.type === "RETRY") {
        return {
          ...state,
          status: "loading",
          error: null,
        };
      }
      if (event.type === "RESET") {
        return { ...INITIAL_STATE };
      }
      break;

    case "done":
      if (event.type === "RESET") {
        return { ...INITIAL_STATE };
      }
      break;
  }
  return state;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makeFile(name = "test.png", type = "image/png", size = 1024): File {
  return new File(["x".repeat(size)], name, { type });
}

function makeBlob(): Blob {
  return new Blob(["fake-png"], { type: "image/png" });
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe("reducer（状态机）", () => {
  describe("初始态 idle", () => {
    it("idle + SUBMIT → loading，附带 file / originalUrl / fileName", () => {
      const file = makeFile("cat.png");
      const next = reducer(INITIAL_STATE, { type: "SUBMIT", file });

      expect(next.status).toBe("loading");
      expect(next.lastFile).toBe(file);
      expect(next.fileName).toBe("cat.png");
      expect(next.originalUrl).toMatch(/^blob:/);
      expect(next.error).toBeNull();
    });

    it("idle + 无关事件 → state 不变（引用相同）", () => {
      const next = reducer(INITIAL_STATE, { type: "RESET" });
      expect(next).toBe(INITIAL_STATE);
    });

    it("idle + SUCCESS → state 不变", () => {
      const next = reducer(INITIAL_STATE, { type: "SUCCESS", result: makeBlob() });
      expect(next).toBe(INITIAL_STATE);
    });
  });

  describe("loading 态", () => {
    const loadingState: RemoveBgState = {
      ...INITIAL_STATE,
      status: "loading",
      lastFile: makeFile("cat.png"),
      originalUrl: "blob:original",
      fileName: "cat.png",
    };

    it("loading + SUCCESS → done，附带 resultUrl", () => {
      const result = makeBlob();
      const next = reducer(loadingState, { type: "SUCCESS", result });

      expect(next.status).toBe("done");
      expect(next.resultUrl).toMatch(/^blob:/);
      expect(next.error).toBeNull();
      // lastFile / originalUrl 保留
      expect(next.lastFile).toBe(loadingState.lastFile);
      expect(next.originalUrl).toBe(loadingState.originalUrl);
    });

    it("loading + FAIL → error，附带 error 信息", () => {
      const err = {
        code: "TIMEOUT",
        message: "超时",
        retryable: true,
      };
      const next = reducer(loadingState, { type: "FAIL", error: err });

      expect(next.status).toBe("error");
      expect(next.error).toEqual(err);
      // lastFile 保留以供 RETRY
      expect(next.lastFile).toBe(loadingState.lastFile);
    });

    it("loading + SUBMIT → state 不变（防重复提交）", () => {
      const next = reducer(loadingState, {
        type: "SUBMIT",
        file: makeFile("dog.png"),
      });
      expect(next).toBe(loadingState);
    });

    it("loading + RETRY → state 不变（禁止重试）", () => {
      const next = reducer(loadingState, { type: "RETRY" });
      expect(next).toBe(loadingState);
    });

    it("loading + RESET → state 不变（禁止重置）", () => {
      const next = reducer(loadingState, { type: "RESET" });
      expect(next).toBe(loadingState);
    });
  });

  describe("error 态", () => {
    const errorState: RemoveBgState = {
      ...INITIAL_STATE,
      status: "error",
      lastFile: makeFile("cat.png"),
      originalUrl: "blob:original",
      fileName: "cat.png",
      error: { code: "TIMEOUT", message: "超时", retryable: true },
    };

    it("error + RETRY → loading，保留 lastFile，清 error", () => {
      const next = reducer(errorState, { type: "RETRY" });

      expect(next.status).toBe("loading");
      expect(next.error).toBeNull();
      // RETRY 复用 lastFile
      expect(next.lastFile).toBe(errorState.lastFile);
      expect(next.originalUrl).toBe(errorState.originalUrl);
      expect(next.fileName).toBe("cat.png");
    });

    it("error + RESET → idle（INITIAL_STATE 展开）", () => {
      const next = reducer(errorState, { type: "RESET" });

      expect(next.status).toBe("idle");
      expect(next.error).toBeNull();
      expect(next.lastFile).toBeNull();
      expect(next.resultUrl).toBeNull();
      expect(next.originalUrl).toBeNull();
    });

    it("error + SUBMIT → state 不变", () => {
      const next = reducer(errorState, {
        type: "SUBMIT",
        file: makeFile("dog.png"),
      });
      expect(next).toBe(errorState);
    });

    it("error 无 lastFile 仍可 RESET", () => {
      const noFile: RemoveBgState = {
        ...INITIAL_STATE,
        status: "error",
        error: { code: "INTERNAL", message: "内部错误", retryable: true },
      };
      const next = reducer(noFile, { type: "RESET" });
      expect(next.status).toBe("idle");
    });
  });

  describe("done 态", () => {
    const doneState: RemoveBgState = {
      ...INITIAL_STATE,
      status: "done",
      lastFile: makeFile("cat.png"),
      originalUrl: "blob:original",
      resultUrl: "blob:result",
      fileName: "cat.png",
    };

    it("done + RESET → idle", () => {
      const next = reducer(doneState, { type: "RESET" });

      expect(next.status).toBe("idle");
      expect(next.error).toBeNull();
      expect(next.lastFile).toBeNull();
      expect(next.resultUrl).toBeNull();
      expect(next.originalUrl).toBeNull();
    });

    it("done + SUBMIT → state 不变", () => {
      const next = reducer(doneState, {
        type: "SUBMIT",
        file: makeFile("dog.png"),
      });
      expect(next).toBe(doneState);
    });

    it("done + RETRY → state 不变", () => {
      const next = reducer(doneState, { type: "RETRY" });
      expect(next).toBe(doneState);
    });

    it("done + SUCCESS → state 不变", () => {
      const next = reducer(doneState, { type: "SUCCESS", result: makeBlob() });
      expect(next).toBe(doneState);
    });
  });

  describe("INITIAL_STATE 引用安全", () => {
    it("RESET 不修改 INITIAL_STATE 对象", () => {
      const frozen = { ...INITIAL_STATE };
      const fromDone: RemoveBgState = {
        status: "done",
        error: null,
        lastFile: makeFile("x.png"),
        resultUrl: "blob:r",
        originalUrl: "blob:o",
        fileName: "x.png",
      };

      const next = reducer(fromDone, { type: "RESET" });
      expect(next).toEqual(frozen);
      // INITIAL_STATE 自身未被修改
      expect(INITIAL_STATE.status).toBe("idle");
    });
  });

  describe("边界情况", () => {
    it("RESET 在 error 态无 lastFile 时也能正常重置", () => {
      const state: RemoveBgState = {
        status: "error",
        error: { code: "INTERNAL", message: "内部错误", retryable: false },
        lastFile: null,
        resultUrl: null,
        originalUrl: null,
        fileName: "",
      };
      const next = reducer(state, { type: "RESET" });
      expect(next.status).toBe("idle");
    });
  });
});
