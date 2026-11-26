export const TODAY_CHAPTERS = [
  { id:"grade", label:"등급" }, { id:"balance", label:"잔금날짜" }, { id:"paid", label:"잔금완납" }, { id:"move", label:"이사날짜" },
  { id:"unconfirmed", label:"미확정" }, { id:"termination", label:"해지" }, { id:"sale", label:"전매" },
] as const;
export type TodayChapter = (typeof TODAY_CHAPTERS)[number]["id"];
export function chooseTodayChapter(value: string | null | undefined): TodayChapter {
  return TODAY_CHAPTERS.find(({id}) => id === value)?.id ?? "grade";
}
export type TodayChapterEvidence = {
  paid?: boolean; balancePlan?: boolean; reservation?: boolean; movePlan?: boolean;
  moved?: boolean; review?: boolean; terminationIntent?: boolean; sale?: boolean;
};
export function matchTodayChapter(chapter: TodayChapter, e: TodayChapterEvidence): boolean {
  switch (chapter) {
    case "grade": return true;
    case "balance": return !e.paid && !!e.balancePlan;
    case "paid": return !!e.paid;
    case "move": return !!(e.reservation || e.movePlan || e.moved);
    case "unconfirmed": return !(e.paid || e.balancePlan || e.reservation || e.movePlan || e.moved || e.review || e.terminationIntent);
    case "termination": return !!(e.review || e.terminationIntent);
    case "sale": return !!e.sale;
  }
}
export function todayChapterHref(projectId:string, chapter:TodayChapter) {
  return `/projects/${projectId}/move-in/today${chapter === "grade" ? "" : `?todayChapter=${chapter}`}`;
}

/** Only a location filter, never a scope selector or a contract identifier. */
export function normalizeTerminationUnitQuery(raw: string | null | undefined): string {
  const clipped=Array.from(raw ?? "").slice(0, 100).join("").normalize("NFKC").trim();
  return Array.from(clipped).slice(0, 40).join("");
}
export function matchesTerminationUnit(row:{buildingNo:string; unitNo:string},raw:string):boolean {
  const input=normalizeTerminationUnitQuery(raw);
  if(!input) return true;
  const stripZeros=(v:string)=>v.replace(/^0+(?=\d)/,"");
  const pair=input.match(/^(\d{1,6})(?:\s*동\s*|\s*[-–—]\s*|\s+)(\d{1,6})\s*호?$/);
  if(pair) return stripZeros(row.buildingNo)===stripZeros(pair[1]) && stripZeros(row.unitNo)===stripZeros(pair[2]);
  const single=input.match(/^(\d{1,6})\s*(동|호)?$/);
  if(!single) return false;
  const key=stripZeros(single[1]);
  return (single[2]!=="호" && key===stripZeros(row.buildingNo)) ||
    (single[2]!=="동" && key===stripZeros(row.unitNo));
}
