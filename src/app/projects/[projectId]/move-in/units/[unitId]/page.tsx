import { CustomerPhone } from "@/components/move-in/customer-phone";
import Link from "next/link";
import { ConsultationCreateForm } from "@/components/move-in/consultation-create-form";
import { ConsultationHistory } from "@/components/move-in/consultation-history";
import { UnitDetailWorkspace } from "@/components/move-in/unit-detail-workspace";
import { DealEditor } from "@/components/move-in/deal-editor";
import { OccupancyEditor } from "@/components/move-in/occupancy-editor";
import { OccupancyStatusCards } from "@/components/move-in/occupancy-status-cards";
import { AccessDenied, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { counselorDisplayName } from "@/lib/move-in/consultation";
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
    loadUnitDeal(projectId, unitId),
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
  const latestGrade = consultations.find(row => !row.previousHolder && row.legacyGrade)?.legacyGrade ?? null;

  return (
    <UnitDetailWorkspace
      returnTo={returnTo}
      previousHref={previousHref}
      nextHref={nextHref}
      lastNextHref={lastNextHref}
    >
    <main className="p-8">
      <h1 className="text-4xl font-semibold">
        {formatUnitLabel(detail.buildingNo, detail.unitNo)}
      </h1>
      <dl className="mt-4 grid max-w-xl grid-cols-[7rem_1fr] gap-y-1 text-lg">
        <dt className="text-neutral-600">계약자</dt>
        <dd>{detail.customerName ?? "—"}</dd>
        <dt className="text-neutral-600">전화번호</dt>
        <dd>{detail.customerId ? <CustomerPhone raw={detail.customerPhone} status={detail.phoneQuality} /> : "—"}</dd>
        <dt className="text-neutral-600">담당상담사</dt>
        <dd>
          {counselorDisplayName(detail.assignedCounselorId, access.memberId)}
        </dd>
        <dt className="text-neutral-600">현재등급</dt>
        <dd>{latestGrade ?? "미확인"}<span className="block text-xs text-neutral-600">현재 계약자의 최근 유효 상담평가 기준</span></dd>
        <dt className="text-neutral-600">최종의향</dt>
        <dd>{detail.occupancy ? OPERATIONAL_INTENT_LABELS[detail.occupancy.operational_intent] : "—"}<span className="block text-xs text-neutral-600">기준 {formatDateTime(detail.occupancy?.operational_intent_as_of ?? null)}</span></dd>
        <dt className="text-neutral-600">최근접촉</dt>
        <dd>{formatDateTime(consultations[0]?.consultedAt ?? detail.occupancy?.last_contact_at ?? null)}</dd>
        <dt className="text-neutral-600">다음접촉</dt>
        <dd>{formatDateTime(detail.occupancy ? detail.occupancy.next_contact_at : consultations[0]?.nextActionAt ?? null)}</dd>
        <dt className="text-neutral-600">총 상담</dt>
        <dd>{consultations.length}회</dd>
      </dl>

      <OccupancyStatusCards occupancy={detail.occupancy} />

      {detail.occupancy ? (
        <OccupancyEditor
          projectId={projectId}
          unitId={unitId}
          occupancy={detail.occupancy}
        />
      ) : (
        <p className="mt-4 text-neutral-700">등록된 입주 상태가 없습니다.</p>
      )}

      {consultations[0] ? <section className="mt-6 border-2 border-neutral-800 bg-neutral-50 p-4">
        <h2 className="mb-3 text-lg font-semibold">최근 상담</h2>
        <ConsultationHistory rows={[consultations[0]]} currentMemberId={access.memberId}/>
      </section> : null}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">상담/콜 이력</h2>
        <ConsultationHistory
          rows={consultations}
          currentMemberId={access.memberId}
        />
      </section>

      {detail.customerId ? (
        <ConsultationCreateForm
          projectId={projectId}
          unitId={unitId}
          customerId={detail.customerId}
          returnTo={returnTo}
        />
      ) : null}

      {detail.customerId && detail.contractId ? (
        dealResult.error || officesResult.error ? <QueryError /> : <DealEditor
          projectId={projectId}
          unitId={unitId}
          contractId={detail.contractId}
          customerId={detail.customerId}
          deal={dealResult.deal}
          offices={officesResult.offices}
        />
      ) : null}

      {detail.customerId && detail.relatedUnits.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">동일 계약자의 다른 보유세대</h2>
          <p className="mb-3 text-sm text-neutral-600">
            {detail.customerName ?? "계약자"} 보유 {detail.relatedUnits.length + 1}세대
          </p>
          <ul className="flex flex-col gap-2">
            {detail.relatedUnits.map((unit) => (
              <li key={unit.unitId} className="border border-neutral-300 p-3">
                <Link className="font-semibold underline" href={`/projects/${projectId}/move-in/units/${unit.unitId}?returnTo=${encodeURIComponent(returnTo)}`}>
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


    </main>
    </UnitDetailWorkspace>
  );
}
