import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

const access = vi.fn();
const rpc = vi.fn();
let occupancy: Record<string, unknown> | null = null;
let history: Record<string, unknown> | null = null;
vi.mock('@/lib/move-in/access', () => ({ requireMoveInAccess: (...a: unknown[]) => access(...a) }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    from: (table: string) => {
      const chain = { select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
        maybeSingle: async () => ({ data: table === 'unit_occupancy_status' ? occupancy : history, error: null }) };
      return chain;
    },
    rpc: (...a: unknown[]) => rpc(...a),
  }),
}));

import { saveMoveInBalancePaid } from '@/app/projects/[projectId]/move-in/units/[unitId]/actions';

const ID = '00000000-0000-4000-8000-000000000001';
const input = (paidOn: string, reason = '입주현황 검증') => ({ projectId: ID, unitId: ID, customerId: ID, contractId: ID, paidOn, reason });
const admin = { ok: true, role: 'PROJECT_ADMIN' };

afterEach(() => { access.mockReset(); rpc.mockReset(); occupancy = null; history = null; });

describe('관리자 잔금완납 저장', () => {
  it('관리자가 아니면 저장하지 않는다', async () => {
    access.mockResolvedValue({ ok: true, role: 'COUNSELOR' });
    expect(await saveMoveInBalancePaid(input('2026-10-19'))).toEqual({ ok: false, message: '잔금완납은 관리자만 수정할 수 있습니다.' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('사유 없음·미래 날짜는 거절', async () => {
    access.mockResolvedValue(admin);
    expect((await saveMoveInBalancePaid(input('2026-10-19', ' '))).ok).toBe(false);
    expect((await saveMoveInBalancePaid(input('2999-01-01'))).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('지정: 잔금완납 + 완납일(한국시간 00:00)', async () => {
    access.mockResolvedValue(admin); rpc.mockResolvedValue({ error: null });
    occupancy = { move_in_status: 'PLANNED', balance_paid_at: null, planned_move_in_date: '2026-11-01' };
    expect(await saveMoveInBalancePaid(input('2026-10-19'))).toEqual({ ok: true, changed: true });
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_move_in_status: 'BALANCE_PAID', p_balance_paid_at: '2026-10-18T15:00:00.000Z', p_reason: '입주현황 검증' });
  });
  it('입주완료 세대는 상태를 낮추지 않고 완납일만', async () => {
    access.mockResolvedValue(admin); rpc.mockResolvedValue({ error: null });
    occupancy = { move_in_status: 'MOVED_IN', balance_paid_at: null, planned_move_in_date: null };
    await saveMoveInBalancePaid(input('2026-10-19'));
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_move_in_status');
    expect(rpc.mock.calls[0][1]).toHaveProperty('p_balance_paid_at');
  });
  it('같은 완납일이면 변경 없음', async () => {
    access.mockResolvedValue(admin);
    occupancy = { move_in_status: 'BALANCE_PAID', balance_paid_at: '2026-10-18T15:00:00Z', planned_move_in_date: null };
    expect(await saveMoveInBalancePaid(input('2026-10-19'))).toEqual({ ok: true, changed: false });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('해제: 직전 입주진행으로 되돌리고 완납일 삭제', async () => {
    access.mockResolvedValue(admin); rpc.mockResolvedValue({ error: null });
    occupancy = { move_in_status: 'BALANCE_PAID', balance_paid_at: '2026-10-18T15:00:00Z', planned_move_in_date: null };
    history = { previous_value: 'DELAYED' };
    await saveMoveInBalancePaid(input(''));
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_move_in_status: 'DELAYED', p_clear_balance_paid_at: true });
  });
  it('해제: 이력이 없거나 입주예정일 없는 입주예정이면 접촉완료', async () => {
    access.mockResolvedValue(admin); rpc.mockResolvedValue({ error: null });
    occupancy = { move_in_status: 'BALANCE_PAID', balance_paid_at: null, planned_move_in_date: null };
    history = { previous_value: 'PLANNED' };
    await saveMoveInBalancePaid(input(''));
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_move_in_status: 'CONTACTED' });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_clear_balance_paid_at');
  });
});
