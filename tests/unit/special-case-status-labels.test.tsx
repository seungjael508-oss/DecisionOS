import { describe, expect, test } from 'vitest';
import {
  LEGAL_CONSULTATION_STATUS_VALUES, PROCESSING_STATUS_VALUES,
  legalConsultationStatusLabel, processingStatusLabel,
} from '@/lib/move-in/special-case';

describe('특별관리 상태 한글 표시', () => {
  test('요청 지정값', () => {
    expect(legalConsultationStatusLabel('NOT_REQUIRED')).toBe('협의 불필요');
    expect(processingStatusLabel('OPEN')).toBe('미처리');
  });
  test('DB enum 전 값에 한글명이 있고 영문이 그대로 노출되지 않음', () => {
    for (const v of LEGAL_CONSULTATION_STATUS_VALUES) expect(legalConsultationStatusLabel(v)).toMatch(/[가-힣]/);
    for (const v of PROCESSING_STATUS_VALUES) expect(processingStatusLabel(v)).toMatch(/[가-힣]/);
  });
  test('enum 값 목록(저장 payload)은 변경 없음', () => {
    expect([...LEGAL_CONSULTATION_STATUS_VALUES]).toEqual(['NOT_REQUIRED', 'REQUESTED', 'IN_REVIEW', 'COMPLETED']);
    expect([...PROCESSING_STATUS_VALUES]).toEqual(['OPEN', 'IN_PROGRESS', 'WAITING_EXTERNAL', 'COMPLETED']);
  });
  test('알 수 없는 값은 추정하지 않고 원문, 빈값은 —', () => {
    expect(processingStatusLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(legalConsultationStatusLabel(null)).toBe('—');
  });
});
