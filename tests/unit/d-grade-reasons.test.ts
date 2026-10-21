import { describe, expect, it } from "vitest";
import {
  currentAbsenceStreak,
  deriveDGradeReasons,
  downgradedFromC,
  matchesDGradeReasonFilter,
  parseDGradeReasonParam,
  summarizeDGradeReasons,
  type DGradeContact,
  type DGradeHistory,
  type DGradeReasonInput,
} from "@/lib/move-in/d-grade-reasons";
import { absenceContactType } from "@/lib/move-in/consultation";
import { LEDGER_BLANK, applyLedgerQuery, parseLedgerQuery, type LedgerFilterRow } from "@/lib/move-in/ledger-filters";
import { resolveTodayQueueAdjacentUnitIds, getMoveInReturnContext } from "@/lib/move-in/return-to";

let seq = 0;
const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 0, minute)).toISOString();
const c = (minute: number, legacyGrade: string | null, contactType: string | null = "CALL"): DGradeContact =>
  ({ id: `c${String(++seq).padStart(4, "0")}`, consultedAt: at(minute), contactType, legacyGrade });
const h = (minute: number, previousValue: string | null, newValue: string | null): DGradeHistory =>
  ({ id: `h${String(++seq).padStart(4, "0")}`, changedAt: at(minute), previousValue, newValue });
const base: DGradeReasonInput = {
  currentGrade: "D", sourceTags: [], holderChanged: false, funding: "NORMAL", moveIn: "CONTACTED", contacts: [], gradeHistory: [],
};

