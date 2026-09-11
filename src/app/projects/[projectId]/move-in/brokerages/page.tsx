import { BrokerageBoard } from "@/components/move-in/brokerage-board";
import { AccessDenied, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { loadBrokerageOffices } from "@/lib/move-in/queries";

export default async function MoveInBrokeragesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;
  if (access.role !== "PROJECT_ADMIN") {
    return (
      <AccessDenied message="중개업소 관리는 현장 관리자만 사용할 수 있습니다." />
    );
  }

  const result = await loadBrokerageOffices(projectId);
  if (result.error) return <QueryError />;

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">중개업소 관리</h1>
      <BrokerageBoard projectId={projectId} offices={result.offices} />
    </main>
  );
}
