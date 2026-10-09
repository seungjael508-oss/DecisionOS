import { LEDGER_BLANK, type LedgerAxis, type LedgerStatePatch } from '@/lib/move-in/ledger-filters';
import type { LedgerSummaryRow } from '@/lib/move-in/ledger-types';
import { FUNDING_STATUS_LABELS, MOVE_IN_STATUS_LABELS, OPERATIONAL_INTENT_LABELS, OCCUPANCY_INTENT_LABELS, formatUnitLabel, formatDateTime } from '@/lib/move-in/labels';
import { SPECIAL_REASON_LABELS } from '@/lib/move-in/intent';

export const LEDGER_COLUMNS = ['동/호수','현재등급','전화번호','납부내역/잔금','계약자','입주의향','자금/대출','입주진행','매매/임대','접촉상태','최종접촉','최근시도','담당자','특별관리','금전소비대차','입주예약','이사예정일','문제세대','관리사유'] as const;
export const LEDGER_AXIS_LABELS: Record<LedgerAxis,string> = {building:'동',unit:'호수',customer:'계약자',phone:'전화번호',grade:'현재등급',intent:'입주의향',funding:'자금/대출',moveIn:'입주진행',assignee:'담당자',specialReason:'특별관리',nextContact:'다음접촉',contactStatus:'접촉상태',deal:'매매/임대',payment:'납부상태',loanAgreement:'금전소비대차',moveReservation:'입주예약',problemHousehold:'문제세대'};
export const CONTACT_STATUS_LABELS: Record<string,string> = {CONTACTED:'접촉',ABSENT:'부재',NONE:'미접촉'};
// 부재·상담거절은 접촉 결과로 분리. 기존에 등급값으로 저장된 세대는 원본 확인 전까지 A~D로 바꾸지 않고 확인필요로만 표시
const CONTACT_RESULT_GRADES = new Set(['부재','상담거절']);
function gradeLabel(grade: string | null) { return grade && CONTACT_RESULT_GRADES.has(grade) ? `확인필요 (기존 ${grade})` : grade ?? '미등록'; }
const reasonLabels: Record<string,string> = {...SPECIAL_REASON_LABELS, ASEL:'아셀',INVESTOR:'투자',DELINQUENT:'연체자'};
const intentLabels: Record<string,string> = {...OPERATIONAL_INTENT_LABELS,...OCCUPANCY_INTENT_LABELS,RENT:'임대(전체)'};
function lookup(labels: Record<string,string>, value: string | null) { return value ? labels[value] ?? value : '미등록'; }
export function assigneeLabel(id: string | null, names: Record<string,string>) { return id ? names[id] || `이름 미등록 · ${id.slice(0,8)}` : '미배정'; }

/** Presentation of server-resolved fields only. Never resolves grade, intent or reasons. */
export function ledgerCells(row: LedgerSummaryRow, assignees: Record<string,string>): string[] {
  return [formatUnitLabel(row.buildingNo,row.unitNo),gradeLabel(row.currentGrade),row.phone || '미등록','납부정보 미등록',
    row.customerName || '미등록', row.effectiveIntent === 'RENT' ? row.rentalType ? lookup(OCCUPANCY_INTENT_LABELS,row.rentalType) : '임대(유형 확인 필요)' : lookup(OPERATIONAL_INTENT_LABELS,row.effectiveIntent),
    row.funding === 'NORMAL' ? `${FUNDING_STATUS_LABELS.NORMAL} (기존)` : lookup(FUNDING_STATUS_LABELS,row.funding),
    lookup(MOVE_IN_STATUS_LABELS,row.moveIn),row.dealTypes.map(v=>lookup(OCCUPANCY_INTENT_LABELS,v)).join(' · ') || '—',
    // lastContact는 서버에서 현재 ACTIVE 계약자 상담만 채택(이전 계약자 기록은 occupancy 값으로 대체)
    // 다음접촉은 열에서만 제외. nextContact 필터·정렬·DB 값은 그대로 유지
    CONTACT_STATUS_LABELS[row.contactStatus] ?? '미접촉',formatDateTime(row.lastContact),formatDateTime(row.lastAttempt),assigneeLabel(row.assigneeId,assignees),row.specialReasons.map(v=>lookup(reasonLabels,v)).join(' · ') || '—',
    sourceTarget(row.management?.loanAgreement),reservationLabel(row.management?.moveReservation),row.management?.movingDate || '—',
    sourceTarget(row.management?.problemHousehold),row.management?.managementReasons.join(' · ') || '—'];
}
function sourceTarget(value: string | undefined) { return value==='TARGET'?'대상':value==='NOT_TARGET'?'—':'원천 확인필요'; }
function reservationLabel(value: string | undefined) { return value==='BOOKED'?'예약완료':value==='CANCELLED'?'예약취소':value==='NONE'?'—':'원천 확인필요'; }
function preset(label: string, axis: LedgerAxis, value: string): {label:string;patch:LedgerStatePatch} {
  return {label,patch:{axes:{[axis]:{include:[value],exclude:[]}}}};
}
export const QUICK_LEDGER_FILTERS = [preset('C','grade','C'),preset('D','grade','D'),preset('대출필요','funding','LOAN_NEEDED'),preset('대출한도부족','funding','LOAN_LIMIT_SHORTAGE'),
  preset('매매','intent','SALE_TRANSFER'),preset('전세/월세','intent','RENT'),preset('특별관리','specialReason','all'),preset('오늘재콜','nextContact','TODAY'),preset('미확정','intent','UNDECIDED')];

