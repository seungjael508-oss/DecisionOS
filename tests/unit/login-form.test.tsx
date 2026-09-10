/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { replace, refresh, searchParams, signInWithPassword } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  searchParams: { get: vi.fn(() => null as string | null) },
  signInWithPassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: { signInWithPassword },
  }),
}));

import { LoginForm } from "@/components/auth/login-form";

async function submitLogin() {
  render(<LoginForm />);
  fireEvent.change(screen.getByLabelText("이메일"), {
    target: { value: "counselor-a1@example.test" },
  });
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: "secret-password" },
  });
  fireEvent.submit(screen.getByRole("button", { name: "로그인" }).closest("form")!);
}

describe("LoginForm auth errors", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    searchParams.get.mockReturnValue(null);
    signInWithPassword.mockReset();
  });

  it("shows a generic message on auth failure and hides the raw error", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials: secret-password" },
    });

    await submitLogin();

    expect(await screen.findByText("로그인에 실패했습니다.")).toBeTruthy();
    expect(screen.queryByText(/Invalid login credentials/)).toBeNull();
    expect(screen.queryByText(/secret-password/)).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: "로그인" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("shows a generic message and re-enables submit when signInWithPassword throws", async () => {
    signInWithPassword.mockRejectedValue(new Error("network down: secret-password"));

    await submitLogin();

    expect(await screen.findByText("로그인에 실패했습니다.")).toBeTruthy();
    expect(screen.queryByText(/network down/)).toBeNull();
    expect(screen.queryByText(/secret-password/)).toBeNull();
    await waitFor(() => {
      expect(
        (screen.getByRole("button", { name: "로그인" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false);
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to a safe internal next path after success", async () => {
    searchParams.get.mockReturnValue(
      "/projects/20000000-0000-4000-8000-000000000001/move-in",
    );
    signInWithPassword.mockResolvedValue({
      data: { user: { id: "user" }, session: {} },
      error: null,
    });

    await submitLogin();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "/projects/20000000-0000-4000-8000-000000000001/move-in",
      );
    });
    expect(refresh).toHaveBeenCalled();
  });
});
