import { readAllRows } from '@/lib/supabase/read-all';

/** Keep PostgREST IN filters below gateway URL limits; discard partial results on failure. */
export async function readByIds<T>(
  ids: string[],
  page: (ids: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: boolean }> {
  const uniqueIds = [...new Set(ids)];
  const rows: T[] = [];
  for (let offset = 0; offset < uniqueIds.length; offset += 100) {
    const batch = uniqueIds.slice(offset, offset + 100);
    const result = await readAllRows((from, to) => page(batch, from, to));
    if (result.error) return { data: [], error: true };
    rows.push(...result.data);
  }
  return { data: rows, error: false };
}
