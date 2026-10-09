import 'server-only';
import type { LedgerSummaryRow, ProjectionResult } from '@/lib/move-in/ledger-types';
import { requireMoveInAccess } from '@/lib/move-in/access';
import { loadOperationalLedgerRows } from '@/lib/move-in/ledger-queries.server';
import { loadFieldMemberNames } from '@/lib/move-in/queries';
export type LedgerSummaryResult = ProjectionResult<LedgerSummaryRow>;
export type LedgerWorkspaceResult = {ok:true;result:LedgerSummaryResult;assignees:Record<string,string>}|{ok:false;error:string};
export async function loadLedgerWorkspace(projectId:string):Promise<LedgerWorkspaceResult> {
  try {
    if(typeof projectId!=='string' || !/^[0-9a-f-]{36}$/i.test(projectId))return {ok:false,error:'프로젝트를 확인할 수 없습니다.'};
    const access=await requireMoveInAccess(projectId);
    if(!access.ok || access.projectId!==projectId)return {ok:false,error:'출력 권한을 확인할 수 없습니다.'};
    const result=await loadOperationalLedgerRows(projectId);
    if(result.error)return {ok:false,error:'원장 데이터를 불러오지 못했습니다.'};
    const rows=result.rows.filter(row=>row.projectId===projectId);
    const ids=new Set(rows.map(row=>row.assigneeId).filter((id): id is string=>!!id));
    const assignees:Record<string,string>={};
    if(ids.size) {
      const names=await loadFieldMemberNames(projectId);
      if(!names.error) for(const member of names.members) if(ids.has(member.memberId) && member.displayName) assignees[member.memberId]=member.displayName;
    }
    return {ok:true,result:{...result,rows},assignees};
  } catch { return {ok:false,error:'원장 데이터를 불러오지 못했습니다.'}; }
}
