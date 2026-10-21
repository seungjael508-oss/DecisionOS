import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getRecoveryUser } from "@/lib/auth/recovery";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  let destination = "/forgot-password?error=expired";
  if (code && !request.nextUrl.searchParams.has("error")) {
    try {
      const client = await createServerClient();
      await client.auth.exchangeCodeForSession(
        code, flowId === null ? undefined : { flowId },
      );
      // 재사용된 코드(새로고침·뒤로 가기)는 교환이 실패한다. 판정은 교환 결과가 아니라
      // 서버가 확인한 최근 복구 세션으로 한다(교환 실패 + 복구 세션 없음 = 만료 화면).
      if (await getRecoveryUser(client)) destination = "/reset-password";
    } catch { /* Do not include auth codes or raw errors in redirects. */ }
  }
  // No next/redirect/forwarded-host input is used to select the destination.
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
