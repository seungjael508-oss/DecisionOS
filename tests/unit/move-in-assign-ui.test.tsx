/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CallListRow } from "@/lib/move-in/calls";
import { AccessDenied } from "@/components/move-in/status-copy";

const assignMoveInCustomers = vi.fn();
const updateMoveInFieldMemberDisplayName = vi.fn();
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
  updateMoveInFieldMemberDisplayName: (...args: unknown[]) =>
    updateMoveInFieldMemberDisplayName(...args),
}));

import { AssignBoard } from "@/components/move-in/assign-board";
import { AssignListClient } from "@/components/move-in/assign-list-client";
import { FieldMemberNameEditor } from "@/components/move-in/field-member-name-editor";

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
  { id: "member-a", label: "이승재" },
  { id: "member-f", label: "송용석" },
];

afterEach(() => {
  cleanup();
});

describe("assign board", () => {
  beforeEach(() => {
    assignMoveInCustomers.mockReset();
    refresh.mockReset();
  });

  it("renders list columns including phone, grade, status, and real display names", () => {
    render(
      <AssignBoard
        projectId="p1"
        rows={rows}
        counselors={counselors}
        sortKey="unit"
        sortDirection="asc"
        onSort={() => {}}
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
    // 현재 담당 컬럼에는 UUID가 아니라 display_name이 그대로 노출된다.
    // (같은 이름이 상담사 select 옵션에도 나오므로 최소 1회 이상 등장하는지만 확인한다)
    expect(screen.getAllByText("이승재").length).toBeGreaterThan(0);
    expect(screen.getByText("미배정")).toBeTruthy();
    expect(screen.queryByText(/member-a/)).toBeNull();
  });

  it("selects rows and supports select all / clear", () => {
    render(
      <AssignBoard
        projectId="p1"
        rows={rows}
        counselors={counselors}
        sortKey="unit"
        sortDirection="asc"
        onSort={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "전체 선택" }));
    expect(screen.getByText("2세대 선택")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "전체 해제" }));
    expect(screen.getByText("0세대 선택")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "101동 202호 선택" }));
    expect(screen.getByText("1세대 선택")).toBeTruthy();
  });

  it("shows only provided active counselors with real names", () => {
    render(
      <AssignBoard
        projectId="p1"
        rows={rows}
        counselors={counselors}
        sortKey="unit"
        sortDirection="asc"
        onSort={() => {}}
      />,
    );
    expect(screen.getByRole("option", { name: "이승재" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "송용석" })).toBeTruthy();
  });

  it("does not call assign when nothing is selected", () => {
    render(
      <AssignBoard
        projectId="p1"
        rows={rows}
        counselors={counselors}
        sortKey="unit"
        sortDirection="asc"
        onSort={() => {}}
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
        sortKey="unit"
        sortDirection="asc"
        onSort={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "101동 202호 선택" }));
    fireEvent.change(screen.getByLabelText("상담사"), {
      target: { value: "member-f" },
    });
    fireEvent.click(screen.getByRole("button", { name: "선택 세대 배정" }));
    expect(confirm).toHaveBeenCalled();
    expect(await screen.findByText("1세대를 송용석에게 배정했습니다.")).toBeTruthy();
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
        sortKey="unit"
        sortDirection="asc"
        onSort={() => {}}
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

describe("assign list client: 필터/정렬은 클라이언트에서만 동작한다", () => {
  it("동 필터를 적용하면 검색 결과 문구가 즉시 바뀐다", async () => {
    render(<AssignListClient projectId="p1" rows={rows} counselors={counselors} />);
    expect(screen.getByText("검색 결과 2세대 / 전체 2세대")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("동"), { target: { value: "101" } });
    await waitFor(() => {
      expect(screen.getByText("검색 결과 1세대 / 전체 2세대")).toBeTruthy();
    });
  });

  it("전체 선택은 필터링된 결과에만 적용된다", async () => {
    render(<AssignListClient projectId="p1" rows={rows} counselors={counselors} />);
    fireEvent.change(screen.getByLabelText("동"), { target: { value: "101" } });
    await waitFor(() => {
      expect(screen.getByText("검색 결과 1세대 / 전체 2세대")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "전체 선택" }));
    expect(screen.getByText("1세대 선택")).toBeTruthy();
  });

  it("초기화 버튼은 필터를 모두 되돌린다", async () => {
    render(<AssignListClient projectId="p1" rows={rows} counselors={counselors} />);
    fireEvent.change(screen.getByLabelText("동"), { target: { value: "101" } });
    await waitFor(() => {
      expect(screen.getByText("검색 결과 1세대 / 전체 2세대")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));
    await waitFor(() => {
      expect(screen.getByText("검색 결과 2세대 / 전체 2세대")).toBeTruthy();
    });
  });
});

describe("field member name editor: PROJECT_ADMIN 전용 이름 수정", () => {
  beforeEach(() => {
    updateMoveInFieldMemberDisplayName.mockReset();
    refresh.mockReset();
  });

  it("이름을 수정하면 서버 액션을 호출하고 새로고침한다", async () => {
    updateMoveInFieldMemberDisplayName.mockResolvedValue({ ok: true, displayName: "박진하 팀장" });
    render(
      <FieldMemberNameEditor
        projectId="p1"
        members={[{ memberId: "member-c", displayName: "박진하" }]}
      />,
    );
    const input = screen.getByLabelText("박진하 표시 이름");
    fireEvent.change(input, { target: { value: "박진하 팀장" } });
    fireEvent.click(screen.getByRole("button", { name: "수정" }));

    await waitFor(() => {
      expect(updateMoveInFieldMemberDisplayName).toHaveBeenCalledWith({
        projectId: "p1",
        memberId: "member-c",
        displayName: "박진하 팀장",
      });
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("빈 이름은 서버 호출 없이 클라이언트에서 거부한다", () => {
    render(
      <FieldMemberNameEditor
        projectId="p1"
        members={[{ memberId: "member-c", displayName: "박진하" }]}
      />,
    );
    fireEvent.change(screen.getByLabelText("박진하 표시 이름"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    expect(updateMoveInFieldMemberDisplayName).not.toHaveBeenCalled();
    expect(screen.getByText("이름은 2~30자로 입력해주세요.")).toBeTruthy();
  });

  it("display_name이 없는 상담사는 '이름 미등록'으로 보인다", () => {
    render(
      <FieldMemberNameEditor
        projectId="p1"
        members={[{ memberId: "member-d", displayName: null }]}
      />,
    );
    expect(screen.getByText("이름 미등록")).toBeTruthy();
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
