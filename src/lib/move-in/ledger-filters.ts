import type { LedgerManagement } from '@/lib/move-in/ledger-management-source';
import { gradeSortRank } from "@/lib/move-in/filters";
import { digitsOnly, parseDongHoQuery } from "@/lib/move-in/calls";
import { matchesSpecialManagementFilter, type SpecialManagementFilter } from "@/lib/move-in/intent";

export const LEDGER_AXES = ["building", "unit", "customer", "phone", "grade", "intent", "funding", "moveIn", "assignee", "specialReason", "nextContact", "contactStatus", "deal", "payment", "loanAgreement", "moveReservation", "problemHousehold"] as const;
export type LedgerAxis = typeof LEDGER_AXES[number];
export type AxisSelection = { include: string[]; exclude: string[] };
export const LEDGER_VIEWS = ["all", "today", "sale", "rental", "special"] as const;
export type LedgerView = typeof LEDGER_VIEWS[number];
const SORT_KEYS = ["unit", "name", "grade", "phone", "funding", "moveIn", "nextContact", "balance", "priority", "queue"] as const;
export type LedgerSortKey = typeof SORT_KEYS[number];
type Sort = { key: LedgerSortKey; direction: "asc" | "desc" };
export const LEDGER_BLANK = "__BLANK__";
const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;
const keyFor = (axis: LedgerAxis) => axis === "intent" ? "effectiveIntent" : axis;
const FREE_TEXT_AXES = new Set<LedgerAxis>(["customer", "phone"]);
const ALIASES: Partial<Record<LedgerAxis, readonly string[]>> = {
  building: ["buildingNo"], unit: ["unitNo"], customer: ["customerName", "search"], phone: ["customerPhone"],
  intent: ["intent", "occupancyIntent"], funding: ["fundingStatus"], moveIn: ["moveInStatus"],
};
const SPECIAL_QUICK = ["all", "termination_abandonment", "grade_d", "funding_risk", "undecided", "manual"];

/** The narrow input contract for Task 2's authorized summary DTO; no queries or source inference. */
export type LedgerFilterRow = {
  management?: LedgerManagement;
  unitId: string; buildingNo: string; unitNo: string;
  currentGrade: string | null; customerName: string | null; phone: string | null;
  assigneeId: string | null; effectiveIntent: string | null; rentalType: string | null;
  funding: string | null; moveIn: string | null; nextContact: string | null;
  contactStatus?: string | null;
  specialReasons: readonly string[]; specialPriority: number | null;
  dealTypes: readonly string[]; payment: string | null; balance: number | null;
  views: readonly ("sale" | "rental" | "special")[];
  operationalIntent?: string | null; occupancyIntent?: string | null;
  queue?: { order: number; reasonCodes: readonly string[]; priority?: string } | null;
  deal?: { consentStatus: string | null; dealStatus: string | null; enabledTypes: readonly string[]; officeIds: readonly string[] } | null;
};
type LegacyFilters = {
  building: string[]; unit: string[]; customer: string[]; phone: string[];
  operational: string[]; occupancy: string[]; q: string[]; consentStatus: string[]; dealStatus: string[];
  enabledTypes: string[]; officeIds: string[]; todayFilter: string; priority: string[];
};
export type LedgerQueryState = {
  view: LedgerView; axes: Partial<Record<LedgerAxis, AxisSelection>>;
  text: { unit?: string; customer?: string; phone?: string };
  nextContactRange?: { from: string; to: string };
  sort: Sort; page: number; pageSize: 50 | 100; selectedUnitId: string | null;
  legacy: LegacyFilters; issues: string[];
};
export type LedgerStatePatch = Partial<Pick<LedgerQueryState, "view" | "sort" | "page" | "pageSize" | "selectedUnitId" | "text">> & {
  axes?: Partial<Record<LedgerAxis, AxisSelection>>;
  nextContactRange?: LedgerQueryState["nextContactRange"] | null;
  reset?: boolean;
};

function values(params: URLSearchParams, key: string, split = true): string[] {
  return [...new Set(params.getAll(key).flatMap(v => split ? v.split(",") : [v]).map(v => v.trim()).filter(Boolean))];
}
function dateStart(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms - KST_MS : null;
}
function pageNumber(value: string | null): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : 1;
}

