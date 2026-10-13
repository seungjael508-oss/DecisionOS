import { formatCollectedAt, formatSource } from "@/lib/market/labels";

export function MarketSource({
  source,
  collectedAt,
}: {
  source: string | null;
  collectedAt: string;
}) {
  return (
    <p className="mt-2 text-sm text-neutral-600">
      {formatSource(source)} · 수집: {formatCollectedAt(collectedAt)}
    </p>
  );
}
