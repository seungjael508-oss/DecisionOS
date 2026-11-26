import { expect,test,vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TodayChapterPanel } from "@/components/move-in/today-chapter-panel";
import { matchTodayChapter } from "@/lib/move-in/today-chapters";

const ledger=vi.hoisted(()=>vi.fn());
const keys=vi.hoisted(()=>vi.fn());
vi.mock("@/app/projects/[projectId]/move-in/today/termination-actions",()=>({changeTerminationReview:vi.fn()}));
vi.mock("@/lib/move-in/ledger-queries.server",()=>({loadOperationalLedgerRows:ledger}));
vi.mock("@/lib/move-in/floorplan-reservations.server",()=>({floorplanReservationFor:()=>({moveReservation:"NONE"})}));
vi.mock("@/lib/move-in/floorplan-schedule.server",()=>({loadFloorplanScheduleBadges:()=>({dates:new Map()})}));
vi.mock("@/lib/move-in/termination-review.server",()=>({loadTerminationReviewKeys:keys,loadTerminationReviews:vi.fn()}));
const unit=(id:string,unitNo:string,intent:string)=>({unitId:id,buildingNo:"101",unitNo,currentContractId:`c-${id}`,effectiveIntent:intent});
const html=async(chapter:"unconfirmed"|"termination"|"sale")=>renderToStaticMarkup(await TodayChapterPanel({projectId:"p",chapter,mayReview:false,reviewNotice:null}));
test("manual review is exclusive against unconfirmed and resale, not balance or moving",()=>{
 expect(matchTodayChapter("unconfirmed",{review:true})).toBe(false);
 expect(matchTodayChapter("sale",{review:true,sale:true})).toBe(false);
 expect(matchTodayChapter("sale",{terminationIntent:true,sale:true})).toBe(false);
 expect(matchTodayChapter("paid",{review:true,paid:true})).toBe(true);
 expect(matchTodayChapter("move",{review:true,reservation:true})).toBe(true);
});
test("the real chapter panel loads current-contract review keys across all three reads",async()=>{
 ledger.mockResolvedValue({rows:[unit("a","101","SALE_TRANSFER"),unit("b","102","SALE_TRANSFER"),unit("z","103","UNDECIDED")]});
 keys.mockResolvedValue({rows:[{unit_id:"a",contract_id:"c-a"},{unit_id:"b",contract_id:"c-old"}],error:false});
 const unconfirmed=await html("unconfirmed");
 expect(unconfirmed).not.toContain("101동 101호");
 expect(unconfirmed).toContain("101동 102호");
 const sale=await html("sale");
 expect(sale).not.toContain("101동 101호");
 expect(sale).toContain("101동 102호");
 const termination=await html("termination");
 expect(termination).toContain("101동 101호");
 expect(termination).not.toContain("101동 102호");
 expect(termination).not.toContain("검토 사유");
});
test("unavailable review reads do not put reviewed units back into working filters",async()=>{
 ledger.mockResolvedValue({rows:[unit("a","101","SALE_TRANSFER")]});
 keys.mockResolvedValue({rows:[],error:true});
 expect(await html("unconfirmed")).not.toContain("101동 101호");
 expect(await html("sale")).not.toContain("101동 101호");
});
test("grade view uses the current ledger grade and excludes verified paid, including field-confirmed paid",async()=>{
 ledger.mockResolvedValue({rows:[
  {...unit("a","101","MOVE_IN"),currentGrade:"B",fieldConfirmedBalancePaid:true},
  {...unit("b","102","MOVE_IN"),currentGrade:"A",balancePaidAt:"2026-11-26"},
  {...unit("c","103","SALE_TRANSFER"),currentGrade:"C",finance:{saleBalance:20000000}},
  {...unit("d","104","UNDECIDED"),currentGrade:"D"},
 ]});
 const out=renderToStaticMarkup(await TodayChapterPanel({projectId:"p",chapter:"grade",mayReview:false,reviewNotice:null,todayGrade:"C"}));
 expect(out).toContain("101동 103호");
 expect(out).not.toContain("101동 101호");
 expect(out).not.toContain("101동 102호");
 expect(out).not.toContain("101동 104호");
 expect(out).toContain("20,000,000원");
 expect(matchTodayChapter("grade",{paid:true})).toBe(false);
});