export function parseLedgerQuery(params: URLSearchParams): LedgerQueryState {
  const issues: string[] = [];
  const rawView = params.get("view") || "all";
  const view = LEDGER_VIEWS.includes(rawView as LedgerView) ? rawView as LedgerView : "all";
  if (view !== rawView) issues.push("view");
  const axes: LedgerQueryState["axes"] = {};
  for (const axis of LEDGER_AXES) {
    const key = keyFor(axis);
    const alias = axis === "funding" ? "fundingStatus" : axis === "moveIn" ? "moveInStatus" : null;
    const include = values(params, !params.has(key) && alias ? alias : key, !FREE_TEXT_AXES.has(axis));
    const exclude = values(params, `${key}Exclude`, !FREE_TEXT_AXES.has(axis));
    if (include.length || exclude.length) axes[axis] = { include, exclude };
  }
  const from = params.get("nextContactFrom") || "";
  const to = params.get("nextContactTo") || "";
  if ((from && dateStart(from) === null) || (to && dateStart(to) === null) || (from && to && from > to)) issues.push("nextContactRange");
  const defaultSort = view === "today" ? "queue" : view === "special" ? "priority" : "unit";
  const rawSort = params.get("sort") || defaultSort;
  const key = SORT_KEYS.includes(rawSort as LedgerSortKey) ? rawSort as LedgerSortKey : defaultSort;
  if (key !== rawSort) issues.push("sort");
  const rawDirection = params.get("direction") || "asc";
  if (rawDirection !== "asc" && rawDirection !== "desc") issues.push("direction");
  // These legacy business predicates have no summary capability yet. Never drop them silently.
  for (const unsupported of ["problemOnly", "problemCategory", "specialTag"]) {
    if (values(params, unsupported).some(v => v !== "false" && v !== "0")) issues.push(unsupported);
  }
  const todayFilter = params.get("filter") || "all";
  if (view === "today" && !["all", "next_contact", "delayed", "funding"].includes(todayFilter)) issues.push("filter");
  if (params.get("phoneSearch") && !digitsOnly(params.get("phoneSearch")!)) issues.push("phoneSearch");
  return {
    view, axes,
    text: { unit: params.get("unitSearch") || undefined, customer: params.get("customerSearch") || undefined, phone: params.get("phoneSearch") || undefined },
    nextContactRange: from || to ? { from, to } : undefined,
    sort: { key, direction: rawDirection === "desc" ? "desc" : "asc" },
    page: pageNumber(params.get("page")), pageSize: params.get("pageSize") === "50" ? 50 : 100,
    selectedUnitId: params.get("selectedUnit") || null, issues,
    legacy: {
      building: values(params, "buildingNo", false), unit: values(params, "unitNo", false),
      customer: values(params, params.has("customerName") ? "customerName" : "search", false), phone: values(params, "customerPhone", false),
      operational: values(params, "intent"), occupancy: values(params, "occupancyIntent"), q: values(params, "q", false),
      consentStatus: values(params, "consentStatus"), dealStatus: values(params, "dealStatus"), officeIds: values(params, "brokerageOfficeId", false),
      enabledTypes: [["saleEnabled", "SALE"], ["jeonseEnabled", "JEONSE"], ["monthlyRentEnabled", "MONTHLY_RENT"]].filter(([k]) => params.get(k) === "1").map(([, v]) => v),
      todayFilter, priority: values(params, "priority"),
    },
  };
}

