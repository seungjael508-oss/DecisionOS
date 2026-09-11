/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FloorplanBoard } from "@/components/move-in/floorplan-board";
import { FloorplanFilters } from "@/components/move-in/floorplan-filters";
import type { FloorplanUnit } from "@/lib/move-in/floorplan";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
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

  it("keeps the selected building when switching color mode", () => {
    render(
      <FloorplanFilters
        projectId="p1"
        buildings={["101", "106"]}
        buildingNo="106"
        colorBy="moveInStatus"
      />,
    );
    expect(
      screen.getByRole("link", { name: "입주의향" }).getAttribute("href"),
    ).toBe("/projects/p1/move-in/floorplan?buildingNo=106&colorBy=occupancyIntent");
    expect(screen.getByRole("link", { name: "입주진행" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });
});
