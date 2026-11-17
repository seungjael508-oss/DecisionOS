import { beforeEach, expect, test, vi } from 'vitest';
import ExcelJS from 'exceljs';
import db from '../fixtures/balance-current161-20261109.json';
import official from '../fixtures/balance-official-169.json';
vi.mock('server-only',()=>({}));
const { workspace }=vi.hoisted(()=>({workspace:vi.fn()}));
vi.mock('@/lib/move-in/ledger-workspace.server',()=>({loadLedgerWorkspace:workspace}));
import { exportLedgerXlsx } from '@/app/projects/[projectId]/move-in/ledger/actions';
import { applyLedgerQuery, parseLedgerQuery } from '@/lib/move-in/ledger-filters';
import { fieldConfirmedBalancePaid } from '@/lib/move-in/balance-confirmations';
import type { LedgerClientRow } from '@/lib/move-in/ledger-types';
const pid='1283e198-5043-4027-96d6-edcc7a6686c6',now=new Date('2026-11-09T06:00:00Z');
const rows=db.map(r=>({projectId:pid,unitId:r.unit_id,buildingNo:r.building_no,unitNo:r.unit_no,unitType:r.unit_type,currentGrade:'A',customerName:null,phone:null,assigneeId:null,effectiveIntent:'UNDECIDED',rentalType:null,funding:'NORMAL',moveIn:r.move_in_status,nextContact:null,balancePaidAt:r.balance_paid_at,fieldConfirmedBalancePaid:fieldConfirmedBalancePaid(pid,r.unit_id,now),contactStatus:'NONE',dGradeReasons:[],absenceStreak:0,specialReasons:[],specialPriority:null,dealTypes:[],payment:r.balance_paid_at?'PAID':'PARTIAL',balance:null,views:[],lastContact:null,lastAttempt:null,sourceTags:[],problemFlags:[],problemLockReleased:false,actualMoveInDate:null,finance:null})) as unknown as LedgerClientRow[];
const run=(query:string)=>applyLedgerQuery(rows,parseLedgerQuery(new URLSearchParams(query)),now);
beforeEach(()=>{workspace.mockResolvedValue({ok:true,result:{rows,snapshotAsOf:now.toISOString(),error:false},assignees:{}});});
test.each(['payment=PAID','moveIn=BALANCE_PAID','chapter=balance_paid&payment=PAID'])('official paid filter %s yields exact 169, pages 100+69, duplicate zero',query=>{
 const first=run(query),second=run(query+'&page=2');
 expect(first.total).toBe(169);expect(second.total).toBe(169);
 expect(first.pageRows).toHaveLength(100);expect(second.pageRows).toHaveLength(69);
 expect([...first.pageRows,...second.pageRows].map(r=>`${r.buildingNo}-${Number(r.unitNo)}`).sort()).toEqual([...official].sort());
 expect(new Set(first.filteredSorted.map(r=>r.unitId)).size).toBe(169);
 expect(first.filteredSorted.some(r=>r.buildingNo==='102'&&Number(r.unitNo)===203)).toBe(false);
});
test('paid include/exclude and other-axis include/exclude compose without losing undated units',()=>{
 expect(run('paymentExclude=PAID').total).toBe(682);
 for(const building of ['101','102','104','105','107']){
  const expected=official.filter(k=>k.startsWith(building+'-')).length;
  expect(run('payment=PAID&building='+building).total).toBe(expected);
  expect(run('payment=PAID&buildingExclude='+building).total).toBe(169-expected);
 }
 expect(run('payment=PAID&building=101&unit=1202').total).toBe(1);
 expect(run('payment=PAID&paymentExclude=PAID').total).toBe(0);
 const excluded=rows.find(r=>r.buildingNo==='102'&&Number(r.unitNo)===203)!;
 expect(applyLedgerQuery([{...excluded,payment:'PAID'}],parseLedgerQuery(new URLSearchParams('payment=PAID')),now).total).toBe(0);
});
test('actual XLSX action exports all 169 filtered rows from page 2, not 69 page rows',async()=>{
 const result=await exportLedgerXlsx(pid,'payment=PAID&page=2&pageSize=100');
 expect(result.ok).toBe(true);if(!result.ok)return;
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(result.base64,'base64') as never);
 const sheet=workbook.worksheets[0];expect(sheet.rowCount-1).toBe(169);
 const labels=Array.from({length:169},(_,i)=>sheet.getRow(i+2).getCell(1).text);
 expect(new Set(labels).size).toBe(169);
 const expected=rows.filter(r=>official.includes(`${r.buildingNo}-${Number(r.unitNo)}`)).map(r=>`${r.buildingNo}동 ${r.unitNo}호`).sort();
 expect(labels.sort()).toEqual(expected);
});
