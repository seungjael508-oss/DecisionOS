import { expect, test } from 'vitest';
import { resolveConsultationScheduleBadge, type ScheduleContact } from '@/lib/move-in/consultation-schedule';
const identity = {projectId:'p',unitId:'u',currentCustomerId:'c',currentGrade:'A',balancePaidAt:null,actualMoveInDate:null,fieldConfirmedBalancePaid:false};
const now = new Date('2026-11-16T12:00:00Z');
const note = (content:string, at='2026-11-15T03:00:00Z', id='n'): ScheduleContact => ({project_id:'p',unit_id:'u',customer_id:'c',id,consulted_at:at,content});
const badge = (content:string, patch={}) => resolveConsultationScheduleBadge({...identity,...patch},[note(content)],now);
test.each([
 ['잔금 12/20 예정, 계약자 입주 12/25 예정',{kind:'balance',label:'잔금 12/20'}],
 ['본인 입주 예정일 12월 25일',{kind:'moveIn',label:'입주 12/25'}],
 ['잔금 12월 말 예정',{kind:'balance',label:'잔금 12월 말'}],
 ['계약자 입주 3~4월 예정',{kind:'moveIn',label:'입주 3~4월'}],
 ['잔금 12월 예정',{kind:'balance',label:'잔금 12월'}],
 ['2026년 12월 20일 잔금 납부 예정',{kind:'balance',label:'잔금 12/20'}],
 ['잔금 예정일: 2026-12-20',{kind:'balance',label:'잔금 12/20'}],
 ['잔금 2026.12.20 예정',{kind:'balance',label:'잔금 12/20'}],
 ['일반 문의',null],['상담일 11/15, 잔금일 미정',null],
 ['잔금 12월 말쯤 예상',null],['잔금 12/20 가능할 듯',null],
 ['잔금 12/20 또는 12/25',null],['잔금 12/20 예정인가요?',null],
 ['대출 실행일 12/20 예정',null],['대출 12/20 실행 후 잔금 예정',null],
 ['전세 임차인 입주 12/20 예정',null],['세입자 입주 12/20 예정',null],
 ['잔금 2/30 예정',null],['잔금 13/01 예정',null],['잔금 2025-12-20 예정',null],
 ['잔금 12/20 취소',null],['입주 12/20 연기되어 미정',null],
 ['잔금 12/20에서 12/28로 변경',{kind:'balance',label:'잔금 12/28'}],
 ['잔금 12/20 취소, 잔금 12/28 예정',{kind:'balance',label:'잔금 12/28'}],
] as const)('%s', (content, expected)=>expect(badge(content)).toEqual(expected));
test('paid suppresses balance but allows a known owner move-in fallback',()=>{
 expect(badge('잔금 12/20 예정, 입주 12/25 예정',{balancePaidAt:'2026-11-10'})).toEqual({kind:'moveIn',label:'입주 12/25'});
 expect(badge('잔금 12/20 예정',{fieldConfirmedBalancePaid:true})).toBeNull();
});
test.each(['B','C','D',null])('non-A %s has no badge',currentGrade=>expect(badge('잔금 12/20 예정',{currentGrade})).toBeNull());
test('completed owner move-in is not shown as a future move-in plan',()=>expect(badge('입주 12/25 예정',{actualMoveInDate:'2026-11-10'})).toBeNull());
test('newer unrelated contact preserves a prior schedule',()=>{
 expect(resolveConsultationScheduleBadge(identity,[note('잔금 12/20 예정'),note('전화 연결 안 됨','2026-11-16T01:00:00Z','new')],now)).toEqual({kind:'balance',label:'잔금 12/20'});
});
test.each(['잔금 일정 취소','잔금일 변경, 날짜 미정','기존 일정 모두 취소','일정 변경, 추후 연락'])('newer %s blocks stale schedule',text=>{
 expect(resolveConsultationScheduleBadge(identity,[note('잔금 12/20 예정'),note(text,'2026-11-16T01:00:00Z','new')],now)).toBeNull();
});
test('cancelled balance can fall back to independent owner move-in',()=>{
 expect(resolveConsultationScheduleBadge(identity,[note('잔금 12/20 예정, 입주 12/25 예정'),note('잔금 취소','2026-11-16T01:00:00Z','new')],now)).toEqual({kind:'moveIn',label:'입주 12/25'});
});
test('new explicit replacement wins without reusing the old date',()=>{
 expect(resolveConsultationScheduleBadge(identity,[note('잔금 12/20 예정'),note('잔금 12/28로 변경','2026-11-16T01:00:00Z','new')],now)).toEqual({kind:'balance',label:'잔금 12/28'});
});
test('foreign project, unit, old customer and future-dated notes are excluded',()=>{
 const contacts=[{...note('잔금 12/20 예정'),project_id:'other'},{...note('잔금 12/20 예정'),unit_id:'other'},{...note('잔금 12/20 예정'),customer_id:'old'},note('잔금 12/20 예정','2026-11-17T00:00:00Z')];
 expect(resolveConsultationScheduleBadge(identity,contacts,now)).toBeNull();
});
test('conflicting same-time notes do not choose arbitrary id or an older date',()=>{
 expect(resolveConsultationScheduleBadge(identity,[note('잔금 12/20 예정','2026-11-14T00:00:00Z'),note('잔금 12/25 예정'),note('잔금 12/28 예정',undefined,'other')],now)).toBeNull();
});
test('only the narrow badge DTO is returned and source data stays unchanged',()=>{
 const contacts=[note('잔금 12/20 예정, 비공개 상담 메모')],before=JSON.stringify(contacts);
 const result=resolveConsultationScheduleBadge(identity,contacts,now);
 expect(Object.keys(result!)).toEqual(['kind','label']);expect(JSON.stringify(result)).not.toContain('메모');expect(JSON.stringify(contacts)).toBe(before);
});
test.each(['11/16 상담 잔금 문의','잔금 12/20 또는 1월 초','잔금 12월 20일경','잔금 12/20 아직 확정되지 않음','12/20 잔금 / 12/25 입주'])('does not manufacture date ownership: %s',text=>expect(badge(text)).toBeNull());
test('a newer correction identifying a tenant date blocks a formerly owner-labelled plan',()=>{
 expect(resolveConsultationScheduleBadge(identity,[note('계약자 입주 12/20 예정'),note('기존 입주일은 임차인 일정으로 정정','2026-11-16T01:00:00Z','new')],now)).toBeNull();
});
test('explicit day range preserves a range instead of selecting one endpoint',()=>expect(badge('잔금 12/20~12/25 예정')).toEqual({kind:'balance',label:'잔금 12/20~12/25'}));
test.each(['잔금 12/20 납부 완료','입주 12/20 완료','잔금 완납 12/20','잔금 12/20 변경','입주 12/20 연기'])('past/completed or unspecified revised plan is not a schedule: %s',text=>expect(badge(text)).toBeNull());
test('invalid consulted timestamps fail closed without selecting an older plan',()=>expect(resolveConsultationScheduleBadge(identity,[note('잔금 12/20 예정'),note('잔금 취소','invalid')],now)).toBeNull());
test.each(['잔금 12월 초~중순 예정','잔금 12월 중/말 예정','잔금 3~4월 초 예정','입주 상담 12/20 예정','잔금 상담 12/20 예정','잔금 통화 12/20 예정'])('unsupported precision or consultation-owned dates are never truncated: %s',text=>expect(badge(text)).toBeNull());
