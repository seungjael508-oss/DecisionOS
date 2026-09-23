import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getInviteUser } from "@/lib/auth/invite";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let destination = "/auth/invite/setup?error=expired";
  if (tokenHash && type === "invite") {
    try {
      const client = await createServerClient();
      const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
      if (!error && await getInviteUser(client)) destination = "/auth/invite/setup";
    } catch { /* Do not include auth codes or raw errors in redirects. */ }
  }
  // No next/redirect/forwarded-host input is used to select the destination.
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
