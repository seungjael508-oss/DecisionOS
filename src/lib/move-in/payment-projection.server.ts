import 'server-only';
import { createServerClient } from "@/lib/supabase/server";
import { PAYMENT_SOURCE_PROJECTIONS, PAYMENT_SOURCE_MANIFEST } from './payment-projection-source.server';
import { PAYMENT_PROJECTION_IDENTITIES } from './payment-projection-identity.server';

export type PaymentSourceRow = {
  installmentType: string;
  dueDate: string | null;
  scheduledAmount: number;
  paymentDate: string | null;
  principalPaid: number;
  actualCashReceived: number;
  lateFee: number;
  discountAmount: number;
  additionalScheduled: number;
  additionalPaid: number;
  additionalPrincipal: number;
  additionalLateFee: number;
  excessAmount: number;
  refundAmount: number;
  unrefundedAmount: number;
};

export type PaymentInstallment = PaymentSourceRow;

export type PaymentProjection = {
  projectId: string;
  unitId: string;
  contractId: string;
  salePrice: number;
  installments: PaymentInstallment[];
  totalPrincipalPaid: number;
  balanceScheduled: number;
  finalBalanceScheduled: number | null;
  paymentRate: number;
  sourceSha256: string;
};

export type PaymentSourceProjection = {
  buildingNo: string;
  unitNo: string;
  salePrice: number;
  rows: PaymentSourceRow[];
  sourceSha256: string;
};

export type PaymentProjectionCandidate = {
  source: { projectId: string; unitId: string; contractId: string; grade: string | null };
  current: { projectId: string; unitId: string; contractId: string; grade: string | null };
  payment: Omit<PaymentProjection, "projectId" | "unitId" | "contractId" | "sourceSha256"> & { sourceSha256: string };
};

export type PaymentProjectionIdentity = {
  projectId: string;
  unitId: string;
  contractId: string;
};

export type PaymentInstallmentStatus = "PAID" | "PARTIAL" | "OVERDUE" | "UPCOMING";

const ZERO = 0;

function amount(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : ZERO;
}

export function isPaymentProjectionGrade(value: string | null | undefined): value is "C" | "D" {
  return value === "C" || value === "D";
}

export function aggregatePaymentRows(input: {
  salePrice: number;
  rows: PaymentSourceRow[];
}): Omit<PaymentProjection, "projectId" | "unitId" | "contractId" | "sourceSha256"> {
  const rows = input.rows.map((row) => ({
    ...row,
    scheduledAmount: amount(row.scheduledAmount),
    principalPaid: amount(row.principalPaid),
    actualCashReceived: amount(row.actualCashReceived),
    lateFee: amount(row.lateFee),
    discountAmount: amount(row.discountAmount),
    additionalScheduled: amount(row.additionalScheduled),
    additionalPaid: amount(row.additionalPaid),
    additionalPrincipal: amount(row.additionalPrincipal),
    additionalLateFee: amount(row.additionalLateFee),
    excessAmount: amount(row.excessAmount),
    refundAmount: amount(row.refundAmount),
    unrefundedAmount: amount(row.unrefundedAmount),
  }));
  const salePrice = amount(input.salePrice);
  const totalPrincipalPaid = rows.reduce((sum, row) => sum + row.principalPaid, ZERO);
  const finalRows = rows.filter((row) => row.installmentType === "잔금");
  const finalBalanceScheduled = finalRows.length
    ? finalRows.reduce((sum, row) => sum + Math.max(row.scheduledAmount - row.principalPaid, ZERO), ZERO)
    : null;
  return {
    salePrice,
    installments: rows,
    totalPrincipalPaid,
    balanceScheduled: Math.max(salePrice - totalPrincipalPaid, ZERO),
    finalBalanceScheduled,
    paymentRate: salePrice > ZERO ? Number(((totalPrincipalPaid / salePrice) * 100).toFixed(1)) : ZERO,
  };
}

export function buildPaymentSourceProjection(
  entries: Array<{ buildingNo: string; unitNo: string; sourceRowNo: number; isSubtotal: boolean; salePrice: number; row: PaymentSourceRow }>,
): Record<string, PaymentSourceProjection> {
  const byKey = new Map<string, { salePrice: number; rows: PaymentSourceRow[]; sourceSha256: string }>();
  for (const entry of entries) {
    if (entry.isSubtotal) continue;
    const key = `${entry.buildingNo}-${entry.unitNo}`;
    const existing = byKey.get(key) ?? { salePrice: entry.salePrice, rows: [], sourceSha256: "" };
    existing.rows.push(entry.row);
    existing.salePrice ||= entry.salePrice;
    byKey.set(key, existing);
  }
  return Object.fromEntries([...byKey.entries()].map(([key, value]) => [key, {
    buildingNo: key.split("-")[0],
    unitNo: key.split("-")[1],
    salePrice: value.salePrice,
    rows: value.rows,
    sourceSha256: value.sourceSha256,
  }]));
}

export function buildPaymentProjection(input: PaymentProjectionCandidate): PaymentProjection | null {
  if (
    input.source.projectId !== input.current.projectId ||
    input.source.unitId !== input.current.unitId ||
    input.source.contractId !== input.current.contractId ||
    !isPaymentProjectionGrade(input.current.grade)
  ) return null;
  return {
    projectId: input.current.projectId,
    unitId: input.current.unitId,
    contractId: input.current.contractId,
    ...input.payment,
    sourceSha256: input.payment.sourceSha256,
  };
}

export function paymentInstallmentStatus(input: {
  principalPaid: number;
  scheduledAmount: number;
  dueDate: string | null;
  now: string;
}): PaymentInstallmentStatus {
  if (input.principalPaid >= input.scheduledAmount) return "PAID";
  if (input.dueDate && input.dueDate < input.now.slice(0, 10)) return "OVERDUE";
  if (input.principalPaid > ZERO) return "PARTIAL";
  return "UPCOMING";
}

