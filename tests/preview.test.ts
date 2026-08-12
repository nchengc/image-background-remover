/**
 * preview.test.ts — 预览工具函数单元测试
 *
 * 覆盖：buildDownloadFileName / formatFileSize / checkerboardStyle
 */

import { describe, it, expect } from "vitest";
import {
  buildDownloadFileName,
  formatFileSize,
  checkerboardStyle,
} from "@/lib/preview";

// ---------------------------------------------------------------
// buildDownloadFileName
// ---------------------------------------------------------------

describe("buildDownloadFileName", () => {
  it("普通文件名：返回 原名_nobg.png", () => {
    expect(buildDownloadFileName("cat.jpg")).toBe("cat_nobg.png");
  });

  it("多点扩展名：仅去除最后一个扩展名", () => {
    expect(buildDownloadFileName("photo.backup.jpg")).toBe("photo.backup_nobg.png");
  });

  it("无扩展名：直接加 _nobg.png", () => {
    expect(buildDownloadFileName("image")).toBe("image_nobg.png");
  });

  it("中文文件名：正常处理", () => {
    expect(buildDownloadFileName("猫咪照片.png")).toBe("猫咪照片_nobg.png");
  });

  it("空字符串：兜底为 image_nobg.png", () => {
    expect(buildDownloadFileName("")).toBe("image_nobg.png");
  });

  it("仅扩展名（如 .png）：兜底为 image_nobg.png", () => {
    expect(buildDownloadFileName(".png")).toBe("image_nobg.png");
  });

  it("过滤非法字符 \\ / : * ? \" < > |", () => {
    expect(buildDownloadFileName("a\\b/c:d*e?f\"g<h>i|j.png")).toBe(
      "a_b_c_d_e_f_g_h_i_j_nobg.png"
    );
  });

  it("80 字符截断（超长文件名）", () => {
    const long = "a".repeat(100);
    const result = buildDownloadFileName(`${long}.png`);
    // 100个a去扩展名后 base=100, cleaned=100, safe=slice(0,80)=80, "_nobg.png"=10 → 90 chars
    expect(result.length).toBe(89);
    expect(result).toMatch(/^a{80}_nobg\.png$/);
  });

  it("结果始终以 _nobg.png 结尾", () => {
    expect(buildDownloadFileName("hello.jpeg")).toMatch(/_nobg\.png$/);
    expect(buildDownloadFileName("")).toMatch(/_nobg\.png$/);
    expect(buildDownloadFileName("test")).toMatch(/_nobg\.png$/);
  });

  it("纯空格名处理：trim 后为空兜底", () => {
    // "   " → base 去除扩展名 = "   ", cleaned = "___" (空格不会被正则匹配), trim → "", safe = "image"
    // Actually: 空格不会被 [\\/:*?"<>|] 匹配，trim 后空 → "image"
    const result = buildDownloadFileName("   ");
    expect(result).toBe("image_nobg.png");
  });

  it("前后空白被 trim", () => {
    const result = buildDownloadFileName("  hello  .jpg");
    // base = "  hello  " (去除 .jpg), cleaned = "  hello  " (无非法字符), trim → "hello", safe = "hello"
    expect(result).toBe("hello_nobg.png");
  });
});

// ---------------------------------------------------------------
// formatFileSize
// ---------------------------------------------------------------

describe("formatFileSize", () => {
  it("0 字节 → '0 B'", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("< 1024 → 单位 B", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("≥ 1024 且 < 1024*1024 → 单位 KB（一位小数）", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("≥ 1024*1024 → 单位 MB（一位小数）", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(4194304)).toBe("4.0 MB");
  });

  it("大数据 MB 格式化", () => {
    // 10 MB
    expect(formatFileSize(10485760)).toBe("10.0 MB");
  });

  it("NaN → 落入 MB 分支（JS 比较语义：NaN < x 始终 false）", () => {
    // NaN < 1024 → false, NaN < 1024*1024 → false, 落入 MB 分支
    expect(formatFileSize(NaN)).toBe("NaN MB");
  });

  it("负数 → 仍按绝对值逻辑格式化", () => {
    // -1 < 1024 → "-1 B"
    expect(formatFileSize(-1)).toBe("-1 B");
  });

  it("非整数 bytes，格式化正确", () => {
    expect(formatFileSize(1024.5)).toBe("1.0 KB");
  });
});

// ---------------------------------------------------------------
// checkerboardStyle
// ---------------------------------------------------------------

describe("checkerboardStyle", () => {
  it("返回包含 repeating-conic-gradient 的 CSS 字符串", () => {
    const style = checkerboardStyle();
    expect(style).toContain("repeating-conic-gradient");
  });

  it("包含透明色值 #d1d5db 和 #ffffff", () => {
    const style = checkerboardStyle();
    expect(style).toContain("#d1d5db");
    expect(style).toContain("#ffffff");
  });

  it("包含 50% 定位和 20px 尺寸", () => {
    const style = checkerboardStyle();
    expect(style).toContain("50%");
    expect(style).toContain("20px 20px");
  });

  it("括号配平（左括号数 = 右括号数）", () => {
    const style = checkerboardStyle();
    const left = (style.match(/\(/g) ?? []).length;
    const right = (style.match(/\)/g) ?? []).length;
    expect(left).toBe(right);
    expect(left).toBeGreaterThan(0);
  });

  it("多次调用返回相同字符串（无副作用）", () => {
    expect(checkerboardStyle()).toBe(checkerboardStyle());
  });
});
