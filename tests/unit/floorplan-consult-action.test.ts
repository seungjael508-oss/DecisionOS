import { expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ error: null as object | null })),
  requireAccess: vi.fn(async () => ({ ok: true })),
  loadUnitRows: vi.fn(),
  completeTodayTask: vi.fn(),
}));
vi.mock("@/lib/move-in/access", () => ({ requireMoveInAccess: mocks.requireAccess }));
vi.mock("@/lib/move-in/queries", () => ({ loadUnitRows: mocks.loadUnitRows }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/move-in/today-task.server", () => ({ completeTodayTask: mocks.completeTodayTask }));

import { createMoveInConsultation } from "@/app/projects/[projectId]/move-in/units/[unitId]/actions";

test("saves through the existing RPC and returns to the same floorplan, without completing a Today task", async () => {
  const returnTo = "/projects/p/move-in/floorplan?buildingNo=105";
  const result = await createMoveInConsultation({
    projectId:"p", unitId:"u", customerId:"c", expectedContractId:"k",
    consultationType:"OUTBOUND", content:"납부일 재확인 예정", returnTo, afterSave:"next",
  });
  expect(mocks.rpc).toHaveBeenCalledWith("create_move_in_consultation",expect.objectContaining({p_expected_contract_id:"k",p_content:"납부일 재확인 예정"}));
  expect(mocks.loadUnitRows).not.toHaveBeenCalled();
  expect(mocks.completeTodayTask).not.toHaveBeenCalled();
  expect(result).toEqual({ok:true,returnTo,destination:returnTo,lastInContext:false});
});
