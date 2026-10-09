"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getInviteUser } from "@/lib/auth/invite";

export async function completeInviteSetup(password: string, confirmation: string) {
  if (typeof password !== "string" || password.length < 12 || password.length > 128
    || password !== confirmation) {
    return { ok: false as const, message: "12~128자의 같은 비밀번호를 두 번 입력해 주세요." };
  }
  try {
    const client = await createServerClient();
    // Recheck at the write boundary; rendering a form is not authorization.
    if (!await getInviteUser(client)) {
      return { ok: false as const, message: "인증이 만료되었습니다. 초대 메일을 다시 요청해 주세요." };
    }
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      return { ok: false as const, message: "비밀번호를 설정하지 못했습니다. 비밀번호 조건을 확인하거나 초대 메일을 다시 요청해 주세요." };
    }
    try {
      await client.auth.signOut({ scope: "local" });
    } catch { /* The browser will also try to clear its local session. */ }
  } catch {
    return { ok: false as const, message: "요청 결과를 확인하지 못했습니다. 초대 메일을 다시 요청해 주세요." };
  }
  redirect("/login?invited=1");
}
