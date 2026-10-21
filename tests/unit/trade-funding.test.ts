import { describe, expect, test } from 'vitest';
import { applyLedgerQuery, parseLedgerQuery, type LedgerFilterRow } from '@/lib/move-in/ledger-filters';
import { ledgerOptions } from '@/lib/move-in/ledger-presentation';
import { summarizeTradeFunding, tradeFundingFilterValues, tradeFundingTodo, type TradeFundingStatus, type TradeFundingType } from '@/lib/move-in/trade-funding';
import type { LedgerClientRow } from '@/lib/move-in/ledger-types';

const now = new Date('2026-10-20T03:00:00Z');
function row(unitId: string, grade: string | null, intent: string, type: TradeFundingType | null, status: TradeFundingStatus | null, dealTypes: string[] = []): LedgerFilterRow {
  return {
    unitId, buildingNo: '101', unitNo: unitId, currentGrade: grade, customerName: null, phone: null, assigneeId: null,
    effectiveIntent: intent, rentalType: null, funding: 'UNKNOWN', moveIn: null, nextContact: null,
    specialReasons: [], specialPriority: null, dealTypes, payment: null, balance: null, views: [],
    tradeFundingType: type, tradeFundingStatus: status,
  };
}
const rows = [
  row('1', 'D', 'SALE_TRANSFER', 'BALANCE_SHORTAGE', 'CANDIDATE', ['SALE']),
  row('2', 'C', 'RENT', 'BALANCE_SHORTAGE', 'CONFIRMED', ['JEONSE']),
  row('3', 'C', 'SALE_TRANSFER', 'LOAN_REQUIRED', 'CANDIDATE', ['SALE']),
  row('4', 'D', 'RENT', null, null, ['MONTHLY_RENT']),          // 거래 의향, 자금 방식 미확인
  row('5', 'C', 'MOVE_IN', null, null),                          // 거래 의향 없음 → 대상 아님
  row('6', 'A', 'SALE_TRANSFER', 'OWN_FUNDS_AFTER_BALANCE', 'CONFIRMED', ['SALE']), // 등급이 바뀐 세대: 분류는 남지만 C·D 집계 제외
  row('7', 'D', 'SALE_TRANSFER', 'OWN_FUNDS_AFTER_BALANCE', 'CONFIRMED', ['SALE']),
];
const ids = (query: string) => applyLedgerQuery(rows, parseLedgerQuery(new URLSearchParams(query)), now).filteredSorted.map(r => r.unitId);

describe('거래 자금유형 필터 값', () => {
  test('저장 유형 + 후보 표시, 미분류 거래 의향 = 미확인, 그 외 없음', () => {
    expect(tradeFundingFilterValues(rows[0])).toEqual(['BALANCE_SHORTAGE', 'CANDIDATE']);
    expect(tradeFundingFilterValues(rows[1])).toEqual(['BALANCE_SHORTAGE']);
    expect(tradeFundingFilterValues(rows[3])).toEqual(['UNCONFIRMED']);
    expect(tradeFundingFilterValues(rows[4])).toEqual([]);
  });
});

describe('원장·오늘 관리 필터', () => {
  test('유형별', () => {
    expect(ids('tradeFunding=OWN_FUNDS_AFTER_BALANCE')).toEqual(['6', '7']);
    expect(ids('tradeFunding=BALANCE_SHORTAGE')).toEqual(['1', '2']);
    expect(ids('tradeFunding=LOAN_REQUIRED')).toEqual(['3']);
    expect(ids('tradeFunding=UNCONFIRMED')).toEqual(['4']);
    expect(ids('tradeFunding=CANDIDATE')).toEqual(['1', '3']);
  });
  test('축 안은 OR', () => {
    expect(ids('tradeFunding=LOAN_REQUIRED,UNCONFIRMED')).toEqual(['3', '4']);
  });
  test('C·D는 현재 등급 기준(등급 필터와 AND)', () => {
    expect(ids('grade=C,D&tradeFunding=OWN_FUNDS_AFTER_BALANCE')).toEqual(['7']);
  });
  test('전매·전세·월세(매매/임대 축)와 AND 조합', () => {
    expect(ids('deal=SALE&tradeFunding=BALANCE_SHORTAGE')).toEqual(['1']);
    expect(ids('deal=JEONSE,MONTHLY_RENT&tradeFunding=BALANCE_SHORTAGE,UNCONFIRMED')).toEqual(['2', '4']);
  });
  test('필터 선택지 = 5개 분류 + 빈값', () => {
    expect(ledgerOptions(rows as LedgerClientRow[], 'tradeFunding', {}).map(o => o.label)).toEqual([
      '자기자금 잔금 납부 후 거래', '잔금 부족으로 거래 추진', '대출 후 잔금 납부·거래', '미확인', '상담 확인 전 후보', '해당 없음(거래 의향·분류 없음)',
    ]);
  });
});

describe('분류별 세대 수·후속관리', () => {
  test('C·D 현재 등급 세대만, 세대 단위 집계', () => {
    expect(summarizeTradeFunding([...rows, rows[0]])).toEqual({
      targets: 5, OWN_FUNDS_AFTER_BALANCE: 1, BALANCE_SHORTAGE: 2, LOAN_REQUIRED: 1, UNCONFIRMED: 1, CANDIDATE: 2,
    });
  });
  test('유형별 관리 규칙(대출 필요와 승인 상태 혼동 없음)', () => {
    expect(tradeFundingTodo(rows[0])).toBe('자금유형 후보 상담 확인 · 부족액·매수자·임차인 확보 확인');
    expect(tradeFundingTodo(rows[2])).toBe('자금유형 후보 상담 확인 · 대출 상담·승인 여부·잔금 예정일 확인');
    expect(tradeFundingTodo(rows[6])).toBe('잔금 준비일·거래 진행 확인');
    expect(tradeFundingTodo(rows[3])).toBe('자금조달 방식 재상담');
    expect(tradeFundingTodo(rows[4])).toBeNull();
    expect(tradeFundingTodo(rows[5])).toBeNull();
  });
});
