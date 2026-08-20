import { withRetry } from '../../utils/supabaseUtils';

/**
 * Fetches an entire Supabase table in chunked ranges to bypass the default
 * 1000-row cap. Returns rows in their original order.
 *
 * The previous implementation issued a single `select()` with no `.range()`,
 * which silently truncates at 1000 rows on Supabase — users with larger
 * inventories simply lost data without any error.
 *
 * Usage:
 *   const data = await fetchAllPaginated((from, to) =>
 *     supabase.from('clients').select('...').eq('user_id', userId).range(from, to)
 *   );
 */
const CHUNK_SIZE = 1000;

export async function fetchAllPaginated<T>(
  pageFetcher: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  // Cap at 50k rows as a safety net — well beyond any realistic single-user dataset.
  while (from < 50_000) {
    const to = from + CHUNK_SIZE - 1;
    const { data, error } = await withRetry(() => Promise.resolve(pageFetcher(from, to)));
    if (error) throw error;
    const chunk = (data ?? []) as T[];
    all.push(...chunk);
    if (chunk.length < CHUNK_SIZE) break; // Last page reached.
    from += CHUNK_SIZE;
  }

  return all;
}
