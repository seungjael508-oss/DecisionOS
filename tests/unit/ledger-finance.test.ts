import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

// vi.mock 팩토리는 파일 맨 위로 올라가므로 쓰는 값도 vi.hoisted로 먼저 만든다
const { hash, sale } = vi.hoisted(() => ({
  hash: (name: string) => createHash('sha256').update(name.normalize('NFKC').trim().replace(/\s+/g, '')).digest('hex').slice(0, 24),
  sale: vi.fn(),
}));
vi.mock('@/lib/move-in/payment-projection.server', () => ({ paymentForCurrentContract: (...args: unknown[]) => sale(...args) }));
vi.mock('@/lib/move-in/ledger-finance-data.server', () => ({
  LEDGER_FINANCE_MANIFEST: { accountSourceSha256: 'a', balconySourceSha256: 'b', optionSourceSha256: 'c' },
  LEDGER_FINANCE_SOURCE: {
    '101-201': {
      account: { bank: '하나은행', number: '000-000000-00000' },
      balcony: { holderHash: hash('김현재'), transferred: false, excess: 0, unrefunded: 0, installments: [
        { type: '계약', dueDate: '2026-01-01', scheduled: 100, paid: 100 }, { type: '잔금', dueDate: '2026-12-31', scheduled: 900, paid: 0 }] },
      option: { holderHash: hash('김현재'), transferred: false, excess: 0, unrefunded: 0, installments: [{ type: '계약', dueDate: '2026-01-01', scheduled: 50, paid: 50 }] },
    },
    '101-202': {
      account: { bank: '하나은행', number: '000-000000-00001' },
      balcony: { holderHash: hash('이전계약자'), transferred: false, excess: 0, unrefunded: 0, installments: [{ type: '계약', dueDate: '2026-01-01', scheduled: 100, paid: 100 }] },
      option: { holderHash: hash('김현재'), transferred: true, excess: 0, unrefunded: 0, installments: [{ type: '계약', dueDate: '2026-01-01', scheduled: 50, paid: 50 }] },
    },
    '101-203': { account: { bank: '하나은행', number: '000-000000-00002' }, balcony: { holderHash: hash('박완납'), transferred: false, excess: 0, unrefunded: 0, installments: [{ type: '계약', dueDate: '2026-01-01', scheduled: 10, paid: 10 }] },
      option: { holderHash: hash('박완납'), transferred: false, excess: 0, unrefunded: 0, installments: [{ type: '계약', dueDate: '2026-01-01', scheduled: 5, paid: 5 }] } },
    '101-204': { account: { bank: '하나은행', number: '000-000000-00003' }, balcony: { holderHash: hash('최연체'), transferred: false, excess: 0, unrefunded: 0, installments: [{ type: '잔금', dueDate: '2026-09-01', scheduled: 10, paid: 0 }] } },
  },
}));
import { ledgerFinanceFor } from '@/lib/move-in/ledger-finance.server';
import { ledgerCells, LEDGER_COLUMNS } from '@/lib/move-in/ledger-presentation';

const now = new Date('2026-10-19T03:00:00Z');
const base = { projectId: 'p', unitId: 'u', contractId: 'k', buildingNo: '101', contractHistory: false, canViewAccount: true };
const saleOf = (paid: number, overdue = false) => ({ salePrice: 1000, totalPrincipalPaid: paid, balanceScheduled: 1000 - paid,
  installments: [{ status: overdue ? 'OVERDUE' : paid >= 1000 ? 'PAID' : 'UPCOMING' }] });
beforeEach(() => sale.mockReset());

