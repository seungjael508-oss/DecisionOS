import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createServerClient } from "@/lib/supabase/server";
import { getRecoveryUser } from "@/lib/auth/recovery";

export default async function ResetPasswordPage() {
  let email: string | null = null;
  try {
    const user = await getRecoveryUser(await createServerClient());
    email = user?.email ?? null;
  } catch { /* Expired or unavailable auth stays closed. */ }
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-semibold">새 비밀번호 설정</h1>
      {email ? <ResetPasswordForm email={email} /> : (
        <div className="mt-6">
          <p role="alert">인증이 만료됐거나 재설정 링크를 확인할 수 없습니다.</p>
          <Link href="/forgot-password" className="mt-4 inline-block underline">재설정 메일 다시 받기</Link>
        </div>
      )}
    </main>
  );
}
