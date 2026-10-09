/**
 * Supabase 客户端（仅前端用 anon key）。
 *
 * 登录功能依赖两个环境变量，构建时由 NEXT_PUBLIC_ 前缀内联进静态产物：
 *   NEXT_PUBLIC_SUPABASE_URL        —— 项目 URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   —— anon public key（可公开，受 RLS 保护）
 *
 * 这两个变量缺失时 supabase = null，AuthButton 会自动降级为「未配置」态，
 * 不会让构建或首屏崩溃。后端强制额度用的 service_role key 只存在于
 * Cloudflare Pages 环境变量，绝不加 NEXT_PUBLIC_，也不会出现在这里。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
