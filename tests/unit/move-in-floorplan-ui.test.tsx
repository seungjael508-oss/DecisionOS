/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FloorplanBoard } from "@/components/move-in/floorplan-board";
import { FloorplanClient } from "@/components/move-in/floorplan-client";
import type { FloorplanUnit } from "@/lib/move-in/floorplan";

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
});

const units: FloorplanUnit[] = [
  {
    unitId: "u-1501",
    buildingNo: "106",
    unitNo: "1501",
    floor: null,
    occupancyIntent: "SELF_MOVE_IN",
    fundingStatus: "NORMAL",
    moveInStatus: "PLANNED",
    latestGrade: "A",
  },
  {
    unitId: "u-1502",
    buildingNo: "106",
    unitNo: "1502",
    floor: null,
    occupancyIntent: "SALE",
    fundingStatus: "LOAN_NEEDED",
    moveInStatus: "DELAYED",
    latestGrade: "C",
  },
  {
    unitId: "u-1401",
    buildingNo: "106",
    unitNo: "1401",
    floor: null,
    occupancyIntent: "JEONSE",
    fundingStatus: "UNKNOWN",
    moveInStatus: "CONTACTED",
    latestGrade: "B",
  },
];

describe("floorplan UI", () => {
  it("renders a building grid and links each ho to unit detail", () => {
    render(
      <FloorplanBoard
        projectId="p1"
        units={units}
        buildingNo="106"
        colorBy="moveInStatus"
      />,
    );
    expect(screen.getByText("106동")).toBeTruthy();
    expect(screen.getByText("1501")).toBeTruthy();
    expect(screen.getByText("1502")).toBeTruthy();
    expect(screen.getByText("1401")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "106동 1501호 입주예정" }).getAttribute("href"),
    ).toBe("/projects/p1/move-in/units/u-1501");
  });

  it("switches the visible encoding when colorBy is 기존등급", () => {
    render(
      <FloorplanBoard
        projectId="p1"
        units={units}
        buildingNo="106"
        colorBy="legacyGrade"
      />,
    );
    expect(screen.getByRole("link", { name: "106동 1501호 A" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "범례" })).toBeTruthy();
  });

  it("switches all four modes and buildings using the same dataset without navigation or fetch", () => {
    const fetch = vi.fn(() => { throw new Error("Unexpected network request"); });
    vi.stubGlobal("fetch", fetch);
    const dataset = units.concat({ ...units[0], unitId: "u-101", buildingNo: "101", unitNo: "1004" });
    const before = JSON.stringify(dataset);
    render(<FloorplanClient projectId="p1" units={dataset} initialBuildingNo="106" initialColorBy="moveInStatus" />);
    const cases = [["입주의향", "실입주"], ["자금상태", "정상"], ["기존등급", "A"], ["입주진행", "입주예정"]];
    for (const [mode, value] of cases) {
      fireEvent.click(screen.getByRole("button", { name: mode }));
      expect(screen.getByRole("button", { name: mode }).getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByRole("link", { name: `106동 1501호 ${value}` })).toBeTruthy();
    }
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "101" } });
    expect(screen.queryByText("1501")).toBeNull();
    expect(screen.getByRole("link", { name: "101동 1004호 입주예정" }).getAttribute("data-prefetch")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "기존등급" }));
    fireEvent.click(screen.getByRole("button", { name: "적용" }));
    expect(screen.getByRole("link", { name: "101동 1004호 A" })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    expect(routing.push).not.toHaveBeenCalled();
    expect(routing.replace).not.toHaveBeenCalled();
    expect(routing.refresh).not.toHaveBeenCalled();
    expect(JSON.stringify(dataset)).toBe(before);
  });
});
