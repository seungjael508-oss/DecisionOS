"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
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
import { createBrowserClient } from "@/lib/supabase/client";
import type { OccupancyRecord } from "@/lib/move-in/queries";
import type { Database } from "@/lib/supabase/types";

type Axis = "occupancy_intent" | "funding_status" | "move_in_status";

type UpdateUnitOccupancyStatusArgs =
  Database["public"]["Functions"]["update_unit_occupancy_status"]["Args"];

function toDateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function applyDateArg(
  payload: UpdateUnitOccupancyStatusArgs,
  next: string | undefined,
  previous: string | null,
  valueKey:
    | "p_planned_move_in_date"
    | "p_balance_paid_at"
    | "p_actual_move_in_date"
    | "p_last_contact_at"
    | "p_next_contact_at",
  clearKey:
    | "p_clear_planned_move_in_date"
    | "p_clear_balance_paid_at"
    | "p_clear_actual_move_in_date"
    | "p_clear_last_contact_at"
    | "p_clear_next_contact_at",
) {
  if (next) {
    payload[valueKey] = next;
    return;
  }
  if (previous) {
    payload[clearKey] = true;
  }
}

export function OccupancyEditor({
  projectId,
  unitId,
  occupancy,
}: {
  projectId: string;
  unitId: string;
  occupancy: OccupancyRecord;
}) {
  const router = useRouter();
  const reasonId = useId();
  const [axis, setAxis] = useState<Axis | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    if (!axis) return;
    const reason = String(formData.get("reason") ?? "").trim();
    if (!reason) {
      setError("변경 사유를 입력하세요.");
      return;
    }

    const payload: UpdateUnitOccupancyStatusArgs = {
      p_project_id: projectId,
      p_unit_id: unitId,
      p_contract_id: occupancy.contract_id,
      p_reason: reason,
    };

    if (axis === "occupancy_intent") {
      payload.p_occupancy_intent = String(
        formData.get("occupancy_intent"),
      ) as OccupancyIntent;
    }
    if (axis === "funding_status") {
      payload.p_funding_status = String(
        formData.get("funding_status"),
      ) as FundingStatus;
    }
    if (axis === "move_in_status") {
      const nextStatus = String(formData.get("move_in_status")) as MoveInStatus;
      payload.p_move_in_status = nextStatus;
      if (nextStatus === "PLANNED") {
        const planned = String(formData.get("planned_move_in_date") ?? "");
        if (!planned) {
          setError("입주예정일은 필수입니다.");
          return;
        }
        applyDateArg(
          payload,
          planned,
          occupancy.planned_move_in_date,
          "p_planned_move_in_date",
          "p_clear_planned_move_in_date",
        );
      }
      if (nextStatus === "BALANCE_PAID") {
        const paid = fromDateTimeLocal(
          String(formData.get("balance_paid_at") ?? ""),
        );
        if (!paid) {
          setError("잔금완납 일시는 필수입니다.");
          return;
        }
        applyDateArg(
          payload,
          paid,
          occupancy.balance_paid_at,
          "p_balance_paid_at",
          "p_clear_balance_paid_at",
        );
      }
      if (nextStatus === "MOVED_IN") {
        const moved = fromDateTimeLocal(
          String(formData.get("actual_move_in_date") ?? ""),
        );
        if (!moved) {
          setError("입주완료 일시는 필수입니다.");
          return;
        }
        applyDateArg(
          payload,
          moved,
          occupancy.actual_move_in_date,
          "p_actual_move_in_date",
          "p_clear_actual_move_in_date",
        );
      }
    }

    setPending(true);
    setError(null);
    const supabase = createBrowserClient();
    const { error: rpcError } = await supabase.rpc(
      "update_unit_occupancy_status",
      payload,
    );
    setPending(false);
    if (rpcError) {
      setError("상태를 변경하지 못했습니다.");
      return;
    }
    setAxis(null);
    router.refresh();
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border border-neutral-800 px-2 py-1"
          onClick={() => {
            setAxis("occupancy_intent");
            setError(null);
          }}
        >
          입주의향 변경
        </button>
        <button
          type="button"
          className="border border-neutral-800 px-2 py-1"
          onClick={() => {
            setAxis("funding_status");
            setError(null);
          }}
        >
          자금상태 변경
        </button>
        <button
          type="button"
          className="border border-neutral-800 px-2 py-1"
          onClick={() => {
            setAxis("move_in_status");
            setError(null);
          }}
        >
          입주진행 변경
        </button>
      </div>

      {axis ? (
        <form
          key={occupancy.updated_at}
          className="mt-4 max-w-md border border-neutral-300 p-4"
          action={onSubmit}
        >
          {axis === "occupancy_intent" ? (
            <label className="flex flex-col gap-1 text-sm">
              새 입주의향
              <select
                name="occupancy_intent"
                defaultValue={occupancy.occupancy_intent}
                className="border border-neutral-400 px-2 py-1"
              >
                {OCCUPANCY_INTENT_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {OCCUPANCY_INTENT_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {axis === "funding_status" ? (
            <label className="flex flex-col gap-1 text-sm">
              새 자금상태
              <select
                name="funding_status"
                defaultValue={occupancy.funding_status}
                className="border border-neutral-400 px-2 py-1"
              >
                {FUNDING_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {FUNDING_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {axis === "move_in_status" ? (
            <MoveInFields occupancy={occupancy} />
          ) : null}

          <label className="mt-3 flex flex-col gap-1 text-sm" htmlFor={reasonId}>
            변경 사유
            <textarea
              id={reasonId}
              name="reason"
              required
              className="border border-neutral-400 px-2 py-1"
              rows={3}
            />
          </label>

          {error ? <p className="mt-2 text-sm text-red-800">{error}</p> : null}

          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="border border-neutral-900 bg-neutral-900 px-3 py-1 text-white disabled:opacity-50"
            >
              {pending ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              className="border border-neutral-400 px-3 py-1"
              onClick={() => setAxis(null)}
              disabled={pending}
            >
              취소
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function MoveInFields({ occupancy }: { occupancy: OccupancyRecord }) {
  const [status, setStatus] = useState<MoveInStatus>(occupancy.move_in_status);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        새 입주진행
        <select
          name="move_in_status"
          value={status}
          onChange={(event) => setStatus(event.target.value as MoveInStatus)}
          className="border border-neutral-400 px-2 py-1"
        >
          {MOVE_IN_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {MOVE_IN_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      {status === "PLANNED" ? (
        <label className="flex flex-col gap-1 text-sm">
          입주예정일
          <input
            type="date"
            name="planned_move_in_date"
            required
            defaultValue={toDateInput(occupancy.planned_move_in_date)}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
      ) : null}
      {status === "BALANCE_PAID" ? (
        <label className="flex flex-col gap-1 text-sm">
          잔금완납 일시
          <input
            type="datetime-local"
            name="balance_paid_at"
            required
            defaultValue={toDateTimeLocal(occupancy.balance_paid_at)}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
      ) : null}
      {status === "MOVED_IN" ? (
        <label className="flex flex-col gap-1 text-sm">
          입주완료 일시
          <input
            type="datetime-local"
            name="actual_move_in_date"
            required
            defaultValue={toDateTimeLocal(occupancy.actual_move_in_date)}
            className="border border-neutral-400 px-2 py-1"
          />
        </label>
      ) : null}
    </div>
  );
}
