import type { FundingStatus, MoveInStatus, OccupancyIntent } from "@/lib/move-in/labels";
import type { OccupancyHint } from "@/lib/import/types";

function pickUnique<T extends string>(matches: T[]): T | null {
  const unique = [...new Set(matches)];
  if (unique.length === 1) return unique[0] ?? null;
  return null;
}

export function occupancyHintsFromText(parts: Array<string | null>): OccupancyHint {
  const text = parts.filter(Boolean).join(" ");
  const intentMatches: OccupancyIntent[] = [];
  const fundingMatches: FundingStatus[] = [];
  const statusMatches: MoveInStatus[] = [];

  if (/실입주|입주의사|직접입주/.test(text)) intentMatches.push("SELF_MOVE_IN");
  if (/전매|매도/.test(text)) intentMatches.push("SALE");
  if (/전세/.test(text)) intentMatches.push("JEONSE");
  if (/월세/.test(text)) intentMatches.push("MONTHLY_RENT");

  if (/자금여력\s*없음|자금부족|연체/.test(text)) {
    fundingMatches.push("FUNDING_SHORTAGE");
  }
  if (/기존주택|미처분/.test(text)) fundingMatches.push("EXISTING_HOME_UNSOLD");

  if (/미접촉/.test(text)) statusMatches.push("NOT_CONTACTED");
  if (/접촉|상담완료/.test(text)) statusMatches.push("CONTACTED");
  if (/입주예정|예정/.test(text)) statusMatches.push("PLANNED");
  if (/지연/.test(text)) statusMatches.push("DELAYED");

  const occupancyIntent = pickUnique(intentMatches);
  const fundingStatus = pickUnique(fundingMatches);
  const moveInStatus = pickUnique(statusMatches);
  const mentioned = Boolean(text.trim());
  const resolved = occupancyIntent || fundingStatus || moveInStatus;

  return {
    occupancyIntent,
    fundingStatus,
    moveInStatus,
    needsReview: mentioned && !resolved,
  };
}

export function occupancyHintNeedsWrite(hint: OccupancyHint) {
  return Boolean(hint.occupancyIntent || hint.fundingStatus || hint.moveInStatus);
}
