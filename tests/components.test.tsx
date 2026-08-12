/**
 * components.test.tsx — 组件渲染测试
 *
 * 覆盖：Uploader 事件、StatusBlock 状态、ResultView 视图切换。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import React from "react";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** 给 <input type="file"> 注入 files（jsdom 无 DataTransfer） */
function setInputFiles(input: HTMLInputElement, files: File[]): void {
  const fileList = {
    length: files.length,
    item: (idx: number) => files[idx] ?? null,
    [Symbol.iterator]: function* () {
      for (const f of files) yield f;
    },
    ...files,
  } as unknown as FileList;
  Object.defineProperty(input, "files", { value: fileList, configurable: true });
}

/** 构造模拟 paste 事件的 clipboardData */
function makeClipboardData(items: Array<{ type: string; value: File | string }>): DataTransfer {
  return {
    items: items.map((item) => ({
      type: item.type,
      kind: typeof item.value === "string" ? "string" : "file",
      getAsFile: () => (item.value instanceof File ? item.value : null),
    })),
  } as unknown as DataTransfer;
}

// ------------------------------------------------------------------
// Uploader
// ------------------------------------------------------------------

import Uploader from "@/components/Uploader";

describe("Uploader", () => {
  let onFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onFile = vi.fn();
  });

  function renderUploader(disabled = false) {
    return render(<Uploader disabled={disabled} onFile={onFile} />);
  }

  it("渲染上传区域", () => {
    renderUploader();
    expect(
      screen.getByRole("button", { name: /上传图片区域/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/JPG.*PNG.*WEBP/i)).toBeInTheDocument();
  });

  it("disabled 时 tabIndex=-1、aria-disabled=true", () => {
    renderUploader(true);
    const zone = screen.getByRole("button", { name: /上传图片区域/i });
    expect(zone).toHaveAttribute("aria-disabled", "true");
    expect(zone).toHaveAttribute("tabindex", "-1");
  });

  it("点击选择有效文件 → 调 onFile", () => {
    renderUploader();
    const file = new File(["x".repeat(1024)], "photo.png", {
      type: "image/png",
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    setInputFiles(input, [file]);
    fireEvent.change(input);

    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("点击选择无效类型 → 不调 onFile，显示本地错误", async () => {
    renderUploader();
    const file = new File(["x".repeat(1024)], "doc.txt", {
      type: "text/plain",
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    setInputFiles(input, [file]);
    fireEvent.change(input);

    expect(onFile).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/不支持的文件类型/);
    });
  });

  it("disabled 时选择文件 → 不调 onFile", () => {
    renderUploader(true);
    const file = new File(["x".repeat(1024)], "photo.png", {
      type: "image/png",
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    setInputFiles(input, [file]);
    fireEvent.change(input);
    expect(onFile).not.toHaveBeenCalled();
  });

  it("拖拽有效文件 → 调 onFile", () => {
    renderUploader();
    const zone = screen.getByRole("button", { name: /上传图片区域/i });
    const file = new File(["x".repeat(1024)], "photo.png", {
      type: "image/png",
    });

    fireEvent.dragOver(zone);
    expect(screen.getByText("松手上传")).toBeInTheDocument();

    fireEvent.drop(zone, {
      dataTransfer: { files: [file] },
    });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("disabled 时拖拽 → 不调 onFile", () => {
    renderUploader(true);
    const zone = screen.getByRole("button", { name: /上传图片区域/i });
    const file = new File(["x".repeat(1024)], "photo.png", {
      type: "image/png",
    });

    fireEvent.drop(zone, {
      dataTransfer: { files: [file] },
    });
    expect(onFile).not.toHaveBeenCalled();
  });

  it("粘贴图片 → 调 onFile", () => {
    renderUploader();
    const container = document.querySelector(".w-full")!;

    const file = new File(["x".repeat(1024)], "paste.png", {
      type: "image/png",
    });

    fireEvent.paste(container, {
      clipboardData: makeClipboardData([{ type: "image/png", value: file }]),
    });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("disabled 时粘贴图片 → 不调 onFile", () => {
    renderUploader(true);
    const container = document.querySelector(".w-full")!;

    const file = new File(["x".repeat(1024)], "paste.png", {
      type: "image/png",
    });

    fireEvent.paste(container, {
      clipboardData: makeClipboardData([{ type: "image/png", value: file }]),
    });
    expect(onFile).not.toHaveBeenCalled();
  });

  it("粘贴非图片 → 不调 onFile", () => {
    renderUploader();
    const container = document.querySelector(".w-full")!;

    fireEvent.paste(container, {
      clipboardData: makeClipboardData([{ type: "text/plain", value: "hello" }]),
    });
    expect(onFile).not.toHaveBeenCalled();
  });

  it("超大文件 → 不调 onFile，显示本地错误", async () => {
    renderUploader();
    const tooBig = 5 * 1024 * 1024 + 1;
    const file = new File(["x".repeat(tooBig)], "big.png", {
      type: "image/png",
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    setInputFiles(input, [file]);
    fireEvent.change(input);

    expect(onFile).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/文件过大/);
    });
  });

  it("Enter/空格 → 触发文件选择器", () => {
    renderUploader();
    const zone = screen.getByRole("button", { name: /上传图片区域/i });
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");

    fireEvent.keyDown(zone, { key: "Enter" });
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it("外部 error prop 传递 → 显示", () => {
    render(
      <Uploader
        disabled={false}
        onFile={onFile}
        error={{
          code: "TIMEOUT",
          message: "处理超时",
          retryable: true,
        }}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("处理超时");
  });
});

// ------------------------------------------------------------------
// StatusBlock
// ------------------------------------------------------------------

import StatusBlock from "@/components/StatusBlock";

describe("StatusBlock", () => {
  it("loading 态：显示 spinner + '正在去背景'", () => {
    render(
      <StatusBlock
        status="loading"
        error={null}
        originalUrl={null}
        onRetry={vi.fn()}
        onReset={vi.fn()}
      />
    );
    expect(screen.getByText("正在去背景…")).toBeInTheDocument();
    // animate-spin spinner
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("loading 态无按钮", () => {
    render(
      <StatusBlock
        status="loading"
        error={null}
        originalUrl={null}
        onRetry={vi.fn()}
        onReset={vi.fn()}
      />
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("loading 态有 originalUrl → 显示缩略图", () => {
    render(
      <StatusBlock
        status="loading"
        error={null}
        originalUrl="blob:original"
        onRetry={vi.fn()}
        onReset={vi.fn()}
      />
    );
    expect(screen.getByText("原图")).toBeInTheDocument();
    const img = screen.getByAltText("正在处理的原始图片");
    expect(img).toHaveAttribute("src", "blob:original");
  });

  it("error 态 + retryable=true → 显示重试 + 换一张", () => {
    const onRetry = vi.fn();
    const onReset = vi.fn();
    render(
      <StatusBlock
        status="error"
        error={{
          code: "TIMEOUT",
          message: "处理超时",
          retryable: true,
        }}
        originalUrl={null}
        onRetry={onRetry}
        onReset={onReset}
      />
    );

    expect(screen.getByText("处理超时")).toBeInTheDocument();
    expect(screen.getByText("错误码：TIMEOUT")).toBeInTheDocument();
    expect(screen.getByText("重试")).toBeInTheDocument();
    expect(screen.getByText("换一张图片")).toBeInTheDocument();

    fireEvent.click(screen.getByText("重试"));
    expect(onRetry).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("换一张图片"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("error 态 + retryable=false → 只显示换一张（无重试）", () => {
    render(
      <StatusBlock
        status="error"
        error={{
          code: "INVALID_INPUT",
          message: "文件无效",
          retryable: false,
        }}
        originalUrl={null}
        onRetry={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.queryByText("重试")).toBeNull();
    expect(screen.getByText("换一张图片")).toBeInTheDocument();
  });

  it("idle/done 态 → 不渲染(null)", () => {
    const { container } = render(
      <StatusBlock
        status="idle"
        error={null}
        originalUrl={null}
        onRetry={vi.fn()}
        onReset={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("done 态不渲染", () => {
    const { container } = render(
      <StatusBlock
        status="done"
        error={null}
        originalUrl={null}
        onRetry={vi.fn()}
        onReset={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });
});

// ------------------------------------------------------------------
// ResultView
// ------------------------------------------------------------------

import ResultView from "@/components/ResultView";

describe("ResultView", () => {
  it("默认显示去背景视图（带棋盘格）", () => {
    render(
      <ResultView
        resultUrl="blob:result"
        originalUrl="blob:original"
        fileName="cat.png"
        onReset={vi.fn()}
      />
    );
    const imgs = screen.getAllByRole("img");
    // 默认视图"去背景"：只有一个 img
    expect(imgs.some((img) => img.getAttribute("alt") === "去背景结果")).toBe(true);
  });

  it("三视图切换：去背景 → 原图 → 对比", () => {
    render(
      <ResultView
        resultUrl="blob:result"
        originalUrl="blob:original"
        fileName="cat.png"
        onReset={vi.fn()}
      />
    );

    // 切换到原图（点击 tab 按钮）
    const originalTab = screen.getByRole("tab", { name: "原图" });
    fireEvent.click(originalTab);
    const originalImg = screen.getByAltText("原始图片");
    expect(originalImg).toHaveAttribute("src", "blob:original");

    // 切换到对比（点击 tab 按钮）
    const compareTab = screen.getByRole("tab", { name: "对比" });
    fireEvent.click(compareTab);
    // 对比视图中有原图和去背景两个区域
    expect(screen.getByAltText("原始图片")).toBeInTheDocument();
    expect(screen.getByAltText("去背景结果")).toBeInTheDocument();
  });

  it("无 originalUrl 时不显示视图切换 tabs", () => {
    render(
      <ResultView
        resultUrl="blob:result"
        originalUrl={null}
        fileName="cat.png"
        onReset={vi.fn()}
      />
    );
    // 无 tablist
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("下载按钮 href 指向 resultUrl，download 属性正确", () => {
    render(
      <ResultView
        resultUrl="blob:result"
        originalUrl="blob:original"
        fileName="cat.png"
        onReset={vi.fn()}
      />
    );

    const downloadLink = screen.getByText("下载透明 PNG").closest("a")!;
    expect(downloadLink).toHaveAttribute("href", "blob:result");
    expect(downloadLink).toHaveAttribute("download", "cat_nobg.png");
  });

  it("点击'再传一张' → 调 onReset", () => {
    const onReset = vi.fn();
    render(
      <ResultView
        resultUrl="blob:result"
        originalUrl="blob:original"
        fileName="cat.png"
        onReset={onReset}
      />
    );

    fireEvent.click(screen.getByText("再传一张"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("棋盘格 CSS 在结果视图中应用", () => {
    render(
      <ResultView
        resultUrl="blob:result"
        originalUrl="blob:original"
        fileName="cat.png"
        onReset={vi.fn()}
      />
    );
    // 默认"去背景"视图：img 的父 div 有棋盘格背景
    const img = screen.getByAltText("去背景结果");
    const imgContainer = img.parentElement;
    expect(imgContainer).not.toBeNull();
    if (imgContainer) {
      const style = imgContainer.getAttribute("style");
      expect(style).toContain("repeating-conic-gradient");
    }
  });
});
