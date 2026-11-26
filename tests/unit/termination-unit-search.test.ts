import {test,expect} from "vitest";
import {matchesTerminationUnit,normalizeTerminationUnitQuery} from "@/lib/move-in/today-chapters";
const target={buildingNo:"101",unitNo:"1902"};
test.each(["101-1902","101동 1902호","101 1902","1902","101동","1902호","１０１－１９０２"])("finds %s",q=>expect(matchesTerminationUnit(target,q)).toBe(true));
test.each(["102-1902","101-1903","190","다른 세대","101-1902-2"])("does not match %s",q=>expect(matchesTerminationUnit(target,q)).toBe(false));
test("blank resets, leading zeros normalize without fuzzy matches",()=>{
 expect(matchesTerminationUnit(target,"  ")).toBe(true);
 expect(matchesTerminationUnit({buildingNo:"101",unitNo:"0201"},"101-201")).toBe(true);
 expect(normalizeTerminationUnitQuery(" <a> ")).toBe("<a>");
 expect(normalizeTerminationUnitQuery("0".repeat(5000))).toHaveLength(40);
});
