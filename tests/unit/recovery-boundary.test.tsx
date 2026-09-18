/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Page from "@/app/reset-password/page";
import { safeLoginNextPath } from "@/components/auth/login-form";

const auth = vi.hoisted(() => ({ getUser: vi.fn(), getClaims: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ auth }) }));
vi.mock("@/components/auth/reset-password-form", () => ({
  ResetPasswordForm: () => <form aria-label="password reset" />,
}));
vi.mock("next/navigation", () => ({ useRouter: vi.fn(), useSearchParams: vi.fn() }));
afterEach(cleanup);
beforeEach(() => {
  auth.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "person@example.test" } }, error: null });
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", amr: [{ method: "password", timestamp: Date.now() / 1000 }] } }, error: null });
});
describe("recovery-only password form", () => {
  it("denies an ordinary authenticated session", async () => {
    render(await Page());
    expect(screen.queryByRole("form")).toBeNull();
  });
  it("allows a recently verified recovery session", async () => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", amr: [{ method: "recovery", timestamp: Math.floor(Date.now() / 1000) }] } }, error: null });
    render(await Page());
    expect(screen.getByRole("form")).toBeTruthy();
  });
  it.each(["expired", "future", "other-user", "invalid-signature"])("denies %s claims", async (kind) => {
    const now = Math.floor(Date.now() / 1000);
    auth.getClaims.mockResolvedValue({ data: { claims: {
      sub: kind === "other-user" ? "user-2" : "user-1",
      amr: [{ method: "recovery", timestamp: kind === "expired" ? now - 3600 : kind === "future" ? now + 3600 : now }],
    } }, error: kind === "invalid-signature" ? new Error("PRIVATE") : null });
    render(await Page());
    expect(screen.queryByRole("form")).toBeNull();
  });
});
describe("login destination", () => {
  it.each(["/\\evil.example", "/\n/evil.example", "//evil.example", "https://evil.example"])("rejects %s", (input) => {
    expect(safeLoginNextPath(input)).toBe("/");
  });
});