describe('통합원장 금액·계좌', () => {
  it('현재 계약자 발코니·옵션 결합, 전체 미납 = 분양 잔금 + 발코니·옵션 미납, 잔금 전용 계좌', () => {
    sale.mockReturnValue(saleOf(300));
    const f = ledgerFinanceFor({ ...base, unitNo: '201', holderName: '김 현재' }, now);
    expect(f).toMatchObject({ status: 'PARTIAL', salePrice: 1000, salePaid: 300, saleBalance: 700, totalUnpaid: 700 + 900 + 0, partial: false,
      balcony: { amount: 1000, paid: 100, unpaid: 900, overdue: false }, option: { amount: 50, paid: 50, unpaid: 0 }, account: { number: '000-000000-00000' } });
  });
  it('분양대금 결속이 현재 계약과 다르면 전부 미확인(0원 아님), 계좌도 숨김', () => {
    sale.mockReturnValue(null);
    const f = ledgerFinanceFor({ ...base, unitNo: '201', holderName: '김현재' }, now);
    expect(f).toMatchObject({ status: 'UNKNOWN', salePrice: null, saleBalance: null, totalUnpaid: null, account: null });
  });
  it('이전 계약자 발코니·전매 표시 옵션은 미확인, 전체 미납은 확인된 금액만 합치고 일부 미확인 표시', () => {
    sale.mockReturnValue(saleOf(1000));
    const f = ledgerFinanceFor({ ...base, unitNo: '202', holderName: '김현재' }, now);
    expect(f).toMatchObject({ balcony: null, option: null, totalUnpaid: 0, partial: true, status: 'UNKNOWN' });
  });
  it('계약자 해시가 같아도 세대에 계약 변경 이력이 있으면 발코니·옵션 미확인', () => {
    sale.mockReturnValue(saleOf(300));
    const f = ledgerFinanceFor({ ...base, unitNo: '201', holderName: '김현재', contractHistory: true }, now);
    expect(f).toMatchObject({ balcony: null, option: null, partial: true, totalUnpaid: 700 });
  });
  it('모두 확인·미납 0 = 완납, 지난 약정 미납 = 연체, 자료 없는 옵션은 미확인', () => {
    sale.mockReturnValue(saleOf(1000));
    expect(ledgerFinanceFor({ ...base, unitNo: '203', holderName: '박완납' }, now).status).toBe('PAID');
    const late = ledgerFinanceFor({ ...base, unitNo: '204', holderName: '최연체' }, now);
    expect(late).toMatchObject({ status: 'OVERDUE', option: null, partial: true, balcony: { overdue: true } });
    sale.mockReturnValue(saleOf(0, true));
    expect(ledgerFinanceFor({ ...base, unitNo: '203', holderName: '박완납' }, now).status).toBe('OVERDUE');
  });
  it('계좌 권한이 없으면 서버가 계좌를 내려보내지 않고 화면·인쇄·엑셀 셀은 권한 없음', () => {
    sale.mockReturnValue(saleOf(300));
    const f = ledgerFinanceFor({ ...base, unitNo: '201', holderName: '김현재', canViewAccount: false }, now);
    expect(f.account).toBeNull();
    expect(JSON.stringify(f)).not.toContain('000-000000');
    const cells = ledgerCells({ buildingNo: '101', unitNo: '201', currentGrade: 'C', phone: null, customerName: 'x', effectiveIntent: 'UNDECIDED', rentalType: null,
      funding: null, moveIn: null, dealTypes: [], contactStatus: 'NONE', lastAttempt: null, lastContact: null, assigneeId: null, specialReasons: [], finance: f } as never, {});
    expect(cells[LEDGER_COLUMNS.indexOf('가상계좌번호')]).toBe('권한 없음');
    expect(cells[LEDGER_COLUMNS.indexOf('은행명')]).toBe('권한 없음');
    expect(cells[LEDGER_COLUMNS.indexOf('아파트 분양 잔금')]).toBe('700원');
    expect(cells[LEDGER_COLUMNS.indexOf('납부상태')]).toBe('일부 납부');
    expect(cells[LEDGER_COLUMNS.indexOf('전체 미납액')]).toBe('1,600원');
    expect(cells[LEDGER_COLUMNS.indexOf('발코니 미납액')]).toBe('900원');
    expect(cells[LEDGER_COLUMNS.indexOf('연체 여부')]).toBe('없음');
    const shown = ledgerCells({ buildingNo: '101', unitNo: '201', dealTypes: [], specialReasons: [], contactStatus: 'NONE', finance: ledgerFinanceFor({ ...base, unitNo: '201', holderName: '김현재' }, now) } as never, {});
    expect(shown.slice(LEDGER_COLUMNS.indexOf('은행명'), LEDGER_COLUMNS.indexOf('계좌 용도') + 1)).toEqual(['하나은행', '000-000000-00000', '아파트 분양 잔금 전용']);
  });
});

describe('잔금 가상계좌 열람 권한(서버 판정)', () => {
  const STAYJ = '1283e198-5043-4027-96d6-edcc7a6686c6', OTHER = '21000000-0000-4000-8000-000000000002';
  const access = (role: string, projectId = STAYJ, memberId = 'm1') => ({ ok: true, projectId, role, memberId }) as never;
  it('관리자 전체, 화양 상담사 공동 현장 전체, 일반 프로젝트 상담사 담당 세대만, 그 밖의 역할 차단', async () => {
    const { canViewBalanceAccount } = await import('@/lib/move-in/ledger-finance.server');
    expect(canViewBalanceAccount(access('PROJECT_ADMIN', OTHER), null)).toBe(true);
    expect(canViewBalanceAccount(access('COUNSELOR', STAYJ), 'someone-else')).toBe(true);
    expect(canViewBalanceAccount(access('COUNSELOR', OTHER), 'm1')).toBe(true);
    expect(canViewBalanceAccount(access('COUNSELOR', OTHER), 'someone-else')).toBe(false);
    expect(canViewBalanceAccount(access('COUNSELOR', OTHER), null)).toBe(false);
    expect(canViewBalanceAccount(access('CLIENT_MANAGER', STAYJ), null)).toBe(false);
    expect(canViewBalanceAccount(access('TEAM_LEAD', STAYJ), null)).toBe(false);
  });
  it('세대 상세: 권한 없으면 계좌를 만들지 않고, 현재 계약 결속이 없으면 미확인', async () => {
    const { balanceAccountFor } = await import('@/lib/move-in/ledger-finance.server');
    const input = { projectId: STAYJ, unitId: 'u', contractId: 'k', buildingNo: '101', unitNo: '201', assigneeId: null };
    sale.mockReturnValue(saleOf(300));
    expect(balanceAccountFor({ ...input, access: access('COUNSELOR') })).toEqual({ kind: 'ok', bank: '하나은행', number: '000-000000-00000' });
    const denied = balanceAccountFor({ ...input, access: access('CLIENT_MANAGER') });
    expect(denied).toEqual({ kind: 'restricted' });
    expect(JSON.stringify(denied)).not.toContain('000-000000');
    expect(balanceAccountFor({ ...input, access: access('COUNSELOR', OTHER, 'm1'), assigneeId: 'm2' })).toEqual({ kind: 'restricted' });
    sale.mockReturnValue(null);
    expect(balanceAccountFor({ ...input, access: access('PROJECT_ADMIN') })).toEqual({ kind: 'unknown' });
  });
});
