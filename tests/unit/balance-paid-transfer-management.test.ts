import {expect,it,vi}from'vitest';
vi.mock('server-only',()=>({}));
vi.mock('@/lib/move-in/ledger-management-data.server',()=>({MANAGEMENT_SOURCE:[]}));
import{attachLedgerManagement}from'@/lib/move-in/ledger-management.server';
it('명의변경 후 원천 결속이 없으면 관리대상 미확인을 비대상으로 바꾸지 않는다',()=>{
 const result=attachLedgerManagement({projectId:'p',unitId:'u',currentContractId:'new',currentCustomerId:'new-holder',buildingNo:'101',unitNo:'101',problemFlags:[],problemLockReleased:false,problemNote:null}as never);
 expect(result.management?.problemHousehold).toBe('UNKNOWN');
 expect(result.management?.loanAgreement).toBe('UNKNOWN');
});
