import{describe,it,expect}from'vitest';
import{createManagementSourceLookup,type ManagementSourceRecord}from'@/lib/move-in/ledger-management-source';
const source={projectId:'p',unitId:'u',buildingNo:'101',unitNo:'101',currentContractId:'old',currentCustomerId:'holder-old',loanAgreement:'TARGET',moveReservation:'BOOKED',movingDate:'2026-12-01',problemHousehold:'TARGET',managementReasons:['old personal memo']}as ManagementSourceRecord;
const current={...source,currentContractId:'new',currentCustomerId:'holder-new'};
const contracts=[{project_id:'p',unit_id:'u',contract_id:'new',customer_id:'holder-new',previous_contract_id:'old',contract_status:'ACTIVE',cancellation_reason:null},{project_id:'p',unit_id:'u',contract_id:'old',customer_id:'holder-old',previous_contract_id:null,contract_status:'CANCELLED',cancellation_reason:'HOLDER_CHANGED'}];
const audit=(fields:string[])=>({project_id:'p',unit_id:'u',contract_id:'old',field_changed:'holder_transfer',previous_value:JSON.stringify({contract_id:'old',customer_id:'holder-old'}),new_value:JSON.stringify({contract_id:'new',previous_contract_id:'old',customer_id:'holder-new',management_transfer_version:1,confirmed_management_fields:fields})});
describe('관리정보의 명시적 계약 승계',()=>{
 it('승계 확인 없이는 이전 개인 채무·예약·사유를 새 계약자에게 연결하지 않는다',()=>{const r=createManagementSourceLookup([source])(current,{contracts,transfers:[audit([])]});expect(r.loanAgreement).toBe('UNKNOWN');expect(r.moveReservation).toBe('UNKNOWN');expect(r.problemHousehold).toBe('UNKNOWN');expect(r.managementReasons).toEqual([]);});
 it('확인된 예약만 이전 원천에서 조회하고 개인 채무·메모는 승계하지 않는다',()=>{const r=createManagementSourceLookup([source])(current,{contracts,transfers:[audit(['moveReservation'])]});expect(r.moveReservation).toBe('BOOKED');expect(r.movingDate).toBe('2026-12-01');expect(r.loanAgreement).toBe('UNKNOWN');expect(r.problemHousehold).toBe('UNKNOWN');expect(r.managementReasons).toEqual([]);expect(source.currentContractId).toBe('old');});
 it.each(['SALE','GIFT','INHERITANCE'])('%s에서도 확인된 관리대상 사실만 연결',()=>{const r=createManagementSourceLookup([source])(current,{contracts,transfers:[audit(['problemHousehold'])]});expect(r.problemHousehold).toBe('TARGET');expect(r.managementReasons).toEqual([]);expect(r.loanAgreement).toBe('UNKNOWN');});
 it('다른 프로젝트·명의·깨진 연결·순환은 원천 확정을 거부한다',()=>{
  const lookup=createManagementSourceLookup([source]);
  for(const chain of [contracts.slice(0,1),[{...contracts[0],project_id:'other'},contracts[1]],[contracts[0],{...contracts[1],customer_id:'wrong'}],[contracts[0],{...contracts[1],previous_contract_id:'new'}]])expect(lookup(current,{contracts:chain,transfers:[audit(['moveReservation'])]}).moveReservation).toBe('UNKNOWN');
 });
 it('모든 승계 단계에서 확인해야 복수 승계 원천을 연결한다',()=>{
  const chain=[{...contracts[0],previous_contract_id:'middle'},{...contracts[1],contract_id:'middle',customer_id:'holder-middle',previous_contract_id:'old'},contracts[1]];
  const first=audit(['moveReservation']);first.new_value=JSON.stringify({contract_id:'middle',previous_contract_id:'old',customer_id:'holder-middle',management_transfer_version:1,confirmed_management_fields:['moveReservation']});
  const second={...audit([]),contract_id:'middle',previous_value:JSON.stringify({contract_id:'middle',customer_id:'holder-middle'}),new_value:JSON.stringify({contract_id:'new',previous_contract_id:'middle',customer_id:'holder-new',management_transfer_version:1,confirmed_management_fields:[]})};
  const lookup=createManagementSourceLookup([source]);expect(lookup(current,{contracts:chain,transfers:[first,second]}).moveReservation).toBe('UNKNOWN');second.new_value=JSON.stringify({...JSON.parse(second.new_value),confirmed_management_fields:['moveReservation']});expect(lookup(current,{contracts:chain,transfers:[first,second]}).moveReservation).toBe('BOOKED');
 });
});
