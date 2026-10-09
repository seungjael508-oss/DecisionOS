import 'server-only';
import { MANAGEMENT_SOURCE_METADATA as source } from '@/lib/move-in/ledger-management-data.server';

export function LedgerManagementSourceNotice({projectId}:{projectId:string}) {
  if(projectId!==source.projectId)return null;
  return <aside className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm" aria-label="추가 원천 확인 상태">
    금전소비대차는 상담정리자료 {source.loanSourceRows}세대 기준이며 원본확인이 필요합니다. 목표 {source.loanExpectedRows}세대 중 나머지 1세대와 문제세대 원본은 확인 중입니다.
    {' '}원천 확인필요는 비대상을 의미하지 않습니다. 입주예약은 {source.sourceAsOf} 원천 기준이며 실제 입주완료와 다릅니다.
  </aside>;
}
