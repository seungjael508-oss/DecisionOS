import { readAllRows } from '@/lib/supabase/read-all';

/** Keep PostgREST IN filters below gateway URL limits; discard partial results on failure. */
export async function readByIds<T>(
  ids: string[],
  page: (ids: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  batchSize = 100,
  concurrency = 1,
): Promise<{ data: T[]; error: boolean }> {
  const uniqueIds = [...new Set(ids)];
  const batches: string[][] = [];
  for (let offset = 0; offset < uniqueIds.length; offset += batchSize) batches.push(uniqueIds.slice(offset, offset + batchSize));
  // 배치 수(=요청 수)는 그대로 두고 동시에 실행할 개수만 제한한다.
  // 결과는 배치 순서대로 합치고, 하나라도 실패하면 부분 결과를 버린다.
  const results: T[][] = new Array(batches.length);
  let next = 0, failed = false;
  async function worker() {
    while (!failed && next < batches.length) {
      const index = next++;
      const result = await readAllRows((from, to) => page(batches[index], from, to));
      if (result.error) { failed = true; return; }
      results[index] = result.data;
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), batches.length) }, worker));
  if (failed) return { data: [], error: true };
  return { data: results.flat(), error: false };
}
