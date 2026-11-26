// @vitest-environment jsdom
import { createElement } from "react";
import { render,screen } from "@testing-library/react";
import { expect,test } from "vitest";
import { TodayFilters } from "@/components/move-in/today-filters";
test("screenshot filter wall is replaced by exactly seven usable chapter links",()=>{
 render(createElement(TodayFilters,{projectId:"p",chapter:"move"}));
 const links=screen.getAllByRole("link");
 expect(links.map(a=>a.textContent)).toEqual(["등급","잔금날짜","잔금완납","이사날짜","미확정","해지","전매"]);
 expect(screen.getByRole("link",{name:"이사날짜"}).getAttribute("aria-current")).toBe("page");
 expect(screen.getByRole("link",{name:"해지"}).getAttribute("href")).toBe("/projects/p/move-in/today?todayChapter=termination");
});
