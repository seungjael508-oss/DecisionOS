import { describe, expect, test } from 'vitest';
import { compareTimestampThenId, readByUuidRanges } from '@/lib/supabase/read-by-uuid-range';

describe('readByUuidRanges', () => {
  test('8구간이 빈틈·겹침 없이 전체 UUID를 덮고, 구간 순서대로 합친다', async () => {
    const ranges: { lower: string; upper: string | null }[] = [];
    const result = await readByUuidRanges(async (range) => { ranges.push(range); return { data: [range.lower[0]], error: null }; });
    expect(result).toEqual({ data: ['0', '2', '4', '6', '8', 'a', 'c', 'e'], error: false });
    expect(ranges[0].lower).toBe('00000000-0000-0000-0000-000000000000');
    expect(ranges.at(-1)!.upper).toBeNull();
    for (let i = 1; i < ranges.length; i++) expect(ranges[i].lower).toBe(ranges[i - 1].upper);
  });

  test('한 구간이라도 실패하면 부분 결과를 버린다', async () => {
    const result = await readByUuidRanges(async ({ lower }) => (lower.startsWith('a') ? { data: null, error: new Error('timeout') } : { data: [1], error: null }));
    expect(result).toEqual({ data: [], error: true });
  });

  test('1000행이 넘는 구간은 다음 페이지를 이어 읽는다', async () => {
    const result = await readByUuidRanges(async ({ lower }, from) => ({ data: lower.startsWith('0') && from === 0 ? Array(1000).fill(0) : lower.startsWith('0') ? [1] : [], error: null }));
    expect(result.data).toHaveLength(1001);
  });
});

describe('compareTimestampThenId', () => {
  const sort = (rows: { at: string; id: string }[]) => [...rows].sort(compareTimestampThenId).map(row => row.id);

  test('ms가 같아도 마이크로초 자리로 정렬한다(PostgreSQL timestamptz 순서)', () => {
    expect(sort([
      { at: '2026-10-11T00:48:35.5155+00:00', id: 'b' },
      { at: '2026-10-11T00:48:35.515+00:00', id: 'c' },
      { at: '2026-10-11T00:48:35+00:00', id: 'd' },
      { at: '2026-10-11T00:48:35.51501+00:00', id: 'a' },
    ])).toEqual(['d', 'c', 'a', 'b']);
  });

  test('시각이 같으면 id 오름차순', () => {
    expect(sort([{ at: '2026-10-11T00:00:00+00:00', id: 'f0' }, { at: '2026-10-11T00:00:00.000+00:00', id: '0a' }])).toEqual(['0a', 'f0']);
  });

  test('오프셋이 달라도 같은 순간이면 같은 키', () => {
    expect(compareTimestampThenId({ at: '2026-10-11T09:00:00+09:00', id: 'x' }, { at: '2026-10-11T00:00:00+00:00', id: 'x' })).toBe(0);
  });
});
