import 'server-only';
import { attachLedgerManagement } from '@/lib/move-in/ledger-management.server';
import { attachContractAddress, contractAddressFor } from '@/lib/move-in/contract-address.server';
import { attachLedgerFinance, balanceAccountFor } from '@/lib/move-in/ledger-finance.server';
import type {Json} from '@/lib/supabase/types';
import { requireMoveInAccess } from '@/lib/move-in/access';
import { createServerClient } from '@/lib/supabase/server';
import { loadDGradeReasons } from '@/lib/move-in/d-grade-reasons.server';
import { currentIdentityRevision,currentRelationAnomaly,isCurrentUnitVisible,resolveCurrentUnitSnapshot,toLedgerSummaryRow } from '@/lib/move-in/current-unit-snapshot';
import { approvedUnitSourceTags, attachOnlineListing } from '@/lib/move-in/ledger-source-tags.server';
import { canManageField } from '@/lib/move-in/field-access';
import { extractLegacyGrade } from '@/lib/move-in/consultation';
import { isConsentStatus,isDealStatus,type UnitDealRecord } from '@/lib/move-in/deals';
import { toSpecialCaseMetadata,type SpecialCaseRow } from '@/lib/move-in/special-case';
import type { AuthorizedAccess,CurrentUnitRecord,SpecialRecord,DealRecord,ContactRecord } from '@/lib/move-in/ledger-types';
import { loadCounselorNames,type OccupancyRecord,type ConsultationHistoryRow } from '@/lib/move-in/queries';
import type { UnitWorkspaceResult,WorkspaceHistory,WorkspaceIdentity,UnitWorkspaceSectionResult } from './unit-workspace-types';
import { paymentForCurrentContract } from './payment-projection.server';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELECT=`project_id,unit_id,building_no,unit_no,unit_type,
 occupancy:unit_occupancy_status!unit_occupancy_status_project_id_unit_id_fkey(*),
 contracts:contract!contract_project_id_unit_id_fkey(project_id,unit_id,contract_id,customer_id,contract_status,updated_at,
 holder:customer!contract_customer_id_project_id_fkey(project_id,id,name,phone,phone_quality,assigned_counselor_id))`;
