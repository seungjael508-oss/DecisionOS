import Link from "next/link";
import { ConsultationHistory } from "@/components/move-in/consultation-history";
import { OccupancyEditor } from "@/components/move-in/occupancy-editor";
import { OccupancyStatusCards } from "@/components/move-in/occupancy-status-cards";
import { AccessDenied, QueryError } from "@/components/move-in/status-copy";
import {
  FUNDING_STATUS_LABELS,
  MOVE_IN_STATUS_LABELS,
  OCCUPANCY_INTENT_LABELS,
  formatUnitLabel,
} from "@/lib/move-in/labels";
import { loadUnitDetail } from "@/lib/move-in/queries";

export default async function MoveInUnitDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; unitId: string }>;
}) {
  const { projectId, unitId } = await params;
  const result = await loadUnitDetail(projectId, unitId);

  if (result.kind === "error") return <QueryError />;
  if (result.kind === "missing") {
    return (
      <AccessDenied message="이 프로젝트에 접근할 권한이 없습니다." />
    );
  }

  const { detail, consultations } = result;

  return (
    <main className="p-8">
      <h1 className="text-4xl font-semibold">
        {formatUnitLabel(detail.buildingNo, detail.unitNo)}
      </h1>
      <p className="mt-2 text-lg text-neutral-700">
        계약자 {detail.customerName ?? "—"}
      </p>
      {detail.customerPhone ? (
        <p className="mt-1 text-sm text-neutral-600">연락처 {detail.customerPhone}</p>
      ) : null}

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
        <p className="mb-3 text-sm text-neutral-600">
          상담 입력은 기존 작성 경로가 없어 이번 화면에서는 조회만 제공합니다.
        </p>
        <ConsultationHistory rows={consultations} />
      </section>
    </main>
  );
}
