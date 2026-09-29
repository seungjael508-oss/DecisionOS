import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireMoveInAccess: vi.fn(),
  loadUnitRows: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/move-in/access", () => ({
  requireMoveInAccess: mocks.requireMoveInAccess,
}));
vi.mock("@/lib/move-in/queries", () => ({
  loadUnitRows: mocks.loadUnitRows,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({ rpc: mocks.rpc }),
}));

import { createMoveInConsultation } from "@/app/projects/[projectId]/move-in/units/[unitId]/actions";

const projectId = "p1";
const units = `/projects/${projectId}/move-in/units`;

function row(unitId: string, unitNo: string) {
  return {
    unitId,
    buildingNo: "101",
    unitNo,
    customerName: null,
    customerPhone: null,
    latestGrade: "C",
    occupancyIntent: null,
    fundingStatus: null,
    moveInStatus: null,
    operationalIntent: null,
    operationalIntentAsOf: null,
    currentContractId: "contract-" + unitId,
    balancePaidAt: null,
    actualMoveInDate: null,
    plannedMoveInDate: null,
    lastContactAt: null,
    nextContactAt: null,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    projectId,
    unitId: "u-102",
    customerId: "c-102",
    consultationType: "OUTBOUND" as const,
    content: "다음 세대 상담",
    legacyGrade: "C" as const,
    nextContactAt: "",
    clearNextContactAt: false,
    occupancyIntent: "" as const,
    fundingStatus: "" as const,
    moveInStatus: "" as const,
    plannedMoveInDate: "",
    balancePaidAt: "",
    actualMoveInDate: "",
    reason: "",
    returnTo: `${units}?grade=C&buildingNo=101&sort=unit&cursor=current-page`,
    ...overrides,
  };
}

describe("createMoveInConsultation return context", () => {
  beforeEach(() => {
    mocks.requireMoveInAccess.mockReset();
    mocks.loadUnitRows.mockReset();
    mocks.rpc.mockReset();
    mocks.requireMoveInAccess.mockResolvedValue({ ok: true, role: "CLIENT_MANAGER", memberId: "member" });
    mocks.loadUnitRows.mockResolvedValue({ error: false, rows: [row("u-101", "101"), row("u-102", "102"), row("u-103", "103")] });
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it("uses the server-authorized filtered ordering for save-and-next", async () => {
    const result = await createMoveInConsultation(input({ afterSave: "next" }));

    expect(mocks.loadUnitRows).toHaveBeenCalledWith(projectId);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      returnTo: `${units}?grade=C&buildingNo=101&sort=unit&cursor=current-page`,
      destination: `/projects/${projectId}/move-in/units/u-103?returnTo=${encodeURIComponent(`${units}?grade=C&buildingNo=101&sort=unit&cursor=current-page`)}`,
      lastInContext: false,
    });
  });

  it("returns to the same filtered list when the current unit is last", async () => {
    mocks.loadUnitRows.mockResolvedValue({ error: false, rows: [row("u-102", "102")] });

    const result = await createMoveInConsultation(input({ afterSave: "next" }));

    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      returnTo: `${units}?grade=C&buildingNo=101&sort=unit&cursor=current-page`,
      destination: `${units}?grade=C&buildingNo=101&sort=unit&cursor=current-page&moveInNotice=last`,
      lastInContext: true,
    });
  });

  it("does not resolve or redirect after a failed consultation mutation", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "write failed" } });

    const result = await createMoveInConsultation(input({ afterSave: "next" }));

    expect(result).toEqual({ ok: false });
  });

  it("uses the Today Queue filter context for the next unit", async () => {
    mocks.loadUnitRows.mockResolvedValue({
      error: false,
      rows: [
        { ...row("u-101", "101"), nextContactAt: "2020-01-01T00:00:00.000Z" },
        { ...row("u-102", "102"), nextContactAt: "2020-01-01T00:00:00.000Z" },
      ],
    });

    const returnTo = `/projects/${projectId}/move-in/today?filter=next_contact&cursor=queue-2`;
    const result = await createMoveInConsultation(input({
      unitId: "u-101",
      customerId: "c-101",
      returnTo,
      afterSave: "next",
    }));

    expect(result).toEqual({
      ok: true,
      returnTo,
      destination: `/projects/${projectId}/move-in/units/u-102?returnTo=${encodeURIComponent(returnTo)}`,
      lastInContext: false,
    });
  });

  it("passes an explicit operational intent but omits the argument for 선택 안 함", async () => {
    await createMoveInConsultation(input({ operationalIntent: "SALE_TRANSFER" }));
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_move_in_consultation",
      expect.objectContaining({ p_operational_intent: "SALE_TRANSFER" }),
    );

    mocks.rpc.mockClear();
    await createMoveInConsultation(input());
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_move_in_consultation",
      expect.not.objectContaining({ p_operational_intent: expect.anything() }),
    );
  });

  it.each(["COUNSELOR", "CLIENT_MANAGER", "PROJECT_ADMIN"])(
    "%s uses the same field-operation return flow",
    async (role) => {
      mocks.requireMoveInAccess.mockResolvedValue({ ok: true, role, memberId: "member" });

      const result = await createMoveInConsultation(input());

      expect(result).toMatchObject({ ok: true, destination: `${units}?grade=C&buildingNo=101&sort=unit&cursor=current-page` });
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    },
  );

  it("denies calls outside the existing access boundary before a write", async () => {
    mocks.requireMoveInAccess.mockResolvedValue({ ok: false });

    const result = await createMoveInConsultation(input());

    expect(result).toEqual({ ok: false });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
