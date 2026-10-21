import 'server-only';
import { createHash } from 'node:crypto';
import { paymentForCurrentContract } from '@/lib/move-in/payment-projection.server';
import { PAYMENT_SOURCE_MANIFEST } from '@/lib/move-in/payment-projection-source.server';
import { usesAssignedCustomerScope } from '@/lib/move-in/field-access';
import { LEDGER_FINANCE_MANIFEST, LEDGER_FINANCE_SOURCE } from '@/lib/move-in/ledger-finance-data.server';
import type { AuthorizedAccess, BalanceAccountView, LedgerFinance, LedgerFinancePart, LedgerSummaryRow } from '@/lib/move-in/ledger-types';

export type LedgerFinanceInstallment = { type: string; dueDate: string | null; scheduled: number; paid: number };
/** 발코니·옵션 원천. 계약자명은 해시만 보관한다(원문 미저장). */
export type LedgerFinanceAddon = { holderHash: string; transferred: boolean; installments: LedgerFinanceInstallment[]; excess: number; unrefunded: number };
export type LedgerFinanceSource = { account?: { bank: string; number: string }; balcony?: LedgerFinanceAddon; option?: LedgerFinanceAddon };

/**
 * 잔금 가상계좌 열람 권한(서버 판정). 원장·세대 상세·인쇄·엑셀이 모두 이 결과만 쓴다.
 * 관리자 = 전체, 상담사 = 기존 세대 조회 범위(화양 공동 현장은 전체, 그 외 프로젝트는 담당 세대만). 그 밖의 역할은 차단.
 * 호출 전에 기존 세대 조회 권한(RLS·isCurrentUnitVisible)을 이미 통과한 세대여야 한다.
 */
export function canViewBalanceAccount(access: AuthorizedAccess, assigneeId: string | null): boolean {
  if (access.role === 'PROJECT_ADMIN') return true;
  if (access.role !== 'COUNSELOR') return false;
  return !usesAssignedCustomerScope(access.projectId, access.role) || (!!assigneeId && assigneeId === access.memberId);
}

/** 세대 상세용 잔금 가상계좌. 현재 ACTIVE 계약 결속(분양대금)이 확인될 때만 계좌를 연결한다. */
export function balanceAccountFor(input: { access: AuthorizedAccess; projectId: string; unitId: string; contractId: string; buildingNo: string; unitNo: string; assigneeId: string | null }): BalanceAccountView {
  if (!canViewBalanceAccount(input.access, input.assigneeId)) return { kind: 'restricted' };
  const key = /^\d+$/.test(input.buildingNo) && /^\d+$/.test(input.unitNo) ? `${Number(input.buildingNo)}-${Number(input.unitNo)}` : null;
  const account = key ? LEDGER_FINANCE_SOURCE[key]?.account : undefined;
  const bound = paymentForCurrentContract({ projectId: input.projectId, unitId: input.unitId, contractId: input.contractId, buildingNo: input.buildingNo, unitNo: input.unitNo });
  return account && bound ? { kind: 'ok', bank: account.bank, number: account.number } : { kind: 'unknown' };
}

