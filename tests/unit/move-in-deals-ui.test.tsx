/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveMoveInUnitDeal = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
  usePathname: () => "/projects/p1/move-in/deals",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/app/projects/[projectId]/move-in/deals/actions", () => ({
  saveMoveInUnitDeal: (...args: unknown[]) => saveMoveInUnitDeal(...args),
}));

import { DealEditor } from "@/components/move-in/deal-editor";
import { DealFilters } from "@/components/move-in/deal-filters";
import { DealTable } from "@/components/move-in/deal-table";
import type { DealListRow } from "@/lib/move-in/deals";
import type { BrokerageOfficeOption } from "@/lib/move-in/brokerages";

const offices: BrokerageOfficeOption[] = [
  {
    id: "off-1",
    name: "익명공인",
    active: true,
    contacts: [
      { id: "rep-1", role: "REP", name: "대표A", phone: "01000001111", active: true },
    ],
  },
];

const row: DealListRow = {
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
  lastConsultedAt: null,
  nextContactAt: null,
  contractId: "ct-1",
  consentStatus: "CONSENTED",
  dealStatus: "IN_PROGRESS",
  saleEnabled: true,
  jeonseEnabled: false,
  monthlyRentEnabled: false,
  brokerageCount: 1,
  updatedAt: "2026-09-11T00:00:00.000Z",
  officeIds: ["off-1"],
};

afterEach(() => {
  cleanup();
});

describe("deals UI", () => {
  beforeEach(() => {
    saveMoveInUnitDeal.mockReset();
    refresh.mockReset();
  });

  it("lists occupancy as read-only and deal execution fields", () => {
    render(<DealTable projectId="p1" rows={[row]} />);
    expect(screen.getByText("입주의향")).toBeTruthy();
    expect(screen.getByText("매도")).toBeTruthy();
    expect(screen.getByText("동의")).toBeTruthy();
    expect(screen.getByText("진행중")).toBeTruthy();
    expect(screen.getByText("매매")).toBeTruthy();
    expect(screen.getByText("이OO")).toBeTruthy();
  });

  it("exposes search and deal filters", () => {
    render(
      <DealFilters
        projectId="p1"
        filters={{
          q: "",
          consentStatus: "",
          dealStatus: "",
          saleEnabled: "",
          jeonseEnabled: "",
          monthlyRentEnabled: "",
          brokerageOfficeId: "",
        }}
        offices={offices}
      />,
    );
    expect(screen.getByLabelText("검색 (동, 호, 계약자명, 전화번호, 101-202)")).toBeTruthy();
    expect(screen.getByLabelText("거래동의")).toBeTruthy();
    expect(screen.getByLabelText("거래상태")).toBeTruthy();
    expect(screen.getByLabelText("배포 중개업소")).toBeTruthy();
  });

  it("saves deal + brokerage selection and refreshes", async () => {
    saveMoveInUnitDeal.mockResolvedValue({ ok: true });
    render(
      <DealEditor
        projectId="p1"
        unitId="u1"
        contractId="ct-1"
        customerId="c1"
        deal={{
          consentStatus: "NOT_CONSENTED",
          dealStatus: "IN_PROGRESS",
          saleEnabled: false,
          jeonseEnabled: false,
          monthlyRentEnabled: false,
          saleNote: "",
          jeonseNote: "",
          monthlyRentNote: "",
          details: "",
          brokerages: [],
        }}
        offices={offices}
      />,
    );
    fireEvent.click(screen.getByLabelText("동의"));
    fireEvent.click(screen.getByLabelText("매매"));
    fireEvent.change(screen.getByLabelText("업소 선택"), {
      target: { value: "off-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "중개업소 추가" }));
    fireEvent.submit(screen.getByRole("button", { name: "거래정보 저장" }).closest("form")!);
    await waitFor(() => {
      expect(saveMoveInUnitDeal).toHaveBeenCalledWith(
        expect.objectContaining({
          consentStatus: "CONSENTED",
          saleEnabled: true,
          brokerages: [expect.objectContaining({ brokerageOfficeId: "off-1" })],
        }),
      );
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("shows a generic error on stale save", async () => {
    saveMoveInUnitDeal.mockResolvedValue({ ok: false });
    render(
      <DealEditor
        projectId="p1"
        unitId="u1"
        contractId="ct-1"
        customerId="c1"
        deal={null}
        offices={offices}
      />,
    );
    fireEvent.submit(screen.getByRole("button", { name: "거래정보 저장" }).closest("form")!);
    expect(
      await screen.findByText("거래정보를 저장하지 못했습니다. 다시 불러온 후 시도해 주세요."),
    ).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
