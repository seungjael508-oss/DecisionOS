"use server";

import { requireMoveInAccess } from "@/lib/move-in/access";
import {
  buildRecordVisitResultArgs,
  type RecordVisitResultError,
  type RecordVisitResultInput,
} from "@/lib/move-in/absence-visit";
import { createServerClient } from "@/lib/supabase/server";
import { completeTodayTask } from "@/lib/move-in/today-task.server";
import { TODAY_TASK_PENDING_MESSAGE } from "@/lib/move-in/today-task";

export type AbsenceActionResult =
  | { ok: true; message: string; taskPending?: { unitId: string; nextAt: string | null } }
  | { ok: false; message: string };

type RpcError = { code?: string; message?: string } | null;
type RpcClient = {
  rpc: (name: string, args: object) => Promise<{ data: unknown; error: RpcError }>;
  from: (table: "move_in_visit_target") => {
    select: (columns: "unit_id") => {
      eq: (column: "project_id", value: string) => {
        eq: (column: "visit_target_id", value: string) => {
          maybeSingle: () => Promise<{ data: { unit_id: string } | null; error: unknown }>;
        };
      };
    };
  };
};

const STALE_MESSAGE = "세대 정보가 바뀌었습니다. 새로고침 후 다시 확인해 주세요.";

/**
 * 방문 결과 저장. 기본등급은 바꾸지 않으며 상담 저장은 기존 상담 RPC를 거친다.
 * 저장 성공 후 오늘 업무를 처리한다: 방문 완료·다음 방문일 없는 재방문 필요 = 오늘 완료, 다음 방문일 = 그날까지 미룸.
 * 완료 처리할 세대는 클라이언트 값이 아니라 저장한 방문대상의 unit_id로 정한다.
 */
export async function recordVisitResult(input: RecordVisitResultInput): Promise<AbsenceActionResult> {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok) return { ok: false, message: "권한이 없습니다." };
  const args = buildRecordVisitResultArgs(input);
  if ("error" in args) {
    const messages: Record<RecordVisitResultError, string> = {
      invalid_target: STALE_MESSAGE,
      invalid_result: "방문 결과를 선택해 주세요.",
      content_required: "방문 내용을 입력해 주세요.",
      intent_required: "방문 완료 시 확인한 의향을 선택해 주세요.",
      intent_not_allowed: "재방문 필요는 의향을 기록하지 않습니다.",
      next_visit_invalid: "다음 방문일은 재방문 필요일 때 내일 이후 날짜로 선택해 주세요.",
    };
    return { ok: false, message: messages[args.error] };
  }
  const supabase = (await createServerClient()) as unknown as RpcClient;
  const { error } = await supabase.rpc("record_move_in_visit_result", args);
  if (error) {
    if (error.code === "40001" || error.code === "23514") return { ok: false, message: STALE_MESSAGE };
    if (error.code === "42501") return { ok: false, message: "이 세대의 방문 결과를 저장할 권한이 없습니다." };
    return { ok: false, message: "방문 결과를 저장하지 못했습니다." };
  }
  const saved = input.result === "VISITED" ? "방문 완료로 저장했습니다." : args.p_next_visit_at ? "재방문 필요로 저장하고 다음 방문일까지 미뤘습니다." : "재방문 필요로 저장했습니다.";
  const target = await supabase.from("move_in_visit_target").select("unit_id")
    .eq("project_id", input.projectId).eq("visit_target_id", input.visitTargetId).maybeSingle();
  const unitId = target.error ? null : target.data?.unit_id ?? null;
  if (!unitId) return { ok: true, message: `${saved} 오늘 업무 완료 처리를 하지 못했습니다. 새로고침 후 목록에서 완료 처리해 주세요.` };
  const task = await completeTodayTask(input.projectId, unitId, args.p_next_visit_at);
  if (task === "failed") return { ok: true, message: `${saved} ${TODAY_TASK_PENDING_MESSAGE}`, taskPending: { unitId, nextAt: args.p_next_visit_at } };
  return { ok: true, message: saved };
}

/** 저장 후 완료 처리만 실패한 세대의 재시도. 같은 날 같은 상태면 기록을 새로 만들지 않고 갱신한다. */
export async function retryTodayTask(input: { projectId: string; unitId: string; nextAt: string | null }): Promise<{ ok: boolean; message: string }> {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok) return { ok: false, message: "권한이 없습니다." };
  const task = await completeTodayTask(input.projectId, input.unitId, input.nextAt);
  if (task === "failed") return { ok: false, message: "완료 처리를 다시 하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  return { ok: true, message: task === "snoozed" ? "다음 관리일까지 미뤘습니다." : "오늘 업무를 완료 처리했습니다." };
}
