"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setPending(true);
    setError(null);
    try {
      const { error } = await createBrowserClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/recovery`,
      });
      if (error) {
        setError("메일을 요청하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setSent(true);
    } catch {
      setError("메일을 요청하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return sent ? (
    <div className="mt-6">
      <p role="status">등록된 이메일이면 비밀번호 재설정 메일이 발송됩니다.</p>
      <p className="mt-3 text-neutral-600">메일의 Reset password 링크를 이 브라우저에서 열어 주세요. 메일이 보이지 않으면 스팸함도 확인해 주세요.</p>
      <Link href="/login" className="mt-6 inline-block underline">로그인으로 돌아가기</Link>
    </div>
  ) : (
    <form onSubmit={submit} aria-label="비밀번호 재설정 메일 요청" className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1">이메일
        <input name="email" type="email" autoComplete="email" required className="border border-neutral-400 px-3 py-2" />
      </label>
      {error ? <p role="alert" className="text-red-800">{error}</p> : null}
      <button disabled={pending} className="border border-neutral-900 bg-neutral-900 px-3 py-2 text-white disabled:opacity-50">{pending ? "요청 중…" : "재설정 메일 받기"}</button>
      <Link href="/login" className="underline">로그인으로 돌아가기</Link>
    </form>
  );
}
