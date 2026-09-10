import { WorklogDateForm } from "@/components/move-in/worklog-date-form";
import { WorklogSnapshotView } from "@/components/move-in/worklog-snapshot-view";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { formatWorklogDateLabel } from "@/lib/worklog/day-range";
import { loadMoveInWorklog } from "@/lib/worklog/queries";
import { worklogGeneratedData } from "@/lib/worklog/snapshot";

export default async function MoveInWorklogPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;

  const query = await searchParams;
  const rawDate = Array.isArray(query.date) ? query.date[0] : query.date;
  const result = await loadMoveInWorklog(projectId, rawDate ?? null);
  if (result.error) return <QueryError />;

  const snapshot = result.snapshot;
  const preview = worklogGeneratedData(snapshot);

  return (
    <main className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">입주촉진 업무일지</h1>
        <p className="mt-2 text-xl tabular-nums">{formatWorklogDateLabel(snapshot.date)}</p>
        <p className="mt-1 text-sm text-neutral-600">
          집계 기준 {snapshot.timeZone} 업무일 00:00 이상 ~ 익일 00:00 미만
        </p>
        <WorklogDateForm projectId={projectId} dateYmd={snapshot.date} />
      </header>

      {snapshot.summary.totalUnits === 0 ? (
        <EmptyState>집계할 입주 데이터가 없습니다.</EmptyState>
      ) : (
        <>
          <WorklogSnapshotView snapshot={snapshot} />
          <section className="mt-10" aria-label="보고서 미리보기">
            <h2 className="mb-3 text-lg font-semibold">보고서 미리보기</h2>
            <p className="mb-4 text-sm text-neutral-600">
              화면 집계와 동일한 snapshot입니다.
            </p>
            <WorklogPreview summary={preview} />
          </section>
        </>
      )}
    </main>
  );
}

function WorklogPreview({
  summary,
}: {
  summary: ReturnType<typeof worklogGeneratedData>;
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border border-neutral-300 p-4 text-sm md:grid-cols-4">
      <PreviewItem label="총 대상세대" value={summary.summary.totalUnits} />
      <PreviewItem label="잔금완납" value={summary.summary.balancePaid} />
      <PreviewItem label="입주완료" value={summary.summary.movedIn} />
      <PreviewItem label="입주예정" value={summary.summary.planned} />
      <PreviewItem label="미입주" value={summary.summary.notMovedIn} />
      <PreviewItem label="실입주" value={summary.intent.selfMoveIn} />
      <PreviewItem label="자금부족" value={summary.funding.fundingShortage} />
      <PreviewItem
        label="기존주택 미처분"
        value={summary.funding.existingHomeUnsold}
      />
    </dl>
  );
}

function PreviewItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-neutral-600">{label}</dt>
      <dd className="tabular-nums font-semibold">{value}</dd>
    </div>
  );
}
