import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/move-in/queries', () => ({ loadUnitRows: vi.fn() }));
const access = vi.fn(), rpc = vi.fn();
let occupancy: Record<string, unknown> | null = null;
vi.mock('@/lib/move-in/access', () => ({ requireMoveInAccess: (...a: unknown[]) => access(...a) }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => ({
  from: () => { const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: occupancy, error: null }) }; return chain; },
  rpc: (...a: unknown[]) => rpc(...a),
}) }));
import { saveMoveInBalancePaid } from '@/app/projects/[projectId]/move-in/units/[unitId]/actions';
const ID = '00000000-0000-4000-8000-000000000001';
const input = (paidOn = '2026-10-19', reason = '입주현황 검증', expectedBalancePaidAt: string | null = null) => ({ projectId: ID, unitId: ID, customerId: ID, contractId: ID, paidOn, reason, expectedBalancePaidAt });
function setup() { access.mockResolvedValue({ ok: true, role: 'PROJECT_ADMIN' }); occupancy = { move_in_status: 'PLANNED', balance_paid_at: null }; rpc.mockResolvedValue({ data: { changed: true }, error: null }); }
afterEach(() => { access.mockReset(); rpc.mockReset(); occupancy = null; });
describe('관리자 완납 저장 검증', () => {
  it('전용 RPC만 1회 호출하고 현재 계약·고객·기대 완납일을 전달', async () => {
    setup(); expect(await saveMoveInBalancePaid(input())).toEqual({ ok: true, changed: true });
    expect(rpc).toHaveBeenCalledExactlyOnceWith('set_move_in_balance_paid', { p_project_id: ID, p_unit_id: ID, p_contract_id: ID, p_customer_id: ID, p_paid: true, p_expected_balance_paid_at: null, p_paid_at: '2026-10-18T15:00:00.000Z', p_reason: '입주현황 검증' });
  });
  it('관리자 외 저장 거부', async () => { setup(); access.mockResolvedValue({ ok: true, role: 'COUNSELOR' }); expect((await saveMoveInBalancePaid(input())).ok).toBe(false); expect(rpc).not.toHaveBeenCalled(); });
  it.each(['', ' ', 'x'.repeat(201)])('잘못된 사유 거부 %s', async reason => { setup(); expect((await saveMoveInBalancePaid(input('2026-10-19', reason))).ok).toBe(false); expect(rpc).not.toHaveBeenCalled(); });
  it.each(['2999-01-01', '2026-02-30', 'bad-date', '2026-13-01'])('날짜 오류 거부 %s', async date => { setup(); expect((await saveMoveInBalancePaid(input(date))).ok).toBe(false); expect(rpc).not.toHaveBeenCalled(); });
  it('현재 계약 행이 없으면 RPC 호출 없이 거부', async () => { setup(); occupancy = null; expect((await saveMoveInBalancePaid(input())).ok).toBe(false); expect(rpc).not.toHaveBeenCalled(); });
  it.each(['23503', '40001', '42501', 'XX000'])('RPC 오류 %s는 성공으로 반환하지 않음', async code => { setup(); const before = { ...occupancy }; rpc.mockResolvedValue({ data: null, error: { code, message: 'rejected' } }); expect((await saveMoveInBalancePaid(input())).ok).toBe(false); expect(occupancy).toEqual(before); expect(rpc).toHaveBeenCalledTimes(1); });
  it('해제도 전용 RPC에서 처리하며 상태를 클라이언트가 지정하지 않음', async () => { setup(); occupancy = { move_in_status: 'MOVED_IN', balance_paid_at: '2026-10-18T15:00:00Z' }; await saveMoveInBalancePaid(input('', '해제', '2026-10-18T15:00:00Z')); expect(rpc.mock.calls[0][1]).toMatchObject({ p_paid: false, p_paid_at: null, p_expected_balance_paid_at: occupancy.balance_paid_at }); expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_move_in_status'); });
  it('RPC의 무변경 응답을 존중', async () => { setup(); rpc.mockResolvedValue({ data: { changed: false }, error: null }); expect(await saveMoveInBalancePaid(input())).toEqual({ ok: true, changed: false }); });
  it('회귀: 화면 로드 이후 완납일이 변경되면 거부하고 덮어쓰지 않음', async () => {
    setup(); occupancy = { move_in_status: 'BALANCE_PAID', balance_paid_at: '2026-10-20T15:00:00Z' };
    expect(await saveMoveInBalancePaid(input('2026-10-19'))).toMatchObject({ ok: false, code: 'stale_balance' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    [null, '2026-10-18T15:00:00Z'], ['2026-10-18T15:00:00Z', null],
    ['2026-10-17T15:00:00Z', '2026-10-18T15:00:00Z'],
  ])('NULL·날짜 기대값 충돌 %s → %s', async (expected, current) => {
    setup(); occupancy = { move_in_status: 'BALANCE_PAID', balance_paid_at: current };
    expect(await saveMoveInBalancePaid(input('2026-10-19', '검증', expected))).toMatchObject({ ok: false, code: 'stale_balance' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('시간대 표기가 달라도 같은 시각이면 화면 기대값 그대로 전달', async () => {
    setup(); occupancy = { move_in_status: 'BALANCE_PAID', balance_paid_at: '2026-10-19T00:00:00+09:00' };
    expect((await saveMoveInBalancePaid(input('2026-10-20', '검증', '2026-10-18T15:00:00.000Z'))).ok).toBe(true);
    expect(rpc.mock.calls[0][1].p_expected_balance_paid_at).toBe('2026-10-18T15:00:00.000Z');
  });
  it('읽기 이후 경합은 기존 RPC 40001 거절로 처리', async () => {
    setup(); rpc.mockResolvedValue({ data: null, error: { code: '40001', message: 'balance changed; reload' } });
    expect(await saveMoveInBalancePaid(input())).toMatchObject({ ok: false, code: 'stale_balance' });
  });
  it.each([null, '2026-10-17T15:00:00Z'])('원자 비교 RPC 모형: 같은 기대값 %s의 동시 요청 중 하나만 저장', async expected => {
    setup(); occupancy = { move_in_status: 'PLANNED', balance_paid_at: expected };
    let databaseValue = expected;
    rpc.mockImplementation(async (_name, args) => {
      if (args.p_expected_balance_paid_at !== databaseValue) return { data: null, error: { code: '40001', message: 'balance changed; reload' } };
      databaseValue = args.p_paid_at;
      return { data: { changed: true }, error: null };
    });
    const results = await Promise.all([saveMoveInBalancePaid(input('2026-10-19', 'A', expected)), saveMoveInBalancePaid(input('2026-10-20', 'B', expected))]);
    expect(results.filter(r => r.ok)).toHaveLength(1);
    expect(results.filter(r => !r.ok)).toMatchObject([{ code: 'stale_balance' }]);
    expect(databaseValue).toBe('2026-10-18T15:00:00.000Z');
  });
  it('기대값 누락은 NULL로 보정하지 않고 거절', async () => {
    setup(); const bad = { ...input(), expectedBalancePaidAt: undefined };
    expect(await saveMoveInBalancePaid(bad as never)).toMatchObject({ ok: false, code: 'stale_balance' });
    expect(rpc).not.toHaveBeenCalled();
  });
});
