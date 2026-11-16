import {describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase/server',()=>({createServerClient:vi.fn()}));
vi.mock('@/lib/move-in/payment-projection-source.server',async()=>await import('../fixtures/payment-source-empty'));
import {paymentForCurrentContract,type PaymentContractLink}from '@/lib/move-in/payment-projection.server';
import {PAYMENT_SOURCE_PROJECTIONS}from '../fixtures/payment-source-empty';
import {PAYMENT_PROJECTION_IDENTITIES}from '@/lib/move-in/payment-projection-identity.server';
const binding=PAYMENT_PROJECTION_IDENTITIES['101-1001'];
const node=(id:string,previous:string|null,status='CANCELLED'):PaymentContractLink=>({contract_id:id,previous_contract_id:previous,project_id:binding.projectId,unit_id:binding.unitId,contract_status:status,cancellation_reason:status==='CANCELLED'?'HOLDER_CHANGED':null});
const source={buildingNo:'101',unitNo:'1001',salePrice:100,sourceSha256:'synthetic-test-only',rows:[{installmentType:'잔금',dueDate:'2026-10-20',scheduledAmount:100,paymentDate:'2026-10-20',principalPaid:75,actualCashReceived:80,lateFee:5,discountAmount:0,additionalScheduled:0,additionalPaid:0,additionalPrincipal:0,additionalLateFee:0,excessAmount:0,refundAmount:0,unrefundedAmount:0}]};
function run(chain:PaymentContractLink[]){PAYMENT_SOURCE_PROJECTIONS['101-1001']=structuredClone(source);try{return paymentForCurrentContract({...binding,contractId:'new-contract',buildingNo:'101',unitNo:'1001',contractChain:chain});}finally{delete PAYMENT_SOURCE_PROJECTIONS['101-1001'];}}
describe('명의변경 원천 납부 귀속',()=>{
 it.each(['매매','증여','상속','공동명의'])('%s 승계는 기존 원천을 한 번만 반환하고 원본 계약 ID를 유지',()=>{
 const chain=[node('new-contract','middle','ACTIVE'),node('middle',binding.contractId),node(binding.contractId,null)];
 const result=run([...chain,chain[2]]);expect(result?.totalPrincipalPaid).toBe(75);expect(result?.installments).toHaveLength(1);expect(result?.installments[0].actualCashReceived).toBe(80);expect(result?.contractId).toBe(binding.contractId);expect(result?.currentContractId).toBe('new-contract');
 });
 it.each([
 [node('new-contract','missing','ACTIVE')],
 [node('new-contract',binding.contractId,'ACTIVE'),node(binding.contractId,'new-contract')],
 [node('new-contract',binding.contractId,'ACTIVE'),{...node(binding.contractId,null),unit_id:'other-unit'}],
 [node('new-contract',binding.contractId,'ACTIVE'),{...node(binding.contractId,null),project_id:'other-project'}],
 [node('new-contract',binding.contractId,'ACTIVE'),node(binding.contractId,null),node('another-active',null,'ACTIVE')],
 [node('new-contract',binding.contractId,'ACTIVE'),{...node(binding.contractId,null),cancellation_reason:'OTHER'}],
 [node('new-contract',binding.contractId,'ACTIVE'),node(binding.contractId,null),node(binding.contractId,'conflicting-parent')],
 [node('new-contract',binding.contractId,'ACTIVE'),node(binding.contractId,'missing-after-source')],
 ].map(chain=>({chain})))('연결 단절·순환·IDOR·중복 ACTIVE·잘못된 승계는 금액 확정 거부',({chain})=>{expect(run(chain)).toBeNull();});
});
