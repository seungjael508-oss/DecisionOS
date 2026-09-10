import Link from "next/link";
import { KpiGrid } from "@/components/move-in/kpi-grid";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import {
  filterTodayRows,
  TODAY_REASON_LABELS,
  todayReasons,
} from "@/lib/move-in/filters";
import { computeMoveInKpis } from "@/lib/move-in/kpis";
import {
  FUNDING_STATUS_LABELS,
  FUNDING_STATUS_VALUES,
  MOVE_IN_STATUS_LABELS,
  MOVE_IN_STATUS_VALUES,
  OCCUPANCY_INTENT_LABELS,
  OCCUPANCY_INTENT_VALUES,
  formatUnitLabel,
} from "@/lib/move-in/labels";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { loadUnitRows } from "@/lib/move-in/queries";

export default async function MoveInDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;

  const result = await loadUnitRows(projectId);
  if (result.error) return <QueryError />;

  const kpis = computeMoveInKpis(
    result.rows.length,
    result.rows.map((row) => ({
      occupancyIntent: row.occupancyIntent,
      fundingStatus: row.fundingStatus,
      moveInStatus: row.moveInStatus,
      balancePaidAt: row.balancePaidAt,
      actualMoveInDate: row.actualMoveInDate,
      plannedMoveInDate: row.plannedMoveInDate,
    })),
  );

  const today = filterTodayRows(result.rows, "all").slice(0, 5);

  return (
    <main className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">{access.projectName}</h1>
        <p className="mt-1 text-neutral-600">입주촉진</p>
      </header>

      {result.rows.length === 0 ? (
        <EmptyState>등록된 동호수가 없습니다.</EmptyState>
      ) : (
        <KpiGrid kpis={kpis} />
      )}

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">오늘 관리대상</h2>
            <Link
              className="text-sm underline"
              href={`/projects/${projectId}/move-in/today`}
            >
              전체 보기
            </Link>
          </div>
          {today.length === 0 ? (
            <EmptyState>오늘 관리할 세대가 없습니다.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {today.map((row) => (
                <li key={row.unitId} className="border border-neutral-300 p-3">
                  <Link
                    className="font-semibold underline"
                    href={`/projects/${projectId}/move-in/units/${row.unitId}`}
                  >
                    {formatUnitLabel(row.buildingNo, row.unitNo)}
                  </Link>
                  <p className="text-sm text-neutral-700">
                    {todayReasons(row)
                      .map((reason) => TODAY_REASON_LABELS[reason])
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">상태 요약</h2>
          {result.rows.length === 0 ? (
            <EmptyState>등록된 동호수가 없습니다.</EmptyState>
          ) : (
            <div className="flex flex-col gap-6">
              <Distribution
                title="입주의향"
                total={result.rows.length}
                counts={countBy(
                  result.rows.map((row) => row.occupancyIntent),
                  OCCUPANCY_INTENT_VALUES,
                )}
                labels={OCCUPANCY_INTENT_LABELS}
              />
              <Distribution
                title="자금상태"
                total={result.rows.length}
                counts={countBy(
                  result.rows.map((row) => row.fundingStatus),
                  FUNDING_STATUS_VALUES,
                )}
                labels={FUNDING_STATUS_LABELS}
              />
              <Distribution
                title="입주진행"
                total={result.rows.length}
                counts={countBy(
                  result.rows.map((row) => row.moveInStatus),
                  MOVE_IN_STATUS_VALUES,
                )}
                labels={MOVE_IN_STATUS_LABELS}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function countBy<T extends string>(
  values: Array<T | null>,
  keys: T[],
): Record<T, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<
    T,
    number
  >;
  for (const value of values) {
    if (value && value in counts) counts[value] += 1;
  }
  return counts;
}

function Distribution<T extends string>({
  title,
  total,
  counts,
  labels,
}: {
  title: string;
  total: number;
  counts: Record<T, number>;
  labels: Record<T, string>;
}) {
  return (
    <section aria-label={title}>
      <h3 className="mb-2 font-medium">{title}</h3>
      <ul className="flex flex-col gap-2">
        {(Object.keys(counts) as T[]).map((key) => {
          const count = counts[key];
          const width = total === 0 ? 0 : Math.round((count / total) * 100);
          return (
            <li key={key}>
              <div className="flex justify-between text-sm">
                <span>{labels[key]}</span>
                <span className="tabular-nums">{count}</span>
              </div>
              <div className="h-2 bg-neutral-200">
                <div
                  className="h-2 bg-neutral-800"
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
