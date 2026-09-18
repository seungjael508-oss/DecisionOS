import { canManageField } from "@/lib/move-in/field-access";
import { WorklogDateForm } from "@/components/move-in/worklog-date-form";
import { WorklogSnapshotView } from "@/components/move-in/worklog-snapshot-view";
import { ReportGenerateForm } from "@/components/move-in/report-generate-form";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { formatWorklogDateLabel } from "@/lib/worklog/day-range";
import { loadMoveInWorklog } from "@/lib/worklog/queries";
import { worklogSnapshotFingerprint } from "@/lib/worklog/fingerprint";

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
  if (result.error) return <p role="alert" className="p-8">업무일지를 불러오지 못했습니다.</p>;

  const snapshot = result.snapshot;

  return (
    <main className="p-8">
      <header className="mb-8">
        <p className="mb-2 text-xl">{access.projectName}</p>
        <h1 className="text-3xl font-semibold">일일 업무현황</h1>
        <p className="mt-2 text-xl tabular-nums">{formatWorklogDateLabel(snapshot.date)}</p>
        <p className="mt-1 text-sm text-neutral-600">
          자동 집계 기준 {snapshot.timeZone} 업무일 00:00 이상 ~ 익일 00:00 미만
        </p>
        <p className="mt-1 text-sm text-neutral-600">최종 갱신 {new Intl.DateTimeFormat("ko-KR", { timeZone: snapshot.timeZone, dateStyle: "medium", timeStyle: "medium" }).format(new Date(result.refreshedAt))}</p>
        <WorklogDateForm projectId={projectId} dateYmd={snapshot.date} />
      </header>

      <WorklogSnapshotView snapshot={snapshot} />
      {canManageField(projectId, access.role) ? (
        <section className="mt-8" aria-label="현재 업무일지 보고서 저장">
          <p className="mb-3 text-sm text-neutral-600">현재 표시된 집계를 보고서로 저장합니다.</p>
          <ReportGenerateForm key={`${snapshot.date}:${worklogSnapshotFingerprint(snapshot)}`} projectId={projectId} dateYmd={snapshot.date} expectedFingerprint={worklogSnapshotFingerprint(snapshot)} />
        </section>
      ) : null}
    </main>
  );
}