export function ledgerOptionLabel(axis: LedgerAxis, value: string, assignees: Record<string,string>): string {
  if(axis==='loanAgreement'||axis==='problemHousehold')return value==='TARGET'?'대상':value==='NOT_TARGET'?'비대상':value==='UNKNOWN'?'원천 확인필요':'빈값';
  if(axis==='moveReservation')return value==='NONE'?'미예약':reservationLabel(value);
  if(value===LEDGER_BLANK)return '빈값';
  if(axis==='contactStatus')return CONTACT_STATUS_LABELS[value] ?? value;
  if(axis==='grade'&&CONTACT_RESULT_GRADES.has(value))return gradeLabel(value);
  if(axis==='intent')return lookup(intentLabels,value);
  if(axis==='funding')return value==='NORMAL'?'정상 (기존)':lookup(FUNDING_STATUS_LABELS,value);
  if(axis==='moveIn')return lookup(MOVE_IN_STATUS_LABELS,value);
  if(axis==='specialReason')return value==='all'?'특별관리 전체':lookup(reasonLabels,value);
  if(axis==='deal')return lookup(OCCUPANCY_INTENT_LABELS,value);
  if(axis==='payment' && value==='UNREGISTERED')return '납부정보 미등록';
  if(axis==='nextContact')return lookup({TODAY:'오늘',OVERDUE:'지난 일정',FUTURE:'향후 일정'},value);
  if(axis==='assignee')return assigneeLabel(value,assignees);
  return value;
}
/** Option discovery only, not filtering or current-state inference. */
export function ledgerOptions(rows: readonly LedgerSummaryRow[], axis: LedgerAxis, assignees: Record<string,string>) {
  if(axis==='loanAgreement'||axis==='problemHousehold')return ['TARGET','NOT_TARGET','UNKNOWN'].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)}));
  if(axis==='moveReservation')return ['BOOKED','CANCELLED','NONE','UNKNOWN'].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)}));
  if(axis==='contactStatus')return ['CONTACTED','ABSENT','NONE'].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)}));
  const values=new Set<string>([LEDGER_BLANK]);
  if(axis==='nextContact') for(const v of ['TODAY','OVERDUE','FUTURE']) values.add(v);
  else for(const row of rows) {
    const list=axis==='intent' ? [row.effectiveIntent,...(row.rentalType?[row.rentalType]:[])] : axis==='specialReason'? row.specialReasons : axis==='deal'?row.dealTypes :
      [{building:row.buildingNo,unit:row.unitNo,customer:row.customerName,phone:row.phone,grade:row.currentGrade,funding:row.funding,moveIn:row.moveIn,assignee:row.assigneeId,payment:row.payment}[axis]];
    for(const value of list) if(value?.trim()) values.add(value);
  }
  return [...values].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)})).sort((a,b)=>a.value===LEDGER_BLANK?-1:b.value===LEDGER_BLANK?1:a.label.localeCompare(b.label,'ko',{numeric:true}));
}
