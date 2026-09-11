import type { LegacyGrade } from "@/lib/move-in/consultation";
import {
  FUNDING_STATUS_LABELS,
  MOVE_IN_STATUS_LABELS,
  OCCUPANCY_INTENT_LABELS,
  type FundingStatus,
  type MoveInStatus,
  type OccupancyIntent,
} from "@/lib/move-in/labels";

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
  legacyGrade: "기존등급",
};

export function isFloorplanColorMode(value: string): value is FloorplanColorMode {
  return (FLOORPLAN_COLOR_MODES as readonly string[]).includes(value);
}

export type FloorplanUnit = {
  unitId: string;
  buildingNo: string;
  unitNo: string;
  floor: number | null;
  occupancyIntent: OccupancyIntent | null;
  fundingStatus: FundingStatus | null;
  moveInStatus: MoveInStatus | null;
  latestGrade: LegacyGrade | null;
};

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

export function floorplanCellTone(
  unit: FloorplanUnit | undefined,
  colorBy: FloorplanColorMode,
): { className: string; label: string } {
  if (!unit) return EMPTY_CELL;

  if (colorBy === "moveInStatus") {
    if (!unit.moveInStatus) return EMPTY_CELL;
    return {
      className: MOVE_IN_TONE[unit.moveInStatus],
      label: MOVE_IN_STATUS_LABELS[unit.moveInStatus],
    };
  }
  if (colorBy === "occupancyIntent") {
    if (!unit.occupancyIntent) return EMPTY_CELL;
    return {
      className: INTENT_TONE[unit.occupancyIntent],
      label: OCCUPANCY_INTENT_LABELS[unit.occupancyIntent],
    };
  }
  if (colorBy === "fundingStatus") {
    if (!unit.fundingStatus) return EMPTY_CELL;
    return {
      className: FUNDING_TONE[unit.fundingStatus],
      label: FUNDING_STATUS_LABELS[unit.fundingStatus],
    };
  }
  if (!unit.latestGrade) return EMPTY_CELL;
  return {
    className: GRADE_TONE[unit.latestGrade],
    label: unit.latestGrade,
  };
}

const MOVE_IN_TONE: Record<MoveInStatus, string> = {
  NOT_CONTACTED: "bg-neutral-200 text-neutral-900",
  CONTACTED: "bg-sky-200 text-neutral-900",
  PLANNED: "bg-amber-200 text-neutral-900",
  DELAYED: "bg-red-200 text-neutral-900",
  BALANCE_PAID: "bg-emerald-200 text-neutral-900",
  MOVED_IN: "bg-emerald-300 text-neutral-900",
};

const INTENT_TONE: Record<OccupancyIntent, string> = {
  SELF_MOVE_IN: "bg-emerald-200 text-neutral-900",
  SALE: "bg-amber-200 text-neutral-900",
  JEONSE: "bg-sky-200 text-neutral-900",
  MONTHLY_RENT: "bg-violet-200 text-neutral-900",
  UNDECIDED: "bg-neutral-200 text-neutral-900",
};

const FUNDING_TONE: Record<FundingStatus, string> = {
  NORMAL: "bg-emerald-200 text-neutral-900",
  LOAN_NEEDED: "bg-amber-200 text-neutral-900",
  FUNDING_SHORTAGE: "bg-red-200 text-neutral-900",
  EXISTING_HOME_UNSOLD: "bg-orange-200 text-neutral-900",
  UNKNOWN: "bg-neutral-200 text-neutral-900",
};

const GRADE_TONE: Record<LegacyGrade, string> = {
  A: "bg-emerald-300 text-neutral-900",
  B: "bg-sky-200 text-neutral-900",
  C: "bg-amber-200 text-neutral-900",
  D: "bg-red-200 text-neutral-900",
  부재: "bg-neutral-200 text-neutral-900",
  상담거절: "bg-stone-300 text-neutral-900",
};

export function floorplanLegend(colorBy: FloorplanColorMode) {
  if (colorBy === "moveInStatus") {
    return (Object.keys(MOVE_IN_TONE) as MoveInStatus[]).map((value) => ({
      value,
      label: MOVE_IN_STATUS_LABELS[value],
      className: MOVE_IN_TONE[value],
    }));
  }
  if (colorBy === "occupancyIntent") {
    return (Object.keys(INTENT_TONE) as OccupancyIntent[]).map((value) => ({
      value,
      label: OCCUPANCY_INTENT_LABELS[value],
      className: INTENT_TONE[value],
    }));
  }
  if (colorBy === "fundingStatus") {
    return (Object.keys(FUNDING_TONE) as FundingStatus[]).map((value) => ({
      value,
      label: FUNDING_STATUS_LABELS[value],
      className: FUNDING_TONE[value],
    }));
  }
  return (Object.keys(GRADE_TONE) as LegacyGrade[]).map((value) => ({
    value,
    label: value,
    className: GRADE_TONE[value],
  }));
}
