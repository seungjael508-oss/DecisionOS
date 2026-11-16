import { expect, test, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync } from 'node:fs';
import db from '../fixtures/floorplan-grades-readonly.json';
import official from '../fixtures/balance-official-169.json';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import { listBuildings, type FloorplanUnit } from '@/lib/move-in/floorplan';
import { fieldConfirmedBalancePaid } from '@/lib/move-in/balance-confirmations';
vi.mock('server-only',()=>({}));
import { floorplanReservationFor } from '@/lib/move-in/floorplan-reservations.server';
import { approvedUnitSourceTags } from '@/lib/move-in/ledger-source-tags.server';
const projectId='1283e198-5043-4027-96d6-edcc7a6686c6';
test('production SELECT: exact grade counts, 169 paid, 339 reserved and all 851 links across four-building pages',()=>{
 const before=JSON.stringify(db);
 const units:FloorplanUnit[]=db.map(r=>{
   const sourceTags=approvedUnitSourceTags(projectId,r.building_no,r.unit_no);
   return {projectId,unitId:r.unit_id,buildingNo:r.building_no,unitNo:r.unit_no,floor:r.floor,currentGrade:r.legacy_grade,
     funding:'NORMAL',moveIn:r.move_in_status as FloorplanUnit['moveIn'],effectiveIntent:'UNDECIDED',rentalType:null,specialReasons:[],sourceTags,
     balancePaidAt:r.balance_paid_at,fieldConfirmedBalancePaid:fieldConfirmedBalancePaid(projectId,r.unit_id),actualMoveInDate:r.actual_move_in_date,revision:'readonly',fetchedAt:'2026-11-09',
     ...floorplanReservationFor({projectId,unitId:r.unit_id,buildingNo:r.building_no,unitNo:r.unit_no,currentContractId:r.contract_id!,currentCustomerId:r.customer_id!})};
 });
 const buildings=listBuildings(units);
 const pages=Array.from({length:Math.ceil(buildings.length/4)},(_,i)=>renderToStaticMarkup(createElement(FloorplanBoard,{projectId,units:units.filter(u=>buildings.slice(i*4,i*4+4).includes(u.buildingNo))})));
 const html=pages.join('');
 const tiles=[...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/g)];
 expect(tiles).toHaveLength(851);
 expect(new Set(tiles.map(t=>t[1])).size).toBe(851);
 for(const u of units) expect(tiles.some(t=>t[1]===`/projects/${projectId}/move-in/units/${u.unitId}`)).toBe(true);
 const counts:Record<string,number>={};
 for(const grade of ['A','B','C','D','부재','상담거절']){
   counts[grade]=(html.match(new RegExp(`data-grade="${grade}"`,'g'))??[]).length;
   expect(counts[grade]).toBe(db.filter(r=>r.legacy_grade===grade).length);
 }
 expect(counts).toEqual({A:569,B:94,C:41,D:132,부재:8,상담거절:7});
 const paid=tiles.filter(t=>t[0].includes('data-balance-paid="true"'));
 const reserved=tiles.filter(t=>t[0].includes('data-move-reserved="true"'));
 expect(paid).toHaveLength(169); expect(reserved).toHaveLength(339);
 expect(units.filter(u=>u.balancePaidAt||u.fieldConfirmedBalancePaid).map(u=>`${u.buildingNo}-${Number(u.unitNo)}`).sort()).toEqual([...official].sort());
 for(const tile of [...paid,...reserved]) expect(tile[0]).toContain('data-grade=');
 for(const page of pages) expect((page.match(/colSpan=/g)??[]).length).toBeLessThanOrEqual(4);
 expect(JSON.stringify(db)).toBe(before);
 const report={input:'PRODUCTION_SELECT',households:851,grades:counts,paid:paid.length,unpaid:851-paid.length,reserved:reserved.length,uniqueLinks:851,pages:pages.length,buildingsPerPage:4,dbWrites:0};
 const output=process.env.FLOORPLAN_QA_OUTPUT_DIR;
 if(output){
   mkdirSync(output,{recursive:true});
   writeFileSync(`${output}/render-verification.json`,JSON.stringify(report,null,2));
   writeFileSync(`${output}/render.html`,'<!doctype html><meta charset="utf-8">'+pages.join('<hr>'));
 }
 console.log(JSON.stringify(report));
});