const kstToday = (now: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const holderHash = (name: string) => createHash('sha256').update(name.normalize('NFKC').trim().replace(/\s+/g, '')).digest('hex').slice(0, 24);

/**
 * 현재 계약자와 같은 사람의 발코니·옵션만 인정한다. 계약자가 다르거나 전매 표시가 있거나
 * 세대에 계약 변경 이력(현재 계약 외 계약)이 있으면 미확인(null).
 */
function addonPart(addon: LedgerFinanceAddon | undefined, holderName: string | null, contractHistory: boolean, today: string): LedgerFinancePart | null {
  if (!addon || contractHistory || !holderName?.trim() || addon.transferred || addon.holderHash !== holderHash(holderName)) return null;
  const amount = addon.installments.reduce((sum, row) => sum + row.scheduled, 0);
  const paid = addon.installments.reduce((sum, row) => sum + row.paid, 0);
  const overdue = addon.installments.some(row => row.dueDate !== null && row.dueDate < today && row.paid < row.scheduled);
  // 초과입금·미환불은 미납을 줄이지 않는다(납부원금 기준). 확인 필요 표시만 한다
  return { amount, paid, unpaid: Math.max(amount - paid, 0), overdue, excess: addon.excess > 0 || addon.unrefunded > 0 };
}

/**
 * 세대 금액·계좌. 분양대금은 기존 납부 결속(현재 ACTIVE 계약 ID 일치)으로만 인정하고,
 * 하나라도 확인되지 않은 금액은 0원이 아닌 미확인(null)으로 둔다.
 */
export function ledgerFinanceFor(input: {
  projectId: string; unitId: string; contractId: string; buildingNo: string; unitNo: string; holderName: string | null; contractHistory: boolean; canViewAccount: boolean;
}, now = new Date()): LedgerFinance {
  const today = kstToday(now);
  const key = /^\d+$/.test(input.buildingNo) && /^\d+$/.test(input.unitNo) ? `${Number(input.buildingNo)}-${Number(input.unitNo)}` : null;
  const source = key ? LEDGER_FINANCE_SOURCE[key] : undefined;
  const sale = paymentForCurrentContract({ projectId: input.projectId, unitId: input.unitId, contractId: input.contractId, buildingNo: input.buildingNo, unitNo: input.unitNo }, now);
  const balcony = addonPart(source?.balcony, input.holderName, input.contractHistory, today);
  const option = addonPart(source?.option, input.holderName, input.contractHistory, today);
  const account = sale && source?.account && input.canViewAccount ? source.account : null;
  if (!sale) {
    return { status: 'UNKNOWN', salePrice: null, salePaid: null, saleBalance: null, balcony, option, totalUnpaid: null, partial: true,
      account: null, accountRestricted: !input.canViewAccount };
  }
  const saleOverdue = sale.installments.some(row => row.status === 'OVERDUE');
  const partial = balcony === null || option === null;
  const totalUnpaid = sale.balanceScheduled + (balcony?.unpaid ?? 0) + (option?.unpaid ?? 0);
  const totalPaid = sale.totalPrincipalPaid + (balcony?.paid ?? 0) + (option?.paid ?? 0);
  const status: LedgerFinance['status'] = saleOverdue || balcony?.overdue || option?.overdue ? 'OVERDUE'
    : totalUnpaid === 0 ? (partial ? 'UNKNOWN' : 'PAID')
    : totalPaid === 0 ? 'UNPAID' : 'PARTIAL';
  return { status, salePrice: sale.salePrice, salePaid: sale.totalPrincipalPaid, saleBalance: sale.balanceScheduled, balcony, option,
    totalUnpaid, partial, account, accountRestricted: !input.canViewAccount };
}

/** 원장 행에 금액·계좌를 붙인다(현재 ACTIVE 계약·현재 계약자 기준). 납부상태 필터·잔금 정렬 값도 채운다. */
export function attachLedgerFinance(row: LedgerSummaryRow, access: AuthorizedAccess, now = new Date()): LedgerSummaryRow {
  const finance = ledgerFinanceFor({ projectId: row.projectId, unitId: row.unitId, contractId: row.currentContractId, buildingNo: row.buildingNo, unitNo: row.unitNo,
    // 이력 여부를 모르는 행은 연결하지 않는다
    holderName: row.customerName, contractHistory: row.contractHistory !== false, canViewAccount: canViewBalanceAccount(access, row.assigneeId) }, now);
  return { ...row, finance, payment: finance.status, balance: finance.totalUnpaid };
}

/** 금액·계좌 자료 기준일(원본 파일명 YYMMDD). 분양대금은 기존 원장(납부내역) 기준 */
export const LEDGER_FINANCE_AS_OF = {
  sale: PAYMENT_SOURCE_MANIFEST.sourceFileName,
  balcony: LEDGER_FINANCE_MANIFEST.balconyAsOf, option: LEDGER_FINANCE_MANIFEST.optionAsOf, account: LEDGER_FINANCE_MANIFEST.accountAsOf,
};

export const LEDGER_FINANCE_SOURCE_SHA256 = {
  account: LEDGER_FINANCE_MANIFEST.accountSourceSha256, balcony: LEDGER_FINANCE_MANIFEST.balconySourceSha256, option: LEDGER_FINANCE_MANIFEST.optionSourceSha256,
};
