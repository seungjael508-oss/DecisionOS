/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnitListClient } from "@/components/move-in/unit-list-client";
import { DEFAULT_UNIT_LIST_FILTERS, type UnitListRow } from "@/lib/move-in/filters";

const routing = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, prefetch, ...props }: { href: string; children: ReactNode; prefetch?: boolean }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routing,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  routing.push.mockClear();
  routing.refresh.mockClear();
  routing.replace.mockClear();
});

function row(partial: Partial<UnitListRow> & Pick<UnitListRow, "unitId">): UnitListRow {
  return {
    buildingNo: "101",
    unitNo: "1001",
    customerName: "홍길동",
    latestGrade: null,
    customerPhone: null,
    occupancyIntent: null,
    fundingStatus: null,
    moveInStatus: null,
    balancePaidAt: null,
    actualMoveInDate: null,
    plannedMoveInDate: null,
    lastContactAt: null,
    nextContactAt: null,
    ...partial,
  };
}

const rows: UnitListRow[] = [
  row({ unitId: "u-101-201", buildingNo: "101", unitNo: "201", customerName: "김철수", latestGrade: "A", customerPhone: "010-1234-5678" }),
  row({ unitId: "u-105-301", buildingNo: "105", unitNo: "301", customerName: "박영희", latestGrade: "C", customerPhone: "010-9999-0000" }),
  row({ unitId: "u-105-302", buildingNo: "105", unitNo: "302", customerName: "이민수", latestGrade: "C", customerPhone: "010-7777-1234" }),
  row({ unitId: "u-106-401", buildingNo: "106", unitNo: "401", customerName: "최지훈", latestGrade: "D", customerPhone: "010-5678-2222" }),
];

// jsdom은 @media print를 평가하지 않으므로 화면용 영역(.print:hidden)과
// 인쇄 전용 표(.print:block)가 동시에 DOM에 남는다. 화면 단언은 반드시 이 스코프로 좁힌다.
function screenArea() {
  const container = document.querySelector(".print\\:hidden");
  if (!container) throw new Error("screen container not found");
  return within(container as HTMLElement);
}

function renderClient() {
  const fetch = vi.fn(() => {
    throw new Error("Unexpected network request");
  });
  vi.stubGlobal("fetch", fetch);
  const before = JSON.stringify(rows);
  render(<UnitListClient projectId="p1" rows={rows} initialFilters={DEFAULT_UNIT_LIST_FILTERS} />);
  return { fetch, before };
}

function expectNoNetworkOrNavigation(fetch: ReturnType<typeof vi.fn>, before: string) {
  expect(fetch).not.toHaveBeenCalled();
  expect(routing.push).not.toHaveBeenCalled();
  expect(routing.replace).not.toHaveBeenCalled();
  expect(routing.refresh).not.toHaveBeenCalled();
  expect(JSON.stringify(rows)).toBe(before);
}

