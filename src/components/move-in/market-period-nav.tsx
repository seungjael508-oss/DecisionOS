import Link from "next/link";
import { formatPeriodLabel } from "@/lib/market/labels";

export function MarketPeriodNav({
  projectId,
  periods,
  selected,
}: {
  projectId: string;
  periods: string[];
  selected: string;
}) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="시장 기간">
      {periods.map((period) => {
        const href = `/projects/${projectId}/move-in/market?period=${period}`;
        const active = period === selected;
        return (
          <Link
            key={period}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "border border-neutral-900 bg-neutral-900 px-3 py-1 text-white"
                : "border border-neutral-400 px-3 py-1"
            }
          >
            {formatPeriodLabel(period)}
          </Link>
        );
      })}
    </nav>
  );
}
