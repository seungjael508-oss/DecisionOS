import { expect,test } from "vitest";
import { TODAY_CHAPTERS, chooseTodayChapter, matchTodayChapter } from "@/lib/move-in/today-chapters";

test("seven fixed tabs and default grade",()=>{
 expect(TODAY_CHAPTERS.map(x=>x.label)).toEqual(["등급","잔금날짜","잔금완납","이사날짜","미확정","해지","전매"]);
 expect(chooseTodayChapter("untrusted")).toBe("grade");
});
test("reservation, consultation, and paid evidence do not stand in for each other",()=>{
 expect(matchTodayChapter("move",{reservation:true})).toBe(true);
 expect(matchTodayChapter("balance",{reservation:true})).toBe(false);
 expect(matchTodayChapter("balance",{paid:true})).toBe(false);
 expect(matchTodayChapter("balance",{balancePlan:true})).toBe(true);
 expect(matchTodayChapter("balance",{paid:true,balancePlan:true})).toBe(false);
 expect(matchTodayChapter("paid",{paid:true,balancePlan:true})).toBe(true);
 expect(matchTodayChapter("paid",{balancePlan:true})).toBe(false);
 expect(matchTodayChapter("unconfirmed",{paid:true})).toBe(false);
 expect(matchTodayChapter("move",{movePlan:true})).toBe(true);
 expect(matchTodayChapter("unconfirmed",{balancePlan:true})).toBe(false);
 expect(matchTodayChapter("unconfirmed",{})).toBe(true);
});
test("a grade or resale alone is never termination review",()=>{
 expect(matchTodayChapter("termination",{sale:true})).toBe(false);
 expect(matchTodayChapter("termination",{review:true})).toBe(true);
 expect(matchTodayChapter("sale",{sale:true})).toBe(true);
});
