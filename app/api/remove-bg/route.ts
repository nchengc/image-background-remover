import { NextRequest, NextResponse } from "next/server";

// Cloudflare Pages 原生构建（next-on-pages）要求 API 路由运行在 edge 运行时
export const runtime = "edge";

// 图片全程在内存中转发，不写磁盘、不存储；密钥仅来自环境变量。
export async function POST(req: NextRequest) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "服务端未配置 REMOVE_BG_API_KEY（请在环境变量或 .env.local 中设置）",
      },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "无效的表单数据" }, { status: 400 });
  }

  const image = form.get("image");
  if (!image || typeof image === "string") {
    return NextResponse.json({ error: "缺少 image 文件字段" }, { status: 400 });
  }

  // 内存中构造转发请求，不做任何落盘
  const rbForm = new FormData();
  rbForm.append("image_file", image as Blob, "image.png");
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
    return NextResponse.json({ error: "无法连接 remove.bg" }, { status: 502 });
  }

  if (!resp.ok) {
    const detail = await resp.text();
    return NextResponse.json(
      { error: `remove.bg 调用失败（${resp.status}）：${detail}` },
      { status: 502 }
    );
  }

  const buf = await resp.arrayBuffer();
  return new Response(buf, {
    headers: {
      "content-type": "image/png",
      "cache-control": "no-store",
    },
  });
}
