import Link from "next/link";
import { InviteSetupForm } from "@/components/auth/invite-setup-form";
import { createServerClient } from "@/lib/supabase/server";
import { getInviteUser } from "@/lib/auth/invite";

export default async function InviteSetupPage() {
  let email: string | null = null;
  let displayName: string | null = null;
  try {
    const user = await getInviteUser(await createServerClient());
    email = user?.email ?? null;
    const metadataName = user?.user_metadata?.display_name;
    displayName = typeof metadataName === "string" ? metadataName : null;
  } catch { /* Expired or unavailable auth stays closed. */ }
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-semibold">초대 수락 및 비밀번호 설정</h1>
      {email ? <InviteSetupForm email={email} displayName={displayName} /> : (
        <div className="mt-6">
          <p role="alert">초대 인증이 만료됐거나 확인할 수 없습니다.</p>
          <Link href="/login" className="mt-4 inline-block underline">로그인 페이지로 이동</Link>
        </div>
      )}
    </main>
  );
}
