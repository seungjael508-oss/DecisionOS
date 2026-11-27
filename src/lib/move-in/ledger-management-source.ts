/** Source facts only. They never determine grade, funding, intent or move-in completion. */
export type SourceTarget = 'TARGET' | 'NOT_TARGET' | 'UNKNOWN';
export type MoveReservation = 'BOOKED' | 'CANCELLED' | 'NONE' | 'UNKNOWN';
export type LedgerManagement = {
  loanAgreement: SourceTarget;
  moveReservation: MoveReservation;
  movingDate: string | null;
  movingTime?: string | null;
  problemHousehold: SourceTarget;
  managementReasons: readonly string[];
};
export type ManagementIdentity = {
  projectId: string; unitId: string; buildingNo: string; unitNo: string;
  currentContractId: string; currentCustomerId: string;
};
export type ManagementSourceRecord = ManagementIdentity & LedgerManagement;
export type ManagementContractLink = {project_id:string;unit_id:string;contract_id:string;customer_id?:string;previous_contract_id:string|null;contract_status:string;cancellation_reason:string|null};
export type ManagementTransferAudit = {project_id:string;unit_id:string;contract_id:string;field_changed:string;previous_value:string|null;new_value:string|null;reason?:string|null;changed_at?:string|null};
export type ManagementContinuity = {contracts:readonly ManagementContractLink[];transfers:readonly ManagementTransferAudit[]};
const unknown = (): LedgerManagement => ({loanAgreement:'UNKNOWN',moveReservation:'UNKNOWN',movingDate:null,problemHousehold:'UNKNOWN',managementReasons:[]});

function confirmedContinuity(identity:ManagementIdentity,source:ManagementSourceRecord,evidence:ManagementContinuity):Set<string> {
  const none=()=>new Set<string>(),links=new Map<string,ManagementContractLink>();
  for(const link of evidence.contracts){
    if(link.project_id!==identity.projectId||link.unit_id!==identity.unitId||links.has(link.contract_id))return none();
    links.set(link.contract_id,link);
  }
  const active=[...links.values()].filter(x=>x.contract_status==='ACTIVE');
  if(active.length!==1||active[0].contract_id!==identity.currentContractId||active[0].customer_id!==identity.currentCustomerId)return none();
  let id:string|null=identity.currentContractId,found=false;
  const seen=new Set<string>(),confirmed=new Set(['moveReservation','problemHousehold']);
  while(id!==null){
    const child:ManagementContractLink|undefined=links.get(id);
    if(!child||seen.has(id))return none();seen.add(id);
    if(id!==identity.currentContractId&&(child.contract_status!=='CANCELLED'||child.cancellation_reason!=='HOLDER_CHANGED'))return none();
    if(id===source.currentContractId){if(child.customer_id!==source.currentCustomerId)return none();found=true;}
    const parentId=child.previous_contract_id;
    if(parentId!==null){
      const parent=links.get(parentId);if(!parent)return none();
      if(!found){
        const candidates=evidence.transfers.filter(event=>{
          if(event.project_id!==identity.projectId||event.unit_id!==identity.unitId||event.contract_id!==parentId||event.field_changed!=='holder_transfer')return false;
          try{const old=JSON.parse(event.previous_value??''),next=JSON.parse(event.new_value??'');return old.contract_id===parentId&&old.customer_id===parent.customer_id&&next.contract_id===child.contract_id&&next.previous_contract_id===parentId&&next.customer_id===child.customer_id&&next.management_transfer_version===1;}catch{return false;}
        });
        if(candidates.length!==1)return none();
        const fields:unknown=JSON.parse(candidates[0].new_value!).confirmed_management_fields;
        if(!Array.isArray(fields)||fields.some(x=>typeof x!=='string'))return none();
        for(const field of confirmed)if(!fields.includes(field))confirmed.delete(field);
      }
    }
    id=parentId;
    if(seen.size>1000)return none();
  }
  return found?confirmed:none();
}

/** Called only after the existing authorized/current-contract loader has accepted a row. */
export function createManagementSourceLookup(records: readonly ManagementSourceRecord[]) {
  const byId = new Map<string, ManagementSourceRecord>();
  const coordinates = new Map<string, string>();
  const invalid = new Set<string>();
  for (const record of records) {
    const id = `${record.projectId}:${record.unitId}`;
    const coordinate = `${record.projectId}:${record.buildingNo}:${record.unitNo}`;
    const existing = coordinates.get(coordinate);
    if (byId.has(id)) invalid.add(id);
    if (existing) { invalid.add(existing); invalid.add(id); }
    coordinates.set(coordinate,id); byId.set(id,record);
  }
  return (identity: ManagementIdentity,evidence?:ManagementContinuity): LedgerManagement => {
    const id = `${identity.projectId}:${identity.unitId}`, record = byId.get(id);
    if (!record || invalid.has(id) || record.buildingNo !== identity.buildingNo || record.unitNo !== identity.unitNo) return unknown();
    if(record.currentContractId!==identity.currentContractId||record.currentCustomerId!==identity.currentCustomerId){
      if(!evidence)return unknown();
      const confirmed=confirmedContinuity(identity,record,evidence),result=unknown();
      if(confirmed.has('moveReservation')){result.moveReservation=record.moveReservation;result.movingDate=record.moveReservation==='BOOKED'?record.movingDate:null;}
      if(confirmed.has('problemHousehold'))result.problemHousehold=record.problemHousehold;
      return result;
    }
    return {loanAgreement:record.loanAgreement,moveReservation:record.moveReservation,
      movingDate:record.moveReservation==='BOOKED'?record.movingDate:null,
      problemHousehold:record.problemHousehold,managementReasons:record.problemHousehold==='TARGET'?[...record.managementReasons]:[]};
  };
}

export type ReservationSourceRow = {unitKey:string;requestedAt:string;status:'BOOKED'|'CANCELLED';movingDate:string};
/** Import-time reduction. A tied/invalid record is unresolved, never silently completed. */
export function latestMoveReservations(rows: readonly ReservationSourceRow[]) {
  const groups = new Map<string, ReservationSourceRow[]>();
  for (const row of rows) groups.set(row.unitKey,[...(groups.get(row.unitKey)??[]),row]);
  const result = new Map<string,{status:MoveReservation;movingDate:string|null}>();
  for (const [key, group] of groups) {
    const sorted = [...group].sort((a,b)=>Date.parse(b.requestedAt)-Date.parse(a.requestedAt));
    const first=sorted[0], stamp=Date.parse(first.requestedAt);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(first.movingDate) && Number.isFinite(Date.parse(first.movingDate)) && new Date(first.movingDate).toISOString().slice(0,10)===first.movingDate;
    if (group.some(r=>!Number.isFinite(Date.parse(r.requestedAt))) || (sorted[1] && Date.parse(sorted[1].requestedAt)===stamp) || !validDate) {
      result.set(key,{status:'UNKNOWN',movingDate:null}); continue;
    }
    result.set(key,{status:first.status,movingDate:first.status==='BOOKED'?first.movingDate:null});
  }
  return result;
}
