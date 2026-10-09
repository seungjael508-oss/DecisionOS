import {requireMoveInAccess} from '@/lib/move-in/access';
import {loadUnitWorkspace,loadUnitWorkspaceSection} from '@/lib/move-in/unit-workspace.server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
export async function GET(request:Request,{params}:{params:Promise<{projectId:string;unitId:string}>}){
 const {projectId,unitId}=await params,access=await requireMoveInAccess(projectId);if(!access.ok||access.projectId!==projectId)return json({kind:'unavailable'},403);
 const q=new URL(request.url).searchParams,section=q.get('section');
 if(!section)return json(await loadUnitWorkspace(projectId,unitId,access,{saving:true}));
 const contractId=q.get('contractId')??'',customerId=q.get('customerId')??'',offset=Number(q.get('offset')??0);
 if(!['identity','history','brokers','related'].includes(section)||!uuid.test(contractId)||!uuid.test(customerId)||!Number.isSafeInteger(offset)||offset<0)return json({kind:'unavailable'},400);
 return json(await loadUnitWorkspaceSection(projectId,unitId,access,{contractId,customerId},section as 'identity'|'history'|'brokers'|'related',offset));
}
