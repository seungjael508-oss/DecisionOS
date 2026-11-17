import { beforeEach, expect, test, vi } from 'vitest';
import db from '../fixtures/balance-current161-20261109.json';
import official from '../fixtures/balance-official-169.json';
vi.mock('server-only',()=>({}));
const { access, readRows, client }=vi.hoisted(()=>({access:vi.fn(),readRows:vi.fn(),client:vi.fn()}));
vi.mock('@/lib/move-in/access',()=>({requireMoveInAccess:access}));
vi.mock('@/lib/supabase/server',()=>({createServerClient:client}));
vi.mock('@/lib/supabase/read-all',()=>({readAllRows:readRows}));
import { loadDashboard } from '@/lib/move-in/queries';
import { fieldConfirmedBalancePaid } from '@/lib/move-in/balance-confirmations';
import { isConfirmedBalancePaid } from '@/lib/move-in/balance-paid';
const projectId='1283e198-5043-4027-96d6-edcc7a6686c6';
const now=new Date('2026-11-09T06:00:00Z');
beforeEach(()=>{
 vi.clearAllMocks();
 access.mockResolvedValue({ok:true,projectId,role:'PROJECT_ADMIN',memberId:'admin'});
 client.mockResolvedValue({});
 const units=db.map(r=>({unit_id:r.unit_id,legacy:[],occupancy:{contract_id:'ct-'+r.unit_id,occupancy_intent:'UNDECIDED',funding_status:'NORMAL',move_in_status:r.move_in_status,legacy_grade:null,balance_paid_at:r.balance_paid_at,actual_move_in_date:null,planned_move_in_date:null,next_contact_at:null,contract:{contract_id:'ct-'+r.unit_id,customer_id:'customer-'+r.unit_id,contract_status:'ACTIVE',holder:{assigned_counselor_id:null}}}}));
 // Only I/O is mocked. Exercise the actual authorized dashboard loader, mapping and KPI.
 readRows.mockResolvedValue({data:[],error:null}).mockResolvedValueOnce({data:units,error:null});
});
test('authorized dashboard loader includes the same exact 169 official units as ledger/floorplan/worklog',async()=>{
 const before=JSON.stringify(db),result=await loadDashboard(projectId,now);
 expect(result.error).toBe(false);if(result.error)return;
 expect(result.data.totalUnits).toBe(851);
 expect(result.data.occupancy.balancePaid).toBe(169);
 expect(result.data.totalUnits-result.data.occupancy.balancePaid).toBe(682);
 const displayed=db.filter(r=>isConfirmedBalancePaid({balancePaidAt:r.balance_paid_at,fieldConfirmedBalancePaid:fieldConfirmedBalancePaid(projectId,r.unit_id,now)}));
 expect(displayed.map(r=>`${r.building_no}-${Number(r.unit_no)}`).sort()).toEqual([...official].sort());
 expect(new Set(displayed.map(r=>r.unit_id)).size).toBe(169);
 expect(JSON.stringify(db)).toBe(before);
});
test('unauthenticated dashboard reads no data',async()=>{
 access.mockResolvedValue({ok:false,kind:'unauthenticated'});
 expect(await loadDashboard(projectId,now)).toEqual({error:true});
 expect(client).not.toHaveBeenCalled();expect(readRows).not.toHaveBeenCalled();
});
test('another project does not inherit the eight undated confirmations',async()=>{
 access.mockResolvedValue({ok:true,projectId:'other-project',role:'PROJECT_ADMIN',memberId:'admin'});
 const result=await loadDashboard('other-project',now);
 expect(result.error).toBe(false);if(result.error)return;
 expect(result.data.occupancy.balancePaid).toBe(161);
});
