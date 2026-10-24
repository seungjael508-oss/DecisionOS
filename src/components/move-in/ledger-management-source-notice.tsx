import 'server-only';
import { MANAGEMENT_SOURCE_METADATA as source } from '@/lib/move-in/ledger-management-data.server';

export function LedgerManagementSourceNotice({projectId}:{projectId:string}) {
  if(projectId!==source.projectId)return null;
  return <aside className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm" aria-label="추가 원천 확인 상태">
    금전소비대차는 상담정리자료 {source.loanSourceRows}세대 기준이며 원본확인이 필요합니다. 목표 {source.loanExpectedRows}세대 중 나머지 1세대는 확인 중입니다. 문제세대(가압류·소송·D등급·아셀·계약해지)는 관리자가 세대 상세 납부 탭에서 지정하며, 해제 승인 전까지 입주완료 처리가 잠깁니다.
    {' '}원천 확인필요는 비대상을 의미하지 않습니다. 입주예약(이사예약)은 {source.bookingSourceAsOf} 예약현황 기준 예약완료 {source.bookingCompleted}세대이며 실제 입주완료와 다릅니다.
  </aside>;
}
