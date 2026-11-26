// 초기 URL은 첫 표시만 결정하고 이후 전환은 클라이언트에서 처리한다.
import { FloorplanClient } from "@/components/move-in/floorplan-client";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import { loadMoveInTodayQueueRows } from "@/lib/move-in/queries";
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
  const [result, today] = await Promise.all([loadCurrentFloorplanRows(projectId), loadMoveInTodayQueueRows(projectId)]);
  if (result.error) return <QueryError />;

  const buildings = listBuildings(result.rows);
  const focus = result.rows.find(row => row.unitId === one(query.focusUnit));
  const buildingNo = selectBuilding(buildings, focus?.buildingNo ?? one(query.buildingNo));

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">동호배치도</h1>
      <p className="mb-4 text-sm">오늘 현재 상태 · 잔금완납 세대 초록색 표시</p>
      {today.error ? <p role="status">오늘 관리 표시를 불러오지 못했습니다. 배치도와 상담 기록은 사용할 수 있습니다.</p> : null}
      {result.anomalyCount > 0 ? <p className="mb-4" role="status">확인필요 {result.anomalyCount}세대는 배치도에서 제외했습니다.</p> : null}
      {result.rows.length === 0 ? (
        <EmptyState>등록된 동호수가 없습니다.</EmptyState>
      ) : (
        <FloorplanClient projectId={projectId} units={result.rows}
          initialBuildingNo={buildingNo} todayUnitIds={today.error ? [] : today.rows.map(row => row.unitId)} focusUnitId={focus?.unitId} />
      )}
    </main>
  );
}
