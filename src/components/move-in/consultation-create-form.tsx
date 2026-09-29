"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useUnitDetailWorkspace } from "@/components/move-in/unit-detail-workspace";
import { createMoveInConsultation } from "@/app/projects/[projectId]/move-in/units/[unitId]/actions";
import {
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
  OPERATIONAL_INTENT_LABELS,
  OPERATIONAL_INTENT_VALUES,
  type FundingStatus,
  type MoveInStatus,
  type OccupancyIntent,
  type OperationalIntent,
} from "@/lib/move-in/labels";
import { getSafeMoveInReturnTo } from "@/lib/move-in/return-to";

function dateToTimestamptz(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T09:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function kstDateAfterWeeks(weeks: number) {
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const date = new Date(Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day) + weeks * 7,
  ));
  return date.toISOString().slice(0, 10);
}

export function ConsultationCreateForm({
  projectId,
  unitId,
  customerId,
  returnTo,
}: {
  projectId: string;
  unitId: string;
  customerId: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const workspace = useUnitDetailWorkspace();
  const safeReturnTo = getSafeMoveInReturnTo(projectId, returnTo);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moveInStatus, setMoveInStatus] = useState("");
  const [nextContactDate, setNextContactDate] = useState("");
  const [clearNextContactAt, setClearNextContactAt] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const afterSave = submitter?.getAttribute("data-after-save") === "next"
      ? "next"
      : "list";
    const formData = new FormData(event.currentTarget);
    const content = String(formData.get("content") ?? "");
    const consultationType = String(
      formData.get("consultation_type") ?? "OUTBOUND",
    ) as ConsultationType;
    const legacyGrade = String(formData.get("legacy_grade") ?? "") as
      | LegacyGrade
      | "";
    const occupancyIntent = String(formData.get("occupancy_intent") ?? "") as
      | OccupancyIntent
      | "";
    const fundingStatus = String(formData.get("funding_status") ?? "") as
      | FundingStatus
      | "";
    const nextMoveIn = String(formData.get("move_in_status") ?? "") as
      | MoveInStatus
      | "";
    const operationalIntent = String(formData.get("operational_intent") ?? "") as
      | OperationalIntent
      | "";

    setPending(true);
    setError(null);
    const result = await createMoveInConsultation({
      projectId,
      unitId,
      customerId,
      consultationType,
      content,
      legacyGrade,
      nextContactAt: clearNextContactAt ? "" : dateToTimestamptz(nextContactDate),
      clearNextContactAt,
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
      ...(operationalIntent ? { operationalIntent } : {}),
      reason: String(formData.get("reason") ?? ""),
      returnTo: safeReturnTo,
      afterSave,
    });
    setPending(false);
    if (!result.ok) {
      setError("상담을 저장하지 못했습니다.");
      return;
    }
    (document.getElementById("consultation-create-form") as HTMLFormElement | null)
      ?.reset();
    setMoveInStatus("");
    setNextContactDate("");
    setClearNextContactAt(false);
    workspace?.setDirty(false);
    const destination = result.destination ?? result.returnTo;
    if (workspace) workspace.navigateAfterSave(destination);
    else router.replace(destination);
  }

  return (
    <form
      id="consultation-create-form"
      onSubmit={onSubmit}
      onChange={() => workspace?.setDirty(true)}
      className="mt-4 flex max-w-xl flex-col gap-3 border border-neutral-300 p-4"
    >
      <h3 className="text-lg font-semibold">새 상담 등록</h3>
      <label className="flex flex-col gap-1 text-sm">
        접촉방법
        <select
          name="consultation_type"
          defaultValue="OUTBOUND"
          className="border border-neutral-400 px-2 py-1"
        >
          {(["OUTBOUND", "VISIT", "MESSAGE"] as const).map((value) => (
            <option key={value} value={value}>
              {{ OUTBOUND: "전화 (CALL)", VISIT: "방문 (VISIT)", MESSAGE: "문자 (MESSAGE)" }[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        상담결과
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
        최종의향
        <select name="operational_intent" defaultValue="" className="border border-neutral-400 px-2 py-1">
          <option value="">선택 안 함</option>
          {OPERATIONAL_INTENT_VALUES.map((value) => (
            <option key={value} value={value}>
              {OPERATIONAL_INTENT_LABELS[value]}
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
        다음 접촉일 (KST)
        <input
          type="date"
          name="next_contact_date"
          value={nextContactDate}
          disabled={clearNextContactAt}
          onChange={(event) => setNextContactDate(event.target.value)}
          className="border border-neutral-400 px-2 py-1"
        />
      </label>
      <div className="flex flex-wrap gap-2" aria-label="다음 접촉 빠른 예약">
        {[1, 2, 3, 4].map((weeks) => (
          <button
            key={weeks}
            type="button"
            disabled={clearNextContactAt}
            onClick={() => {
              setNextContactDate(kstDateAfterWeeks(weeks));
              workspace?.setDirty(true);
            }}
            className="border border-neutral-600 px-2 py-1 text-sm disabled:opacity-50"
          >
            {weeks}주 후
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={clearNextContactAt}
          onChange={(event) => {
            setClearNextContactAt(event.target.checked);
            workspace?.setDirty(true);
          }}
        />
        기존 다음 접촉일 해제
      </label>
      <details>
        <summary className="cursor-pointer text-sm">관리상태 변경 (선택)</summary>
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
      </details>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          data-after-save="list"
          disabled={pending}
          className="border border-neutral-800 px-3 py-1"
        >
          {pending ? "저장 중…" : "저장 후 목록으로"}
        </button>
        <button
          type="submit"
          data-after-save="next"
          disabled={pending}
          className="border border-neutral-800 px-3 py-1"
        >
          저장 후 다음 세대
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (workspace) workspace.requestNavigation(safeReturnTo);
            else router.replace(safeReturnTo);
          }}
          className="border border-neutral-500 px-3 py-1"
        >
          취소하고 목록으로
        </button>
      </div>
    </form>
  );
}
