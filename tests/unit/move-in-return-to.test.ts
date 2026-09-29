import { describe, expect, it } from "vitest";
import {
  buildMoveInUnitDetailHref,
  getMoveInReturnContext,
  getSafeMoveInReturnTo,
  resolveMoveInAdjacentUnitIds,
  resolveNextMoveInUnitId,
  resolveTodayQueueAdjacentUnitIds,
} from "@/lib/move-in/return-to";
import type { UnitListRow } from "@/lib/move-in/filters";

const projectId = "project-1";
const units = `/projects/${projectId}/move-in/units`;
const today = `/projects/${projectId}/move-in/today`;

function row(
  unitId: string,
  buildingNo: string,
  unitNo: string,
  latestGrade: string | null = "C",
): UnitListRow {
  return {
    unitId,
    buildingNo,
    unitNo,
    customerName: null,
    customerPhone: null,
    latestGrade,
    occupancyIntent: null,
    fundingStatus: null,
    moveInStatus: null,
    balancePaidAt: null,
    actualMoveInDate: null,
    plannedMoveInDate: null,
    lastContactAt: null,
    nextContactAt: null,
    operationalIntent: null,
    operationalIntentAsOf: null,
    currentContractId: null,
  };
}

describe("getSafeMoveInReturnTo", () => {
  it("preserves every units-list query parameter", () => {
    expect(
      getSafeMoveInReturnTo(
        projectId,
        `${units}?grade=C&building=104&assignee=me&page=2&search=%ED%99%8D%EA%B8%B8%EB%8F%99`,
      ),
    ).toBe(`${units}?grade=C&building=104&assignee=me&page=2&search=%ED%99%8D%EA%B8%B8%EB%8F%99`);
  });

  it("returns to Today Queue when it was the entry context", () => {
    expect(getSafeMoveInReturnTo(projectId, `${today}?filter=all`)).toBe(`${today}?filter=all`);
  });

  it("builds a detail link with the complete encoded list context", () => {
    const returnTo = `${units}?grade=C&intent=SALE_TRANSFER,TERMINATION&buildingNo=101&customerName=%ED%99%8D%EA%B8%B8%EB%8F%99&assignee=me&occupancyIntent=SALE&fundingStatus=FUNDING_SHORTAGE&moveInStatus=DELAYED&deal=TRANSFER&problemOnly=true&problemCategory=CREDIT&sort=unit&direction=asc&page=2&cursor=cursor-2&futureSafe=keep`;

    expect(buildMoveInUnitDetailHref(projectId, "u-102", returnTo)).toBe(
      `/projects/${projectId}/move-in/units/u-102?returnTo=${encodeURIComponent(returnTo)}`,
    );
  });

  it("parses comma-separated intent values, preserves safe unknown parameters, and applies only implemented filters", () => {
    const raw = `${units}?grade=C&intent=SALE_TRANSFER,TERMINATION&buildingNo=105&assignee=member-1&sort=grade&cursor=cursor-2&futureSafe=keep`;
    const context = getMoveInReturnContext(projectId, raw);
    expect(context).toMatchObject({
      kind: "units",
      returnTo: raw,
      filters: { grade: "C", buildingNo: "105", operationalIntent: ["SALE_TRANSFER", "TERMINATION"] },
      sortKey: "grade",
    });
    expect(buildMoveInUnitDetailHref(projectId, "u-105", raw)).toContain(encodeURIComponent(raw));
  });

  it("finds the next unit only inside the current C-grade and building context", () => {
    const context = getMoveInReturnContext(projectId, `${units}?grade=C&buildingNo=101&sort=unit`);
    const rows = [
      row("u-101", "101", "101", "C"),
      row("u-102", "101", "102", "C"),
      row("u-103", "101", "103", "C"),
      row("u-other-grade", "101", "104", "D"),
      row("u-other-building", "102", "101", "C"),
    ];

    expect(resolveNextMoveInUnitId(rows, "u-102", context)).toBe("u-103");
  });

  it("resolves both neighbors only from the authorized filtered and sorted intent result", () => {
    const context = getMoveInReturnContext(projectId, `${units}?grade=C&intent=SALE_TRANSFER,TERMINATION&sort=unit&direction=desc`);
    const rows = [
      { ...row("u-101", "101", "101", "C"), operationalIntent: "SALE_TRANSFER" as const },
      { ...row("u-102", "101", "102", "C"), operationalIntent: "TERMINATION" as const },
      { ...row("u-103", "101", "103", "C"), operationalIntent: "SALE_TRANSFER" as const },
      { ...row("u-rent", "101", "104", "C"), operationalIntent: "RENT" as const },
      { ...row("u-d", "101", "105", "D"), operationalIntent: "SALE_TRANSFER" as const },
    ];
    expect(resolveMoveInAdjacentUnitIds(rows, "u-102", context)).toEqual({
      previousUnitId: "u-103",
      nextUnitId: "u-101",
    });
  });

  it("returns null at the end of the filtered list instead of falling back to the project list", () => {
    const context = getMoveInReturnContext(projectId, `${units}?grade=C&buildingNo=101&sort=unit`);
    const rows = [row("u-101", "101", "101"), row("u-102", "101", "102")];

    expect(resolveNextMoveInUnitId(rows, "u-102", context)).toBeNull();
  });

  it("finds the next unit in the current Today Queue filter", () => {
    const context = getMoveInReturnContext(projectId, `${today}?filter=next_contact`);
    const rows = [
      { ...row("u-101", "101", "101"), nextContactAt: "2020-01-01T00:00:00.000Z" },
      { ...row("u-102", "101", "102"), nextContactAt: "2020-01-01T00:00:00.000Z" },
      { ...row("u-funding", "101", "103"), fundingStatus: "FUNDING_SHORTAGE" as const },
    ];

    expect(
      resolveNextMoveInUnitId(rows, "u-101", context, new Date("2026-09-29T00:00:00.000Z")),
    ).toBe("u-102");
  });

  it("resolves Today neighbors only inside the current filtered Queue ordering", () => {
    const context = getMoveInReturnContext(projectId, `${today}?filter=next_contact&priority=HIGH&sort=unit&cursor=q2`);
    const queueRows = [
      { unitId: "u-101", reasonCodes: ["FOLLOW_UP_DUE"] },
      { unitId: "u-102", reasonCodes: ["FOLLOW_UP_DUE"] },
      { unitId: "u-funding", reasonCodes: ["C_GRADE_FUNDING"] },
    ];
    expect(resolveTodayQueueAdjacentUnitIds(queueRows, "u-101", context)).toEqual({
      previousUnitId: null,
      nextUnitId: "u-102",
    });
  });

  it.each([
    [null],
    [""],
    ["https://attacker.example/"],
    ["//attacker.example/"],
    ["/projects/other-project/move-in/units?grade=D"],
    [`/projects/${projectId}/move-in/assign`],
    ["%2F%2Fattacker.example"],
  ])("falls back to units for unsafe returnTo %j", (raw) => {
    expect(getSafeMoveInReturnTo(projectId, raw)).toBe(units);
  });
});