describe("unit list UI", () => {
  it("filters by grade with a visible pressed state and zero network calls", () => {
    const { fetch, before } = renderClient();
    fireEvent.click(screen.getByRole("button", { name: "C 2" }));
    expect(screen.getByRole("button", { name: "C 2" }).getAttribute("aria-pressed")).toBe("true");
    expect(screenArea().getByText("박영희")).toBeTruthy();
    expect(screenArea().getByText("이민수")).toBeTruthy();
    expect(screenArea().queryByText("김철수")).toBeNull();
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("combines grade and building filters", () => {
    const { fetch, before } = renderClient();
    fireEvent.click(screen.getByRole("button", { name: "C 2" }));
    fireEvent.change(screen.getByLabelText("동"), { target: { value: "105" } });
    expect(screen.getByRole("status").textContent).toContain("2세대");
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("debounces the name search input before filtering", async () => {
    const { fetch, before } = renderClient();
    fireEvent.change(screen.getByLabelText("계약자명"), { target: { value: "김" } });
    await waitFor(() => {
      expect(screenArea().queryByText("박영희")).toBeNull();
    });
    expect(screenArea().getByText("김철수")).toBeTruthy();
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("searches by unit number", async () => {
    const { fetch, before } = renderClient();
    fireEvent.change(screen.getByLabelText("호"), { target: { value: "30" } });
    await waitFor(() => {
      expect(screenArea().queryByText("김철수")).toBeNull();
    });
    expect(screenArea().getByText("박영희")).toBeTruthy();
    expect(screenArea().getByText("이민수")).toBeTruthy();
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("resets every filter back to the full list", async () => {
    const { fetch, before } = renderClient();
    fireEvent.click(screen.getByRole("button", { name: "C 2" }));
    fireEvent.change(screen.getByLabelText("계약자명"), { target: { value: "박" } });
    await waitFor(() => {
      expect(screenArea().queryByText("김철수")).toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "전체 초기화" }));
    await waitFor(() => {
      expect(screenArea().getByText("김철수")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "전체 4" }).getAttribute("aria-pressed")).toBe("true");
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("sorts 동호수 numerically ascending by default, and toggles to descending on header click", () => {
    const { fetch, before } = renderClient();
    const cells = screen.getAllByRole("link").map((link) => link.textContent);
    expect(cells[0]).toBe("101동 201호");
    fireEvent.click(screen.getByRole("button", { name: /동호수/ }));
    const reversed = screen.getAllByRole("link").map((link) => link.textContent);
    expect(reversed[0]).toBe("106동 401호");
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("sorts 계약자 가나다순 by header click", () => {
    const { fetch, before } = renderClient();
    fireEvent.click(screen.getByRole("button", { name: /계약자/ }));
    const names = screenArea()
      .getAllByText(/철수|영희|민수|지훈/)
      .map((el) => el.textContent);
    expect(names[0]).toBe("김철수");
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("sorts 등급 in business priority order via mobile select", () => {
    const { fetch, before } = renderClient();
    fireEvent.change(screen.getByLabelText("정렬"), { target: { value: "grade:asc" } });
    let cells = screen.getAllByRole("link").map((link) => link.textContent);
    expect(cells[0]).toBe("101동 201호");
    fireEvent.change(screen.getByLabelText("정렬"), { target: { value: "grade:desc" } });
    cells = screen.getAllByRole("link").map((link) => link.textContent);
    expect(cells[cells.length - 1]).toBe("101동 201호");
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("searches by phone number without hyphens", async () => {
    const { fetch, before } = renderClient();
    fireEvent.change(screen.getByLabelText("전화번호"), { target: { value: "01012345678" } });
    await waitFor(() => {
      expect(screenArea().queryByText("박영희")).toBeNull();
    });
    expect(screenArea().getByText("김철수")).toBeTruthy();
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("searches by phone number with hyphens", async () => {
    const { fetch, before } = renderClient();
    fireEvent.change(screen.getByLabelText("전화번호"), { target: { value: "010-1234-5678" } });
    await waitFor(() => {
      expect(screenArea().queryByText("박영희")).toBeNull();
    });
    expect(screenArea().getByText("김철수")).toBeTruthy();
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("finds a unit by a partial phone number (front digits)", async () => {
    const { fetch, before } = renderClient();
    fireEvent.change(screen.getByLabelText("전화번호"), { target: { value: "1234" } });
    await waitFor(() => {
      expect(screenArea().queryByText("박영희")).toBeNull();
    });
    expect(screenArea().getByText("김철수")).toBeTruthy();
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("finds a unit by a partial phone number (trailing digits)", async () => {
    const { fetch, before } = renderClient();
    fireEvent.change(screen.getByLabelText("전화번호"), { target: { value: "5678" } });
    await waitFor(() => {
      expect(screenArea().queryByText("박영희")).toBeNull();
    });
    expect(screenArea().getByText("김철수")).toBeTruthy();
    expectNoNetworkOrNavigation(fetch, before);
  });

  describe("전화번호 단독 검색: 동/호/계약자명/등급이 비어 있어도 동작한다", () => {
    it.each([
      ["전체 숫자", "01012345678"],
      ["하이픈 포함", "010-1234-5678"],
      ["중간 4자리", "1234"],
      ["끝 4자리", "5678"],
    ])("%s(%s) 입력만으로 계약자를 찾는다", async (_label, value) => {
      const { fetch, before } = renderClient();
      fireEvent.change(screen.getByLabelText("전화번호"), { target: { value } });
      await waitFor(() => {
        expect(screenArea().queryByText("박영희")).toBeNull();
      });
      expect(screenArea().getByText("김철수")).toBeTruthy();
      // 전화번호 검색이 다른 필터 상태를 건드리지 않았는지 확인한다.
      expect((screen.getByLabelText("동") as HTMLInputElement).value).toBe("");
      expect((screen.getByLabelText("호") as HTMLInputElement).value).toBe("");
      expect((screen.getByLabelText("계약자명") as HTMLInputElement).value).toBe("");
      expect(screen.getByRole("button", { name: "전체 4" }).getAttribute("aria-pressed")).toBe("true");
      expectNoNetworkOrNavigation(fetch, before);
    });
  });

  it("combines phone number search with grade filter", async () => {
    const { fetch, before } = renderClient();
    fireEvent.click(screen.getByRole("button", { name: "D 1" }));
    fireEvent.change(screen.getByLabelText("전화번호"), { target: { value: "5678" } });
    // 김철수도 5678을 포함하지만 A등급이라 D 필터와 AND 결합되어 제외되어야 한다.
    await waitFor(() => {
      expect(screenArea().queryByText("김철수")).toBeNull();
    });
    expect(screenArea().getByText("최지훈")).toBeTruthy();
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("combines phone number search with building filter", async () => {
    const { fetch, before } = renderClient();
    fireEvent.change(screen.getByLabelText("동"), { target: { value: "105" } });
    fireEvent.change(screen.getByLabelText("전화번호"), { target: { value: "1234" } });
    // 김철수도 1234를 포함하지만 101동이라 105동 필터와 AND 결합되어 제외되어야 한다.
    await waitFor(() => {
      expect(screenArea().queryByText("김철수")).toBeNull();
    });
    expect(screenArea().getByText("이민수")).toBeTruthy();
    // 105동 박영희는 전화번호에 1234가 없어 제외되어야 한다.
    expect(screenArea().queryByText("박영희")).toBeNull();
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("PHONE_INVALID 세대도 저장된 원본 번호로 검색된다", async () => {
    const invalidRows: UnitListRow[] = [
      ...rows,
      row({
        unitId: "u-107-501",
        buildingNo: "107",
        unitNo: "501",
        customerName: "정하늘",
        customerPhone: "010-0000-9999",
        phoneQuality: "PHONE_INVALID",
      }),
    ];
    const fetch = vi.fn(() => {
      throw new Error("Unexpected network request");
    });
    vi.stubGlobal("fetch", fetch);
    render(<UnitListClient projectId="p1" rows={invalidRows} initialFilters={DEFAULT_UNIT_LIST_FILTERS} />);
    fireEvent.change(screen.getByLabelText("전화번호"), { target: { value: "0000" } });
    await waitFor(() => {
      expect(screenArea().getByText("정하늘")).toBeTruthy();
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(routing.push).not.toHaveBeenCalled();
    expect(routing.refresh).not.toHaveBeenCalled();
  });

  it("전체 초기화는 전화번호 검색값도 지운다", async () => {
    const { fetch, before } = renderClient();
    fireEvent.change(screen.getByLabelText("전화번호"), { target: { value: "1234" } });
    await waitFor(() => {
      expect(screenArea().queryByText("박영희")).toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "전체 초기화" }));
    await waitFor(() => {
      expect((screen.getByLabelText("전화번호") as HTMLInputElement).value).toBe("");
    });
    expect(screenArea().getByText("박영희")).toBeTruthy();
    expectNoNetworkOrNavigation(fetch, before);
  });

  it("prints only the currently visible filtered rows and hides the filter controls from print", () => {
    const printSpy = vi.fn();
    vi.stubGlobal("print", printSpy);
    const { fetch, before } = renderClient();
    fireEvent.click(screen.getByRole("button", { name: "C 2" }));
    fireEvent.click(screen.getByRole("button", { name: "인쇄" }));
    expect(printSpy).toHaveBeenCalledTimes(1);

    const printControls = document.querySelector(".print\\:hidden");
    expect(printControls).toBeTruthy();

    const printTable = document.querySelector(".print\\:block");
    expect(printTable).toBeTruthy();
    expect(printTable?.textContent).toContain("박영희");
    expect(printTable?.textContent).toContain("이민수");
    expect(printTable?.textContent).not.toContain("김철수");
    expectNoNetworkOrNavigation(fetch, before);
  });
});