describe("D등급 관리 사유 판정", () => {
  it("D가 아니면 사유 없음(기본등급 구조 유지)", () => {
    expect(deriveDGradeReasons({ ...base, currentGrade: "C", sourceTags: ["ASEL", "DELINQUENT"], funding: "FUNDING_SHORTAGE" })).toEqual([]);
  });

  it("아셀·연체: 원본 명단 연결 + 현재 계약 외 계약이 없을 때만", () => {
    expect(deriveDGradeReasons({ ...base, sourceTags: ["ASEL", "DELINQUENT", "INVESTOR", "ONLINE"] })).toEqual(["ASEL", "DELINQUENT"]);
    expect(deriveDGradeReasons({ ...base, sourceTags: ["ASEL", "DELINQUENT"], holderChanged: true })).toEqual([]);
    expect(deriveDGradeReasons({ ...base, sourceTags: ["ASEL", "DELINQUENT"], holderChanged: null })).toEqual([]);
  });

  it("C등급 하향: 실제 등급 기록에서 D 직전 등급이 C", () => {
    expect(downgradedFromC([c(1, "B"), c(2, "C"), c(3, "D")], [])).toBe(true);
    expect(downgradedFromC([c(1, "C"), c(2, "B"), c(3, "D")], [])).toBe(false);
    expect(downgradedFromC([c(1, "C"), c(2, "D"), c(3, "C"), c(4, "D"), c(5, "D")], [])).toBe(true);
    // 자동 전환: 상담 태그는 부재, 등급 변화는 이력(C→D)에만 있음
    expect(downgradedFromC([c(1, "C"), c(2, "부재"), c(3, "부재"), c(4, "부재")], [h(4, "C", "D")])).toBe(true);
    // 근거 없는 D(기록상 마지막 등급이 D가 아님 / D 이전 기록 없음)는 분류하지 않음
    expect(downgradedFromC([c(1, "C")], [])).toBeNull();
    expect(downgradedFromC([c(1, "D")], [])).toBeNull();
    expect(downgradedFromC([], [])).toBeNull();
  });

  it("C등급 하향: 이력 조회 실패·상담 조회 실패면 분류하지 않음", () => {
    const contacts = [c(1, "C"), c(2, "D")];
    expect(deriveDGradeReasons({ ...base, contacts })).toContain("C_DOWNGRADE");
    expect(deriveDGradeReasons({ ...base, contacts, gradeHistory: null })).not.toContain("C_DOWNGRADE");
    expect(deriveDGradeReasons({ ...base, contacts: null })).not.toContain("C_DOWNGRADE");
  });

  it("입주 곤란: 자금 위험(한도부족·자금부족·기존주택 미처분) 또는 입주 지연. 대출필요는 제외", () => {
    for (const funding of ["LOAN_LIMIT_SHORTAGE", "FUNDING_SHORTAGE", "EXISTING_HOME_UNSOLD"]) {
      expect(deriveDGradeReasons({ ...base, funding })).toEqual(["MOVE_IN_DIFFICULTY"]);
    }
    expect(deriveDGradeReasons({ ...base, moveIn: "DELAYED" })).toEqual(["MOVE_IN_DIFFICULTY"]);
    expect(deriveDGradeReasons({ ...base, funding: "LOAN_NEEDED" })).toEqual([]);
  });

  it("장기 부재: 마지막 실제 접촉 이후 전화 부재 3회 이상(방문 부재 제외, 상담 성공 시 초기화)", () => {
    expect(currentAbsenceStreak([c(1, "B"), c(2, "부재"), c(3, "부재"), c(4, "부재")])).toBe(3);
    expect(currentAbsenceStreak([c(1, "부재"), c(2, "부재"), c(3, "부재"), c(4, "C"), c(5, "부재")])).toBe(1);
    expect(currentAbsenceStreak([c(1, "부재"), c(2, "부재", "VISIT"), c(3, "부재")])).toBe(2);
    expect(currentAbsenceStreak([c(5, "A"), c(5, "부재"), c(6, "부재"), c(7, "부재")])).toBe(2); // 같은 시각은 실제 접촉 우선
    expect(deriveDGradeReasons({ ...base, contacts: [c(1, "부재"), c(2, "부재"), c(3, "부재")] })).toEqual(["ABSENCE_STREAK"]);
    expect(deriveDGradeReasons({ ...base, contacts: [c(1, "부재"), c(2, "부재")] })).toEqual([]);
    expect(deriveDGradeReasons({ ...base, contacts: null })).toEqual([]);
  });

  it("장기 부재: 문자는 부재 횟수에 넣지 않고 연속 부재를 초기화하지도 않음", () => {
    expect(currentAbsenceStreak([c(1, "부재"), c(2, null, "MESSAGE"), c(3, "부재"), c(4, "부재")])).toBe(3);
    expect(currentAbsenceStreak([c(1, "부재"), c(2, "B", "MESSAGE"), c(3, "부재"), c(4, "부재")])).toBe(3);
    expect(currentAbsenceStreak([c(1, "부재"), c(2, "부재", "MESSAGE"), c(3, "부재")])).toBe(2);
    expect(currentAbsenceStreak([c(1, "부재"), c(2, "부재"), c(3, null), c(4, "부재")])).toBe(1); // 문자 아닌 상담은 초기화
  });

  it("장기 부재 접촉 유형: Stay J 레거시 이관 상담은 전화, 확인된 방문 시트 행은 방문", () => {
    const stayj = "1283e198-5043-4027-96d6-edcc7a6686c6";
    expect(absenceContactType(stayj, "CONSULTATION", "LEGACY_IMPORT", { legacy_grade: "부재" })).toBe("CALL");
    expect(absenceContactType(stayj, "CONSULTATION", "LEGACY_IMPORT", {
      legacy_source: "hwayang_legacy", legacy_file_id: "F003", legacy_sheet_index: 4, legacy_row_number: 7,
      legacy_source_key: "hwayang-260915:F003:4:7",
    })).toBe("VISIT");
    expect(absenceContactType(stayj, "CONSULTATION", null, null)).toBe("CONSULTATION");
    expect(absenceContactType("10000000-0000-4000-8000-000000000001", "CONSULTATION", "LEGACY_IMPORT", null)).toBe("CONSULTATION");
    expect(absenceContactType(stayj, "MESSAGE", null, null)).toBe("MESSAGE");
  });

  it("복수 사유를 모두 붙이고 정의 순서를 유지", () => {
    expect(deriveDGradeReasons({
      ...base, sourceTags: ["DELINQUENT", "ASEL"], moveIn: "DELAYED",
      contacts: [c(1, "C"), c(2, "D"), c(3, "부재"), c(4, "부재"), c(5, "부재")],
    })).toEqual(["ASEL", "DELINQUENT", "C_DOWNGRADE", "MOVE_IN_DIFFICULTY", "ABSENCE_STREAK"]);
  });
});

