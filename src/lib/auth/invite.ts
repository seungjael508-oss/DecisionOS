import type { SupabaseClient } from "@supabase/supabase-js";

// A normal login session is not proof of an invite-setup request.
// Only server-verified Supabase claims may authorize this flow.
export async function getInviteUser(client: SupabaseClient) {
  try {
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user?.email) return null;
    const { data, error } = await client.auth.getClaims();
    if (error || !data || data.claims.sub !== userData.user.id) return null;
    const now = Math.floor(Date.now() / 1000);
    const methods: unknown = data.claims.amr;
    const recentInvite = Array.isArray(methods) && methods.some((entry: unknown) => {
      if (typeof entry !== "object" || entry === null) return false;
      if (!("method" in entry) || !("timestamp" in entry)) return false;
      return entry.method === "invite" && typeof entry.timestamp === "number"
        && Number.isFinite(entry.timestamp) && entry.timestamp <= now + 30
        && entry.timestamp > now - 15 * 60;
    });
    return recentInvite ? userData.user : null;
  } catch {
    return null;
  }
}
