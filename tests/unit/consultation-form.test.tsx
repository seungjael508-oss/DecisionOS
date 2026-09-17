/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMoveInConsultation = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/app/projects/[projectId]/move-in/units/[unitId]/actions", () => ({
  createMoveInConsultation: (...args: unknown[]) =>
    createMoveInConsultation(...args),
}));

import { ConsultationCreateForm } from "@/components/move-in/consultation-create-form";

function submitForm() {
  fireEvent.change(screen.getByLabelText("업무 목적 *"), { target: { value: "잔금독촉" } });
  fireEvent.change(screen.getByLabelText("상담내용 *"), {
    target: { value: "현장 콜" },
  });
  fireEvent.submit(screen.getByRole("button", { name: "상담 저장" }).closest("form")!);
}

describe("consultation create form", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    createMoveInConsultation.mockReset();
    refresh.mockReset();
  });

  it("shows a generic error when save fails", async () => {
    createMoveInConsultation.mockResolvedValue({ ok: false });
    render(
      <ConsultationCreateForm projectId="p1" unitId="u1" customerId="c1" />,
    );
    submitForm();
    expect(await screen.findByText("상담을 저장하지 못했습니다.")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes after a successful save without occupancy changes", async () => {
    createMoveInConsultation.mockResolvedValue({ ok: true });
    render(
      <ConsultationCreateForm projectId="p1" unitId="u1" customerId="c1" />,
    );
    submitForm();
    await waitFor(() => {
      expect(createMoveInConsultation).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "현장 콜",
          purpose: "잔금독촉",
          occupancyIntent: "",
          fundingStatus: "",
          moveInStatus: "",
        }),
      );
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });
});
