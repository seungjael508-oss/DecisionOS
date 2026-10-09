import { CompetitorMonthly } from "@/components/move-in/competitor-monthly";
import { MarketPeriodNav } from "@/components/move-in/market-period-nav";
import { MarketSource } from "@/components/move-in/market-source";
import { EmptyState } from "@/components/move-in/status-copy";
import {
  formatPeriodLabel,
  formatPrice,
  MARKET_SCOPE_LABELS,
} from "@/lib/market/labels";
import { formatCount, formatDelta } from "@/lib/market/metrics";
import { loadMarketRows } from "@/lib/market/queries";
import { competitorHistory, buildMarketView } from "@/lib/market/view";
import { requireMoveInAccess } from "@/lib/move-in/access";

function MarketQueryError() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">시장 데이터를 불러오지 못했습니다.</h1>
    </main>
  );
}

export default async function MoveInMarketPage({
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
  const rawPeriod = Array.isArray(query.period) ? query.period[0] : query.period;
  const result = await loadMarketRows(projectId);
  if (result.error) return <MarketQueryError />;

  const view = buildMarketView(result.rows, rawPeriod ?? null);

  return (
    <main className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">시장동향</h1>
        <p className="mt-2 text-neutral-700">
          {access.projectName} 전체 및 경쟁단지의 월별 매물·거래·가격 변화를
          확인합니다.
        </p>
        <p className="mt-1 text-sm text-neutral-600">외부 시장데이터</p>
      </header>

      {result.rows.length === 0 ? (
        <EmptyState>등록된 시장 데이터가 없습니다.</EmptyState>
      ) : view.period ? (
        <>
          <MarketPeriodNav
            projectId={projectId}
            periods={view.periods}
            selected={view.period}
          />

          <section className="mb-10" aria-labelledby="region-heading">
            <h2 id="region-heading" className="text-lg font-semibold">
              {MARKET_SCOPE_LABELS.REGION_TOTAL}
            </h2>
            <p className="mb-4 text-sm text-neutral-600">외부 시장데이터</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiCard
                label="매매 매물"
                value={view.currentRegion?.saleListingCount ?? null}
                delta={view.deltas.sale}
              />
              <KpiCard
                label="전세 매물"
                value={view.currentRegion?.jeonseListingCount ?? null}
                delta={view.deltas.jeonse}
              />
              <KpiCard
                label="월세 매물"
                value={view.currentRegion?.monthlyRentListingCount ?? null}
                delta={view.deltas.monthly}
              />
              <KpiCard
                label="거래량"
                value={view.currentRegion?.transactionCount ?? null}
                delta={view.deltas.transaction}
              />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-300">
                    <th className="py-2 pr-3 font-medium">구분</th>
                    <th className="py-2 pr-3 font-medium">현재월</th>
                    <th className="py-2 pr-3 font-medium">전월</th>
                    <th className="py-2 font-medium">증감</th>
                  </tr>
                </thead>
                <tbody>
                  <CompareRow
                    label="매매"
                    current={view.currentRegion?.saleListingCount ?? null}
                    previous={view.previousRegion?.saleListingCount ?? null}
                    delta={view.deltas.sale}
                  />
                  <CompareRow
                    label="전세"
                    current={view.currentRegion?.jeonseListingCount ?? null}
                    previous={view.previousRegion?.jeonseListingCount ?? null}
                    delta={view.deltas.jeonse}
                  />
                  <CompareRow
                    label="월세"
                    current={view.currentRegion?.monthlyRentListingCount ?? null}
                    previous={view.previousRegion?.monthlyRentListingCount ?? null}
                    delta={view.deltas.monthly}
                  />
                  <CompareRow
                    label="거래량"
                    current={view.currentRegion?.transactionCount ?? null}
                    previous={view.previousRegion?.transactionCount ?? null}
                    delta={view.deltas.transaction}
                  />
                </tbody>
              </table>
            </div>
            {view.currentRegion ? (
              <MarketSource
                source={view.currentRegion.source}
                collectedAt={view.currentRegion.collectedAt}
              />
            ) : null}
          </section>

          <section className="mb-10" aria-labelledby="competitor-heading">
            <h2 id="competitor-heading" className="text-lg font-semibold">
              {MARKET_SCOPE_LABELS.COMPETITOR}
            </h2>
            <p className="mb-4 text-sm text-neutral-600">외부 시장데이터</p>
            {view.competitors.length === 0 ? (
              <EmptyState>등록된 경쟁단지 데이터가 없습니다.</EmptyState>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-neutral-300">
                        <th className="py-2 pr-3 font-medium">경쟁단지</th>
                        <th className="py-2 pr-3 font-medium">매매</th>
                        <th className="py-2 pr-3 font-medium">전세</th>
                        <th className="py-2 pr-3 font-medium">월세</th>
                        <th className="py-2 pr-3 font-medium">거래</th>
                        <th className="py-2 pr-3 font-medium">입주세대</th>
                        <th className="py-2 font-medium">입주시점</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.competitors.map((row) => (
                        <tr key={row.complexName} className="border-b border-neutral-200 align-top">
                          <td className="py-2 pr-3 font-semibold">
                            {row.complexName}
                            <MarketSource
                              source={row.source}
                              collectedAt={row.collectedAt}
                            />
                            <CompetitorMonthly
                              complexName={row.complexName ?? ""}
                              history={competitorHistory(
                                result.rows,
                                row.complexName ?? "",
                              )}
                            />
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {formatCount(row.saleListingCount)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {formatCount(row.jeonseListingCount)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {formatCount(row.monthlyRentListingCount)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {formatCount(row.transactionCount)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {formatCount(row.moveInUnits)}
                          </td>
                          <td className="py-2">{row.moveInDate ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="flex flex-col gap-3 md:hidden">
                  {view.competitors.map((row) => (
                    <li key={row.complexName} className="border border-neutral-300 p-4">
                      <p className="text-lg font-semibold">{row.complexName}</p>
                      <p>매매 {formatCount(row.saleListingCount)}</p>
                      <p>전세 {formatCount(row.jeonseListingCount)}</p>
                      <p>월세 {formatCount(row.monthlyRentListingCount)}</p>
                      <p>입주시점 {row.moveInDate ?? "—"}</p>
                      <p>입주세대 {formatCount(row.moveInUnits)}</p>
                      <MarketSource
                        source={row.source}
                        collectedAt={row.collectedAt}
                      />
                      <CompetitorMonthly
                        complexName={row.complexName ?? ""}
                        history={competitorHistory(
                          result.rows,
                          row.complexName ?? "",
                        )}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="mb-10" aria-labelledby="unit-type-heading">
            <h2 id="unit-type-heading" className="text-lg font-semibold">
              타입별 시장
            </h2>
            {view.unitTypes.length === 0 ? (
              <EmptyState>등록된 타입별 데이터가 없습니다.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-neutral-300">
                      <th className="py-2 pr-3 font-medium">타입</th>
                      <th className="py-2 pr-3 font-medium">매매</th>
                      <th className="py-2 pr-3 font-medium">전세</th>
                      <th className="py-2 pr-3 font-medium">월세</th>
                      <th className="py-2 font-medium">평균가격</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.unitTypes.map((row) => (
                      <tr key={row.unitType} className="border-b border-neutral-200">
                        <td className="py-2 pr-3">{row.unitType}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {formatCount(row.saleListingCount)}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {formatCount(row.jeonseListingCount)}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {formatCount(row.monthlyRentListingCount)}
                        </td>
                        <td className="py-2 tabular-nums">
                          {formatPrice(row.priceAvg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {view.internal.length > 0 ? (
            <section aria-labelledby="internal-heading">
              <h2 id="internal-heading" className="text-lg font-semibold">
                {MARKET_SCOPE_LABELS.INTERNAL}
              </h2>
              <p className="mb-4 text-sm text-neutral-600">
                내부 운영데이터가 아닌 시장조사 자료입니다. 계약/입주 현황은 입주
                현황 화면을 사용하세요.
              </p>
              <ul className="flex flex-col gap-3">
                {view.internal.map((row) => (
                  <li
                    key={row.marketDataId}
                    className="border border-neutral-300 p-4"
                  >
                    <p>
                      {formatPeriodLabel(row.period)}
                      {row.unitType ? ` · ${row.unitType}` : ""}
                    </p>
                    <p>매매 {formatCount(row.saleListingCount)}</p>
                    <p>전세 {formatCount(row.jeonseListingCount)}</p>
                    <p>월세 {formatCount(row.monthlyRentListingCount)}</p>
                    <p>거래 {formatCount(row.transactionCount)}</p>
                    <MarketSource
                      source={row.source}
                      collectedAt={row.collectedAt}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <EmptyState>등록된 시장 데이터가 없습니다.</EmptyState>
      )}
    </main>
  );
}

function KpiCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: number | null;
  delta: number | null;
}) {
  return (
    <article className="border border-neutral-300 p-4">
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">
        {formatCount(value)}
      </p>
      <p className="mt-1 text-sm text-neutral-700">{formatDelta(delta)}</p>
    </article>
  );
}

function CompareRow({
  label,
  current,
  previous,
  delta,
}: {
  label: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
}) {
  return (
    <tr className="border-b border-neutral-200">
      <td className="py-2 pr-3">{label}</td>
      <td className="py-2 pr-3 tabular-nums">{formatCount(current)}</td>
      <td className="py-2 pr-3 tabular-nums">{formatCount(previous)}</td>
      <td className="py-2 tabular-nums">
        {delta === null ? "전월 데이터 없음" : delta > 0 ? `+${delta}` : String(delta)}
      </td>
    </tr>
  );
}
