/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMoveInConsultation = vi.fn();
const refresh = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
}));

vi.mock("@/app/projects/[projectId]/move-in/units/[unitId]/actions", () => ({
  createMoveInConsultation: (...args: unknown[]) =>
    createMoveInConsultation(...args),
}));

import { ConsultationCreateForm } from "@/components/move-in/consultation-create-form";
import { UnitDetailWorkspace } from "@/components/move-in/unit-detail-workspace";

function submitForm() {
  fireEvent.change(screen.getByLabelText("상담내용 *"), {
    target: { value: "현장 콜" },
  });
  fireEvent.submit(screen.getByRole("button", { name: "저장 후 목록으로" }).closest("form")!);
}

describe("consultation create form", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    createMoveInConsultation.mockReset();
    refresh.mockReset();
    replace.mockReset();
  });

  it("shows a generic error when save fails", async () => {
    createMoveInConsultation.mockResolvedValue({ ok: false });
    render(
      <ConsultationCreateForm projectId="p1" unitId="u1" customerId="c1" />,
    );
    submitForm();
    expect(await screen.findByText("상담을 저장하지 못했습니다.")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect((screen.getByLabelText("상담내용 *") as HTMLTextAreaElement).value).toBe("현장 콜");
  });

  it("returns to the validated list context after a successful save", async () => {
    createMoveInConsultation.mockResolvedValue({
      ok: true,
      returnTo: "/projects/p1/move-in/units?grade=C&buildingNo=104",
    });
    render(
      <ConsultationCreateForm
        projectId="p1"
        unitId="u1"
        customerId="c1"
        returnTo="/projects/p1/move-in/units?grade=C&buildingNo=104"
      />,
    );
    expect(screen.queryByLabelText("업무 목적 *")).toBeNull();
    submitForm();
    await waitFor(() => {
      expect(createMoveInConsultation).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "현장 콜",
          afterSave: "list",
          occupancyIntent: "",
          fundingStatus: "",
          moveInStatus: "",
        }),
      );
    });
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        "/projects/p1/move-in/units?grade=C&buildingNo=104",
      );
      expect(refresh).not.toHaveBeenCalled();
      expect(createMoveInConsultation.mock.calls[0][0]).not.toHaveProperty("purpose");
    });
  });

  it("moves to the server-resolved next unit only after the save succeeds", async () => {
    createMoveInConsultation.mockResolvedValue({
      ok: true,
      returnTo: "/projects/p1/move-in/units?grade=C&buildingNo=104",
      destination: "/projects/p1/move-in/units/u2?returnTo=%2Fprojects%2Fp1%2Fmove-in%2Funits%3Fgrade%3DC%26buildingNo%3D104",
    });
    render(
      <ConsultationCreateForm
        projectId="p1"
        unitId="u1"
        customerId="c1"
        returnTo="/projects/p1/move-in/units?grade=C&buildingNo=104"
      />,
    );
    fireEvent.change(screen.getByLabelText("상담내용 *"), { target: { value: "다음 세대 처리" } });
    fireEvent.click(screen.getByRole("button", { name: "저장 후 다음 세대" }));

    await waitFor(() => {
      expect(createMoveInConsultation).toHaveBeenCalledWith(
        expect.objectContaining({ afterSave: "next", content: "다음 세대 처리" }),
      );
      expect(replace).toHaveBeenCalledWith(
        "/projects/p1/move-in/units/u2?returnTo=%2Fprojects%2Fp1%2Fmove-in%2Funits%3Fgrade%3DC%26buildingNo%3D104",
      );
    });
  });

  it("omits the operational-intent argument when 선택 안 함 remains selected", async () => {
    createMoveInConsultation.mockResolvedValue({ ok: false });
    render(<ConsultationCreateForm projectId="p1" unitId="u1" customerId="c1" />);
    submitForm();
    await waitFor(() => expect(createMoveInConsultation).toHaveBeenCalled());
    expect(createMoveInConsultation.mock.calls[0][0]).not.toHaveProperty("operationalIntent");
  });

  it("sends an explicit selected operational intent", async () => {
    createMoveInConsultation.mockResolvedValue({ ok: false });
    render(<ConsultationCreateForm projectId="p1" unitId="u1" customerId="c1" />);
    fireEvent.change(screen.getByLabelText("최종의향"), { target: { value: "SALE_TRANSFER" } });
    submitForm();
    await waitFor(() => expect(createMoveInConsultation).toHaveBeenCalledWith(
      expect.objectContaining({ operationalIntent: "SALE_TRANSFER" }),
    ));
  });

  it("reports edited form state so workspace navigation asks before discarding", () => {
    render(
      <UnitDetailWorkspace
        returnTo="/projects/p1/move-in/units?grade=C&intent=SALE_TRANSFER"
        previousHref={null}
        nextHref="/projects/p1/move-in/units/u2?returnTo=context"
      >
        <ConsultationCreateForm projectId="p1" unitId="u1" customerId="c1" />
      </UnitDetailWorkspace>,
    );
    fireEvent.change(screen.getByLabelText("상담내용 *"), { target: { value: "저장 전 입력" } });
    fireEvent.click(screen.getByRole("button", { name: "다음 세대" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("저장하지 않은 변경사항이 있습니다.");
    expect(createMoveInConsultation).not.toHaveBeenCalled();
  });

  it("uses the validated return context for cancellation", () => {
    render(
      <ConsultationCreateForm
        projectId="p1"
        unitId="u1"
        customerId="c1"
        returnTo="/projects/p1/move-in/today?filter=next_contact"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "취소하고 목록으로" }));

    expect(replace).toHaveBeenCalledWith("/projects/p1/move-in/today?filter=next_contact");
  });
});
