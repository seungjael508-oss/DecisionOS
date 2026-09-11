import type { OccupancyCandidate } from "@/lib/legacy-migration/types";

function textOf(value: unknown) {
  if (value == null) return "";
  return String(value);
}

export function extractOccupancyCandidates(input: {
  contents: string[];
  deal: { jeonse?: unknown; wolse?: unknown; maemae?: unknown } | null;
  resale: Array<{ reason?: unknown }>;
}): OccupancyCandidate[] {
  const text = [
    ...input.contents,
    ...input.resale.map((row) => textOf(row.reason)),
  ].join(" ");
  const found = new Set<OccupancyCandidate>();

  if (/전매/.test(text) || (input.deal && input.deal.maemae === true)) {
    found.add("SALE");
  } else if (/매도/.test(text) && !/기존주택/.test(text)) {
    found.add("SALE");
  }

  if (/전세/.test(text) || (input.deal && input.deal.jeonse === true)) {
    found.add("JEONSE");
  }
  if (/월세/.test(text) || (input.deal && input.deal.wolse === true)) {
    found.add("MONTHLY_RENT");
  }
  if (/입주의사|입주예정/.test(text)) found.add("SELF_MOVE_IN");
  if (/기존주택/.test(text) && /매도/.test(text)) {
    found.add("EXISTING_HOME_UNSOLD");
  }
  if (/자금부족/.test(text)) found.add("FUNDING_SHORTAGE");

  return [...found];
}
