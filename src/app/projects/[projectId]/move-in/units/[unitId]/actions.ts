"use server";

import { buildCreateMoveInConsultationArgs } from "@/lib/move-in/consultation";
import type { CreateMoveInConsultationInput } from "@/lib/move-in/consultation";
import { requireMoveInAccess } from "@/lib/move-in/access";
import {
  buildMoveInUnitDetailHref,
  getMoveInReturnContext,
  getSafeMoveInReturnTo,
  resolveNextMoveInUnitId,
  withMoveInReturnNotice,
  withTodayTaskPendingNotice,
} from "@/lib/move-in/return-to";
import { loadUnitRows } from "@/lib/move-in/queries";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { completeTodayTask } from "@/lib/move-in/today-task.server";
import type { TodayTaskOutcome } from "@/lib/move-in/today-task";
import { isTradeFundingStatus, isTradeFundingType } from "@/lib/move-in/trade-funding";
import type { SaveMoveInBalancePaidInput, SaveMoveInTradeFundingInput } from "@/lib/move-in/workspace-save";

type CreateMoveInConsultationResult =
  | { ok: false }
  | {
      ok: true;
      returnTo: string;
      destination: string;
      lastInContext: boolean;
      /** 오늘 관리대상에서 진입한 저장만 값이 있다. failed면 세대는 목록에 남고 재시도 안내로 이동한다. */
      todayTask?: TodayTaskOutcome;
    };

