/**
 * remove.bg Provider 实现 + Provider 工厂。
 *
 * 上游协议：
 *   POST https://api.remove.bg/v1.0/removebg
 *   Header: X-Api-Key: <REMOVE_BG_API_KEY>
 *   Body:   multipart/form-data，字段 image_file=<图片字节>，size=auto
 *   成功：  直接返回 PNG 二进制（含 alpha）
 *   失败：  JSON {errors:[{title,detail,code}]} + 对应 HTTP 状态码
 *
 * 说明：免费档 Key 返回预览分辨率（约 0.25MP），全分辨率需付费 Key；
 * 代码不做区分，由环境变量中的 Key 与 REMOVE_BG_SIZE 决定实际输出。
 */

import {
  ProviderError,
  type BackgroundRemovalProvider,
  type ProviderEnv,
  type RemovalInput,
  type RemovalOutput,
} from './types';

const REMOVE_BG_ENDPOINT = 'https://api.remove.bg/v1.0/removebg';
const DEFAULT_SIZE = 'auto';
const DEFAULT_UPLOAD_NAME = 'upload';

/** remove.bg 失败响应体结构。 */
interface RemoveBgErrorResponse {
  errors?: Array<{ title?: string; detail?: string; code?: string }>;
}

export class RemoveBgProvider implements BackgroundRemovalProvider {
  readonly name = 'removebg';

  private readonly apiKey: string;
  private readonly size: string;

  /**
   * @param apiKey remove.bg API Key（必填，仅服务端持有）
   * @param size   输出尺寸参数，默认 auto
   */
  constructor(apiKey: string, size: string = DEFAULT_SIZE) {
    if (!apiKey) {
      throw new ProviderError(
        'INTERNAL',
        '服务端未配置去背景服务密钥，请联系站点管理员',
        false,
        'REMOVE_BG_API_KEY is missing',
      );
    }
    this.apiKey = apiKey;
    this.size = size || DEFAULT_SIZE;
  }

  /** 调用 remove.bg 完成去背景，返回透明 PNG 字节。 */
  async remove(input: RemovalInput): Promise<RemovalOutput> {
    const form = new FormData();
    // 用 Blob 包装内存字节，避免任何磁盘中转。
    const blob = new Blob([input.buffer], { type: input.mimeType || 'application/octet-stream' });
    form.append('image_file', blob, input.fileName || DEFAULT_UPLOAD_NAME);
    form.append('size', this.size);

    let response: Response;
    try {
      response = await fetch(REMOVE_BG_ENDPOINT, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
          Accept: 'image/png, application/json',
        },
        body: form,
      });
    } catch (error) {
      // 网络层失败（DNS / TLS / 连接中断），可重试。
      throw new ProviderError(
        'PROVIDER_ERROR',
        '连接去背景服务失败，请稍后重试',
        true,
        error instanceof Error ? error.message : String(error),
      );
    }

    if (!response.ok) {
      throw await toProviderError(response);
    }

    const pngBuffer = new Uint8Array(await response.arrayBuffer());
    if (pngBuffer.byteLength === 0) {
      throw new ProviderError('PROVIDER_ERROR', '去背景服务返回了空结果，请重试', true, 'empty body');
    }

    return { pngBuffer };
  }
}

/**
 * 把 remove.bg 的失败响应映射为统一的 ProviderError。
 *
 * 映射规则：
 * - 400 参数/无法识别前景 → PROVIDER_ERROR，不可重试（重试同一张图无意义，需换图）
 * - 401/403 Key 无效/无权限 → PROVIDER_ERROR，不可重试（需修配置）
 * - 402 余额不足           → PROVIDER_ERROR，不可重试
 * - 429 触发上游限流       → RATE_LIMITED，可重试
 * - 其他 4xx / 5xx         → PROVIDER_ERROR，可重试
 */
export async function toProviderError(response: Response): Promise<ProviderError> {
  const raw = await safeReadText(response);
  const upstreamMessage = extractUpstreamMessage(raw);
  const detail = `remove.bg ${response.status}: ${raw.slice(0, 500)}`;

  switch (response.status) {
    case 400:
      return new ProviderError(
        'PROVIDER_ERROR',
        upstreamMessage || '这张图片无法识别主体，请换一张更清晰的图片试试',
        false,
        detail,
      );
    case 401:
    case 403:
      return new ProviderError('PROVIDER_ERROR', '去背景服务鉴权失败，请联系站点管理员', false, detail);
    case 402:
      return new ProviderError('PROVIDER_ERROR', '去背景服务额度已用尽，请稍后再试或联系站点管理员', false, detail);
    case 429:
      return new ProviderError('RATE_LIMITED', '请求过于频繁，请稍后重试', true, detail);
    default:
      return new ProviderError(
        'PROVIDER_ERROR',
        upstreamMessage || '去背景服务暂时不可用，请稍后重试',
        true,
        detail,
      );
  }
}

/** 读取响应文本，任何异常都退化为空串，保证错误处理链不中断。 */
async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

/** 从 remove.bg 的 JSON 错误体中提取可读信息；非 JSON 返回空串。 */
function extractUpstreamMessage(raw: string): string {
  if (!raw) {
    return '';
  }
  try {
    const parsed = JSON.parse(raw) as RemoveBgErrorResponse;
    const first = parsed.errors?.[0];
    if (!first) {
      return '';
    }
    return [first.title, first.detail].filter(Boolean).join('：');
  } catch {
    return '';
  }
}

/**
 * Provider 工厂：按 env.PROVIDER 选择实现，默认 removebg。
 * 新增供应商时在此处扩展 switch 分支即可，代理层无需改动。
 */
export function getProvider(env: ProviderEnv): BackgroundRemovalProvider {
  const providerName = (env.PROVIDER || 'removebg').trim().toLowerCase();

  switch (providerName) {
    case '':
    case 'removebg':
    case 'remove.bg':
      return new RemoveBgProvider(env.REMOVE_BG_API_KEY ?? '', env.REMOVE_BG_SIZE ?? DEFAULT_SIZE);
    default:
      throw new ProviderError(
        'INTERNAL',
        '服务端配置有误，请联系站点管理员',
        false,
        `unknown provider: ${providerName}`,
      );
  }
}
