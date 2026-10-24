import { matchesDGradeReasonFilter, parseDGradeReasonParam, type DGradeReason } from "@/lib/move-in/d-grade-reasons";
import { matchesTodayQueueFilter, parseTodayQueueFilter, type TodayFilter } from "@/lib/move-in/filters";
import { parseTodayTaskType, type TodayTaskType } from "@/lib/move-in/today-workflow";

/** 오늘 관리대상 화면 한 행(서버가 원장 셀 함수로 만든 표시값 + 화면 필터 판정에 필요한 값만). */
export type TodayViewRow = {
  key: string;
  unitId: string;
  unitLabel: string;
  customerName: string | null;
  phone: string;
  grade: string;
  intent: string;
  assignee: string;
  reasonText: string;
  todoText: string;
  lastContact: string;
  nextContact: string;
  rowClassName: string;
  barClassName: string;
  reasonCodes: string[];
  moveInStatus: string | null;
  legacyGrade: string | null;
  dGradeReasons: string[];
  taskTypes: TodayTaskType[];
};

export type TodayViewDoneRow = {
  unitId: string;
  unitLabel: string | null;
  customerName: string | null;
  grade: string;
  assignee: string;
  handledLabel: string;
  handledAt: string;
};

/** 화면 전용 필터(서버 재조회 없이 브라우저에서 바꾼다). 원장 필터는 서버가 이미 적용한 행에만 쓴다. */
export type TodayViewFilters = { filter: TodayFilter; dReasons: DGradeReason[]; task: TodayTaskType | null };

export function parseTodayViewFilters(params: { get(name: string): string | null; getAll(name: string): string[] }): TodayViewFilters {
  return {
    filter: parseTodayQueueFilter(params.get("filter") ?? undefined),
    dReasons: parseDGradeReasonParam(params.getAll("dReason")),
    task: parseTodayTaskType(params.get("task")),
  };
}

/** 기존 서버 판정과 같다: 오늘 필터 AND (D등급 AND 선택 사유 OR) AND 업무 유형(처리 완료 선택 시 미처리 없음) */
export function selectTodayViewRows<T extends Pick<TodayViewRow, "reasonCodes" | "moveInStatus" | "legacyGrade" | "dGradeReasons" | "taskTypes">>(
  rows: readonly T[], { filter, dReasons, task }: TodayViewFilters,
): T[] {
  return rows.filter((row) => (filter === "all" || matchesTodayQueueFilter(row, filter))
    && matchesDGradeReasonFilter({ currentGrade: row.legacyGrade, dGradeReasons: row.dGradeReasons }, dReasons)
    && (!task || (task !== "done" && row.taskTypes.includes(task))));
}

/** 처리 완료 목록은 업무 필터·D등급 사유 필터가 없을 때(또는 처리 완료 선택 시)만 */
export function showTodayDoneRows({ filter, dReasons, task }: TodayViewFilters): boolean {
  return (!task || task === "done") && filter === "all" && !dReasons.length;
}
