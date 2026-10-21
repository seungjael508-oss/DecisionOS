// 오늘 관리대상 업무 처리(완료·다음 관리일 미루기). 기존 complete_or_snooze_move_in_tracking RPC 인자를 만든다.
// 다음 관리일이 내일(KST) 이후면 그날 00:00까지 미루고(같은 사유 묶음만), 아니면 오늘 완료로 처리한다.

export type TodayTaskArgs = {
  p_project_id: string;
  p_unit_id: string;
  p_action: "COMPLETE" | "SNOOZE";
  p_snoozed_until: string | null;
};

/** completed: 오늘 완료, snoozed: 다음 관리일까지 미룸, not_tracked: 이미 오늘 관리대상 아님, failed: 처리 실패(목록에 남음) */
export type TodayTaskOutcome = "completed" | "snoozed" | "not_tracked" | "failed";

const kstDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);

export function buildTodayTaskArgs(projectId: string, unitId: string, nextAt: string | null | undefined, now = new Date()): TodayTaskArgs {
  const next = nextAt ? new Date(nextAt) : null;
  const snooze = next !== null && !Number.isNaN(next.getTime()) && kstDay(next) > kstDay(now);
  return {
    p_project_id: projectId,
    p_unit_id: unitId,
    p_action: snooze ? "SNOOZE" : "COMPLETE",
    p_snoozed_until: snooze ? next.toISOString() : null,
  };
}

export function todayTaskOutcome(args: TodayTaskArgs, result: { data: unknown; error: unknown }): TodayTaskOutcome {
  if (result.error) return "failed";
  if (result.data === null || result.data === undefined) return "not_tracked";
  return args.p_action === "SNOOZE" ? "snoozed" : "completed";
}

export const TODAY_TASK_PENDING_MESSAGE = "저장은 됐지만 오늘 업무 완료 처리를 하지 못했습니다. 세대가 목록에 남아 있습니다. 다시 저장하지 말고 '완료 처리 다시 시도'를 눌러 주세요.";