const normalized = (value: string | null | undefined) => value?.trim() || LEDGER_BLANK;
function axisValues(row: LedgerFilterRow, axis: LedgerAxis, now: Date): readonly string[] {
  if (axis === "loanAgreement" || axis === "moveReservation" || axis === "problemHousehold") return [row.management?.[axis] ?? "UNKNOWN"];
  if (axis === "contactStatus") return [row.contactStatus ?? "NONE"];
  if (axis === "intent") return [normalized(row.effectiveIntent), ...(row.effectiveIntent === "RENT" && row.rentalType ? [row.rentalType] : [])];
  if (axis === "specialReason") return row.specialReasons.length ? row.specialReasons : [LEDGER_BLANK];
  if (axis === "deal") return row.dealTypes.length ? row.dealTypes : [LEDGER_BLANK];
  if (axis === "nextContact") {
    if (!row.nextContact) return [LEDGER_BLANK];
    const ms = Date.parse(row.nextContact);
    if (!Number.isFinite(ms)) return [];
    const date = new Date(ms + KST_MS).toISOString().slice(0, 10);
    const today = new Date(now.getTime() + KST_MS).toISOString().slice(0, 10);
    return [date, date === today ? "TODAY" : date < today ? "OVERDUE" : "FUTURE"];
  }
  const scalar = { building: row.buildingNo, unit: row.unitNo, customer: row.customerName, phone: row.phone, grade: row.currentGrade, funding: row.funding, moveIn: row.moveIn, assignee: row.assigneeId, payment: row.payment };
  return [normalized(scalar[axis])];
}
function phoneValue(v: string) { return v === LEDGER_BLANK ? v : digitsOnly(v) || v; }
function matchesSelection(rowValues: readonly string[], selection: AxisSelection, axis: LedgerAxis) {
  const clean = (v: string) => axis === "phone" ? phoneValue(v) : axis === "intent" && v === "SALE" ? "SALE_TRANSFER" : v;
  const set = new Set(rowValues.map(clean));
  const matches = (value: string) => axis === "specialReason" && SPECIAL_QUICK.includes(value)
    ? matchesSpecialManagementFilter(rowValues.filter(v => v !== LEDGER_BLANK) as Parameters<typeof matchesSpecialManagementFilter>[0], value as SpecialManagementFilter)
    : set.has(clean(value));
  return (!selection.include.length || selection.include.some(matches)) && !selection.exclude.some(matches);
}
function matchesLegacy(row: LedgerFilterRow, f: LegacyFilters) {
  const contains = (actual: string | null, selected: readonly string[]) => !selected.length || selected.some(v => (actual ?? "").includes(v));
  const exact = (actual: string | null | undefined, selected: readonly string[]) => !selected.length || (!!actual && selected.includes(actual));
  if (!contains(row.buildingNo, f.building) || !contains(row.unitNo, f.unit) || !contains(row.customerName, f.customer)) return false;
  if (f.phone.length && !f.phone.some(v => !digitsOnly(v) || digitsOnly(row.phone ?? "").includes(digitsOnly(v)))) return false;
  if (!exact(row.operationalIntent, f.operational) || !exact(row.occupancyIntent, f.occupancy)) return false;
  if (!exact(row.deal?.consentStatus, f.consentStatus) || !exact(row.deal?.dealStatus, f.dealStatus)) return false;
  if (f.enabledTypes.some(v => !row.deal?.enabledTypes.includes(v))) return false;
  if (f.officeIds.length && !f.officeIds.some(v => row.deal?.officeIds.includes(v))) return false;
  if (f.priority.length && !exact(row.queue?.priority, f.priority)) return false;
  if (f.q.length && !f.q.some(q => {
    const pair = parseDongHoQuery(q);
    if (pair) return pair.buildingNo === row.buildingNo && pair.unitNo === row.unitNo;
    return [row.buildingNo, row.unitNo, row.customerName ?? ""].some(v => v.includes(q)) || (!!digitsOnly(q) && digitsOnly(row.phone ?? "").includes(digitsOnly(q)));
  })) return false;
  return true;
}
function matchesView(row: LedgerFilterRow, state: LedgerQueryState) {
  if (state.view === "all") return true;
  if (state.view !== "today") return row.views.includes(state.view);
  if (!row.queue) return false;
  const filter = state.legacy.todayFilter;
  if (filter === "next_contact") return row.queue.reasonCodes.includes("FOLLOW_UP_DUE");
  if (filter === "funding") return row.queue.reasonCodes.includes("C_GRADE_FUNDING");
  if (filter === "delayed") return row.moveIn === "DELAYED";
  return true;
}
function naturalUnit(a: LedgerFilterRow, b: LedgerFilterRow) {
  return a.buildingNo.localeCompare(b.buildingNo, "ko", { numeric: true }) || a.unitNo.localeCompare(b.unitNo, "ko", { numeric: true });
}
function sortValue(row: LedgerFilterRow, key: LedgerSortKey): string | number | null {
  if (key === "grade") return row.currentGrade ? gradeSortRank(row.currentGrade) : null;
  if (key === "name") return row.customerName;
  if (key === "priority") return row.specialPriority;
  if (key === "queue") return row.queue?.order ?? null;
  if (key === "nextContact") { const n = Date.parse(row.nextContact ?? ""); return Number.isFinite(n) ? n : null; }
  if (key === "unit") return null;
  return row[key];
}