export async function createMoveInConsultation(
  input: CreateMoveInConsultationInput & {
    returnTo?: string;
    afterSave?: "list" | "next";
  },
): Promise<CreateMoveInConsultationResult> {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok) {
    return { ok: false as const };
  }

  const args = buildCreateMoveInConsultationArgs(input);
  if ("error" in args) {
    return { ok: false as const };
  }

  const returnContext = getMoveInReturnContext(input.projectId, input.returnTo);
  let nextUnitId: string | null = null;
  if (input.afterSave === "next") {
    // Resolve from the same server-authorized projection that powers the list
    // before mutating. A grade/status change in this consultation must not
    // move the operator to an unrelated row after a successful save.
    const rows = await loadUnitRows(input.projectId);
    if (rows.error) return { ok: false as const };
    nextUnitId = resolveNextMoveInUnitId(
      rows.rows,
      input.unitId,
      returnContext,
    );
  }

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("create_move_in_consultation", args);
  if (error) {
    return { ok: false as const };
  }

  // 오늘 관리대상에서 진입한 상담만, 저장 성공이 확인된 뒤 오늘 업무를 처리한다(다음 관리일이 있으면 그날까지 미룸).
  // 처리에 실패해도 상담은 이미 저장됐으므로 성공으로 돌려주되, 오늘 관리대상으로 돌아가 재시도 안내를 보여준다.
  let todayTask: TodayTaskOutcome | undefined;
  if (returnContext.kind === "today") {
    const nextAt = input.clearNextContactAt ? null : input.nextContactAt || null;
    todayTask = await completeTodayTask(input.projectId, input.unitId, nextAt);
    if (todayTask === "failed") {
      return {
        ok: true as const,
        returnTo: returnContext.returnTo,
        destination: withTodayTaskPendingNotice(returnContext.returnTo, input.unitId, nextAt),
        lastInContext: false,
        todayTask,
      };
    }
  }

  if (input.afterSave === "next") {
    const destination = nextUnitId
      ? buildMoveInUnitDetailHref(input.projectId, nextUnitId, returnContext.returnTo)
      : withMoveInReturnNotice(returnContext.returnTo, "last");
    return {
      ok: true as const,
      returnTo: returnContext.returnTo,
      destination,
      lastInContext: nextUnitId === null,
      ...(todayTask ? { todayTask } : {}),
    };
  }

  const returnTo = getSafeMoveInReturnTo(input.projectId, input.returnTo);
  return {
    ok: true as const,
    returnTo,
    destination: returnTo,
    lastInContext: false,
    ...(todayTask ? { todayTask } : {}),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** C·D 매매/임대 자금조달 분류 저장. 권한·현재 ACTIVE 계약·고객 쓰기 권한·이력은 RPC가 검증·기록한다(화면 값은 신뢰하지 않음). */
export async function saveMoveInTradeFunding(input: SaveMoveInTradeFundingInput): Promise<{ ok: true; changed: boolean } | { ok: false; message: string }> {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok) return { ok: false, message: "이 세대를 수정할 권한이 없습니다." };
  if (![input.projectId, input.unitId, input.customerId, input.contractId].every((v) => UUID.test(v))) {
    return { ok: false, message: "세대 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요." };
  }
  if ((input.tradeFundingType !== "" && !isTradeFundingType(input.tradeFundingType)) ||
      (input.tradeFundingStatus !== "" && !isTradeFundingStatus(input.tradeFundingStatus)) ||
      (input.tradeFundingType === "" && input.tradeFundingStatus !== "")) {
    return { ok: false, message: "자금조달 분류 값이 올바르지 않습니다." };
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("set_move_in_trade_funding", {
    p_project_id: input.projectId, p_unit_id: input.unitId, p_customer_id: input.customerId,
    p_expected_contract_id: input.contractId, p_trade_funding_type: input.tradeFundingType || null,
    p_trade_funding_status: input.tradeFundingStatus || null, p_reason: null,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, message: "이 세대의 자금유형을 수정할 권한이 없습니다." };
    if (error.code === "40001" || error.message.includes("active contract")) return { ok: false, message: "현재 계약자가 바뀌었습니다. 새로고침 후 다시 확인해 주세요." };
    return { ok: false, message: "저장하지 못했습니다. 다시 시도해 주세요." };
  }
  const changed = !!data && typeof data === "object" && !Array.isArray(data) && data.changed === true;
  return { ok: true, changed };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const REVERTIBLE_MOVE_IN = ["NOT_CONTACTED", "CONTACTED", "PLANNED", "DELAYED"] as const;

/**
 * 관리자(PROJECT_ADMIN) 잔금완납 지정·완납일 수정·해제. 상태 변경과 이력은 기존 update_unit_occupancy_status RPC가 기록한다.
 * 입주완료 세대는 상태를 낮추지 않고 완납일만 바꾼다. 해제는 잔금완납으로 바뀌기 직전 입주진행으로 되돌린다(이력 없으면 접촉완료).
 */
export async function saveMoveInBalancePaid(input: SaveMoveInBalancePaidInput): Promise<{ ok: true; changed: boolean } | { ok: false; message: string }> {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok || access.role !== "PROJECT_ADMIN") return { ok: false, message: "잔금완납은 관리자만 수정할 수 있습니다." };
  if (![input.projectId, input.unitId, input.customerId, input.contractId].every((v) => UUID.test(v))) {
    return { ok: false, message: "세대 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요." };
  }
  const reason = input.reason.trim();
  if (!reason || reason.length > 200) return { ok: false, message: "변경 사유를 입력해 주세요(200자 이내)." };
  if (input.paidOn !== "") {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
    if (!DATE_ONLY.test(input.paidOn) || Number.isNaN(Date.parse(`${input.paidOn}T00:00:00+09:00`)) || input.paidOn > today) {
      return { ok: false, message: "잔금 완납일을 오늘 이전 날짜로 입력해 주세요." };
    }
  }
  const supabase = await createServerClient();
  const { data: current, error: readError } = await supabase.from("unit_occupancy_status")
    .select("move_in_status,balance_paid_at,planned_move_in_date")
    .eq("project_id", input.projectId).eq("unit_id", input.unitId).eq("contract_id", input.contractId).maybeSingle();
  if (readError || !current) return { ok: false, message: "입주 상태를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요." };

  const args: Database["public"]["Functions"]["update_unit_occupancy_status"]["Args"] = {
    p_project_id: input.projectId, p_unit_id: input.unitId, p_contract_id: input.contractId, p_reason: reason,
  };
  const movedIn = current.move_in_status === "MOVED_IN";
  if (input.paidOn !== "") {
    const paidAt = new Date(`${input.paidOn}T00:00:00+09:00`).toISOString();
    const sameDay = current.balance_paid_at
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(current.balance_paid_at)) === input.paidOn : false;
    if (sameDay && (movedIn || current.move_in_status === "BALANCE_PAID")) return { ok: true, changed: false };
    if (!movedIn) args.p_move_in_status = "BALANCE_PAID";
    args.p_balance_paid_at = paidAt;
  } else {
    if (current.move_in_status !== "BALANCE_PAID" && !current.balance_paid_at) return { ok: true, changed: false };
    if (current.move_in_status === "BALANCE_PAID") {
      const { data: history } = await supabase.from("contract_status_history").select("previous_value")
        .eq("project_id", input.projectId).eq("unit_id", input.unitId).eq("contract_id", input.contractId)
        .eq("field_changed", "move_in_status").eq("new_value", "BALANCE_PAID")
        .order("changed_at", { ascending: false }).limit(1).maybeSingle();
      const previous = REVERTIBLE_MOVE_IN.find((v) => v === history?.previous_value);
      args.p_move_in_status = previous === "PLANNED" && !current.planned_move_in_date ? "CONTACTED" : previous ?? "CONTACTED";
    }
    if (current.balance_paid_at) args.p_clear_balance_paid_at = true;
  }
  const { error } = await supabase.rpc("update_unit_occupancy_status", args);
  if (error) {
    if (error.code === "42501") return { ok: false, message: "이 세대의 입주 상태를 수정할 권한이 없습니다." };
    return { ok: false, message: "저장하지 못했습니다. 다시 시도해 주세요." };
  }
  return { ok: true, changed: true };
}
