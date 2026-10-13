"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { TodayFilter } from "@/lib/move-in/filters";

const OPTIONS: { value: TodayFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "next_contact", label: "다음 접촉 도래" },
  { value: "delayed", label: "입주 지연" },
  { value: "funding", label: "자금 위험" },
];

export function TodayFilters({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const current = (searchParams.get("filter") ?? "all") as TodayFilter;

  return (
    <nav className="mb-4 flex flex-wrap gap-2" aria-label="오늘 관리대상 필터">
      {OPTIONS.map((option) => {
        const href =
          option.value === "all"
            ? `/projects/${projectId}/move-in/today`
            : `/projects/${projectId}/move-in/today?filter=${option.value}`;
        const active = current === option.value || (option.value === "all" && !searchParams.get("filter"));
        return (
          <Link
            key={option.value}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "border border-neutral-900 bg-neutral-900 px-2 py-1 text-white"
                : "border border-neutral-400 px-2 py-1"
            }
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
