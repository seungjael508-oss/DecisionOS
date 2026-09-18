"use client";

import { useState, type FormEvent } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { resetPassword } from "@/app/reset-password/actions";

export function ResetPasswordForm({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signOutWarning, setSignOutWarning] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") ?? "");
    if (password.length < 12) {
      setError("새 비밀번호는 12자 이상 입력해 주세요.");
      return;
    }
    if (password !== String(values.get("confirmation") ?? "")) {
      setError("두 비밀번호가 일치하지 않습니다.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await resetPassword(password, String(values.get("confirmation") ?? ""));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      form.reset();
      // The password is already saved; a sign-out failure must not suggest otherwise.
      let signedOut = result.signedOut;
      try {
        const outcome = await createBrowserClient().auth.signOut({ scope: "local" });
        signedOut = signedOut || !outcome.error;
      } catch { /* Show saved state and separate sign-out guidance. */ }
      setSignOutWarning(!signedOut);
      setDone(true);
    } catch {
      setError("요청 결과를 확인하지 못했습니다. 새 비밀번호로 로그인해 보거나 재설정 메일을 다시 요청해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return done ? (
    <div className="mt-6">
      <p role="status">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.</p>
      {signOutWarning ? <p role="alert" className="mt-3">로그아웃을 확인하지 못했습니다. 다른 사람이 사용하는 브라우저라면 로그아웃을 다시 확인해 주세요.</p> : null}
      <a href="/login" className="mt-6 inline-block underline">로그인하기</a>
    </div>
  ) : (
    <form onSubmit={submit} aria-label="새 비밀번호 설정" className="mt-6 flex flex-col gap-4">
      <p className="break-all text-neutral-600">{email}</p>
      <label className="flex flex-col gap-1">새 비밀번호
        <input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required className="border border-neutral-400 px-3 py-2" />
      </label>
      <p className="text-sm text-neutral-600">영문 대·소문자, 숫자, 기호를 포함해 12자 이상 입력해 주세요.</p>
      <label className="flex flex-col gap-1">새 비밀번호 확인
        <input name="confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required className="border border-neutral-400 px-3 py-2" />
      </label>
      {error ? <p role="alert" className="text-red-800">{error}</p> : null}
      <button disabled={pending} className="border border-neutral-900 bg-neutral-900 px-3 py-2 text-white disabled:opacity-50">{pending ? "저장 중…" : "새 비밀번호 저장"}</button>
      <a href="/forgot-password" className="underline">재설정 메일 다시 받기</a>
    </form>
  );
}
