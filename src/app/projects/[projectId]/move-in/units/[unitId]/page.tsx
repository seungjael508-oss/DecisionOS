import Link from "next/link";
import { ConsultationCreateForm } from "@/components/move-in/consultation-create-form";
import { ConsultationHistory } from "@/components/move-in/consultation-history";
import { DealEditor } from "@/components/move-in/deal-editor";
import { OccupancyEditor } from "@/components/move-in/occupancy-editor";
import { OccupancyStatusCards } from "@/components/move-in/occupancy-status-cards";
import { AccessDenied, QueryError } from "@/components/move-in/status-copy";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { counselorDisplayName } from "@/lib/move-in/consultation";
import {
  FUNDING_STATUS_LABELS,
  MOVE_IN_STATUS_LABELS,
  OCCUPANCY_INTENT_LABELS,
  formatUnitLabel,
} from "@/lib/move-in/labels";
import {
  loadBrokerageOffices,
  loadUnitDeal,
  loadUnitDetail,
} from "@/lib/move-in/queries";

export default async function MoveInUnitDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; unitId: string }>;
}) {
  const { projectId, unitId } = await params;
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return null;

  const result = await loadUnitDetail(projectId, unitId);

  if (result.kind === "error") return <QueryError />;
  if (result.kind === "missing") {
    return (
      <AccessDenied message="이 프로젝트에 접근할 권한이 없습니다." />
    );
  }

  const [dealResult, officesResult] = await Promise.all([
    loadUnitDeal(projectId, unitId),
    loadBrokerageOffices(projectId),
  ]);
  if (dealResult.error || officesResult.error) return <QueryError />;

  const { detail, consultations } = result;
  const latestGrade = consultations[0]?.legacyGrade ?? null;

  return (
    <main className="p-8">
      <h1 className="text-4xl font-semibold">
        {formatUnitLabel(detail.buildingNo, detail.unitNo)}
      </h1>
      <dl className="mt-4 grid max-w-xl grid-cols-[7rem_1fr] gap-y-1 text-lg">
        <dt className="text-neutral-600">계약자</dt>
        <dd>{detail.customerName ?? "—"}</dd>
        <dt className="text-neutral-600">전화번호</dt>
        <dd>{detail.customerPhone ?? "—"}</dd>
        <dt className="text-neutral-600">담당</dt>
        <dd>
          {counselorDisplayName(detail.assignedCounselorId, access.memberId)}
        </dd>
        <dt className="text-neutral-600">최근등급</dt>
        <dd>{latestGrade ?? "—"}</dd>
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

      {detail.customerId ? (
        <ConsultationCreateForm
          projectId={projectId}
          unitId={unitId}
          customerId={detail.customerId}
        />
      ) : null}

      {detail.customerId && detail.contractId ? (
        <DealEditor
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
                <Link className="font-semibold underline" href={`/projects/${projectId}/move-in/units/${unit.unitId}`}>
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

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">상담/콜 이력</h2>
        <ConsultationHistory
          rows={consultations}
          currentMemberId={access.memberId}
        />
      </section>
    </main>
  );
}
