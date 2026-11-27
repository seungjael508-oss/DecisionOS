import type { ManagementContractLink, ManagementIdentity, ManagementTransferAudit } from "./ledger-management-source";

const KINDS = { SALE: "매매", GIFT: "증여", INHERITANCE: "상속" } as const;
export type RecordedTitleChange = { kind: (typeof KINDS)[keyof typeof KINDS]; recordedDate: string };
const kstDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });

/** An audit event is history about this contract, not evidence of a later resale intention being fulfilled. */
export function confirmedTitleChange(
  identity: Pick<ManagementIdentity, "projectId" | "unitId" | "currentContractId" | "currentCustomerId">,
  contracts: readonly ManagementContractLink[],
  transfers: readonly ManagementTransferAudit[],
): RecordedTitleChange | null {
  const inScope = (r: {project_id:string;unit_id:string}) => r.project_id === identity.projectId && r.unit_id === identity.unitId;
  const active = contracts.filter(c => inScope(c) && c.contract_status === "ACTIVE");
  const current = active[0];
  if (active.length !== 1 || current.contract_id !== identity.currentContractId ||
    current.customer_id !== identity.currentCustomerId || !current.previous_contract_id) return null;
  const predecessors = contracts.filter(c => inScope(c) && c.contract_id === current.previous_contract_id);
  const prior = predecessors[0];
  if (predecessors.length !== 1 || prior.contract_status !== "CANCELLED" || prior.cancellation_reason !== "HOLDER_CHANGED" ||
    !prior.customer_id || prior.customer_id === current.customer_id) return null;
  const matching = transfers.filter(a => {
    if (!inScope(a) || a.field_changed !== "holder_transfer" ||
      (a.contract_id !== current.contract_id && a.contract_id !== prior.contract_id)) return false;
    try {
      const old = JSON.parse(a.previous_value ?? "");
      const next = JSON.parse(a.new_value ?? "");
      return old?.contract_id === prior.contract_id && old.customer_id === prior.customer_id &&
        next?.contract_id === current.contract_id && next.previous_contract_id === prior.contract_id &&
        next.customer_id === current.customer_id;
    } catch { return false; }
  });
  if (matching.length !== 1) return null;
  const {reason, changed_at} = matching[0];
  if (reason !== "SALE" && reason !== "GIFT" && reason !== "INHERITANCE") return null;
  if (!changed_at || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(changed_at)) return null;
  const stamp = Date.parse(changed_at);
  if (!Number.isFinite(stamp)) return null;
  return {kind: KINDS[reason], recordedDate: kstDay.format(stamp)};
}
