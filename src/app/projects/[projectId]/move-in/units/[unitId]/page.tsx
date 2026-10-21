import { CustomerPhone } from "@/components/move-in/customer-phone";
import Link from "next/link";
import { ConsultationCreateForm } from "@/components/move-in/consultation-create-form";
import { D_GRADE_REASON_LABELS } from "@/lib/move-in/d-grade-reasons";
import { loadDGradeReasons } from "@/lib/move-in/d-grade-reasons.server";
import { ConsultationHistory } from "@/components/move-in/consultation-history";
import { PaymentSummaryCard } from "@/components/move-in/payment-summary-card";
import { paymentForCurrentContract } from '@/lib/move-in/payment-projection.server';
import { balanceAccountFor } from '@/lib/move-in/ledger-finance.server';
import { verifyUnitWorkspaceIdentity } from '@/lib/move-in/unit-workspace.server';
import { UnitDetailWorkspace } from "@/components/move-in/unit-detail-workspace";
import { MobileDetailTabs, MobileUnitHeader } from "@/components/move-in/mobile-detail-tabs";
import { DealEditor } from "@/components/move-in/deal-editor";
import { TradeFundingEditor } from "@/components/move-in/trade-funding-editor";
import { isTradeFundingStatus, isTradeFundingType } from "@/lib/move-in/trade-funding";
import { SpecialCaseEditor } from "@/components/move-in/special-case-editor";
import { OccupancyEditor } from "@/components/move-in/occupancy-editor";
import { OccupancyStatusCards } from "@/components/move-in/occupancy-status-cards";
import { AccessDenied, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { canSelectDGrade, counselorDisplayName } from "@/lib/move-in/consultation";
import {
  buildMoveInUnitDetailHref,
  getMoveInReturnContext,
  getSafeMoveInReturnTo,
  resolveMoveInAdjacentUnitIds,
  resolveTodayQueueAdjacentUnitIds,
  withMoveInReturnNotice,
} from "@/lib/move-in/return-to";
import {
  FUNDING_STATUS_LABELS,
  MOVE_IN_STATUS_LABELS,
  OCCUPANCY_INTENT_LABELS,
  OPERATIONAL_INTENT_LABELS,
  formatUnitLabel,
  formatDateTime,
} from "@/lib/move-in/labels";
import {
  loadBrokerageOffices,
  loadUnitDeal,
  loadUnitDetail,
  loadUnitRows,
  loadMoveInTodayQueueRows,
  loadMoveInSpecialCaseProjection,
} from "@/lib/move-in/queries";

export default async function MoveInUnitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; unitId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { projectId, unitId } = await params;
  const query = await searchParams;
  const rawReturnTo = Array.isArray(query.returnTo)
    ? query.returnTo[0]
    : query.returnTo;
  const returnTo = getSafeMoveInReturnTo(projectId, rawReturnTo);
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;

  const result = await loadUnitDetail(projectId, unitId);

  if (result.kind === "error") return <QueryError />;
  if (result.kind === "missing") {
    return (
      <AccessDenied message="이 프로젝트에 접근할 권한이 없습니다." />
    );
  }

  const returnContext = getMoveInReturnContext(projectId, returnTo);
  const [dealResult, officesResult] = await Promise.all([
    loadUnitDeal(projectId, unitId, result.detail.contractId, result.detail.customerId),
    loadBrokerageOffices(projectId),
  ]);
  let contextError = false;
  let adjacent = { previousUnitId: null as string | null, nextUnitId: null as string | null };
  if (returnContext.kind === "today") {
    const queueResult = await loadMoveInTodayQueueRows(projectId);
    contextError = queueResult.error;
    if (!queueResult.error) {
      adjacent = resolveTodayQueueAdjacentUnitIds(queueResult.rows, unitId, returnContext);
    }
  } else {
    const listResult = await loadUnitRows(projectId);
    contextError = listResult.error;
    if (!listResult.error) {
      adjacent = resolveMoveInAdjacentUnitIds(listResult.rows, unitId, returnContext);
    }
  }
  const previousHref = adjacent.previousUnitId
    ? buildMoveInUnitDetailHref(projectId, adjacent.previousUnitId, returnTo)
    : null;
  const nextHref = adjacent.nextUnitId
    ? buildMoveInUnitDetailHref(projectId, adjacent.nextUnitId, returnTo)
    : null;
  // A projection read failure is not evidence that this is the final row.
  // Keep the validated work context but reserve the last-row notice for a
  // successfully resolved filtered result with no successor.
  const lastNextHref = contextError
    ? returnTo
    : withMoveInReturnNotice(returnTo, "last");

  const { detail, consultations } = result;
  const latestGrade = detail.occupancy?.legacy_grade ?? null;
  const dReasons = latestGrade === "D" && detail.contractId && detail.customerId
    ? await loadDGradeReasons(projectId, [{
      unitId, contractId: detail.contractId, customerId: detail.customerId, buildingNo: detail.buildingNo, unitNo: detail.unitNo,
      currentGrade: latestGrade, funding: detail.occupancy?.funding_status ?? null, moveIn: detail.occupancy?.move_in_status ?? null,
    }])
    : null;
  const specialCaseResult = await loadMoveInSpecialCaseProjection(
    projectId,
    unitId,
    detail.contractId,
    latestGrade,
    detail.occupancy,
  );
  const paymentCandidate = detail.contractId && detail.customerId
    ? paymentForCurrentContract({ projectId, unitId, contractId: detail.contractId, buildingNo: detail.buildingNo, unitNo: detail.unitNo })
    : null;
  const payment = paymentCandidate && detail.contractId && detail.customerId &&
    (await verifyUnitWorkspaceIdentity(projectId, unitId, { contractId: detail.contractId, customerId: detail.customerId })).ok
    ? paymentCandidate : null;

  return (
    <UnitDetailWorkspace
      returnTo={returnTo}
      previousHref={previousHref}
      nextHref={nextHref}
      lastNextHref={lastNextHref}
    >
    {/* 모바일: 요약 헤더 + 기본/계약·상담/방문·납부/미납 탭(data-tab). 오늘 관리대상에서 오면 상담 탭부터. 하단 고정 바만큼 아래 여백 */}
    <main className="p-8 max-[1099px]:p-4 max-[1099px]:pb-36">
      <MobileDetailTabs defaultTab={returnContext.kind === "today" ? "consult" : "info"} header={<MobileUnitHeader
        unitLabel={formatUnitLabel(detail.buildingNo, detail.unitNo)} unitType={detail.unitType ?? "타입 미등록"} customerName={detail.customerName ?? "계약자 미등록"}
        phone={detail.customerId ? <CustomerPhone raw={detail.customerPhone} status={detail.phoneQuality} /> : "—"} grade={latestGrade}
        dReasonText={latestGrade === "D" ? (dReasons?.byUnit.get(unitId)?.length ? dReasons.byUnit.get(unitId)!.map((r) => D_GRADE_REASON_LABELS[r]).join(" · ") : "사유 미확인") : null}
        nextContact={formatDateTime(detail.occupancy ? detail.occupancy.next_contact_at : consultations[0]?.nextActionAt ?? null)} />}>
      <h1 className="text-4xl font-semibold max-[1099px]:hidden">
        {formatUnitLabel(detail.buildingNo, detail.unitNo)} · {detail.unitType ?? "타입 미등록"} · {detail.customerName ?? "계약자 미등록"} · {latestGrade ? `${latestGrade}등급` : "등급 미등록"}
      </h1>
      <dl data-tab="info" className="mt-4 grid max-w-xl grid-cols-[7rem_1fr] gap-y-1 text-lg max-[1099px]:text-sm">
        <dt className="text-neutral-600">전화번호</dt>
        <dd>{detail.customerId ? <CustomerPhone raw={detail.customerPhone} status={detail.phoneQuality} /> : "—"}</dd>
        <dt className="text-neutral-600">담당상담사</dt>
        <dd>
          {counselorDisplayName(detail.assignedCounselorId, access.memberId, detail.assignedCounselorName)}
        </dd>
        {latestGrade === "D" ? <>
          <dt className="text-neutral-600">D 관리사유</dt>
          <dd>{dReasons?.byUnit.get(unitId)?.length ? dReasons.byUnit.get(unitId)!.map((r) => D_GRADE_REASON_LABELS[r]).join(" · ") : "사유 미확인"}
            {dReasons?.unavailable.length ? <span className="block text-xs text-red-700">{dReasons.unavailable.map((r) => D_GRADE_REASON_LABELS[r]).join(" · ")} 근거 조회 실패</span> : null}</dd>
        </> : null}
        <dt className="text-neutral-600">최종의향</dt>
        <dd>{detail.occupancy ? OPERATIONAL_INTENT_LABELS[detail.occupancy.operational_intent] : "—"}<span className="block text-xs text-neutral-600">기준 {formatDateTime(detail.occupancy?.operational_intent_as_of ?? null)}</span></dd>
        <dt className="text-neutral-600">최근접촉</dt>
        <dd>{formatDateTime(consultations[0]?.consultedAt ?? detail.occupancy?.last_contact_at ?? null)}</dd>
        <dt className="text-neutral-600">다음접촉</dt>
        <dd>{formatDateTime(detail.occupancy ? detail.occupancy.next_contact_at : consultations[0]?.nextActionAt ?? null)}</dd>
        <dt className="text-neutral-600">총 상담</dt>
        <dd>{consultations.length}회</dd>
      </dl>

      <div data-tab="info"><OccupancyStatusCards occupancy={detail.occupancy} /></div>

      {detail.occupancy ? (
        <div data-tab="info"><OccupancyEditor
          projectId={projectId}
          unitId={unitId}
          occupancy={detail.occupancy}
        /></div>
      ) : (
        <p data-tab="info" className="mt-4 text-neutral-700">등록된 입주 상태가 없습니다.</p>
      )}

      {specialCaseResult.error || !specialCaseResult.projection || !detail.contractId ? null : (
        <div data-tab="info"><SpecialCaseEditor
          projectId={projectId}
          unitId={unitId}
          contractId={specialCaseResult.projection.currentContractId}
          currentCustomerId={specialCaseResult.projection.currentCustomerId}
          returnTo={returnTo}
          role={access.role}
          reasons={specialCaseResult.projection.reasons}
          specialCase={specialCaseResult.projection.specialCase}
        /></div>
      )}

      <div data-tab="pay"><PaymentSummaryCard occupancy={detail.occupancy} projection={payment} account={payment && detail.contractId
        ? balanceAccountFor({ access, projectId, unitId, contractId: detail.contractId, buildingNo: detail.buildingNo, unitNo: detail.unitNo, assigneeId: detail.assignedCounselorId })
        : { kind: "unknown" }} /></div>
      <section data-tab="consult" className="mt-10 max-[1099px]:order-2">
        <h2 className="mb-3 text-lg font-semibold">상담/콜 이력</h2>
        <ConsultationHistory
          rows={consultations}
          currentMemberId={access.memberId}
        />
      </section>

      {detail.customerId ? (
        <div data-tab="consult" className="max-[1099px]:order-1"><ConsultationCreateForm
          projectId={projectId}
          unitId={unitId}
          customerId={detail.customerId}
          expectedContractId={detail.contractId ?? undefined}
          saveDisabled={!detail.contractId}
          returnTo={returnTo}
          currentFundingStatus={detail.occupancy?.funding_status ?? null}
          currentOperationalIntent={detail.occupancy?.operational_intent ?? null}
          currentOccupancyIntent={detail.occupancy?.occupancy_intent ?? null}
          canChangeToDGrade={canSelectDGrade(access.role, latestGrade)}
        /></div>
      ) : null}

      {detail.customerId && detail.contractId ? (
        <div data-tab="info"><TradeFundingEditor
          projectId={projectId}
          unitId={unitId}
          customerId={detail.customerId}
          contractId={detail.contractId}
          currentGrade={latestGrade}
          type={isTradeFundingType(detail.occupancy?.trade_funding_type) ? detail.occupancy.trade_funding_type : null}
          status={isTradeFundingType(detail.occupancy?.trade_funding_type) && isTradeFundingStatus(detail.occupancy?.trade_funding_status) ? detail.occupancy.trade_funding_status : null}
          updatedAt={detail.occupancy?.trade_funding_updated_at ?? null}
        /></div>
      ) : null}

      {detail.customerId && detail.contractId ? (
        dealResult.error || officesResult.error ? <QueryError /> : <div data-tab="info"><DealEditor
          projectId={projectId}
          unitId={unitId}
          contractId={detail.contractId}
          customerId={detail.customerId}
          deal={dealResult.deal}
          offices={officesResult.offices}
        /></div>
      ) : null}

      {detail.customerId && detail.relatedUnits.length > 0 ? (
        <section data-tab="info" className="mt-10 max-[1099px]:order-3">
          <h2 className="mb-3 text-lg font-semibold">동일 계약자의 다른 보유세대</h2>
          <p className="mb-3 text-sm text-neutral-600">
            {detail.customerName ?? "계약자"} 보유 {detail.relatedUnits.length + 1}세대
          </p>
          <ul className="flex flex-col gap-2">
            {detail.relatedUnits.map((unit) => (
              <li key={unit.unitId} className="border border-neutral-300 p-3">
                <Link prefetch={false} className="font-semibold underline" href={`/projects/${projectId}/move-in/units/${unit.unitId}?returnTo=${encodeURIComponent(returnTo)}`}>
                  {formatUnitLabel(unit.buildingNo, unit.unitNo)}
                </Link>
                <p className="mt-1 text-sm text-neutral-700">
                  {unit.occupancyIntent
                    ? OCCUPANCY_INTENT_LABELS[unit.occupancyIntent]
                    : "—"}{" "}
                  /{" "}
                  {unit.fundingStatus
                    ? FUNDING_STATUS_LABELS[unit.fundingStatus]
                    : "—"}{" "}
                  /{" "}
                  {unit.moveInStatus ? MOVE_IN_STATUS_LABELS[unit.moveInStatus] : "—"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      </MobileDetailTabs>
    </main>
    </UnitDetailWorkspace>
  );
}