type SelectedUnit=CurrentUnitRecord&{occupancy:OccupancyRecord|null};
type Client=Awaited<ReturnType<typeof createServerClient>>;
type HistoryRecord={project_id:string;unit_id:string;customer_id:string;id:string;consulted_at:string;contact_type:string|null;purpose:string|null;content:string;next_action_at:string|null;counselor_id:string;channel:string|null;structured_tags:{[key:string]:Json|undefined}|null};
type RawDeal=DealRecord&{project_id:string;unit_id:string;contract_id:string;customer_id:string;id:string;consent_status:string;deal_status:string;sale_enabled:boolean;jeonse_enabled:boolean;monthly_rent_enabled:boolean;sale_note:string|null;jeonse_note:string|null;monthly_rent_note:string|null;details:string|null;asking_sale_price_krw:number|null;jeonse_deposit_krw:number|null;monthly_rent_deposit_krw:number|null;monthly_rent_amount_krw:number|null;sale_listing_status:NonNullable<UnitDealRecord['typed']>['saleListingStatus'];jeonse_listing_status:NonNullable<UnitDealRecord['typed']>['jeonseListingStatus'];monthly_rent_listing_status:NonNullable<UnitDealRecord['typed']>['monthlyRentListingStatus']};
const DEAL_SELECT='project_id,unit_id,contract_id,customer_id,id,consent_status,deal_status,sale_enabled,jeonse_enabled,monthly_rent_enabled,sale_note,jeonse_note,monthly_rent_note,details,asking_sale_price_krw,jeonse_deposit_krw,monthly_rent_deposit_krw,monthly_rent_amount_krw,sale_listing_status,jeonse_listing_status,monthly_rent_listing_status,updated_at,offices:unit_deal_brokerage!unit_deal_brokerage_unit_deal_id_fkey(brokerage_office_id)';
async function authorized(projectId:string,unitId:string,provided:AuthorizedAccess){
 if(!UUID.test(projectId)||!UUID.test(unitId)||provided.projectId!==projectId)return null;
 const access=await requireMoveInAccess(projectId);
 return access.ok&&access.projectId===projectId&&access.userId===provided.userId&&access.memberId===provided.memberId&&access.role===provided.role?access:null;
}
async function readCurrent(client:Client,projectId:string,unitId:string,access:AuthorizedAccess){
 const r=await client.from('project_unit').select(SELECT).eq('project_id',projectId).eq('unit_id',unitId).eq('contracts.contract_status','ACTIVE').limit(2).returns<SelectedUnit[]>();
 if(r.error)throw new Error('current read failed');if(r.data?.length!==1)return null;const unit=r.data[0];
 return unit.unit_id===unitId&&!currentRelationAnomaly(unit,projectId)&&isCurrentUnitVisible(unit,access)?unit:null;
}
function identity(u:SelectedUnit):WorkspaceIdentity{const c=u.contracts.find(c=>c.contract_status==='ACTIVE')!;return {contractId:c.contract_id,customerId:c.customer_id};}
function matches(u:SelectedUnit,e:WorkspaceIdentity){const i=identity(u);return i.contractId===e.contractId&&i.customerId===e.customerId;}
async function historyPage(client:Client,p:string,u:string,customer:string,offset:number):Promise<WorkspaceHistory|null>{
 // 상담사 이름은 페이지당 1회 일괄 조회(상담 건별 조회 없음). 실패해도 이력은 '담당상담사'로 표시
 const [r,names]=await Promise.all([client.from('consultation').select('project_id,unit_id,customer_id,id,consulted_at,contact_type,purpose,content,next_action_at,counselor_id,channel,structured_tags').eq('project_id',p).eq('unit_id',u)
  .order('consulted_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+25).returns<HistoryRecord[]>(),loadCounselorNames(p)]);
 if(r.error)throw new Error('history read failed');if(r.data.some(row=>row.project_id!==p||row.unit_id!==u))return null;
 const rows:ConsultationHistoryRow[]=r.data.slice(0,25).map(row=>({id:row.id,consultedAt:row.consulted_at,contactType:row.contact_type,purpose:row.purpose,content:row.content,nextActionAt:row.next_action_at,counselorId:row.counselor_id,counselorName:names.get(row.counselor_id)??null,previousHolder:row.customer_id!==customer,sourceHolder:null,legacyImported:row.channel==='LEGACY_IMPORT',legacyCounselorName:typeof row.structured_tags?.legacy_counselor_name==='string'?row.structured_tags.legacy_counselor_name:null,legacyGrade:extractLegacyGrade(row.structured_tags)}));
 return {rows,nextOffset:r.data.length>25?offset+25:null};
}
function toDeal(r:RawDeal):UnitDealRecord{return {consentStatus:isConsentStatus(r.consent_status)?r.consent_status:'NOT_CONSENTED',dealStatus:isDealStatus(r.deal_status)?r.deal_status:'IN_PROGRESS',saleEnabled:r.sale_enabled,jeonseEnabled:r.jeonse_enabled,monthlyRentEnabled:r.monthly_rent_enabled,saleNote:r.sale_note??'',jeonseNote:r.jeonse_note??'',monthlyRentNote:r.monthly_rent_note??'',details:r.details??'',brokerages:[],typed:{askingSalePriceKrw:r.asking_sale_price_krw??null,jeonseDepositKrw:r.jeonse_deposit_krw??null,monthlyRentDepositKrw:r.monthly_rent_deposit_krw??null,monthlyRentAmountKrw:r.monthly_rent_amount_krw??null,saleListingStatus:r.sale_listing_status??null,jeonseListingStatus:r.jeonse_listing_status??null,monthlyRentListingStatus:r.monthly_rent_listing_status??null}};}
async function readDeal(c:Client,p:string,u:string,i:WorkspaceIdentity){
 const r=await c.from('unit_deal').select(DEAL_SELECT).eq('project_id',p).eq('unit_id',u).eq('contract_id',i.contractId).eq('customer_id',i.customerId).limit(2).returns<RawDeal[]>();
 if(r.error||r.data.length>1)throw new Error('deal unavailable');const row=r.data[0];return row&&row.project_id===p&&row.unit_id===u&&row.contract_id===i.contractId&&row.customer_id===i.customerId?row:null;
}
export async function loadUnitWorkspace(projectId:string,unitId:string,provided:AuthorizedAccess,options:{summary?:boolean;saving?:boolean}={}):Promise<UnitWorkspaceResult>{
 try{
  const access=await authorized(projectId,unitId,provided);if(!access)return {kind:'unavailable'};
  const c=await createServerClient(),unit=await readCurrent(c,projectId,unitId,access);if(!unit)return {kind:'unavailable'};const id=identity(unit);
  const [history,deal,s,contact,k]=await Promise.all([historyPage(c,projectId,unitId,id.customerId,0),readDeal(c,projectId,unitId,id),
   c.from('move_in_special_case' as 'unit_deal').select('project_id,unit_id,contract_id,manually_flagged,visit_required,abandonment_document_received,termination_document_received,legal_consultation_required,legal_consultation_status,processing_status,memo,updated_at').eq('project_id',projectId).eq('unit_id',unitId).eq('contract_id',id.contractId).limit(2).returns<(SpecialCaseRow&SpecialRecord)[]>(),
   options.summary?c.from('consultation').select('project_id,unit_id,customer_id,id,consulted_at,next_action_at,structured_tags,content,contact_type,channel').eq('project_id',projectId).eq('unit_id',unitId).eq('customer_id',id.customerId).order('consulted_at',{ascending:false}).order('id',{ascending:false}).returns<ContactRecord[]>():Promise.resolve({data:[] as ContactRecord[],error:null}),
   // 계약 변경 이력(현재 계약 외 계약) 판정용. 실패·현재 계약 누락이면 미확인으로 두고 발코니·옵션을 연결하지 않는다
   options.summary?c.from('contract').select('contract_id').eq('project_id',projectId).eq('unit_id',unitId).limit(100).returns<{contract_id:string}[]>():Promise.resolve({data:[] as {contract_id:string}[],error:null})]);
  if(!history||s.error||s.data.length>1||contact.error)return {kind:'unavailable'};
  const special=s.data.find(s=>s.project_id===projectId&&s.unit_id===unitId&&s.contract_id===id.contractId)??null;
  const final=await readCurrent(c,projectId,unitId,access);if(!final||currentIdentityRevision(unit)!==currentIdentityRevision(final))return {kind:'stale'};
  const resolved=resolveCurrentUnitSnapshot({unit,access,special,sourceTags:approvedUnitSourceTags(projectId,unit.building_no,unit.unit_no),now:new Date()});if(resolved.kind!=='ok')return {kind:'unavailable'};
  const h=unit.contracts.find(c=>c.contract_status==='ACTIVE')!.holder!;
  const contractHistory=!k.error&&k.data?.some(r=>r.contract_id===id.contractId)?k.data.some(r=>r.contract_id!==id.contractId):undefined;
  const payment=paymentForCurrentContract({projectId,unitId,contractId:id.contractId,buildingNo:unit.building_no,unitNo:unit.unit_no});
  const dReasons=resolved.snapshot.currentGrade==='D'?await loadDGradeReasons(projectId,[{unitId,contractId:id.contractId,customerId:id.customerId,buildingNo:unit.building_no,unitNo:unit.unit_no,currentGrade:resolved.snapshot.currentGrade,funding:resolved.snapshot.funding,moveIn:resolved.snapshot.moveIn}]):null;
  const dGradeReasons=dReasons?.byUnit.get(unitId)??[];
  return {kind:'ok',workspace:{dGradeReasons,dGradeReasonUnavailable:dReasons?.unavailable??[],projectId,identity:id,snapshot:resolved.snapshot,detail:{unitId,buildingNo:unit.building_no,unitNo:unit.unit_no,unitType:unit.unit_type,customerId:id.customerId,contractId:id.contractId,customerName:h.name,customerPhone:h.phone,contractAddress:contractAddressFor({projectId,unitId,contractId:id.contractId,customerId:id.customerId}),phoneQuality:h.phone_quality,assignedCounselorId:h.assigned_counselor_id,occupancy:unit.occupancy,relatedUnits:[]},capabilities:{role:access.role,memberId:access.memberId,fieldWrite:canManageField(projectId,access.role)||access.role==='COUNSELOR',specialWrite:access.role==='PROJECT_ADMIN'||access.role==='CLIENT_MANAGER',saveEnabled:options.saving===true},...(options.summary?{summary:{...attachOnlineListing(attachLedgerFinance(attachContractAddress(attachLedgerManagement({...toLedgerSummaryRow(unit,resolved.snapshot,deal,contact.data??[]),contractHistory})),access)),dGradeReasons}}:{}),history,deal:deal?toDeal(deal):null,special:special?toSpecialCaseMetadata(special):null,paymentAvailability:payment?'registered':'unregistered',payment,
   balanceAccount:balanceAccountFor({access,projectId,unitId,contractId:id.contractId,buildingNo:unit.building_no,unitNo:unit.unit_no,assigneeId:h.assigned_counselor_id})}};
 }catch{return {kind:'unavailable'};}
}
export async function loadUnitWorkspaceSection(p:string,u:string,provided:AuthorizedAccess,expected:WorkspaceIdentity,section:'history'|'brokers'|'related'|'identity',offset=0):Promise<UnitWorkspaceSectionResult>{
 try{
  const access=await authorized(p,u,provided);if(!access)return {kind:'unavailable'};
  const c=await createServerClient(),unit=await readCurrent(c,p,u,access);if(!unit)return {kind:'unavailable'};
  if(!matches(unit,expected))return {kind:'stale'};
  let output:UnitWorkspaceSectionResult;
  if(section==='identity')return {kind:'identity',identity:identity(unit)};
  if(section==='history'){
   if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return {kind:'unavailable'};
   const history=await historyPage(c,p,u,expected.customerId,offset);if(!history)return {kind:'unavailable'};output={kind:'history',history};
  }else if(section==='brokers'){
   const {loadBrokerageOffices}=await import('@/lib/move-in/queries');const [offices,raw]=await Promise.all([loadBrokerageOffices(p),readDeal(c,p,u,expected)]);if(offices.error)throw new Error('offices read failed');
   const deal=raw?toDeal(raw):null;
   if(raw&&deal){const links=await c.from('unit_deal_brokerage').select('brokerage_office_id,brokerage_contact_id').eq('unit_deal_id',raw.id).limit(100);if(links.error)throw new Error('broker links read failed');if(links.data.length>=100)return {kind:'unavailable'};deal.brokerages=links.data.map(l=>({brokerageOfficeId:l.brokerage_office_id,brokerageContactId:l.brokerage_contact_id}));}
   output={kind:'brokers',offices:offices.offices,deal};
  }else{
   const contracts=await c.from('contract').select('unit_id').eq('project_id',p).eq('customer_id',expected.customerId).eq('contract_status','ACTIVE').limit(100);
   if(contracts.error)throw new Error('related read failed');if(contracts.data.length>=100)return {kind:'unavailable'};
   const ids=[...new Set(contracts.data.map(r=>r.unit_id).filter(id=>id!==u))];
   if(!ids.length)output={kind:'related',units:[]};else{
    const r=await c.from('project_unit').select(SELECT).eq('project_id',p).in('unit_id',ids).eq('contracts.contract_status','ACTIVE').order('unit_id').limit(100).returns<SelectedUnit[]>();if(r.error)throw new Error('related units read failed');
    output={kind:'related',units:r.data.filter(row=>ids.includes(row.unit_id)&&!currentRelationAnomaly(row,p)&&isCurrentUnitVisible(row,access)&&identity(row).customerId===expected.customerId).map(row=>({unitId:row.unit_id,buildingNo:row.building_no,unitNo:row.unit_no,occupancyIntent:row.occupancy!.occupancy_intent,fundingStatus:row.occupancy!.funding_status,moveInStatus:row.occupancy!.move_in_status}))};
   }
  }
  const final=await readCurrent(c,p,u,access);return final&&currentIdentityRevision(unit)===currentIdentityRevision(final)?output:{kind:'stale'};
 }catch{return {kind:'retryable'};}
}

/** A fresh RLS-scoped identity read immediately before a mutation; never trusts form identity. */
export async function verifyUnitWorkspaceIdentity(projectId:string,unitId:string,expected:WorkspaceIdentity):Promise<{ok:true;access:AuthorizedAccess}|{ok:false}> {
 try {
  if(!UUID.test(projectId)||!UUID.test(unitId)||!UUID.test(expected.contractId)||!UUID.test(expected.customerId))return {ok:false};
  const access=await requireMoveInAccess(projectId);if(!access.ok||access.projectId!==projectId)return {ok:false};
  const unit=await readCurrent(await createServerClient(),projectId,unitId,access);
  return unit&&matches(unit,expected)?{ok:true,access}:{ok:false};
 }catch{return {ok:false};}
}
