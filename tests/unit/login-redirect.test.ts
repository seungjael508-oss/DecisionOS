import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: { signInWithPassword: vi.fn() },
  }),
}));

import { safeLoginNextPath } from "@/components/auth/login-form";

describe("safeLoginNextPath", () => {
  it("keeps an internal project path", () => {
    expect(safeLoginNextPath("/projects/20000000-0000-4000-8000-000000000001/move-in")).toBe(
      "/projects/20000000-0000-4000-8000-000000000001/move-in",
    );
  });

  it("falls back to home when next is missing", () => {
    expect(safeLoginNextPath(null)).toBe("/");
    expect(safeLoginNextPath("")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeLoginNextPath("//evil.example")).toBe("/");
  });

  it("rejects paths that are not same-origin relative", () => {
    expect(safeLoginNextPath("https://evil.example")).toBe("/");
    expect(safeLoginNextPath("evil.example")).toBe("/");
  });
});
