// 3인 실시간 업무일지: 담당자별 실적 / 등급변경 / 금일 상담 상세를 계산하는 순수 함수 모음.
// 화양 프로젝트 전용 기능이지만, sources.fieldMembers가 없으면 아무 것도 계산하지 않는
// 기존 WorklogV2Sources의 점진적 확장 패턴을 따른다 (snapshot.ts 참고).
import { isInstantInDay, type WorklogDayRange } from "@/lib/worklog/day-range";
import { consultationKindLabel, isLegacyGrade, LEGACY_GRADE_VALUES, type LegacyGrade } from "@/lib/move-in/consultation";
import { formatUnitLabel } from "@/lib/move-in/labels";
import type { WorklogConsultationRow, WorklogMasterSnapshot, WorklogUnitRow } from "@/lib/worklog/snapshot";

export type WorklogFieldMember = { memberId: string; displayName: string | null };

export type WorklogCounselorActivity = {
  memberId: string;
  displayName: string;
  call: number;
  visit: number;
  message: number;
  other: number;
  total: number;
};

export type WorklogTeamActivity = {
  rows: WorklogCounselorActivity[];
  total: WorklogCounselorActivity;
};

export type WorklogGradeTransition = { from: LegacyGrade; to: LegacyGrade; count: number };

export type WorklogGradeChangeRow = {
  consultationId: string;
  consultedAt: string;
  memberId: string | null;
  displayName: string;
  unitId: string;
  unitLabel: string;
  from: LegacyGrade;
  to: LegacyGrade;
};

export type WorklogGradeChanges = {
  totalChanges: number;
  transitions: WorklogGradeTransition[];
  rows: WorklogGradeChangeRow[];
  // 미확인 -> C 처럼 직전 유효 등급이 없는 첫 평가. 등급변경 건수에는 포함하지 않는다.
  newEvaluations: number;
};

export type WorklogConsultationDetailRow = {
  consultationId: string;
  consultedAt: string;
  memberId: string | null;
  displayName: string;
  unitId: string | null;
  unitLabel: string | null;
  channel: string;
  previousGrade: LegacyGrade | null;
  newGrade: LegacyGrade | null;
  content: string | null;
  nextActionAt: string | null;
};

const UNKNOWN_COUNSELOR_LABEL = "담당자 미확인";

function resolveDisplayName(memberId: string | null, fieldMembers: WorklogFieldMember[]): string {
  if (!memberId) return UNKNOWN_COUNSELOR_LABEL;
  const member = fieldMembers.find((m) => m.memberId === memberId);
  return member?.displayName?.trim() || UNKNOWN_COUNSELOR_LABEL;
}

function unitLabelOf(unit: WorklogUnitRow | undefined): string | null {
  if (!unit) return null;
  return unit.unitNo ? formatUnitLabel(unit.buildingNo, unit.unitNo) : `${unit.buildingNo}동`;
}

// 담당자별 오늘 실적: 전화/방문/문자/기타/총 상담 + 합계.
// fieldMembers에 등록된 화양 상담사만 집계 대상이다 (신원 미상 카운터로 오염되지 않도록).
export function buildTeamActivity(
  consultationsToday: WorklogConsultationRow[],
  fieldMembers: WorklogFieldMember[],
): WorklogTeamActivity {
  const rows = fieldMembers.map((member) => ({
    memberId: member.memberId,
    displayName: member.displayName?.trim() || UNKNOWN_COUNSELOR_LABEL,
    call: 0,
    visit: 0,
    message: 0,
    other: 0,
    total: 0,
  }));
  const rowByMemberId = new Map(rows.map((row) => [row.memberId, row]));

  for (const c of consultationsToday) {
    if (!c.counselorId) continue;
    const row = rowByMemberId.get(c.counselorId);
    if (!row) continue;
    row.total += 1;
    if (c.contactType === "CALL") row.call += 1;
    else if (c.contactType === "VISIT") row.visit += 1;
    else if (c.contactType === "MESSAGE") row.message += 1;
    else row.other += 1;
  }

  const total = rows.reduce(
    (acc, row) => ({
      memberId: "TOTAL",
      displayName: "합계",
      call: acc.call + row.call,
      visit: acc.visit + row.visit,
      message: acc.message + row.message,
      other: acc.other + row.other,
      total: acc.total + row.total,
    }),
    { memberId: "TOTAL", displayName: "합계", call: 0, visit: 0, message: 0, other: 0, total: 0 },
  );

  return { rows, total };
}

type GradeTimelineEntry = { previousGrade: LegacyGrade | null; newGrade: LegacyGrade | null; isChange: boolean; isNewEvaluation: boolean };

