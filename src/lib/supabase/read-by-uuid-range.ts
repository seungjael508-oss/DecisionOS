import { readAllRows } from '@/lib/supabase/read-all';

// UUID 첫 hex 자리로 8구간. 상담 RLS는 행마다 권한 함수를 부르고 (project_id, consulted_at) 인덱스가 없어,
// 정렬·페이지 쿼리는 매번 프로젝트 전체 행에 RLS를 다시 평가한다(1회 약 2s, 부하 시 8s 타임아웃).
// unit_id 구간으로 나누면 (project_id, unit_id, consulted_at) 인덱스로 각 행을 한 번씩만 평가한다.
const BOUNDS = ['0', '2', '4', '6', '8', 'a', 'c', 'e'].map(hex => `${hex}0000000-0000-0000-0000-000000000000`);

/** 구간별 결과를 구간 순서대로 합친다. 한 구간이라도 실패하면 부분 결과를 버린다. 순서가 필요하면 호출측이 정렬한다. */
export async function readByUuidRanges<T>(
  page: (range: { lower: string; upper: string | null }, from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: boolean }> {
  const results = await Promise.all(BOUNDS.map((lower, index) =>
    readAllRows((from, to) => page({ lower, upper: BOUNDS[index + 1] ?? null }, from, to), 1000)));
  if (results.some(result => result.error)) return { data: [], error: true };
  return { data: results.flatMap(result => result.data), error: false };
}

/**
 * PostgreSQL ORDER BY consulted_at, id 와 같은 순서. Date.parse는 ms까지만 보므로 마이크로초 자리까지 비교하고,
 * id는 소문자 UUID 문자열 비교가 uuid 정렬과 같다.
 */
export function compareTimestampThenId(a: { at: string; id: string }, b: { at: string; id: string }): number {
  const key = (value: string) => {
    const fraction = /\.(\d+)/.exec(value.slice(19))?.[1] ?? '';
    return `${new Date(Date.parse(value)).toISOString().slice(0, 19)}${fraction.padEnd(6, '0')}`;
  };
  const left = key(a.at), right = key(b.at);
  if (left !== right) return left < right ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
