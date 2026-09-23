import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/auth/confirm/route";

const verifyOtp = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    auth: {
      verifyOtp,
      getUser: async () => ({ data: { user: { id: "fixture", email: "person@example.test" } }, error: null }),
      getClaims: async () => ({ data: { claims: { sub: "fixture", amr: [{ method: "invite", timestamp: Math.floor(Date.now() / 1000) }] } }, error: null }),
    },
  }),
}));
beforeEach(() => { verifyOtp.mockReset().mockResolvedValue({ error: null }); });

describe("invite confirm callback", () => {
  it("verifies a valid invite token and redirects to invite setup", async () => {
    const res = await GET(new NextRequest("https://app.example/auth/confirm?token_hash=fixture&type=invite"));
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "fixture", type: "invite" });
    expect(res.headers.get("location")).toBe("https://app.example/auth/invite/setup");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("rejects type=recovery (wrong OTP type must not unlock invite setup)", async () => {
    const res = await GET(new NextRequest("https://app.example/auth/confirm?token_hash=fixture&type=recovery"));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("https://app.example/auth/invite/setup?error=expired");
  });

  it("does not verify an absent token_hash", async () => {
    const res = await GET(new NextRequest("https://app.example/auth/confirm?type=invite"));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("https://app.example/auth/invite/setup?error=expired");
  });

  it("ignores an attacker-supplied next/redirect destination (no open redirect)", async () => {
    const res = await GET(new NextRequest("https://app.example/auth/confirm?token_hash=fixture&type=invite&next=https://evil.example"));
    expect(res.headers.get("location")).toBe("https://app.example/auth/invite/setup");
  });

  it.each(["error", "throw"])("handles %s without leaking tokens or errors", async (kind) => {
    if (kind === "error") verifyOtp.mockResolvedValue({ error: { message: "PRIVATE_ERROR" } });
    else verifyOtp.mockRejectedValue(new Error("PRIVATE_ERROR"));
    const res = await GET(new NextRequest("https://app.example/auth/confirm?token_hash=fixture&type=invite"));
    expect(res.headers.get("location")).toBe("https://app.example/auth/invite/setup?error=expired");
  });
});
