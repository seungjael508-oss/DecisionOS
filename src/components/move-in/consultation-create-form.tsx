"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createMoveInConsultation } from "@/app/projects/[projectId]/move-in/units/[unitId]/actions";
import {
  CONSULTATION_PURPOSES,
  CONSULTATION_TYPE_LABELS,
  CONSULTATION_TYPES,
  LEGACY_GRADE_VALUES,
  type ConsultationType,
  type LegacyGrade,
} from "@/lib/move-in/consultation";
import {
  FUNDING_STATUS_LABELS,
  FUNDING_STATUS_VALUES,
  MOVE_IN_STATUS_LABELS,
  MOVE_IN_STATUS_VALUES,
  OCCUPANCY_INTENT_LABELS,
  OCCUPANCY_INTENT_VALUES,
  type FundingStatus,
  type MoveInStatus,
  type OccupancyIntent,
} from "@/lib/move-in/labels";

function dateToTimestamptz(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T09:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

export function ConsultationCreateForm({
  projectId,
  unitId,
  customerId,
}: {
  projectId: string;
  unitId: string;
  customerId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moveInStatus, setMoveInStatus] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const content = String(formData.get("content") ?? "");
    const consultationType = String(
      formData.get("consultation_type") ?? "OUTBOUND",
    ) as ConsultationType;
    const legacyGrade = String(formData.get("legacy_grade") ?? "") as
      | LegacyGrade
      | "";
    const nextDate = String(formData.get("next_contact_date") ?? "");
    const occupancyIntent = String(formData.get("occupancy_intent") ?? "") as
      | OccupancyIntent
      | "";
    const fundingStatus = String(formData.get("funding_status") ?? "") as
      | FundingStatus
      | "";
    const nextMoveIn = String(formData.get("move_in_status") ?? "") as
      | MoveInStatus
      | "";

    setPending(true);
    setError(null);
    const result = await createMoveInConsultation({
      projectId,
      unitId,
      customerId,
      consultationType,
      content,
      purpose: String(formData.get("purpose") ?? ""),
      legacyGrade,
      nextContactAt: dateToTimestamptz(nextDate),
      occupancyIntent,
      fundingStatus,
      moveInStatus: nextMoveIn,
      plannedMoveInDate: String(formData.get("planned_move_in_date") ?? ""),
      balancePaidAt: dateToTimestamptz(
        String(formData.get("balance_paid_at") ?? ""),
      ),
      actualMoveInDate: dateToTimestamptz(
        String(formData.get("actual_move_in_date") ?? ""),
      ),
      reason: String(formData.get("reason") ?? ""),
    });
    setPending(false);
    if (!result.ok) {
      setError("상담을 저장하지 못했습니다.");
      return;
    }
    (document.getElementById("consultation-create-form") as HTMLFormElement | null)
      ?.reset();
    setMoveInStatus("");
    router.refresh();
  }

  return (
    <form
      id="consultation-create-form"
      onSubmit={onSubmit}
      className="mt-4 flex max-w-xl flex-col gap-3 border border-neutral-300 p-4"
    >
      <h3 className="text-lg font-semibold">새 상담 등록</h3>
      <label className="flex flex-col gap-1 text-sm">
        상담유형
        <select
          name="consultation_type"
          defaultValue="OUTBOUND"
          className="border border-neutral-400 px-2 py-1"
        >
          {CONSULTATION_TYPES.map((value) => (
            <option key={value} value={value}>
              {CONSULTATION_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        업무 목적 *
        <select name="purpose" required defaultValue="" className="border border-neutral-400 px-2 py-1">
          <option value="" disabled>선택하세요</option>
          {CONSULTATION_PURPOSES.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        평가
        <select name="legacy_grade" defaultValue="" className="border border-neutral-400 px-2 py-1">
          <option value="">선택 안 함</option>
          {LEGACY_GRADE_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        상담내용 *
        <textarea
          name="content"
          required
          rows={4}
          className="border border-neutral-400 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        다음 접촉일
        <input
          type="date"
          name="next_contact_date"
          className="border border-neutral-400 px-2 py-1"
        />
      </label>
      <fieldset className="border border-neutral-200 p-3">
        <legend className="text-sm font-medium">필요 시 상태변경</legend>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            입주의향
            <select name="occupancy_intent" defaultValue="" className="border border-neutral-400 px-2 py-1">
              <option value="">변경 안 함</option>
              {OCCUPANCY_INTENT_VALUES.map((value) => (
                <option key={value} value={value}>
                  {OCCUPANCY_INTENT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            자금상태
            <select name="funding_status" defaultValue="" className="border border-neutral-400 px-2 py-1">
              <option value="">변경 안 함</option>
              {FUNDING_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {FUNDING_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            입주진행
            <select
              name="move_in_status"
              value={moveInStatus}
              onChange={(event) => setMoveInStatus(event.target.value)}
              className="border border-neutral-400 px-2 py-1"
            >
              <option value="">변경 안 함</option>
              {MOVE_IN_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {MOVE_IN_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {moveInStatus === "PLANNED" ? (
          <label className="mt-3 flex flex-col gap-1 text-sm">
            입주예정일
            <input
              type="date"
              name="planned_move_in_date"
              className="border border-neutral-400 px-2 py-1"
            />
          </label>
        ) : null}
        {moveInStatus === "BALANCE_PAID" ? (
          <label className="mt-3 flex flex-col gap-1 text-sm">
            잔금완납일
            <input
              type="date"
              name="balance_paid_at"
              className="border border-neutral-400 px-2 py-1"
            />
          </label>
        ) : null}
        {moveInStatus === "MOVED_IN" ? (
          <label className="mt-3 flex flex-col gap-1 text-sm">
            입주완료일
            <input
              type="date"
              name="actual_move_in_date"
              className="border border-neutral-400 px-2 py-1"
            />
          </label>
        ) : null}
        <label className="mt-3 flex flex-col gap-1 text-sm">
          변경 사유
          <input name="reason" className="border border-neutral-400 px-2 py-1" />
        </label>
      </fieldset>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start border border-neutral-800 px-3 py-1"
      >
        {pending ? "저장 중…" : "상담 저장"}
      </button>
    </form>
  );
}
