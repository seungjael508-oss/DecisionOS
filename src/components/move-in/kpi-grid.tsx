import type { MoveInKpis } from "@/lib/move-in/kpis";
import { computeProgressPercent } from "@/lib/move-in/kpis";

const KPI_ITEMS: { key: keyof MoveInKpis; label: string }[] = [
  { key: "totalUnits", label: "총 대상세대" },
  { key: "balancePaid", label: "잔금완납" },
  { key: "movedIn", label: "입주완료" },
  { key: "planned", label: "입주예정" },
  { key: "fundingIssue", label: "자금문제" },
  { key: "sellOrRent", label: "매도/임대" },
  { key: "undecided", label: "미정" },
  { key: "notContacted", label: "미접촉" },
];

export function KpiGrid({ kpis }: { kpis: MoveInKpis }) {
  const progress = computeProgressPercent(kpis);

  return (
    <section aria-label="입주 현황 요약">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {KPI_ITEMS.map((item) => (
          <article key={item.key} className="border border-neutral-300 p-4">
            <p className="text-sm text-neutral-600">{item.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {kpis[item.key]}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-neutral-800">
        잔금완납 진행률 {progress}%
      </p>
    </section>
  );
}
