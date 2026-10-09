import {requireMoveInAccess} from '@/lib/move-in/access';
import {loadOperationalLedgerRows} from '@/lib/move-in/ledger-queries.server';
import {parseWorkspaceContext} from '@/lib/move-in/ledger-context';
import {applyLedgerQuery} from '@/lib/move-in/ledger-filters';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
/** Explicit detail navigation only; ordinary list state changes never call this. */
export async function GET(request:Request,{params}:{params:Promise<{projectId:string}>}){
 const {projectId}=await params,access=await requireMoveInAccess(projectId);if(!access.ok||access.projectId!==projectId)return json({kind:'unavailable'},403);
 const raw=new URL(request.url).searchParams.get('returnTo')??`/projects/${projectId}/move-in/ledger`;
 if(raw.length>32768)return json({kind:'unavailable'},400);
 const context=parseWorkspaceContext(projectId,raw);if(!context.valid)return json({kind:'unavailable'},400);
 const result=await loadOperationalLedgerRows(projectId);if(result.error)return json({kind:'unavailable'},503);
 const rows=applyLedgerQuery(result.rows.filter(r=>r.projectId===projectId),context.state,new Date(result.snapshotAsOf)).filteredSorted;
 return json({kind:'ok',orderedIds:rows.map(r=>r.unitId),returnTo:context.returnTo});
}
