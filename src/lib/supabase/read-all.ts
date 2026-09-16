/** Read-only pagination. Never expose partial aggregates after a page failure. */
export async function readAllRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown; count?: number | null }>): Promise<{ data: T[]; error: boolean }> {
  const rows: T[] = [];
  const pageSize = 500;
  try {
    for (;;) {
      const result = await page(rows.length, rows.length + pageSize - 1);
      if (result.error) return { data: [], error: true };
      const next = result.data ?? [];
      rows.push(...next);
      if (result.count != null) {
        if (rows.length >= result.count) return { data: rows, error: false };
        if (!next.length) return { data: [], error: true };
      } else if (next.length < pageSize) return { data: rows, error: false };
    }
  } catch {
    return { data: [], error: true };
  }
}
