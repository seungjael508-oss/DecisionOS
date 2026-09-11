/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallListRow } from "@/lib/move-in/calls";
import { AccessDenied } from "@/components/move-in/status-copy";

const assignMoveInCustomers = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/app/projects/[projectId]/move-in/assign/actions", () => ({
  assignMoveInCustomers: (...args: unknown[]) => assignMoveInCustomers(...args),
}));

import { AssignBoard } from "@/components/move-in/assign-board";

const rows: CallListRow[] = [
  {
    unitId: "u1",
    buildingNo: "101",
    unitNo: "202",
    customerId: "c1",
    customerName: "이OO",
    customerPhone: "010-1234-5678",
    phoneNormalized: "01012345678",
    assignedCounselorId: null,
    latestGrade: "C",
    occupancyIntent: "SALE",
    fundingStatus: "UNKNOWN",
    moveInStatus: "CONTACTED",
    lastConsultedAt: null,
    nextContactAt: null,
  },
  {
    unitId: "u2",
    buildingNo: "102",
    unitNo: "301",
    customerId: "c2",
    customerName: "김OO",
    customerPhone: "010-9999-0000",
    phoneNormalized: "01099990000",
    assignedCounselorId: "member-a",
    latestGrade: "A",
    occupancyIntent: "SELF_MOVE_IN",
    fundingStatus: "NORMAL",
    moveInStatus: "PLANNED",
    lastConsultedAt: null,
    nextContactAt: null,
  },
];

const counselors = [
  { id: "member-a", label: "상담사 A" },
  { id: "member-f", label: "상담사 F" },
];

afterEach(() => {
  cleanup();
});

describe("assign board", () => {
  beforeEach(() => {
    assignMoveInCustomers.mockReset();
    refresh.mockReset();
  });

  it("renders list columns including phone, grade, status, and assignee", () => {
    render(
      <AssignBoard
        projectId="p1"
        rows={rows}
        counselors={counselors}
        currentMemberId="admin"
      />,
    );
    expect(screen.getByText("동호수")).toBeTruthy();
    expect(screen.getByText("계약자")).toBeTruthy();
    expect(screen.getByText("전화번호")).toBeTruthy();
    expect(screen.getByText("기존등급")).toBeTruthy();
    expect(screen.getByText("현재상태")).toBeTruthy();
    expect(screen.getByText("현재 담당")).toBeTruthy();
    expect(screen.getByText("010-1234-5678")).toBeTruthy();
    expect(screen.getByText("이OO")).toBeTruthy();
  });

  it("selects rows and supports select all / clear", () => {
    render(
      <AssignBoard
        projectId="p1"
        rows={rows}
        counselors={counselors}
        currentMemberId="admin"
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "전체 선택" }));
    expect(screen.getByText("2세대 선택")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "전체 해제" }));
    expect(screen.getByText("0세대 선택")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "101동 202호 선택" }));
    expect(screen.getByText("1세대 선택")).toBeTruthy();
  });

  it("shows only provided active counselors", () => {
    render(
      <AssignBoard
        projectId="p1"
        rows={rows}
        counselors={counselors}
        currentMemberId="admin"
      />,
    );
    expect(screen.getByRole("option", { name: "상담사 A" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "상담사 F" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /inactive/i })).toBeNull();
  });

  it("does not call assign when nothing is selected", () => {
    render(
      <AssignBoard
        projectId="p1"
        rows={rows}
        counselors={counselors}
        currentMemberId="admin"
      />,
    );
    fireEvent.change(screen.getByLabelText("상담사"), {
      target: { value: "member-f" },
    });
    fireEvent.click(screen.getByRole("button", { name: "선택 세대 배정" }));
    expect(assignMoveInCustomers).not.toHaveBeenCalled();
  });

  it("confirms, then shows generic success and refreshes", async () => {
    assignMoveInCustomers.mockResolvedValue({ ok: true, assigned: 1 });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <AssignBoard
        projectId="p1"
        rows={rows}
        counselors={counselors}
        currentMemberId="admin"
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "101동 202호 선택" }));
    fireEvent.change(screen.getByLabelText("상담사"), {
      target: { value: "member-f" },
    });
    fireEvent.click(screen.getByRole("button", { name: "선택 세대 배정" }));
    expect(confirm).toHaveBeenCalled();
    expect(await screen.findByText("1세대를 상담사 F에게 배정했습니다.")).toBeTruthy();
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
    confirm.mockRestore();
  });

  it("shows a generic error on failure without raw ids", async () => {
    assignMoveInCustomers.mockResolvedValue({ ok: false });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <AssignBoard
        projectId="p1"
        rows={rows}
        counselors={counselors}
        currentMemberId="admin"
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "101동 202호 선택" }));
    fireEvent.change(screen.getByLabelText("상담사"), {
      target: { value: "member-f" },
    });
    fireEvent.click(screen.getByRole("button", { name: "선택 세대 배정" }));
    expect(await screen.findByText("상담사 배정에 실패했습니다.")).toBeTruthy();
    expect(screen.queryByText(/c1/)).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});

describe("counselor assign route copy", () => {
  it("uses the admin-only denial message", () => {
    render(
      <AccessDenied message="상담사 배정은 현장 관리자만 사용할 수 있습니다." />,
    );
    expect(
      screen.getByText("상담사 배정은 현장 관리자만 사용할 수 있습니다."),
    ).toBeTruthy();
  });
});
