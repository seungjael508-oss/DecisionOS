import { isLegacyGrade } from "@/lib/move-in/consultation";
import type { CurrentUnitSnapshot } from "@/lib/move-in/ledger-types";
import { SPECIAL_REASON_LABELS } from "@/lib/move-in/intent";
import { formatUnitLabel } from "@/lib/move-in/labels";
import { isProblemHousehold } from "@/lib/move-in/problem-household";

export const FLOORPLAN_COLOR_MODES = [
  "moveInStatus",
  "occupancyIntent",
  "fundingStatus",
  "legacyGrade",
] as const;

export type FloorplanColorMode = (typeof FLOORPLAN_COLOR_MODES)[number];

export const FLOORPLAN_COLOR_MODE_LABELS: Record<FloorplanColorMode, string> = {
  moveInStatus: "입주진행",
  occupancyIntent: "입주의향",
  fundingStatus: "자금상태",
  legacyGrade: "현재등급",
};

export function isFloorplanColorMode(value: string): value is FloorplanColorMode {
  return (FLOORPLAN_COLOR_MODES as readonly string[]).includes(value);
}

/** Display-only fields from the approved current snapshot. No identity/history/phone DTO. */
export type FloorplanUnit = Pick<CurrentUnitSnapshot,
  "projectId" | "unitId" | "currentGrade" | "funding" | "moveIn" | "effectiveIntent" | "rentalType" |
  "specialReasons" | "balancePaidAt" | "actualMoveInDate" | "revision" | "fetchedAt" | "problemFlags"
> & { buildingNo: string; unitNo: string; floor: number | null };

export type ParsedHo = {
  floor: number;
  line: number;
};

export function parseHoLayout(
  unitNo: string,
  floorHint: number | null = null,
): ParsedHo | null {
  const digits = unitNo.replace(/\D/g, "");
  if (digits.length >= 3) {
    const line = Number(digits.slice(-2));
    const parsedFloor = Number(digits.slice(0, -2));
    if (!Number.isFinite(line) || !Number.isFinite(parsedFloor)) return null;
    return { floor: floorHint ?? parsedFloor, line };
  }
  if (floorHint != null && digits.length > 0) {
    const line = Number(digits);
    if (!Number.isFinite(line)) return null;
    return { floor: floorHint, line };
  }
  return null;
}

export function listBuildings(units: Pick<FloorplanUnit, "buildingNo">[]) {
  return [
    ...new Set(units.map((unit) => unit.buildingNo)),
  ].sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));
}

export function selectBuilding(
  buildings: string[],
  requested: string,
): string {
  if (requested && buildings.includes(requested)) return requested;
  return buildings[0] ?? "";
}

export type FloorplanCell = FloorplanUnit & ParsedHo;

export type FloorplanGrid = {
  buildingNo: string;
  floors: number[];
  lines: number[];
  cells: Map<string, FloorplanCell>;
  unparsed: FloorplanUnit[];
};

export function cellKey(floor: number, line: number) {
  return `${floor}:${line}`;
}

export function buildFloorplanGrid(
  units: FloorplanUnit[],
  buildingNo: string,
): FloorplanGrid {
  const inBuilding = units.filter((unit) => unit.buildingNo === buildingNo);
  const cells = new Map<string, FloorplanCell>();
  const unparsed: FloorplanUnit[] = [];
  const floorSet = new Set<number>();
  const lineSet = new Set<number>();

  for (const unit of inBuilding) {
    const parsed = parseHoLayout(unit.unitNo, unit.floor);
    if (!parsed) {
      unparsed.push(unit);
      continue;
    }
    floorSet.add(parsed.floor);
    lineSet.add(parsed.line);
    cells.set(cellKey(parsed.floor, parsed.line), { ...unit, ...parsed });
  }

  return {
    buildingNo,
    floors: [...floorSet].sort((a, b) => b - a),
    lines: [...lineSet].sort((a, b) => a - b),
    cells,
    unparsed,
  };
}

const EMPTY_CELL = {
  className: "bg-white text-neutral-800",
  label: "미등록",
};

/** Only problem/paid status colors the background. Grade labels remain visible. */
export function floorplanCellTone(
  unit: FloorplanUnit | undefined,
  colorBy: FloorplanColorMode = "legacyGrade",
): { className: string; label: string } {
  void colorBy;
  const grade = unit?.currentGrade;
  const label = grade && isLegacyGrade(grade) ? grade : EMPTY_CELL.label;
  if (unit && isProblemHousehold(unit)) return { className: PROBLEM_TONE, label };
  if (unit && (unit.moveIn === "BALANCE_PAID" || unit.balancePaidAt)) {
    return { className: PAID_TONE, label };
  }
  return { className: EMPTY_CELL.className, label };
}

const PAID_TONE = "bg-green-200 text-neutral-900";
const PROBLEM_TONE = "bg-red-200 text-neutral-900";

export function floorplanLegend(colorBy: FloorplanColorMode = "legacyGrade") {
  void colorBy;
  return [
    { value: "PROBLEM", label: "문제세대", className: PROBLEM_TONE },
    { value: "BALANCE_PAID", label: "잔금완납", className: PAID_TONE },
    { value: "OTHER", label: "그 외 세대", className: EMPTY_CELL.className },
  ];
}

export const FLOORPLAN_AUXILIARY_LEGEND = ["문제세대", "대출필요", "매매", "임대", "특별관리", "잔금완납", "실제입주"] as const;
const reasonLabels: Record<string, string> = { ...SPECIAL_REASON_LABELS, ASEL: "아셀", INVESTOR: "투자", DELINQUENT: "연체자" };

/** Presentation only: the current-state resolver has already run on the server. */
export function floorplanCurrentPresentation(unit: FloorplanUnit) {
  const tone = floorplanCellTone(unit);
  const tags: { key: string; label: string }[] = [];
  if (isProblemHousehold(unit)) tags.push({ key: "problem", label: "문제세대" });
  if (unit.funding === "LOAN_NEEDED") tags.push({ key: "loan", label: "대출필요" });
  if (unit.effectiveIntent === "SALE_TRANSFER") tags.push({ key: "sale", label: "매매" });
  if (unit.effectiveIntent === "RENT") tags.push({ key: "rental", label: "임대" });
  if (unit.specialReasons.length) {
    tags.push({ key: "special", label: "특별관리" });
    for (const reason of new Set(unit.specialReasons)) tags.push({ key: `reason:${reason}`, label: reasonLabels[reason] ?? "기타 특별관리" });
  }
  // Payment availability/amount is not an input. MOVED_IN does not imply payment.
  if (unit.moveIn === "BALANCE_PAID" || unit.balancePaidAt) tags.push({ key: "paid", label: "잔금완납" });
  if (unit.moveIn === "MOVED_IN" || unit.actualMoveInDate) tags.push({ key: "moved", label: "실제입주" });
  return { className: tone.className, gradeLabel: tone.label, tags,
    ariaLabel: `${formatUnitLabel(unit.buildingNo, unit.unitNo)} 현재등급 ${tone.label}${tags.length ? ` · ${tags.map(t => t.label).join(" · ")}` : ""}` };
}