/**
 * Server-only runtime adapter. The generated workbook projection contains no
 * identifiers; current project/unit/active-contract identity is attached only
 * after this read-only current-state check succeeds.
 */
export async function loadPaymentProjection(
  projectId: string,
  unitId: string,
  buildingNo: string,
  unitNo: string,
  source: PaymentSourceProjection | null | undefined,
  identity: PaymentProjectionIdentity | null | undefined,
): Promise<PaymentProjection | null> {
  if (!source || !identity || projectId !== PAYMENT_PROJECT_ID) return null;
  if (
    source.buildingNo !== buildingNo ||
    source.unitNo !== unitNo ||
    identity.projectId !== projectId ||
    identity.unitId !== unitId
  ) return null;
  const supabase = await createServerClient();
  const [current, activeContracts] = await Promise.all([
    supabase
      .from("unit_occupancy_status")
      .select("legacy_grade,contract_id,contract:contract!unit_occupancy_status_contract_id_project_id_unit_id_fkey(contract_id,customer_id,contract_status)")
      .eq("project_id", projectId)
      .eq("unit_id", unitId)
      .maybeSingle(),
    supabase
      .from("contract")
      .select("contract_id")
      .eq("project_id", projectId)
      .eq("unit_id", unitId)
      .eq("contract_status", "ACTIVE"),
  ]);
  if (current.error || activeContracts.error || !current.data || activeContracts.data.length !== 1) return null;
  const contract = Array.isArray(current.data.contract) ? current.data.contract[0] : current.data.contract;
  if (
    !contract ||
    contract.contract_status !== "ACTIVE" ||
    !contract.customer_id ||
    contract.contract_id !== identity.contractId ||
    current.data.contract_id !== identity.contractId ||
    !isPaymentProjectionGrade(current.data.legacy_grade)
  ) return null;
  const projection = aggregatePaymentRows({ salePrice: source.salePrice, rows: source.rows });
  return {
    projectId,
    unitId,
    contractId: contract.contract_id,
    ...projection,
    sourceSha256: source.sourceSha256,
  };
}

export const PAYMENT_PROJECT_ID = "1283e198-5043-4027-96d6-edcc7a6686c6";

export type RegisteredPaymentProjection = Omit<PaymentProjection, 'installments'> & {
  asOfDate: string;
  totalLateFee: number;
  installments: (PaymentInstallment & { status: PaymentInstallmentStatus })[];
};

/** Call only after the existing server-side access/current-holder checks succeed.
 * Uses the frozen workbook-to-contract binding, never rebinds an old payment.
 * Only this unit's installments are returned; no payment DB query or grade gate.
 */
export function paymentForCurrentContract(input: PaymentProjectionIdentity & {
  buildingNo: string; unitNo: string;
}, now = new Date()): RegisteredPaymentProjection | null {
  if (input.projectId !== PAYMENT_PROJECT_ID || !input.contractId || !input.unitId) return null;
  if (!/^\d+$/.test(input.buildingNo) || !/^\d+$/.test(input.unitNo)) return null;
  const key = `${Number(input.buildingNo)}-${Number(input.unitNo)}`;
  const binding = PAYMENT_PROJECTION_IDENTITIES[key], source = PAYMENT_SOURCE_PROJECTIONS[key];
  if (!binding || !source || binding.projectId !== input.projectId || binding.unitId !== input.unitId || binding.contractId !== input.contractId ||
      `${source.buildingNo}-${source.unitNo}` !== key || source.sourceSha256 !== PAYMENT_SOURCE_MANIFEST.sourceSha256) return null;
  // Missing/invalid source is not a known zero. Do not let the legacy aggregate's
  // numeric normalization turn an absent source value into a displayed amount.
  if (!Number.isSafeInteger(source.salePrice) || source.salePrice <= 0 || !source.rows.length || source.rows.some(row =>
    !/^(계약[12]|[1-6]차|잔금)$/.test(row.installmentType) ||
    ['scheduledAmount','principalPaid','actualCashReceived','lateFee','discountAmount','additionalScheduled','additionalPaid','additionalPrincipal','additionalLateFee','excessAmount','refundAmount','unrefundedAmount']
      .some(field => !Number.isSafeInteger(row[field as keyof PaymentSourceRow]) || Number(row[field as keyof PaymentSourceRow]) < 0))) return null;
  const aggregate = aggregatePaymentRows(source);
  const asOfDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  // One obligation can have several receipt rows, with the scheduled amount
  // present only on the first row. Preserve receipts; classify their total.
  const installmentKey = (row: PaymentInstallment) => `${row.installmentType}|${row.dueDate ?? ''}`;
  const totals = new Map<string, { scheduledAmount: number; principalPaid: number; dueDate: string | null }>();
  for (const row of aggregate.installments) {
    const key = installmentKey(row);
    const total = totals.get(key) ?? { scheduledAmount: 0, principalPaid: 0, dueDate: row.dueDate };
    total.scheduledAmount += row.scheduledAmount;
    total.principalPaid += row.principalPaid;
    totals.set(key, total);
  }
  return {
    projectId: input.projectId, unitId: input.unitId, contractId: input.contractId,
    ...aggregate, sourceSha256: source.sourceSha256, asOfDate,
    totalLateFee: aggregate.installments.reduce((sum, row) => sum + row.lateFee, 0),
    installments: aggregate.installments.map(row => ({ ...row, status: paymentInstallmentStatus({ ...totals.get(installmentKey(row))!, now: asOfDate }) })),
  };
}
