import { describe, expect, it } from "vitest";
import { buildMoveInWorklogSnapshot, worklogGeneratedData, type WorklogMasterSnapshot } from "@/lib/worklog/snapshot";
import { worklogDayRange } from "@/lib/worklog/day-range";
const range = worklogDayRange("2026-09-17", "Asia/Seoul");
const units = Array.from({length:851}, (_,i)=>({unitId:`synthetic-${i}`,buildingNo:"TEST",unitType:`TYPE-${i%7}`}));
const master: WorklogMasterSnapshot[] = units.map((u,i)=>({...u,asOf:"2026-09-15T00:00:00+09:00",legacyGrade:i<245?"A":i<401?"B":i<782?"C":i<821?"D":i<840?"부재":"상담거절",balancePaid:i<10?true:i<20?false:null,phoneInvalid:i<109}));
const event = (id:string,unitId:string,contactType:string,legacyGrade:string|null=null)=>({id,unitId,contactType,legacyGrade,consultedAt:"2026-09-17T09:00:00+09:00",purpose:"잔금독촉",nextActionAt:"2026-09-18T00:00:00+09:00"});
describe("final worklog migration contract",()=>{
 it("preserves all 851 units including 109 invalid phones, using the master grade once per unit",()=>{
  const s=buildMoveInWorklogSnapshot(units,[],[],range,{masterSnapshots:master});
  expect(s.salesConsultation?.total.supply).toBe(851);
  expect(s.salesConsultation?.rows.reduce((n,r)=>n+r.supply,0)).toBe(851);
  expect(s.salesConsultation?.rows).toHaveLength(7);
  expect(s.salesConsultation?.total.grades).toEqual({A:245,B:156,C:381,D:39,부재:19,상담거절:11});
  expect(s.sourceReadiness).toEqual({master:"READY",phoneInvalid:109});
 });
 it("uses master after old history but lets later valid consultation change the grade",()=>{
  const events=[{...event("old","synthetic-0","CALL","D"),consultedAt:"2026-09-14T00:00:00+09:00"},event("new","synthetic-1","CALL","C")];
  const s=buildMoveInWorklogSnapshot(units,[],events,range,{masterSnapshots:master});
  expect(s.salesConsultation?.total.grades).toMatchObject({A:244,C:382,D:39});
  const past=buildMoveInWorklogSnapshot(units,[],[],worklogDayRange("2026-09-10","Asia/Seoul"),{masterSnapshots:master});
  expect(past.sourceReadiness?.master).toBe("UNAVAILABLE");
  expect(past.salesConsultation?.total.unclassified).toBe(851);
 });
 it("counts real events, all channels, purpose, and prior-state recontacts without a 30-day threshold",()=>{
  const events=[event("a","synthetic-830","CALL","A"),event("b","synthetic-845","VISIT"),event("c","synthetic-500","MESSAGE"),event("d","synthetic-500","CALL"),event("e","synthetic-500","CALL")];
  const s=buildMoveInWorklogSnapshot(units,[],[...events,events[0]],range,{masterSnapshots:master});
  expect(s.consultationActivity?.today).toEqual({call:3,visit:1,message:1,unknown:0,other:0,total:5});
  expect(s.consultations.totalToday).toBe(5);
  expect(s.consultationActivity?.rows.find(r=>r.purpose==="잔금독촉")?.today.total).toBe(5);
  expect(s.otherActivities?.automatic).toMatchObject({absenceRecontacts:1,refusalRecontacts:1,cdRecontacts:1,nextContactSettings:5});
 });
 it("counts only explicit active confirmed classifications and deduplicates the total",()=>{
  const s=buildMoveInWorklogSnapshot(units,[],[],range,{masterSnapshots:master,managementClassifications:[
   {unitId:"synthetic-1",asOf:range.startIso,confirmed:true,active:true,category:"계약금대여"},
   {unitId:"synthetic-1",asOf:range.startIso,confirmed:true,active:true,category:"기타연체"},
   {unitId:"synthetic-2",asOf:range.startIso,confirmed:false,active:true,category:"기타연체"},
   {unitId:"synthetic-3",asOf:range.endIso,confirmed:true,active:true,category:"기타연체"},
  ]});
  expect(s.managementTargets?.status).toBe("READY");
  if(s.managementTargets?.status==="READY")expect(s.managementTargets.total.supply).toBe(1);
 });
 it("keeps paid flags separate from payment timestamps and unknown is not unpaid",()=>{
  const s=buildMoveInWorklogSnapshot(units,[],[],range,{masterSnapshots:master});
  expect(s.balanceManagement).toEqual({paid:10,unpaid:10,unknown:831,remindersToday:0});
  expect(s.summary.balancePaidToday).toBe(0);
  expect(s.summary.balancePaid).toBe(10);
  expect(s.byUnitType.reduce((n,r)=>n+r.balancePaid,0)).toBe(10);
 });
 it("stores only aggregate data and detaches it from later source changes",()=>{
  const input={...event("e","synthetic-1","CALL"),content:"PRIVATE_CONTENT",customerName:"PRIVATE_NAME",phone:"PRIVATE_PHONE",address:"PRIVATE_ADDRESS"};
  const s=buildMoveInWorklogSnapshot(units,[],[input],range,{masterSnapshots:master});
  const saved=worklogGeneratedData(s);const before=JSON.stringify(saved);
  for(const marker of ["PRIVATE_CONTENT","PRIVATE_NAME","PRIVATE_PHONE","PRIVATE_ADDRESS","synthetic-1"])expect(before).not.toContain(marker);
  s.salesConsultation!.total.grades.A=999;expect(JSON.stringify(saved)).toBe(before);
 });
});
