import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPassword } from "@/app/reset-password/actions";

const auth = vi.hoisted(() => ({ getUser: vi.fn(), getClaims: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth }) }));
const password = "Synthetic-Password-123!";
beforeEach(() => {
  vi.resetAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "person@example.test" } }, error: null });
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", amr: [{ method: "recovery", timestamp: Math.floor(Date.now() / 1000) }] } }, error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});
describe("password write authorization", () => {
  it("rechecks recovery and signs out only after saving", async () => {
    expect(await resetPassword(password, password)).toEqual({ ok: true, signedOut: true });
    expect(auth.updateUser).toHaveBeenCalledWith({ password });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(auth.updateUser.mock.invocationCallOrder[0]).toBeLessThan(auth.signOut.mock.invocationCallOrder[0]);
  });
  it("rejects a normal login even if a reset form was already open", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", amr: [{ method: "password", timestamp: Date.now() / 1000 }] } }, error: null });
    expect((await resetPassword(password, password)).ok).toBe(false);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it.each(["missing", "expired", "wrong-user", "unverified"])("does not save with %s authorization", async (kind) => {
    if (kind === "missing") auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    else auth.getClaims.mockResolvedValue({ data: { claims: {
      sub: kind === "wrong-user" ? "user-2" : "user-1",
      amr: [{ method: "recovery", timestamp: Math.floor(Date.now() / 1000) - (kind === "expired" ? 3600 : 0) }],
    } }, error: kind === "unverified" ? new Error("PRIVATE") : null });
    expect((await resetPassword(password, password)).ok).toBe(false);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it.each([["short", "short"], [password, "different"], ["x".repeat(129), "x".repeat(129)]])("validates input on the server", async (value, confirm) => {
    expect((await resetPassword(value, confirm)).ok).toBe(false);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("does not expose update errors or sign out after a failed update", async () => {
    auth.updateUser.mockResolvedValue({ error: { message: "PRIVATE_SUPABASE_ERROR" } });
    const result = await resetPassword(password, password);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SUPABASE_ERROR");
    expect(auth.signOut).not.toHaveBeenCalled();
  });
  it.each(["error", "throw"])("keeps the saved result when logout returns %s", async (kind) => {
    if (kind === "throw") auth.signOut.mockRejectedValue(new Error("PRIVATE"));
    else auth.signOut.mockResolvedValue({ error: new Error("PRIVATE") });
    expect(await resetPassword(password, password)).toEqual({ ok: true, signedOut: false });
  });
});
