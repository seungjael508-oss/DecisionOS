export const TODAY_CHAPTERS = [
  { id:"grade", label:"등급" }, { id:"balance", label:"잔금날짜" }, { id:"move", label:"이사날짜" },
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
    case "balance": return !!(e.paid || e.balancePlan);
    case "move": return !!(e.reservation || e.movePlan || e.moved);
    case "unconfirmed": return !(e.paid || e.balancePlan || e.reservation || e.movePlan || e.moved || e.review || e.terminationIntent);
    case "termination": return !!(e.review || e.terminationIntent);
    case "sale": return !!e.sale;
  }
}
export function todayChapterHref(projectId:string, chapter:TodayChapter) {
  return `/projects/${projectId}/move-in/today${chapter === "grade" ? "" : `?todayChapter=${chapter}`}`;
}
