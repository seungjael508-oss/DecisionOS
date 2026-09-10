"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export function safeLoginNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setPending(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError("로그인에 실패했습니다.");
        return;
      }
      router.replace(safeLoginNextPath(searchParams.get("next")));
      router.refresh();
    } catch {
      setError("로그인에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex max-w-sm flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        이메일
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="border border-neutral-400 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        비밀번호
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="border border-neutral-400 px-2 py-1"
        />
      </label>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-neutral-900 bg-neutral-900 px-3 py-1 text-white disabled:opacity-50"
      >
        {pending ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}