describe("필터·집계", () => {
  it("D등급 AND 선택 사유 OR", () => {
    expect(matchesDGradeReasonFilter({ currentGrade: "D", dGradeReasons: ["ASEL"] }, ["ASEL", "DELINQUENT"])).toBe(true);
    expect(matchesDGradeReasonFilter({ currentGrade: "D", dGradeReasons: ["C_DOWNGRADE"] }, ["ASEL", "DELINQUENT"])).toBe(false);
    expect(matchesDGradeReasonFilter({ currentGrade: "C", dGradeReasons: ["ASEL"] }, ["ASEL"])).toBe(false);
    expect(matchesDGradeReasonFilter({ currentGrade: "C", dGradeReasons: [] }, [])).toBe(true);
  });

  it("세대 단위 집계: 같은 세대 중복 행 1회, 복수 사유·미확인 분리", () => {
    const summary = summarizeDGradeReasons([
      { unitId: "u1", currentGrade: "D", dGradeReasons: ["ASEL", "DELINQUENT"] },
      { unitId: "u1", currentGrade: "D", dGradeReasons: ["ASEL", "DELINQUENT"] },
      { unitId: "u2", currentGrade: "D", dGradeReasons: ["ASEL"] },
      { unitId: "u3", currentGrade: "D", dGradeReasons: [] },
      { unitId: "u4", currentGrade: "C", dGradeReasons: ["ASEL"] },
      { unitId: "u5", currentGrade: "D", dGradeReasons: ["ABSENCE_STREAK", "UNKNOWN_CODE"] },
    ]);
    expect(summary).toEqual({
      dTotal: 4,
      byReason: { ASEL: 2, DELINQUENT: 1, C_DOWNGRADE: 0, MOVE_IN_DIFFICULTY: 0, ABSENCE_STREAK: 1 },
      classified: 3, unclassified: 1, multiple: 1,
    });
    expect(summary.classified + summary.unclassified).toBe(summary.dTotal);
  });

  it("URL 사유 파라미터 검증", () => {
    expect(parseDGradeReasonParam("ABSENCE_STREAK,ASEL,ASEL,bogus")).toEqual(["ASEL", "ABSENCE_STREAK"]);
    expect(parseDGradeReasonParam(["DELINQUENT", "C_DOWNGRADE"])).toEqual(["DELINQUENT", "C_DOWNGRADE"]);
    expect(parseDGradeReasonParam(undefined)).toEqual([]);
  });
});

describe("통합원장 D등급 관리사유 축", () => {
  const row = (unitId: string, currentGrade: string | null, dGradeReasons: string[]): LedgerFilterRow => ({
    unitId, buildingNo: "101", unitNo: unitId, currentGrade, customerName: null, phone: null, assigneeId: null, effectiveIntent: null,
    rentalType: null, funding: null, moveIn: null, nextContact: null, specialReasons: [], specialPriority: null, dealTypes: [],
    payment: null, balance: null, views: [], dGradeReasons,
  });
  const rows = [row("1", "D", ["ASEL"]), row("2", "D", ["ABSENCE_STREAK", "MOVE_IN_DIFFICULTY"]), row("3", "D", []),
    row("4", "C", []), row("5", "D", ["C_DOWNGRADE"])];
  const run = (qs: string) => applyLedgerQuery(rows, parseLedgerQuery(new URLSearchParams(qs)), new Date()).filteredSorted.map(r => r.unitId);

  it("선택 사유 OR, D가 아닌 세대 제외, 복수 사유 세대 1행", () => {
    expect(run("dGradeReason=ASEL,ABSENCE_STREAK")).toEqual(["1", "2"]);
    expect(run("dGradeReason=ABSENCE_STREAK,MOVE_IN_DIFFICULTY")).toEqual(["2"]);
  });
  it("빈값 = D이지만 사유 미확인", () => {
    expect(run(`dGradeReason=${LEDGER_BLANK}`)).toEqual(["3"]);
  });
  it("다른 축과 AND, 제외값", () => {
    expect(run("grade=D&dGradeReasonExclude=ASEL")).toEqual(["2", "3", "5"]);
    expect(run("dGradeReason=ASEL&grade=C")).toEqual([]);
  });
});

describe("오늘 관리대상 저장 후 다음 세대", () => {
  it("D등급 관리사유 필터 범위 안에서만 이동", () => {
    const context = getMoveInReturnContext("p", "/projects/p/move-in/today?dReason=ASEL");
    const queue = [
      { unitId: "a", reasonCodes: ["D_GRADE_STALE"], legacyGrade: "D", dGradeReasons: ["ASEL"] },
      { unitId: "b", reasonCodes: ["D_GRADE_STALE"], legacyGrade: "D", dGradeReasons: ["DELINQUENT"] },
      { unitId: "c", reasonCodes: ["C_GRADE_STALE"], legacyGrade: "C", dGradeReasons: [] },
      { unitId: "d", reasonCodes: ["D_GRADE_STALE"], legacyGrade: "D", dGradeReasons: ["ASEL", "ABSENCE_STREAK"] },
    ];
    expect(resolveTodayQueueAdjacentUnitIds(queue, "a", context)).toEqual({ previousUnitId: null, nextUnitId: "d" });
  });
});
