import Link from "next/link";
import { TODAY_CHAPTERS, todayChapterHref, type TodayChapter } from "@/lib/move-in/today-chapters";

export function TodayFilters({ projectId, chapter }: { projectId:string; chapter:TodayChapter }) {
  return <nav aria-label="오늘 관리대상 챕터" className="mb-5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
    {TODAY_CHAPTERS.map(({id,label}) => <Link prefetch={false} key={id}
      href={todayChapterHref(projectId,id)} aria-current={chapter===id ? "page" : undefined}
      className={`flex min-h-11 items-center justify-center rounded border px-4 py-2 text-sm font-medium ${chapter===id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-900"}`}>
      {label}
    </Link>)}
  </nav>;
}