// 세대별로 시간순 정렬한 상담 이력을 따라가며 "직전 유효 등급"을 추적한다.
// dailySections()의 priorByUnit 패턴과 동일한 원리: 등급이 명시된 상담만 등급을 갱신한다.
function computeGradeTimeline(
  units: WorklogUnitRow[],
  consultations: WorklogConsultationRow[],
  range: WorklogDayRange,
  masterSnapshots: WorklogMasterSnapshot[],
): Map<string, GradeTimelineEntry> {
  const beforeEnd = (value: string) => Number.isFinite(Date.parse(value)) && Date.parse(value) < range.end.getTime();
  const unitIds = new Set(units.map((u) => u.unitId));
  const history = consultations
    .filter((c) => c.unitId && unitIds.has(c.unitId) && beforeEnd(c.consultedAt))
    .sort((a, b) => Date.parse(a.consultedAt) - Date.parse(b.consultedAt) || a.id.localeCompare(b.id));

  const initialByUnit = new Map<string, { asOf: number; grade: LegacyGrade | null }>();
  for (const row of [...masterSnapshots]
    .filter((r) => unitIds.has(r.unitId) && beforeEnd(r.asOf))
    .sort((a, b) => Date.parse(a.asOf) - Date.parse(b.asOf))) {
    initialByUnit.set(row.unitId, {
      asOf: Date.parse(row.asOf),
      grade: row.legacyGrade && isLegacyGrade(row.legacyGrade) ? row.legacyGrade : null,
    });
  }

  const currentGradeByUnit = new Map<string, LegacyGrade>();
  const timeline = new Map<string, GradeTimelineEntry>();

  for (const c of history) {
    if (!c.legacyGrade || !isLegacyGrade(c.legacyGrade)) {
      timeline.set(c.id, { previousGrade: null, newGrade: null, isChange: false, isNewEvaluation: false });
      continue;
    }
    const unitId = c.unitId!;
    const time = Date.parse(c.consultedAt);
    let prior = currentGradeByUnit.get(unitId) ?? null;
    if (prior === null) {
      const initial = initialByUnit.get(unitId);
      if (initial && initial.asOf < time) prior = initial.grade;
    }
    const isNewEvaluation = prior === null;
    const isChange = !isNewEvaluation && prior !== c.legacyGrade;
    timeline.set(c.id, { previousGrade: prior, newGrade: c.legacyGrade, isChange, isNewEvaluation });
    currentGradeByUnit.set(unitId, c.legacyGrade);
  }

  return timeline;
}

// 금일 등급변경 요약: 실제 전환(A→B 등)만 집계하고, 동일 등급 전환과 신규평가는 제외한다.
export function buildGradeChangeSummary(
  units: WorklogUnitRow[],
  consultations: WorklogConsultationRow[],
  fieldMembers: WorklogFieldMember[],
  range: WorklogDayRange,
  masterSnapshots: WorklogMasterSnapshot[] = [],
): WorklogGradeChanges {
  const timeline = computeGradeTimeline(units, consultations, range, masterSnapshots);
  const unitById = new Map(units.map((u) => [u.unitId, u]));
  const today = consultations.filter((c) => isInstantInDay(c.consultedAt, range));

  const rows: WorklogGradeChangeRow[] = [];
  const transitionCounts = new Map<string, number>();
  let newEvaluations = 0;

  for (const c of today) {
    const entry = timeline.get(c.id);
    if (!entry) continue; // 세대(unit_id)가 없는 상담은 등급변경 집계 대상이 아니다.
    if (entry.isNewEvaluation) {
      newEvaluations += 1;
      continue;
    }
    if (!entry.isChange || !entry.previousGrade || !entry.newGrade) continue;
    const key = `${entry.previousGrade}>${entry.newGrade}`;
    transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1);
    rows.push({
      consultationId: c.id,
      consultedAt: c.consultedAt,
      memberId: c.counselorId ?? null,
      displayName: resolveDisplayName(c.counselorId ?? null, fieldMembers),
      unitId: c.unitId!,
      unitLabel: unitLabelOf(unitById.get(c.unitId!)) ?? c.unitId!,
      from: entry.previousGrade,
      to: entry.newGrade,
    });
  }

  rows.sort((a, b) => Date.parse(b.consultedAt) - Date.parse(a.consultedAt) || b.consultationId.localeCompare(a.consultationId));

  const gradeOrder = (grade: LegacyGrade) => LEGACY_GRADE_VALUES.indexOf(grade);
  const transitions = [...transitionCounts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split(">") as [LegacyGrade, LegacyGrade];
      return { from, to, count };
    })
    .sort((a, b) => gradeOrder(a.from) - gradeOrder(b.from) || gradeOrder(a.to) - gradeOrder(b.to));

  return { totalChanges: rows.length, transitions, rows, newEvaluations };
}

// 금일 상담 상세: 시간/담당자/동호수/채널/등급변경/상담내용/다음접촉, 최신순.
export function buildConsultationDetail(
  units: WorklogUnitRow[],
  consultations: WorklogConsultationRow[],
  fieldMembers: WorklogFieldMember[],
  range: WorklogDayRange,
  masterSnapshots: WorklogMasterSnapshot[] = [],
): WorklogConsultationDetailRow[] {
  const timeline = computeGradeTimeline(units, consultations, range, masterSnapshots);
  const unitById = new Map(units.map((u) => [u.unitId, u]));

  return consultations
    .filter((c) => isInstantInDay(c.consultedAt, range))
    .map((c) => {
      const entry = timeline.get(c.id);
      const newGrade = c.legacyGrade && isLegacyGrade(c.legacyGrade) ? c.legacyGrade : null;
      return {
        consultationId: c.id,
        consultedAt: c.consultedAt,
        memberId: c.counselorId ?? null,
        displayName: resolveDisplayName(c.counselorId ?? null, fieldMembers),
        unitId: c.unitId ?? null,
        unitLabel: c.unitId ? unitLabelOf(unitById.get(c.unitId)) : null,
        channel: consultationKindLabel(c.contactType, c.purpose ?? null),
        previousGrade: entry?.previousGrade ?? null,
        newGrade,
        content: c.content ?? null,
        nextActionAt: c.nextActionAt ?? null,
      };
    })
    .sort((a, b) => Date.parse(b.consultedAt) - Date.parse(a.consultedAt) || b.consultationId.localeCompare(a.consultationId));
}
