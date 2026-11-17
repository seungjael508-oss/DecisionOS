// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
const saveAction = vi.fn(), refreshAction = vi.fn();
vi.mock('@/app/projects/[projectId]/move-in/ledger/save-actions', () => ({ saveLedgerUnit: (...args: unknown[]) => saveAction(...args), refreshLedgerUnit: (...args: unknown[]) => refreshAction(...args) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
import { BalancePaidEditor } from '@/components/move-in/balance-paid-editor';
import { LedgerSummaryProvider, useLedgerSummaryResult } from '@/components/move-in/ledger-summary-store';
import { UnitSaveProvider, useUnitSave } from '@/components/move-in/unit-save-context';
import type { LedgerClientRow, ProjectionResult } from '@/lib/move-in/ledger-types';
import type { UnitWorkspace } from '@/lib/move-in/unit-workspace-types';

const P = '00000000-0000-4000-8000-000000000001';
const row = { projectId: P, unitId: P, currentContractId: P, currentCustomerId: P, moveIn: 'PLANNED', balancePaidAt: null } as LedgerClientRow;
const result = { error: false, rows: [row], snapshotAsOf: '2026-11-05', anomalyCount: 0, anomalies: {}, queryCounts: {} } as ProjectionResult<LedgerClientRow>;
const workspace = { projectId: P, detail: { unitId: P }, identity: { contractId: P, customerId: P }, capabilities: { saveEnabled: true } } as UnitWorkspace;
let saving: ReturnType<typeof useUnitSave> = null;
function Capture() { const value = useUnitSave(); useEffect(() => { saving = value; }, [value]); return null; }
function Current() { const current = useLedgerSummaryResult(P, result); return <p data-testid="current">{current.rows[0].moveIn}</p>; }
function mount(paidAt: string | null = null) { const refreshed = vi.fn(); render(<LedgerSummaryProvider><Current /><UnitSaveProvider workspace={workspace} returnTo={`/projects/${P}/move-in/ledger`} onRefreshed={refreshed}><Capture /><BalancePaidEditor projectId={P} unitId={P} customerId={P} contractId={P} moveIn={paidAt ? 'BALANCE_PAID' : 'PLANNED'} balancePaidAt={paidAt} remainder={null} /></UnitSaveProvider></LedgerSummaryProvider>); return refreshed; }
async function submit() { fireEvent.change(screen.getByLabelText('잔금 완납일'), { target: { value: '2026-10-19' } }); fireEvent.change(screen.getByLabelText('변경 사유'), { target: { value: '검증' } }); await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^(잔금완납 지정|완납일 수정)$/ })); }); }
afterEach(() => { cleanup(); saveAction.mockReset(); refreshAction.mockReset(); saving = null; });
it('화면에서 선택한 새 날짜와 별개로 조회 당시 완납일을 기대값으로 전달', async () => {
  saveAction.mockResolvedValue({ ok: false, code: 'stale_balance', committed: false });
  mount('2026-10-17T15:00:00.000Z'); await submit();
  expect(saveAction.mock.calls[0][0].change.input).toMatchObject({ paidOn: '2026-10-19', expectedBalancePaidAt: '2026-10-17T15:00:00.000Z' });
});
it.each(['40001 충돌', '23503 계약 불일치', 'RPC 오류'])('%s에서 성공 UI·원장 갱신 없이 입력 유지, 재저장 차단', async () => {
  saveAction.mockResolvedValue({ ok: false, code: 'save_failed', committed: 'unknown' });
  const refreshed = mount(); await submit();
  expect(saveAction).toHaveBeenCalledTimes(1); expect(saveAction.mock.calls[0][0].change.kind).toBe('balancePaid');
  expect(saveAction.mock.calls[0][0].change.input.expectedBalancePaidAt).toBeNull();
  expect(screen.getByTestId('current').textContent).toBe('PLANNED'); expect(refreshed).not.toHaveBeenCalled(); expect(saving?.blocked).toBe(true);
  expect((screen.getByLabelText('변경 사유') as HTMLInputElement).value).toBe('검증');
});
it('완납 충돌은 최신 데이터 조회를 요구하며 재조회만으로 차단 해제', async () => {
  saveAction.mockResolvedValue({ ok: false, code: 'stale_balance', committed: false });
  refreshAction.mockResolvedValue({ ok: true, workspace, row });
  const refreshed = mount(); await submit();
  expect(saving?.blocked).toBe(true); expect(screen.getByText(/완납 정보가 변경되어 저장하지 않았습니다/)).toBeTruthy();
  expect(refreshed).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '저장 결과 다시 확인' })); });
  expect(refreshAction).toHaveBeenCalledTimes(1); expect(saveAction).toHaveBeenCalledTimes(1); expect(saving?.blocked).toBe(false);
});
it('통신 응답 유실은 성공으로 간주하지 않고 재저장 차단', async () => {
  saveAction.mockRejectedValue(new Error('network')); const refreshed = mount(); await submit();
  expect(saving?.blocked).toBe(true); expect(refreshed).not.toHaveBeenCalled(); expect(refreshAction).not.toHaveBeenCalled();
  expect(screen.getByTestId('current').textContent).toBe('PLANNED');
});
it('DB 저장 후 조회 실패는 재조회만 수행하고 RPC 저장을 재실행하지 않음', async () => {
  saveAction.mockResolvedValue({ ok: false, code: 'refresh_failed', committed: true });
  refreshAction.mockResolvedValue({ ok: true, workspace, row: { ...row, moveIn: 'BALANCE_PAID' } });
  const refreshed = mount(); await submit(); expect(saving?.blocked).toBe(true); expect(refreshed).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '저장 결과 다시 확인' })); });
  expect(saveAction).toHaveBeenCalledTimes(1); expect(refreshAction).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('current').textContent).toBe('BALANCE_PAID'); expect(saving?.blocked).toBe(false);
});
