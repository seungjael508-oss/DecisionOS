"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { assignMoveInCustomers } from "@/app/projects/[projectId]/move-in/assign/actions";
import { canSubmitAssignment, uniqueCustomerIds } from "@/lib/move-in/assign";
import { counselorDisplayName } from "@/lib/move-in/consultation";
import type { CallListRow } from "@/lib/move-in/calls";
import {
  FUNDING_STATUS_LABELS,
  MOVE_IN_STATUS_LABELS,
  OCCUPANCY_INTENT_LABELS,
  formatUnitLabel,
} from "@/lib/move-in/labels";
import Link from "next/link";

function statusSummary(row: CallListRow) {
  const parts = [
    row.occupancyIntent
      ? OCCUPANCY_INTENT_LABELS[row.occupancyIntent]
      : null,
    row.fundingStatus ? FUNDING_STATUS_LABELS[row.fundingStatus] : null,
    row.moveInStatus ? MOVE_IN_STATUS_LABELS[row.moveInStatus] : null,
  ].filter(Boolean);
  return parts.join(" / ") || "미등록";
}

export function AssignBoard({
  projectId,
  rows,
  counselors,
  currentMemberId,
}: {
  projectId: string;
  rows: CallListRow[];
  counselors: { id: string; label: string }[];
  currentMemberId: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCount = selected.length;
  const assigneeLabel =
    counselors.find((item) => item.id === assigneeId)?.label ?? "";

  const allIds = useMemo(
    () => uniqueCustomerIds(rows.map((row) => row.customerId)),
    [rows],
  );

  function toggle(customerId: string) {
    setSelected((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId],
    );
  }

  async function onAssign() {
    if (!canSubmitAssignment(selected, assigneeId)) return;
    const count = uniqueCustomerIds(selected).length;
    const confirmed = window.confirm(
      `선택한 ${count}세대를 ${assigneeLabel}에게 배정합니다.`,
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await assignMoveInCustomers({
      projectId,
      customerIds: selected,
      assigneeProjectMemberId: assigneeId,
    });
    setPending(false);
    if (!result.ok) {
      setError("상담사 배정에 실패했습니다.");
      return;
    }
    setSuccess(
      `${result.assigned}세대를 ${assigneeLabel}에게 배정했습니다.`,
    );
    setSelected([]);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span>{selectedCount}세대 선택</span>
        <button
          type="button"
          className="border border-neutral-800 px-3 py-1"
          onClick={() => setSelected([])}
        >
          전체 해제
        </button>
        <label className="flex flex-col gap-1 text-sm">
          상담사
          <select
            aria-label="상담사"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            className="border border-neutral-400 px-2 py-1"
          >
            <option value="">선택</option>
            {counselors.map((counselor) => (
              <option key={counselor.id} value={counselor.id}>
                {counselor.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="border border-neutral-800 px-3 py-1"
          disabled={pending}
          onClick={() => void onAssign()}
        >
          선택 세대 배정
        </button>
      </div>
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mb-3 text-sm">{success}</p> : null}

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-300">
              <th className="py-2 pr-3 font-medium">
                <input
                  type="checkbox"
                  aria-label="전체 선택"
                  checked={
                    allIds.length > 0 && allIds.every((id) => selected.includes(id))
                  }
                  onChange={(event) => {
                    setSelected(event.target.checked ? allIds : []);
                  }}
                />
              </th>
              <th className="py-2 pr-3 font-medium">동호수</th>
              <th className="py-2 pr-3 font-medium">계약자</th>
              <th className="py-2 pr-3 font-medium">전화번호</th>
              <th className="py-2 pr-3 font-medium">기존등급</th>
              <th className="py-2 pr-3 font-medium">현재상태</th>
              <th className="py-2 font-medium">현재 담당</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.unitId}-${row.customerId}`} className="border-b border-neutral-200">
                <td className="py-2 pr-3">
                  <input
                    type="checkbox"
                    aria-label={`${formatUnitLabel(row.buildingNo, row.unitNo)} 선택`}
                    checked={selected.includes(row.customerId)}
                    onChange={() => toggle(row.customerId)}
                  />
                </td>
                <td className="py-2 pr-3 font-semibold">
                  <Link
                    className="underline"
                    href={`/projects/${projectId}/move-in/units/${row.unitId}`}
                  >
                    {formatUnitLabel(row.buildingNo, row.unitNo)}
                  </Link>
                </td>
                <td className="py-2 pr-3">{row.customerName ?? "—"}</td>
                <td className="py-2 pr-3">{row.customerPhone ?? "—"}</td>
                <td className="py-2 pr-3">{row.latestGrade ?? "—"}</td>
                <td className="py-2 pr-3">{statusSummary(row)}</td>
                <td className="py-2">
                  {counselorDisplayName(row.assignedCounselorId, currentMemberId)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
