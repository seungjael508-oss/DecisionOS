"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getRecoveryUser } from "@/lib/auth/recovery";

export async function resetPassword(password: string, confirmation: string) {
  if (typeof password !== "string" || password.length < 12 || password.length > 128
    || password !== confirmation) {
    return { ok: false as const, message: "12~128자의 같은 비밀번호를 두 번 입력해 주세요." };
  }
  try {
    const client = await createServerClient();
    // Recheck at the write boundary; rendering a form is not authorization.
    if (!await getRecoveryUser(client)) {
      return { ok: false as const, message: "인증이 만료되었습니다. 재설정 메일을 다시 요청해 주세요." };
    }
    const { error } = await client.auth.updateUser({ password });
    if (error) {
      return { ok: false as const, message: error.code === "same_password"
        ? "기존 비밀번호와 다른 비밀번호를 입력해 주세요."
        : "비밀번호를 변경하지 못했습니다. 비밀번호 조건을 확인하거나 재설정 메일을 다시 요청해 주세요." };
    }
    // A sign-out failure does not undo the saved password. Report it separately.
    let signedOut = false;
    try {
      const result = await client.auth.signOut({ scope: "local" });
      signedOut = !result.error;
    } catch { /* The browser will also try to clear its local session. */ }
    return { ok: true as const, signedOut };
  } catch {
    return { ok: false as const, message: "요청 결과를 확인하지 못했습니다. 새 비밀번호로 로그인해 보거나 재설정 메일을 다시 요청해 주세요." };
  }
}
