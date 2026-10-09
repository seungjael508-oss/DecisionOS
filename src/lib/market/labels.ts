import type { MarketDataScope } from "@/lib/market/select-latest";

export const MARKET_SCOPE_LABELS: Record<MarketDataScope, string> = {
  INTERNAL: "우리 현장",
  COMPETITOR: "경쟁단지",
  REGION_TOTAL: "지역 전체",
};

export function formatPeriodLabel(period: string) {
  const date = new Date(`${period}T00:00:00`);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(date);
}

export function formatCollectedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatSource(source: string | null) {
  if (!source) return "출처 미등록";
  return `출처: ${source}`;
}

export function formatPrice(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ko-KR").format(value);
}
