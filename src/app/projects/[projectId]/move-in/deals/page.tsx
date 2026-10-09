import { DealFilters } from "@/components/move-in/deal-filters";
import { DealTable } from "@/components/move-in/deal-table";
import { EmptyState, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import {
  parseDealFundingFilter,
  parseDealTab,
  parseSpecialReasonFilter,
  filterDealRows,
  isConsentStatus,
  isDealStatus,
  sortDealRows,
  type DealListFilters,
} from "@/lib/move-in/deals";
import { loadBrokerageOffices, loadDealRows, loadFieldMemberNames } from "@/lib/move-in/queries";

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
    tab: parseDealTab(one(searchParams.tab) || "sale"),
    fundingStatus: parseDealFundingFilter(one(searchParams.fundingStatus)),
    specialReason: parseSpecialReasonFilter(one(searchParams.specialReason)),
    sort: one(searchParams.sort) === "name" || one(searchParams.sort) === "unit" ? one(searchParams.sort) as "name" | "unit" : "priority",
    direction: one(searchParams.direction) === "desc" ? "desc" : "asc",
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

  const rawSearchParams = await searchParams;
  const filters = parseFilters(rawSearchParams);
  const currentParams = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (value === undefined || key === "returnTo") continue;
    for (const item of Array.isArray(value) ? value : [value]) currentParams.append(key, item);
  }
  const returnTo = `/projects/${projectId}/move-in/deals${currentParams.toString() ? `?${currentParams.toString()}` : ""}`;
  const [list, officesResult, membersResult] = await Promise.all([
    loadDealRows(projectId),
    loadBrokerageOffices(projectId),
    loadFieldMemberNames(projectId),
  ]);
  if (list.error || officesResult.error || membersResult.error) return <QueryError />;

  const memberNames = new Map(membersResult.members.map((member) => [member.memberId, member.displayName ?? "이름 미등록"]));
  const rows = sortDealRows(filterDealRows(list.rows, filters).map((row) => ({
    ...row,
    assignedCounselorName: row.assignedCounselorId ? memberNames.get(row.assignedCounselorId) ?? "이름 미등록" : null,
  })), filters.sort, filters.direction);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">매도·임대 관리</h1>
      <nav className="mb-4 flex gap-2" aria-label="거래관리 탭">
        {(["sale", "rental", "special"] as const).map((tab) => {
          const params = new URLSearchParams(currentParams);
          params.set("tab", tab);
          return <a key={tab} href={`/projects/${projectId}/move-in/deals?${params.toString()}`} className={`border px-3 py-1 ${filters.tab === tab ? "bg-neutral-900 text-white" : ""}`}>
            {tab === "sale" ? "매매관리" : tab === "rental" ? "임대관리" : "특별관리"}
          </a>;
        })}
      </nav>
      {list.anomalyCount > 0 && (access.role === "PROJECT_ADMIN" || access.role === "CLIENT_MANAGER") ? (
        <p role="status" className="mb-4 text-sm text-red-700">현재 계약 관계를 확인할 세대 {list.anomalyCount}건이 있어 목록에서 제외했습니다.</p>
      ) : null}
      <DealFilters
        projectId={projectId}
        filters={filters}
        offices={officesResult.offices}
      />
      {list.rows.length === 0 || rows.length === 0 ? (
        <EmptyState>등록된 거래 대상이 없습니다.</EmptyState>
      ) : (
        <DealTable projectId={projectId} rows={rows} tab={filters.tab} returnTo={returnTo} />
      )}
    </main>
  );
}
