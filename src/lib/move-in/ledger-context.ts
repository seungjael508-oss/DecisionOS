import { getSafeMoveInListUrl } from "@/lib/move-in/return-to";
import { parseLedgerQuery, type LedgerQueryState, type LedgerView } from "@/lib/move-in/ledger-filters";

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

/** Only a caller's authorized, filtered, sorted full result may be passed here. */
export function resolveWorkspaceAdjacentIds(orderedIds: readonly string[], currentId: string) {
  const missing = { previous: null, next: null, currentFound: false };
  if (new Set(orderedIds).size !== orderedIds.length) return missing;
  const index = orderedIds.indexOf(currentId);
  if (index < 0) return missing;
  return { previous: orderedIds[index - 1] ?? null, next: orderedIds[index + 1] ?? null, currentFound: true };
}
