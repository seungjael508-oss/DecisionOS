import { getSafeMoveInListUrl } from "@/lib/move-in/return-to";
import { applyLedgerQuery, parseLedgerQuery, type LedgerFilterRow, type LedgerQueryState, type LedgerView } from "@/lib/move-in/ledger-filters";

export type WorkspaceContext = {
  valid: boolean; returnTo: string; view: LedgerView; state: LedgerQueryState;
  source: "ledger" | "units" | "today" | "deals" | null;
};

/** Converts old entry routes only. Route redirects and UI integration belong to later tasks. */
export function parseWorkspaceContext(projectId: string, raw: string): WorkspaceContext {
  const base = `/projects/${projectId}/move-in`;
  const safe = getSafeMoveInListUrl(projectId, raw);
  if (!safe) {
    const state = parseLedgerQuery(new URLSearchParams());
    state.issues.push("unsafeReturnContext");
    return { valid: false, returnTo: `${base}/ledger`, view: "all", state, source: null };
  }
  const url = new URL(safe, "https://decisionos.invalid");
  const source = url.pathname.slice(base.length + 1) as NonNullable<WorkspaceContext["source"]>;
  const params = new URLSearchParams(url.search);
  let returnTo = safe;
  if (source !== "ledger") {
    const view = source === "today" ? "today" : source === "deals" ? params.get("tab") || "sale" : "all";
    params.set("view", view);
    if (source === "deals" && !params.has("sort")) params.set("sort", "priority");
    if (source === "units") {
      for (const [alias, key] of [["building", "buildingNo"], ["unit", "unitNo"]]) {
        if (!params.has(key)) for (const value of params.getAll(alias)) params.append(key, value);
        params.delete(alias);
      }
    }
    returnTo = `${base}/ledger${params.size ? `?${params}` : ""}`;
  }
  const state = parseLedgerQuery(params);
  state.selectedUnitId = new URL(raw, "https://decisionos.invalid").searchParams.get("selectedUnit") || null;
  return { valid: state.issues.length === 0, returnTo, view: state.view, state, source };
}

export function buildWorkspaceSelectionHref(projectId: string, raw: string, unitId: string | null) {
  const context = parseWorkspaceContext(projectId, raw);
  if (!context.valid || !unitId) return context.returnTo;
  return `${context.returnTo}${context.returnTo.includes("?") ? "&" : "?"}selectedUnit=${encodeURIComponent(unitId)}`;
}

/**
 * 이미 받은 원장 행으로 /context와 같은 순서를 계산한다(같은 applyLedgerQuery 사용).
 * 다른 프로젝트 행이 섞였거나 조건이 잘못되면 null → 호출측이 서버 /context로 대체한다.
 */
export function orderedIdsFromLoadedLedger<T extends LedgerFilterRow & { projectId: string; unitId: string }>(
  projectId: string, returnTo: string, loaded: { rows: readonly T[]; snapshotAsOf: string } | null,
): string[] | null {
  if (!loaded?.rows.length || loaded.rows.some((row) => row.projectId !== projectId)) return null;
  const context = parseWorkspaceContext(projectId, returnTo);
  if (!context.valid) return null;
  return applyLedgerQuery(loaded.rows, context.state, new Date(loaded.snapshotAsOf)).filteredSorted.map((row) => row.unitId);
}

/** Only a caller's authorized, filtered, sorted full result may be passed here. */
export function resolveWorkspaceAdjacentIds(orderedIds: readonly string[], currentId: string) {
  const missing = { previous: null, next: null, currentFound: false };
  if (new Set(orderedIds).size !== orderedIds.length) return missing;
  const index = orderedIds.indexOf(currentId);
  if (index < 0) return missing;
  return { previous: orderedIds[index - 1] ?? null, next: orderedIds[index + 1] ?? null, currentFound: true };
}
