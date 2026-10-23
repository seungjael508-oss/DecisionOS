import { LEDGER_BLANK, type LedgerAxis, type LedgerStatePatch } from '@/lib/move-in/ledger-filters';
import type { LedgerClientRow, LedgerFinance, LedgerFinancePart } from '@/lib/move-in/ledger-types';
import { FUNDING_STATUS_LABELS, MOVE_IN_STATUS_LABELS, OPERATIONAL_INTENT_LABELS, OCCUPANCY_INTENT_LABELS, formatUnitLabel, formatDateTime } from '@/lib/move-in/labels';
import { SPECIAL_REASON_LABELS } from '@/lib/move-in/intent';
import { D_GRADE_REASONS, D_GRADE_REASON_LABELS } from '@/lib/move-in/d-grade-reasons';
import { TRADE_FUNDING_FILTER_LABELS, TRADE_FUNDING_FILTER_VALUES } from '@/lib/move-in/trade-funding';

export const LEDGER_COLUMNS = ['동/호수','현재등급','전화번호','납부상태','계약자','계약자 주소','아파트 분양금액','발코니 확장금액','추가옵션금액','분양대금 실납입액','아파트 분양 잔금','발코니 납부액','발코니 미납액','옵션 납부액','옵션 미납액','전체 미납액','연체 여부','은행명','가상계좌번호','계좌 용도','입주의향','자금/대출','입주진행','매매/임대','접촉상태','최종접촉','최근시도','담당자','특별관리','금전소비대차','입주예약','이사예정일','문제세대','관리사유'] as const;
// 최종접촉이 마지막 시도 시각이 되면서 최근시도와 대부분 같아 기본 화면에서만 숨김(값·인쇄·엑셀은 유지)
export const LEDGER_SCREEN_HIDDEN_COLUMNS: ReadonlySet<string> = new Set(['최근시도']);
export const LEDGER_AXIS_LABELS: Record<LedgerAxis,string> = {building:'동',unit:'호수',customer:'계약자',phone:'전화번호',grade:'현재등급',dGradeReason:'D등급 관리사유',intent:'입주의향',funding:'자금/대출',moveIn:'입주진행',assignee:'담당자',specialReason:'특별관리',nextContact:'다음접촉',contactStatus:'접촉상태',deal:'매매/임대',tradeFunding:'거래 자금유형',payment:'납부상태',loanAgreement:'금전소비대차',moveReservation:'입주예약',problemHousehold:'문제세대',online:'온라인 매물'};
// 부재 = 결번·미수신·연락불능 등 부재성 상태 전체(contact-outcome). 횟수별로 나누지 않는다
export const CONTACT_STATUS_LABELS: Record<string,string> = {CONTACTED:'접촉완료',ABSENT:'부재',REFUSED:'상담거절',NONE:'미접촉'};
// 부재·상담거절은 접촉 결과로 분리. 기존에 등급값으로 저장된 세대는 원본 확인 전까지 A~D로 바꾸지 않고 확인필요로만 표시
const CONTACT_RESULT_GRADES = new Set(['부재','상담거절']);
function gradeLabel(grade: string | null) { return grade && CONTACT_RESULT_GRADES.has(grade) ? `확인필요 (기존 ${grade})` : grade ?? '미등록'; }
const reasonLabels: Record<string,string> = {...SPECIAL_REASON_LABELS, ASEL:'아셀',INVESTOR:'투자',DELINQUENT:'연체자'};
const intentLabels: Record<string,string> = {...OPERATIONAL_INTENT_LABELS,...OCCUPANCY_INTENT_LABELS,RENT:'임대(전체)'};
function lookup(labels: Record<string,string>, value: string | null) { return value ? labels[value] ?? value : '미등록'; }
// 납부상태. 미확인 = 분양대금 결속 불일치·자료 없음 또는 확인된 금액만으로 완납을 단정할 수 없음
export const PAYMENT_STATUS_LABELS: Record<string,string> = {PAID:'완납',PARTIAL:'일부 납부',UNPAID:'미납',OVERDUE:'연체',UNKNOWN:'미확인'};
const won = (value: number | null | undefined) => typeof value === 'number' ? `${value.toLocaleString('ko-KR')}원` : '미확인';
const partPaid = (value: LedgerFinancePart | null | undefined) => value ? `${won(value.paid)}${value.excess ? ' (초과입금·미환불 확인 필요)' : ''}` : '미확인';
const partUnpaid = (value: LedgerFinancePart | null | undefined) => value ? won(value.unpaid) : '미확인';
function paymentStatus(finance: LedgerFinance | undefined) {
  if (!finance) return '미확인';
  return `${PAYMENT_STATUS_LABELS[finance.status] ?? '미확인'}${finance.partial && finance.status !== 'UNKNOWN' ? ' (발코니·옵션 일부 미확인)' : ''}`;
}
function totalUnpaid(finance: LedgerFinance | undefined) {
  if (!finance || finance.totalUnpaid === null) return '미확인';
  return `${won(finance.totalUnpaid)}${finance.partial ? ' (확인된 금액만)' : ''}`;
}
function overdueLabel(finance: LedgerFinance | undefined) {
  if (!finance || finance.status === 'UNKNOWN' && finance.totalUnpaid === null) return '미확인';
  return finance.status === 'OVERDUE' ? '연체' : finance.partial ? '없음(일부 미확인)' : '없음';
}
// 분양 잔금 전용 가상계좌. 권한이 없으면 서버가 값을 보내지 않는다(화면·인쇄·엑셀 동일)
function accountCells(finance: LedgerFinance | undefined): [string, string, string] {
  if (!finance || finance.accountRestricted) return ['권한 없음', '권한 없음', '—'];
  return finance.account ? [finance.account.bank, finance.account.number, '아파트 분양 잔금 전용'] : ['미확인', '미확인', '—'];
}
/** 잔금완납 강조 기준: 입주진행 잔금완납, 잔금 완납일 있음(평면도 태그와 같음), 또는 금액 자료상 납부상태 완납 */
export function isBalancePaid(row: Pick<LedgerClientRow,'moveIn'|'balancePaidAt'> & Partial<Pick<LedgerClientRow,'finance'>>) {
  return row.moveIn === 'BALANCE_PAID' || Boolean(row.balancePaidAt) || row.finance?.status === 'PAID';
}
/** 이사예약 표시 기준: 예약현황 원천에서 예약완료(취소·실패 제외) */
export function isMoveReserved(row: Pick<LedgerClientRow,'management'>) { return row.management?.moveReservation === 'BOOKED'; }
/** 잔금완납 세대에 금액 자료상 미납이 남았을 때만 '잔여 N원'. 없거나 미확인이면 null */
export function balancePaidRemainder(row: Pick<LedgerClientRow,'finance'>) {
  const unpaid = row.finance?.totalUnpaid;
  return typeof unpaid === 'number' && unpaid > 0 ? `잔여 ${won(unpaid)}` : null;
}
/** 이름은 project_member.display_name(일괄 조회). 없거나 조회 불가면 '담당상담사' — member ID는 표시하지 않는다 */
export function assigneeLabel(id: string | null, names: Record<string,string>) { return id ? names[id] || '담당상담사' : '미배정'; }

