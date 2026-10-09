export function monthDelta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return current - previous;
}

export function formatDelta(delta: number | null) {
  if (delta === null) return "전월 데이터 없음";
  if (delta > 0) return `전월 대비 +${delta}`;
  if (delta < 0) return `전월 대비 ${delta}`;
  return "전월 대비 0";
}

export function formatCount(value: number | null) {
  if (value === null) return "—";
  return String(value);
}

export function uniquePeriods(periods: string[]) {
  return [...new Set(periods)].sort((a, b) => b.localeCompare(a));
}

export function previousPeriod(periods: string[], current: string) {
  const ordered = uniquePeriods(periods);
  const index = ordered.indexOf(current);
  if (index < 0 || index === ordered.length - 1) return null;
  return ordered[index + 1];
}