/** Input must already be authorized and projected server-side. This is not an access check. */
export function applyLedgerQuery<T extends LedgerFilterRow>(rows: readonly T[], state: LedgerQueryState, now: Date): { filteredSorted: T[]; pageRows: T[]; total: number } {
  if (state.issues.length || !Number.isFinite(now.getTime())) return { filteredSorted: [], pageRows: [], total: 0 };
  const filteredSorted = rows.filter(row => {
    if (!matchesView(row, state) || !matchesLegacy(row, state.legacy)) return false;
    for (const axis of LEDGER_AXES) {
      const selection = state.axes[axis];
      if (selection && !matchesSelection(axisValues(row, axis, now), selection, axis)) return false;
    }
    if (state.text.unit && !row.unitNo.includes(state.text.unit)) return false;
    if (state.text.customer && !(row.customerName ?? "").includes(state.text.customer)) return false;
    if (state.text.phone && !digitsOnly(row.phone ?? "").includes(digitsOnly(state.text.phone))) return false;
    if (state.nextContactRange) {
      const ms = Date.parse(row.nextContact ?? "");
      const { from, to } = state.nextContactRange;
      if (!Number.isFinite(ms) || (from && ms < dateStart(from)!) || (to && ms >= dateStart(to)! + DAY_MS)) return false;
    }
    return true;
  });
  const sign = state.sort.direction === "desc" ? -1 : 1;
  filteredSorted.sort((a, b) => {
    if (state.sort.key === "unit") return naturalUnit(a, b) * sign;
    const x = sortValue(a, state.sort.key), y = sortValue(b, state.sort.key);
    if (x === null || x === "") return y === null || y === "" ? naturalUnit(a, b) : 1;
    if (y === null || y === "") return -1;
    const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ko", { numeric: true });
    return cmp * sign || naturalUnit(a, b);
  });
  const total = filteredSorted.length;
  const page = Math.min(state.page, Math.max(1, Math.ceil(total / state.pageSize)));
  return { filteredSorted, pageRows: filteredSorted.slice((page - 1) * state.pageSize, page * state.pageSize), total };
}

function resultIdentity(state: LedgerQueryState): string {
  // Canonicalize OR sets so a no-op patch does not lose the cursor or page.
  return JSON.stringify({ view: state.view, axes: Object.fromEntries(LEDGER_AXES.map(axis => [axis, {
    include: [...(state.axes[axis]?.include ?? [])].sort(), exclude: [...(state.axes[axis]?.exclude ?? [])].sort(),
  }])), text: state.text, range: state.nextContactRange, sort: state.sort, legacy: state.legacy, issues: state.issues });
}
export function patchLedgerQuery(original: URLSearchParams, patch: LedgerStatePatch): URLSearchParams {
  const params = new URLSearchParams(original);
  const setMany = (key: string, vals: readonly string[]) => { params.delete(key); for (const value of vals) params.append(key, value); };
  if (patch.reset) {
    const keys = [...LEDGER_AXES.flatMap(axis => [keyFor(axis), `${keyFor(axis)}Exclude`, ...(ALIASES[axis] ?? [])]),
      "view", "tab", "filter", "unitSearch", "customerSearch", "phoneSearch", "nextContactFrom", "nextContactTo", "sort", "direction", "page", "pageSize", "cursor", "selectedUnit", "q", "consentStatus", "dealStatus", "brokerageOfficeId", "saleEnabled", "jeonseEnabled", "monthlyRentEnabled", "priority", "problemOnly", "problemCategory", "specialTag"];
    for (const key of keys) params.delete(key);
  }
  for (const axis of LEDGER_AXES) {
    const selection = patch.axes?.[axis];
    if (!selection) continue;
    for (const alias of ALIASES[axis] ?? []) params.delete(alias);
    if (["unit", "customer", "phone"].includes(axis)) params.delete(`${axis}Search`);
    setMany(keyFor(axis), selection.include); setMany(`${keyFor(axis)}Exclude`, selection.exclude);
  }
  if (patch.view !== undefined) { params.set("view", patch.view); params.delete("tab"); params.delete("filter"); }
  if (patch.sort) { params.set("sort", patch.sort.key); params.set("direction", patch.sort.direction); }
  for (const key of ["unit", "customer", "phone"] as const) {
    if (patch.text && key in patch.text) {
      params.delete(`${key}Search`);
      if (patch.text[key]) params.set(`${key}Search`, patch.text[key]!);
      for (const alias of ALIASES[key] ?? []) params.delete(alias);
    }
  }
  if (patch.nextContactRange !== undefined) {
    params.delete("nextContactFrom"); params.delete("nextContactTo");
    if (patch.nextContactRange?.from) params.set("nextContactFrom", patch.nextContactRange.from);
    if (patch.nextContactRange?.to) params.set("nextContactTo", patch.nextContactRange.to);
  }
  if (patch.page !== undefined) params.set("page", String(patch.page));
  if (patch.pageSize !== undefined) params.set("pageSize", String(patch.pageSize));
  if (patch.selectedUnitId !== undefined) { params.delete("selectedUnit"); if (patch.selectedUnitId) params.set("selectedUnit", patch.selectedUnitId); }
  const before = parseLedgerQuery(original), after = parseLedgerQuery(params);
  if (resultIdentity(before) !== resultIdentity(after) || before.pageSize !== after.pageSize) {
    params.set("page", "1"); params.delete("cursor");
  } else if (before.page !== after.page) {
    params.delete("cursor");
  }
  return params;
}
