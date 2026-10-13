// 초기 URL은 첫 표시만 결정하고 이후 전환은 클라이언트에서 처리한다.
import { FloorplanClient } from "@/components/move-in/floorplan-client";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import {
  listBuildings,
  selectBuilding,
} from "@/lib/move-in/floorplan";
import { loadCurrentFloorplanRows } from "@/lib/move-in/floorplan-current.server";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function MoveInFloorplanPage({
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
  // Old colorBy parameters are accepted without changing the grade encoding.
  const result = await loadCurrentFloorplanRows(projectId);
  if (result.error) return <QueryError />;

  const buildings = listBuildings(result.rows);
  const buildingNo = selectBuilding(buildings, one(query.buildingNo));

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">동호배치도</h1>
      <p className="mb-4 text-sm">오늘 현재 상태 · 현재등급 기준</p>
      {result.anomalyCount > 0 ? <p className="mb-4" role="status">확인필요 {result.anomalyCount}세대는 배치도에서 제외했습니다.</p> : null}
      {result.rows.length === 0 ? (
        <EmptyState>등록된 동호수가 없습니다.</EmptyState>
      ) : (
        <FloorplanClient projectId={projectId} units={result.rows}
          initialBuildingNo={buildingNo} />
      )}
    </main>
  );
}
