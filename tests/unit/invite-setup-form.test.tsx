/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InviteSetupForm } from "@/components/auth/invite-setup-form";

const mocks = vi.hoisted(() => ({ complete: vi.fn() }));
vi.mock("@/app/auth/invite/setup/actions", () => ({ completeInviteSetup: mocks.complete }));
beforeEach(() => { vi.resetAllMocks(); mocks.complete.mockResolvedValue(undefined); });
afterEach(cleanup);

function passwordValues(a: string, b = a) {
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: a } });
  fireEvent.change(screen.getByLabelText("비밀번호 확인"), { target: { value: b } });
  fireEvent.submit(screen.getByRole("form"));
}

describe("invite setup form", () => {
  it("shows the invited email and welcome name", () => {
    render(<InviteSetupForm email="person@example.com" displayName="임효묵" />);
    expect(screen.getByText("person@example.com")).toBeTruthy();
    expect(screen.getByText(/임효묵님, 환영합니다/)).toBeTruthy();
  });

  it("blocks submission when confirmation differs", () => {
    render(<InviteSetupForm email="person@example.com" displayName={null} />);
    passwordValues("Synthetic-Password-123!", "different");
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("requires at least twelve characters", () => {
    render(<InviteSetupForm email="person@example.com" displayName={null} />);
    passwordValues("short");
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("submits exactly password and confirmation to the server action", () => {
    render(<InviteSetupForm email="person@example.com" displayName={null} />);
    passwordValues("Synthetic-Password-123!");
    expect(mocks.complete).toHaveBeenCalledWith("Synthetic-Password-123!", "Synthetic-Password-123!");
  });

  it("shows server-reported failure without exposing internal errors", async () => {
    mocks.complete.mockResolvedValue({ ok: false, message: "인증이 만료되었습니다. 초대 메일을 다시 요청해 주세요." });
    render(<InviteSetupForm email="person@example.com" displayName={null} />);
    passwordValues("Synthetic-Password-123!");
    expect((await screen.findByRole("alert")).textContent).toContain("초대 메일");
  });
});
