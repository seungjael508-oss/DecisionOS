import { afterEach, describe, expect, it, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
vi.mock('server-only', () => ({}));

const access = vi.fn();
const rpc = vi.fn();
vi.mock('@/lib/move-in/access', () => ({ requireMoveInAccess: (...a: unknown[]) => access(...a) }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => ({ rpc: (...a: unknown[]) => rpc(...a) }) }));

import { saveMoveInProblemHousehold } from '@/app/projects/[projectId]/move-in/units/[unitId]/actions';
import { isProblemHousehold, isProblemLocked, normalizeProblemFlags, problemReasonText } from '@/lib/move-in/problem-household';
import { LedgerCardList } from '@/components/move-in/ledger-card-list';
import { LedgerTable } from '@/components/move-in/ledger-table';

const ID = '00000000-0000-4000-8000-000000000001';
const input = (over: Record<string, unknown> = {}) => ({ projectId: ID, unitId: ID, customerId: ID, contractId: ID, flags: ['SEIZURE'], lockReleased: false, note: '', reason: '법무팀 통보', ...over }) as never;
const admin = { ok: true, role: 'PROJECT_ADMIN' };
afterEach(() => { access.mockReset(); rpc.mockReset(); });

test('분류 정리: 알 수 없는 값 제거·중복 제거·고정 순서', () => {
  expect(normalizeProblemFlags(['TERMINATED', 'SEIZURE', 'X', 'SEIZURE', null])).toEqual(['SEIZURE', 'TERMINATED']);
  expect(normalizeProblemFlags(undefined)).toEqual([]);
  expect(problemReasonText(['LITIGATION', 'ASEL'])).toBe('소송 · 아셀');
});
test('잠금: 문제세대이면서 해제 승인 전일 때만', () => {
  expect(isProblemLocked({ problemFlags: ['D_GRADE'], problemLockReleased: false })).toBe(true);
  expect(isProblemLocked({ problemFlags: ['D_GRADE'], problemLockReleased: true })).toBe(false);
  expect(isProblemHousehold({ problemFlags: ['D_GRADE'], problemLockReleased: true })).toBe(true);
  expect(isProblemLocked({ problemFlags: [], problemLockReleased: false })).toBe(false);
});

const base = { unitId:'u1', buildingNo:'101', unitNo:'2401', currentGrade:'B', phone:'010-0000-0000', customerName:'테스트', effectiveIntent:'MOVE_IN', rentalType:null,
  funding:'NORMAL', moveIn:'BALANCE_PAID', balancePaidAt:'2026-10-20T15:00:00Z', dealTypes:[], contactStatus:'CONTACTED', lastAttempt:null, lastContact:null, assigneeId:null, specialReasons:[], dGradeReasons:[] };
test('카드·표: 문제세대는 적색 뱃지·사유, 잔금완납이어도 적색 강조가 우선', () => {
  const locked = { ...base, unitId:'p1', problemFlags:['SEIZURE','LITIGATION'], problemLockReleased:false } as never;
  const released = { ...base, unitId:'p2', problemFlags:['TERMINATED'], problemLockReleased:true } as never;
  const normal = { ...base, unitId:'n1', problemFlags:[], problemLockReleased:false } as never;
  for (const markup of [renderToStaticMarkup(createElement(LedgerCardList, { rows:[locked, released, normal], assignees:{} })), renderToStaticMarkup(createElement(LedgerTable, { rows:[locked, released, normal], assignees:{} }))]) {
    expect(markup.match(/data-problem-household="true"/g)?.length).toBe(2);
    expect(markup).toContain('[가압류]');
    expect(markup).toContain('[소송]');
    expect(markup).toContain('[계약해지]');
    expect(markup).toContain('입주잠금');
    expect(markup).toContain('해제승인');
    expect(markup).toContain('가압류 · 소송 · 입주증·이사 승인 차단');
    expect(markup).toContain('border-l-red-600');
    expect(markup).toContain('bg-red-100');
  }
});

describe('관리자 문제세대 저장', () => {
  it('관리자가 아니면 저장하지 않는다', async () => {
    access.mockResolvedValue({ ok: true, role: 'COUNSELOR' });
    expect(await saveMoveInProblemHousehold(input())).toEqual({ ok: false, message: '문제세대는 관리자만 수정할 수 있습니다.' });
    access.mockResolvedValue({ ok: true, role: 'CLIENT_MANAGER' });
    expect((await saveMoveInProblemHousehold(input())).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('사유 없음·잘못된 분류는 거절', async () => {
    access.mockResolvedValue(admin);
    expect((await saveMoveInProblemHousehold(input({ reason: ' ' }))).ok).toBe(false);
    expect((await saveMoveInProblemHousehold(input({ flags: ['UNKNOWN'] }))).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('지정: 정리된 분류·메모·사유를 RPC로', async () => {
    access.mockResolvedValue(admin); rpc.mockResolvedValue({ data: { changed: true }, error: null });
    expect(await saveMoveInProblemHousehold(input({ flags: ['ASEL', 'SEIZURE'], note: ' 등기 확인 ' }))).toEqual({ ok: true, changed: true });
    expect(rpc).toHaveBeenCalledWith('set_move_in_problem_household', expect.objectContaining({
      p_flags: ['SEIZURE', 'ASEL'], p_lock_released: false, p_note: '등기 확인', p_reason: '법무팀 통보', p_expected_contract_id: ID }));
  });
  it('해제: 분류가 없으면 해제 승인·메모도 비운다', async () => {
    access.mockResolvedValue(admin); rpc.mockResolvedValue({ data: { changed: true }, error: null });
    await saveMoveInProblemHousehold(input({ flags: [], lockReleased: true, note: '메모' }));
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_flags: [], p_lock_released: false, p_note: null });
  });
  it('계약자 변경·권한 오류 안내', async () => {
    access.mockResolvedValue(admin);
    rpc.mockResolvedValue({ data: null, error: { code: '40001', message: 'current contract changed' } });
    expect(await saveMoveInProblemHousehold(input())).toEqual({ ok: false, message: '현재 계약자가 바뀌었습니다. 새로고침 후 다시 확인해 주세요.' });
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'not authorized' } });
    expect(await saveMoveInProblemHousehold(input())).toEqual({ ok: false, message: '문제세대는 관리자만 수정할 수 있습니다.' });
  });
});
