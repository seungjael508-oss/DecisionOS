// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ConsultationHistory } from '@/components/move-in/consultation-history';
import type { ConsultationHistoryRow } from '@/lib/move-in/queries';
Object.assign(globalThis,{React});
it('shows the original counselor for imported history instead of the importing administrator',()=>{
 const row: ConsultationHistoryRow & {legacyImported:boolean;legacyCounselorName:string}={id:'synthetic-history',consultedAt:'2026-08-01T01:00:00Z',contactType:'CALL',purpose:'OUTBOUND',content:'익명 상담 내용',nextActionAt:null,counselorId:'admin',legacyGrade:'B',legacyImported:true,legacyCounselorName:'원본 상담사'};
 render(<ConsultationHistory rows={[row]} currentMemberId="admin"/>);
 expect(screen.getByText(/원본 상담사/)).toBeTruthy();
 expect(screen.getByText(/이관 기록/)).toBeTruthy();
 expect(screen.queryByText(/나 ·/)).toBeNull();
});

it('shows legacy unknown channel and historical holder without interpreting purpose',()=>{
 const row: ConsultationHistoryRow={id:'synthetic-old',consultedAt:'2026-08-01T01:00:00Z',contactType:'CONSULTATION',purpose:'OUTBOUND',content:'Synthetic private content',nextActionAt:null,counselorId:'importer',legacyGrade:'D',legacyImported:true,legacyCounselorName:'Original agent',previousHolder:true,sourceHolder:'Synthetic previous holder'};
 render(<ConsultationHistory rows={[row]} currentMemberId="member"/>);
 expect(screen.getByText(/채널 미확인/)).toBeTruthy();
 expect(screen.getByText('이전 계약자 상담')).toBeTruthy();
 expect(screen.getByText(/이관 당시 계약자: Synthetic previous holder/)).toBeTruthy();
 expect(screen.getByText('Synthetic private content')).toBeTruthy();
});
