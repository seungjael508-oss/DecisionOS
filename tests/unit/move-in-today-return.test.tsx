/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/move-in/today-filters", () => ({ TodayFilters: () => <div>필터</div> }));
vi.mock("@/lib/move-in/queries", () => ({
  loadMoveInTodayQueueRows: async () => ({
    error: false,
    rows: [{
      unitId: "u-101", contractId: "c-101", buildingNo: "101", unitNo: "101",
      customerName: "Synthetic holder", legacyGrade: "C", occupancyIntent: null,
      fundingStatus: null, moveInStatus: null, lastContactAt: null,
      nextContactAt: "2020-01-01T00:00:00.000Z", reasonCodes: ["FOLLOW_UP_DUE"],
      problemCategories: ["UNKNOWN"], priority: "MEDIUM", sourceFingerprint: "source",
      operationalIntent: "SALE_TRANSFER", operationalIntentAsOf: "2026-09-29T00:00:00.000Z",
    }],
  }),
  filterTodayQueueRows: (rows: unknown[]) => rows,
}));

import Page from "@/app/projects/[projectId]/move-in/today/page";
afterEach(cleanup);

it("passes the complete Today Queue URL to unit detail as a return context and shows intent", async () => {
  render(await Page({
    params: Promise.resolve({ projectId: "p1" }),
    searchParams: Promise.resolve({ filter: "next_contact", cursor: "queue-cursor", sort: "unit", priority: "HIGH", problemOnly: "1" }),
  }));

  const href = screen.getAllByRole("link", { name: "101동 101호" })[0].getAttribute("href");
  expect(decodeURIComponent(href ?? "")).toContain(
    "returnTo=/projects/p1/move-in/today?filter=next_contact&cursor=queue-cursor&sort=unit&priority=HIGH&problemOnly=1",
  );
  expect(screen.getAllByText("전매/매도").length).toBeGreaterThan(0);
});

it("shows the last-unit notice without carrying it into the next detail context", async () => {
  render(await Page({
    params: Promise.resolve({ projectId: "p1" }),
    searchParams: Promise.resolve({ filter: "next_contact", cursor: "queue-cursor", moveInNotice: "last" }),
  }));

  expect(screen.getByRole("status").textContent).toContain("현재 조건의 마지막 세대입니다.");
  const href = screen.getAllByRole("link", { name: "101동 101호" })[0].getAttribute("href");
  expect(decodeURIComponent(href ?? "")).not.toContain("moveInNotice=last");
});
