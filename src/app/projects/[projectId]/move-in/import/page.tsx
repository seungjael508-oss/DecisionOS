import { MoveInImportClient } from "@/components/move-in/move-in-import-client";
import { AccessDenied } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";

export default async function MoveInImportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;
  if (access.role !== "PROJECT_ADMIN") {
    return <AccessDenied message="가져오기는 현장 관리자만 사용할 수 있습니다." />;
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">데이터 가져오기</h1>
      <p className="mt-2 text-neutral-700">
        계약자 Excel을 분석한 뒤 관리자 확인이 있는 행만 반영합니다. 분석 단계에서는 DB를
        변경하지 않습니다.
      </p>
      <div className="mt-6">
        <MoveInImportClient projectId={projectId} />
      </div>
    </main>
  );
}
