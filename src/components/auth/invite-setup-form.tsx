"use client";

import { useState, type FormEvent } from "react";
import { completeInviteSetup } from "@/app/auth/invite/setup/actions";

export function InviteSetupForm({ email, displayName }: { email: string; displayName: string | null }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") ?? "");
    if (password.length < 12) {
      setError("비밀번호는 12자 이상 입력해 주세요.");
      return;
    }
    if (password !== String(values.get("confirmation") ?? "")) {
      setError("두 비밀번호가 일치하지 않습니다.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await completeInviteSetup(password, String(values.get("confirmation") ?? ""));
      // completeInviteSetup redirects on success; reaching here means it failed.
      if (result && !result.ok) {
        setError(result.message);
      }
    } catch {
      setError("요청 결과를 확인하지 못했습니다. 초대 메일을 다시 요청해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="초대 수락 및 비밀번호 설정" className="mt-6 flex flex-col gap-4">
      <p className="break-all text-neutral-600">{email}</p>
      {displayName ? <p className="text-neutral-600">{displayName}님, 환영합니다.</p> : null}
      <label className="flex flex-col gap-1">비밀번호
        <input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required className="border border-neutral-400 px-3 py-2" />
      </label>
      <p className="text-sm text-neutral-600">영문 대·소문자, 숫자, 기호를 포함해 12자 이상 입력해 주세요.</p>
      <label className="flex flex-col gap-1">비밀번호 확인
        <input name="confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required className="border border-neutral-400 px-3 py-2" />
      </label>
      {error ? <p role="alert" className="text-red-800">{error}</p> : null}
      <button disabled={pending} className="border border-neutral-900 bg-neutral-900 px-3 py-2 text-white disabled:opacity-50">{pending ? "저장 중…" : "비밀번호 설정하고 시작하기"}</button>
    </form>
  );
}
