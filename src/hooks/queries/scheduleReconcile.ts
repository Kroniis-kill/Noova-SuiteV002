import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Backup reconciliation for optimistic mutations.
 *
 * Optimistic updates apply the change to the cache before the server confirms.
 * Realtime usually re-syncs, but if it misses (subscription drop, server defaults,
 * triggers, computed columns), the cache can drift.
 *
 * This schedules a debounced "soft" invalidation: marks the query stale without
 * forcing an immediate refetch. The next focus / mount / navigation will pick up
 * fresh data, guaranteeing eventual consistency without fighting the optimistic UI.
 */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const scheduleReconcile = (
  queryClient: QueryClient,
  queryKey: QueryKey,
  delayMs = 4000,
) => {
  const id = JSON.stringify(queryKey);
  const existing = timers.get(id);
  if (existing) clearTimeout(existing);

  const t = setTimeout(() => {
    timers.delete(id);
    // refetchType: 'none' -> mark stale only, no immediate network round-trip.
    // Active queries will refetch on next focus/mount via the singleton sync.
    queryClient.invalidateQueries({ queryKey, refetchType: 'none' });
  }, delayMs);

  timers.set(id, t);
};
