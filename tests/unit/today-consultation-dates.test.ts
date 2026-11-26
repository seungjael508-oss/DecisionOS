import {expect,test} from "vitest";
import {resolveConsultationScheduleDates} from "@/lib/move-in/consultation-schedule";
const who={projectId:"p",unitId:"u",currentCustomerId:"c",currentGrade:"C"};
const stamp="2026-11-26T01:00:00Z", now=new Date("2026-11-26T02:00:00Z");
const note=(content:string)=>({project_id:"p",unit_id:"u",customer_id:"c",id:"n",consulted_at:stamp,content});
test("does not turn a dated callback into the move-in date",()=>{
 expect(resolveConsultationScheduleDates(who,[note("11월 말 입주가 결정 됨 12월 1일 전화통화")],now,"today"))
   .toEqual({balance:null,moveIn:"11월 말"});
});
test("keeps both express dates but does not turn an unconfirmed date or an earlier holder into a plan",()=>{
 expect(resolveConsultationScheduleDates(who,[note("12월 16일 잔금 예정, 12월 20일 입주 예정")],now,"today"))
   .toEqual({balance:"12/16",moveIn:"12/20"});
 expect(resolveConsultationScheduleDates(who,[note("잔금 12/20 아직 확정되지 않음"),{...note("이전 고객 입주 12/20 예정"),customer_id:"old"}],now,"today"))
   .toEqual({balance:null,moveIn:null});
});
