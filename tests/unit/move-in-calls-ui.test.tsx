/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConsultationHistory } from "@/components/move-in/consultation-history";
import { CallTable } from "@/components/move-in/call-table";
import type { CallListRow } from "@/lib/move-in/calls";
import type { ConsultationHistoryRow } from "@/lib/move-in/queries";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("call list and timeline UI", () => {
  it("shows latest grade and phone on the calls table", () => {
    const rows: CallListRow[] = [
      {
        unitId: "u1",
        buildingNo: "101",
        unitNo: "202",
        customerId: "c1",
        customerName: "이OO",
        customerPhone: "010-1234-5678",
        phoneNormalized: "01012345678",
        assignedCounselorId: "member-a",
        latestGrade: "C",
        occupancyIntent: "SALE",
        fundingStatus: "UNKNOWN",
        moveInStatus: "CONTACTED",
        lastConsultedAt: "2026-09-01T08:27:00.000Z",
        nextContactAt: null,
      },
    ];
    render(<CallTable projectId="p1" rows={rows} currentMemberId="member-a" />);
    expect(screen.getByText("최근등급")).toBeTruthy();
    expect(screen.getAllByText("C").length).toBeGreaterThan(0);
    expect(screen.getAllByText("010-1234-5678")).toHaveLength(2);
  });

  it("renders timeline newest-first with counselor, type, and grade", () => {
    const rows: ConsultationHistoryRow[] = [
      {
        id: "new",
        consultedAt: "2026-09-01T08:27:00.000Z",
        contactType: "CALL",
        purpose: "OUTBOUND",
        content: "인콜, 상황변동 없음",
        nextActionAt: null,
        counselorId: "member-a",
        legacyGrade: "C",
      },
      {
        id: "old",
        consultedAt: "2026-08-01T00:00:00.000Z",
        contactType: "VISIT",
        purpose: "VISIT",
        content: "이전 방문",
        nextActionAt: null,
        counselorId: "member-b",
        legacyGrade: "B",
      },
    ];
    const { container } = render(
      <ConsultationHistory rows={rows} currentMemberId="member-a" />,
    );
    const items = container.querySelectorAll("li");
    expect(items[0]?.textContent).toContain("평가 C");
    expect(items[0]?.textContent).toContain("아웃바운드");
    expect(items[0]?.textContent).toContain("나");
    expect(items[1]?.textContent).toContain("이전 방문");
  });
});
