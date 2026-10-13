/** Source facts only. They never determine grade, funding, intent or move-in completion. */
export type SourceTarget = 'TARGET' | 'NOT_TARGET' | 'UNKNOWN';
export type MoveReservation = 'BOOKED' | 'CANCELLED' | 'NONE' | 'UNKNOWN';
export type LedgerManagement = {
  loanAgreement: SourceTarget;
  moveReservation: MoveReservation;
  movingDate: string | null;
  problemHousehold: SourceTarget;
  managementReasons: readonly string[];
};
export type ManagementIdentity = {
  projectId: string; unitId: string; buildingNo: string; unitNo: string;
  currentContractId: string; currentCustomerId: string;
};
export type ManagementSourceRecord = ManagementIdentity & LedgerManagement;
const unknown = (): LedgerManagement => ({loanAgreement:'UNKNOWN',moveReservation:'UNKNOWN',movingDate:null,problemHousehold:'UNKNOWN',managementReasons:[]});

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
  return (identity: ManagementIdentity): LedgerManagement => {
    const id = `${identity.projectId}:${identity.unitId}`, record = byId.get(id);
    if (!record || invalid.has(id) || record.currentContractId !== identity.currentContractId ||
      record.currentCustomerId !== identity.currentCustomerId || record.buildingNo !== identity.buildingNo || record.unitNo !== identity.unitNo) return unknown();
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
