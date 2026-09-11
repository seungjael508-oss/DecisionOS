"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { BrokerageOfficeOption } from "@/lib/move-in/brokerages";
import {
  CONSENT_STATUS_LABELS,
  CONSENT_STATUS_VALUES,
  DEAL_STATUS_LABELS,
  DEAL_STATUS_VALUES,
  type DealListFilters,
} from "@/lib/move-in/deals";

export function DealFilters({
  projectId,
  filters,
  offices,
}: {
  projectId: string;
  filters: DealListFilters;
  offices: BrokerageOfficeOption[];
}) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of [
      "q",
      "consentStatus",
      "dealStatus",
      "saleEnabled",
      "jeonseEnabled",
      "monthlyRentEnabled",
      "brokerageOfficeId",
    ]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const query = params.toString();
    router.push(
      `/projects/${projectId}/move-in/deals${query ? `?${query}` : ""}`,
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 grid gap-3 md:grid-cols-3"
      aria-label="매도 임대 검색 필터"
    >
      <label className="flex flex-col gap-1 text-sm md:col-span-3">
        검색 (동, 호, 계약자명, 전화번호, 101-202)
        <input
          name="q"
          defaultValue={filters.q}
          className="border border-neutral-400 px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        거래동의
        <select
          name="consentStatus"
          defaultValue={filters.consentStatus}
          className="border border-neutral-400 px-2 py-1"
        >
          <option value="">전체</option>
          {CONSENT_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {CONSENT_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        거래상태
        <select
          name="dealStatus"
          defaultValue={filters.dealStatus}
          className="border border-neutral-400 px-2 py-1"
        >
          <option value="">전체</option>
          {DEAL_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {DEAL_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        매매
        <select
          name="saleEnabled"
          defaultValue={filters.saleEnabled}
          className="border border-neutral-400 px-2 py-1"
        >
          <option value="">전체</option>
          <option value="1">매매</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        전세
        <select
          name="jeonseEnabled"
          defaultValue={filters.jeonseEnabled}
          className="border border-neutral-400 px-2 py-1"
        >
          <option value="">전체</option>
          <option value="1">전세</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        월세
        <select
          name="monthlyRentEnabled"
          defaultValue={filters.monthlyRentEnabled}
          className="border border-neutral-400 px-2 py-1"
        >
          <option value="">전체</option>
          <option value="1">월세</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        배포 중개업소
        <select
          name="brokerageOfficeId"
          defaultValue={filters.brokerageOfficeId}
          className="border border-neutral-400 px-2 py-1"
        >
          <option value="">전체</option>
          {offices.map((office) => (
            <option key={office.id} value={office.id}>
              {office.name}
            </option>
          ))}
        </select>
      </label>
      <div>
        <button type="submit" className="border border-neutral-800 px-3 py-1">
          적용
        </button>
      </div>
    </form>
  );
}
