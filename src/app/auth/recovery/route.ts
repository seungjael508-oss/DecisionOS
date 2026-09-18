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
      const { error } = await client.auth.exchangeCodeForSession(
        code, flowId === null ? undefined : { flowId },
      );
      if (!error && await getRecoveryUser(client)) destination = "/reset-password";
    } catch { /* Do not include auth codes or raw errors in redirects. */ }
  }
  // No next/redirect/forwarded-host input is used to select the destination.
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
