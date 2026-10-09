import { describe, expect, test } from 'vitest';
import { buildCreateMoveInConsultationArgs } from '@/lib/move-in/consultation';
import { ledgerCells, LEDGER_COLUMNS } from '@/lib/move-in/ledger-presentation';
const base = { projectId: 'p', unitId: 'u', customerId: 'c', consultationType: 'OUTBOUND' as const, content: '통화' };
describe('상담 저장 인자: 18인자 전용', () => {
  test.each([undefined, '', '   '])('계약 ID 누락(%s) → RPC 인자 생성 없이 거절', id => {
    expect(buildCreateMoveInConsultationArgs({ ...base, expectedContractId: id as string })).toEqual({ error: 'invalid_contract' });
  });
  test('정상: 정확히 18개 키, 빈 선택은 null', () => {
    const a = buildCreateMoveInConsultationArgs({ ...base, expectedContractId: 'k', legacyGrade: '부재', fundingStatus: '' });
    expect('error' in a).toBe(false);
    expect(Object.keys(a)).toHaveLength(18);
    expect(a).toMatchObject({ p_expected_contract_id: 'k', p_legacy_grade: '부재', p_funding_status: null, p_clear_next_contact_at: false, p_business_purpose: null });
  });
  test('내용·목적 검증 유지', () => {
    expect(buildCreateMoveInConsultationArgs({ ...base, expectedContractId: 'k', content: ' ' })).toEqual({ error: 'empty_content' });
    expect(buildCreateMoveInConsultationArgs({ ...base, expectedContractId: 'k', purpose: '임의' })).toEqual({ error: 'invalid_purpose' });
  });
});
test('기존 상담거절 등급값은 확인필요로 표시', () => {
  const row = { buildingNo:'1', unitNo:'1', currentGrade:'상담거절', phone:null, customerName:null, effectiveIntent:'UNDECIDED', rentalType:null, funding:null, moveIn:null, dealTypes:[], contactStatus:'CONTACTED', lastContact:null, lastAttempt:null, assigneeId:null, specialReasons:[] } as never;
  expect(ledgerCells(row, {})[LEDGER_COLUMNS.indexOf('현재등급')]).toBe('확인필요 (기존 상담거절)');
});
