import { TodayFilters } from "@/components/move-in/today-filters";
import { QueryError } from "@/components/move-in/status-copy";
import { TodayChapterPanel } from "@/components/move-in/today-chapter-panel";
import { TodayTaskRetry } from "@/components/move-in/today-task-retry";
import { TODAY_TASK_PENDING_MESSAGE } from "@/lib/move-in/today-task";
import { chooseTodayChapter, todayChapterHref } from "@/lib/move-in/today-chapters";
import { requireMoveInAccess } from "@/lib/move-in/access";

export default async function MoveInTodayPage({ params, searchParams }: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {projectId}=await params;
  const query=await searchParams;
  const one=(value:string|string[]|undefined)=>(Array.isArray(value)?value[0]:value)??null;
  const chapter=chooseTodayChapter(one(query.todayChapter));
  const access=await requireMoveInAccess(projectId);
  if(!access.ok) return <QueryError/>;
  const taskUnit=one(query.taskUnit), next=one(query.taskNext);
  const showRetry=one(query.moveInNotice)==="taskPending" && taskUnit
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskUnit);
  return <main className="p-4 md:p-8">
    <h1 className="mb-6 text-2xl font-semibold">오늘 관리대상</h1>
    <TodayFilters projectId={projectId} chapter={chapter}/>
    {showRetry && taskUnit ? <div role="alert" className="mb-3 flex flex-wrap items-center gap-2 border border-red-300 p-2 text-sm text-red-800">{TODAY_TASK_PENDING_MESSAGE}<TodayTaskRetry projectId={projectId} unitId={taskUnit} nextAt={next&&!Number.isNaN(Date.parse(next))?next:null} doneHref={todayChapterHref(projectId,chapter)}/></div> : null}
    <TodayChapterPanel projectId={projectId} chapter={chapter} mayReview={access.role==="PROJECT_ADMIN"}
      reviewNotice={one(query.review)} unitSearch={one(query.unitSearch)} todayGrade={one(query.todayGrade)}/>
  </main>;
}
