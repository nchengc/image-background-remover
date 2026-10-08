// Cloudflare Pages Function —— 同源代理 remove.bg
// 设计要点：图片全程在内存中转发，不写磁盘、不存储；API Key 仅来自环境变量。

interface Env {
  REMOVE_BG_API_KEY: string;
}

export async function onRequestPost(
  context: { request: Request; env: Env }
): Promise<Response> {
  const { request, env } = context;
  const apiKey = env.REMOVE_BG_API_KEY;

  if (!apiKey) {
    return json(
      { error: "服务端未配置 REMOVE_BG_API_KEY（请在 Cloudflare 环境变量中设置）" },
      500
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "无效的表单数据" }, 400);
  }

  // 兼容 image / image_file 两种字段名，避免前后端或调试工具字段名不一致直接 400
  const image = form.get("image") ?? form.get("image_file");
  if (!image || typeof image === "string") {
    return json({ error: "缺少 image 文件字段" }, 400);
  }

  // 转发到 remove.bg（内存中构造请求，不落盘）
  const rbForm = new FormData();
  rbForm.append("image_file", image, "image.png");
  rbForm.append("size", "auto");
  rbForm.append("format", "png");

  let resp: Response;
  try {
    resp = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: rbForm,
    });
  } catch {
    return json({ error: "无法连接 remove.bg" }, 502);
  }

  if (!resp.ok) {
    // 截断原文，避免把 remove.bg 的大段 HTML/JSON 直接甩给前端
    const detail = (await resp.text()).slice(0, 200);
    return json({ error: friendlyError(resp.status, detail) }, 502);
  }

  const buf = await resp.arrayBuffer();
  return new Response(buf, {
    headers: {
      "content-type": "image/png",
      "cache-control": "no-store",
    },
  });
}

/** 把 remove.bg 的状态码翻译成用户看得懂的中文提示 */
function friendlyError(status: number, detail: string): string {
  switch (status) {
    case 400:
      return "图片格式不受支持或文件已损坏（remove.bg 400）。请换一张 PNG / JPG 试试。";
    case 401:
    case 403:
      return "remove.bg API Key 无效或已失效（401/403），请到 Cloudflare 环境变量中更新。";
    case 402:
      return "remove.bg 额度已用尽，或这张图超出了当前套餐的尺寸上限（402）。免费额度每月 50 张。";
    case 429:
      return "请求过于频繁，已被 remove.bg 限流（429），请稍后再试。";
    case 413:
      return "图片体积过大（413），remove.bg 单张上限约 10MB。";
    default:
      return `remove.bg 调用失败（${status}）：${detail}`;
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
