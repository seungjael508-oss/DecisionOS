import { ReportGenerateForm } from "@/components/move-in/report-generate-form";
import { ReportList } from "@/components/move-in/report-list";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { canGenerateMoveInReport } from "@/lib/move-in/reports";
import { loadMoveInReports } from "@/lib/move-in/queries";
import { createServerClient } from "@/lib/supabase/server";
import { resolveWorklogTimeZone, todayYmd } from "@/lib/worklog/day-range";

export default async function MoveInReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;

  const [list, projectResult] = await Promise.all([
    loadMoveInReports(projectId),
    (await createServerClient())
      .from("project")
      .select("timezone")
      .eq("id", projectId)
      .maybeSingle(),
  ]);
  if (list.error || projectResult.error) return <QueryError />;

  const dateYmd = todayYmd(resolveWorklogTimeZone(projectResult.data?.timezone));

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">일일 입주촉진 보고서</h1>
      {canGenerateMoveInReport(access.role) ? (
        <ReportGenerateForm projectId={projectId} dateYmd={dateYmd} />
      ) : (
        <p className="mb-8 text-sm text-neutral-600">조회만 가능합니다.</p>
      )}
      {list.rows.length === 0 ? (
        <EmptyState>생성된 보고서가 없습니다.</EmptyState>
      ) : (
        <ReportList rows={list.rows} />
      )}
    </main>
  );
}