/** Presentation of server-resolved fields only. Never resolves grade, intent or reasons. */
export function ledgerCells(row: LedgerClientRow, assignees: Record<string,string>): string[] {
  const f = row.finance;
  return [formatUnitLabel(row.buildingNo,row.unitNo),gradeLabel(row.currentGrade),row.phone || '미등록',paymentStatus(f),
    row.customerName || '미등록', row.contractAddress || '미등록',
    won(f?.salePrice), f?.balcony ? won(f.balcony.amount) : '미확인', f?.option ? won(f.option.amount) : '미확인',
    won(f?.salePaid), won(f?.saleBalance), partPaid(f?.balcony), partUnpaid(f?.balcony), partPaid(f?.option), partUnpaid(f?.option),
    totalUnpaid(f), overdueLabel(f), ...accountCells(f),
    row.effectiveIntent === 'RENT' ? row.rentalType ? lookup(OCCUPANCY_INTENT_LABELS,row.rentalType) : '임대(유형 확인 필요)' : lookup(OPERATIONAL_INTENT_LABELS,row.effectiveIntent),
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
// 부재는 등급이 아닌 접촉상태 축이라 C·D와 AND로 겹쳐 걸린다(C + 부재 = C등급 중 부재 세대)
export const QUICK_LEDGER_FILTER_ROWS = [
  [preset('C','grade','C'),preset('D','grade','D'),preset('부재','contactStatus','ABSENT'),preset('대출필요','funding','LOAN_NEEDED'),preset('대출한도부족','funding','LOAN_LIMIT_SHORTAGE'),
    preset('매매','intent','SALE_TRANSFER'),preset('전세/월세','intent','RENT')],
  [preset('특별관리','specialReason','all'),preset('오늘재콜','nextContact','TODAY'),preset('미확정','intent','UNDECIDED')],
];

export function ledgerOptionLabel(axis: LedgerAxis, value: string, assignees: Record<string,string>): string {
  if(axis==='loanAgreement'||axis==='problemHousehold')return value==='TARGET'?'대상':value==='NOT_TARGET'?'비대상':value==='UNKNOWN'?'원천 확인필요':'빈값';
  if(axis==='moveReservation')return value==='NONE'?'미예약':reservationLabel(value);
  if(axis==='dGradeReason')return value===LEDGER_BLANK?'D · 사유 미확인':lookup(D_GRADE_REASON_LABELS,value);
  if(axis==='tradeFunding')return value===LEDGER_BLANK?'해당 없음(거래 의향·분류 없음)':lookup(TRADE_FUNDING_FILTER_LABELS,value);
  if(value===LEDGER_BLANK)return '빈값';
  if(axis==='contactStatus')return CONTACT_STATUS_LABELS[value] ?? value;
  if(axis==='grade'&&CONTACT_RESULT_GRADES.has(value))return gradeLabel(value);
  if(axis==='intent')return lookup(intentLabels,value);
  if(axis==='funding')return value==='NORMAL'?'정상 (기존)':lookup(FUNDING_STATUS_LABELS,value);
  if(axis==='moveIn')return lookup(MOVE_IN_STATUS_LABELS,value);
  if(axis==='specialReason')return value==='all'?'특별관리 전체':lookup(reasonLabels,value);
  if(axis==='deal')return lookup(OCCUPANCY_INTENT_LABELS,value);
  if(axis==='online')return {REGISTERED:'등록',DUPLICATE:'중복 등록',UNREGISTERED:'미등록'}[value] ?? '빈값';
  if(axis==='payment')return PAYMENT_STATUS_LABELS[value] ?? (value==='UNREGISTERED'?'미확인':value);
  if(axis==='nextContact')return lookup({TODAY:'오늘',OVERDUE:'지난 일정',FUTURE:'향후 일정'},value);
  if(axis==='assignee')return assigneeLabel(value,assignees);
  return value;
}
/** Option discovery only, not filtering or current-state inference. */
export function ledgerOptions(rows: readonly LedgerClientRow[], axis: LedgerAxis, assignees: Record<string,string>) {
  if(axis==='loanAgreement'||axis==='problemHousehold')return ['TARGET','NOT_TARGET','UNKNOWN'].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)}));
  if(axis==='moveReservation')return ['BOOKED','CANCELLED','NONE','UNKNOWN'].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)}));
  if(axis==='contactStatus')return ['CONTACTED','ABSENT','REFUSED','NONE'].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)}));
  if(axis==='dGradeReason')return [...D_GRADE_REASONS,LEDGER_BLANK].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)}));
  if(axis==='tradeFunding')return [...TRADE_FUNDING_FILTER_VALUES,LEDGER_BLANK].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)}));
  if(axis==='online')return ['REGISTERED','DUPLICATE','UNREGISTERED'].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)}));
  if(axis==='payment')return ['PAID','PARTIAL','UNPAID','OVERDUE','UNKNOWN'].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)}));
  const values=new Set<string>([LEDGER_BLANK]);
  // 방문 필요는 해당 세대가 없어도 선택지로 둔다(특별관리 필터 고정 항목)
  if(axis==='specialReason') values.add('VISIT_REQUIRED');
  if(axis==='nextContact') for(const v of ['TODAY','OVERDUE','FUTURE']) values.add(v);
  else for(const row of rows) {
    const list=axis==='intent' ? [row.effectiveIntent,...(row.rentalType?[row.rentalType]:[])] : axis==='specialReason'? row.specialReasons : axis==='deal'?row.dealTypes :
      [{building:row.buildingNo,unit:row.unitNo,customer:row.customerName,phone:row.phone,grade:row.currentGrade,funding:row.funding,moveIn:row.moveIn,assignee:row.assigneeId,payment:row.payment}[axis]];
    for(const value of list) if(value?.trim()) values.add(value);
  }
  return [...values].map(value=>({value,label:ledgerOptionLabel(axis,value,assignees)})).sort((a,b)=>a.value===LEDGER_BLANK?-1:b.value===LEDGER_BLANK?1:a.label.localeCompare(b.label,'ko',{numeric:true}));
}
