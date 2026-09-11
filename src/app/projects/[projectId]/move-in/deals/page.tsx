import { DealFilters } from "@/components/move-in/deal-filters";
import { DealTable } from "@/components/move-in/deal-table";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import {
  filterDealRows,
  isConsentStatus,
  isDealStatus,
  type DealListFilters,
} from "@/lib/move-in/deals";
import { loadBrokerageOffices, loadDealRows } from "@/lib/move-in/queries";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): DealListFilters {
  const consentStatus = one(searchParams.consentStatus);
  const dealStatus = one(searchParams.dealStatus);
  return {
    q: one(searchParams.q),
    consentStatus: isConsentStatus(consentStatus) ? consentStatus : "",
    dealStatus: isDealStatus(dealStatus) ? dealStatus : "",
    saleEnabled: one(searchParams.saleEnabled) === "1" ? "1" : "",
    jeonseEnabled: one(searchParams.jeonseEnabled) === "1" ? "1" : "",
    monthlyRentEnabled: one(searchParams.monthlyRentEnabled) === "1" ? "1" : "",
    brokerageOfficeId: one(searchParams.brokerageOfficeId),
  };
}

export default async function MoveInDealsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;

  const filters = parseFilters(await searchParams);
  const [list, officesResult] = await Promise.all([
    loadDealRows(projectId),
    loadBrokerageOffices(projectId),
  ]);
  if (list.error || officesResult.error) return <QueryError />;

  const rows = filterDealRows(list.rows, filters);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">매도·임대 관리</h1>
      <DealFilters
        projectId={projectId}
        filters={filters}
        offices={officesResult.offices}
      />
      {list.rows.length === 0 || rows.length === 0 ? (
        <EmptyState>등록된 거래 대상이 없습니다.</EmptyState>
      ) : (
        <DealTable projectId={projectId} rows={rows} />
      )}
    </main>
  );
}
