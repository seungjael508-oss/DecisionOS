import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeInviteSetup } from "@/app/auth/invite/setup/actions";

const auth = vi.hoisted(() => ({ getUser: vi.fn(), getClaims: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth }) }));
vi.mock("next/navigation", () => ({ redirect }));
const password = "Synthetic-Password-123!";

beforeEach(() => {
  vi.resetAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "person@example.test" } }, error: null });
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", amr: [{ method: "invite", timestamp: Math.floor(Date.now() / 1000) }] } }, error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

describe("invite setup write authorization", () => {
  it("rechecks the invite session, saves only the password, signs out, then redirects to login", async () => {
    await completeInviteSetup(password, password);
    expect(auth.updateUser).toHaveBeenCalledWith({ password });
    expect(auth.updateUser).toHaveBeenCalledTimes(1);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(auth.updateUser.mock.invocationCallOrder[0]).toBeLessThan(auth.signOut.mock.invocationCallOrder[0]);
    expect(redirect).toHaveBeenCalledWith("/login?invited=1");
  });

  it("rejects a normal login session (not an invite session)", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", amr: [{ method: "password", timestamp: Date.now() / 1000 }] } }, error: null });
    const result = await completeInviteSetup(password, password);
    expect(result?.ok).toBe(false);
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each(["missing", "expired", "wrong-user", "unverified"])("does not save with %s authorization", async (kind) => {
    if (kind === "missing") auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    else auth.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: kind === "wrong-user" ? "user-2" : "user-1",
          amr: [{ method: "invite", timestamp: Math.floor(Date.now() / 1000) - (kind === "expired" ? 3600 : 0) }],
        },
      },
      error: kind === "unverified" ? new Error("PRIVATE") : null,
    });
    const result = await completeInviteSetup(password, password);
    expect(result?.ok).toBe(false);
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([["short", "short"], [password, "different"], ["x".repeat(129), "x".repeat(129)]])("validates input on the server", async (value, confirm) => {
    const result = await completeInviteSetup(value, confirm);
    expect(result?.ok).toBe(false);
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not expose update errors or sign out after a failed update", async () => {
    auth.updateUser.mockResolvedValue({ error: { message: "PRIVATE_SUPABASE_ERROR" } });
    const result = await completeInviteSetup(password, password);
    expect(result?.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SUPABASE_ERROR");
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("accepts no role, project_id, or display_name input (no privilege-injection surface)", async () => {
    // completeInviteSetup's signature only ever takes password + confirmation;
    // it cannot be called with a role/project_id/display_name to self-assign privileges.
    expect(completeInviteSetup.length).toBe(2);
    await completeInviteSetup(password, password);
    expect(auth.updateUser).toHaveBeenCalledWith({ password });
  });
});
