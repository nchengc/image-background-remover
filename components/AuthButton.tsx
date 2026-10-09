"use client";

/**
 * 登录按钮（客户端组件）。
 *
 * - 未配置 Supabase：渲染一个禁用的「登录（未配置）」按钮，便于在设计稿/未接环境变量时
 *   仍能看到登录入口的位置，而不报错。
 * - 已配置但未登录：渲染「用 Google 登录」按钮，点击走 Supabase 托管的 Google OAuth
 *   （重定向到 Google，回调回本站，会话存 localStorage）。
 * - 已登录：展示 Google 头像 + 名称 + 「退出」按钮。
 *
 * 说明：因为用的是 Google 作为身份提供方，这里没有账号密码表单——
 * 「登录界面」本身就是这个按钮 + 登录后的账号态。
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  email: string | null;
  name: string | null;
  avatar: string | undefined;
};

export function AuthButton() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setProfile(toProfile(data.session?.user ?? null));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setProfile(toProfile(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 未配置 Supabase：降级展示，不崩溃
  if (!supabase) {
    return (
      <button
        disabled
        title="未配置 Supabase 环境变量（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）"
        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-300"
      >
        登录（未配置）
      </button>
    );
  }

  // 已确认 supabase 非 null，捕获为局部变量便于在事件闭包中稳定使用
  const sb = supabase;

  if (loading) {
    return (
      <span className="h-9 w-24 animate-pulse rounded-xl bg-slate-100" aria-hidden />
    );
  }

  // 已登录：展示账号态
  if (profile) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5">
        {profile.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-full"
          />
        ) : null}
        <span className="max-w-[10rem] truncate text-sm font-medium text-slate-700">
          {profile.name || profile.email}
        </span>
        <button
          onClick={() => sb.auth.signOut()}
          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          退出
        </button>
      </div>
    );
  }

  // 未登录：Google 登录按钮
  return (
    <button
      onClick={() =>
        sb.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        })
      }
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
    >
      <GoogleIcon />
      用 Google 登录
    </button>
  );
}

function toProfile(user: import("@supabase/supabase-js").User | null): Profile | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    picture?: string;
    avatar_url?: string;
  };
  return {
    email: user.email ?? null,
    name: meta.full_name || meta.name || null,
    avatar: meta.picture || meta.avatar_url,
  };
}

/** 内联 Google 「G」 标记，避免额外请求图标资源 */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-3.9 6.8-9.7 6.8-17.4z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.3c-.5-1.5-.8-3-.8-4.8s.3-3.3.8-4.8l-7.9-6.1C1.2 16.9 0 20.3 0 24s1.2 7.1 3.6 10.4l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.3-5.7c-2 1.4-4.7 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
