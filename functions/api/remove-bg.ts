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
      { error: "服务端未配置 REMOVE_BG_API_KEY（请在 Cloudflare 环境变量或 .dev.vars 中设置）" },
      500
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "无效的表单数据" }, 400);
  }

  const image = form.get("image");
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
    const detail = await resp.text();
    return json({ error: `remove.bg 调用失败（${resp.status}）：${detail}` }, 502);
  }

  const buf = await resp.arrayBuffer();
  return new Response(buf, {
    headers: {
      "content-type": "image/png",
      "cache-control": "no-store",
    },
  });
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
