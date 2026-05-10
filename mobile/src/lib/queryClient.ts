/**
 * Single shared QueryClient for the mobile app.
 *
 * Defaults per lens 10 spec:
 *   - staleTime 30s -- the cinematic Profile/Progress screens fan out
 *     several queries on focus. 30s is long enough that a tab-switch
 *     within the same session doesn't refetch, short enough that data
 *     never feels stale to the user.
 *   - retry: 2 -- transient mobile network errors.
 *   - refetchOnWindowFocus: false -- mobile has no window-focus the
 *     same way web does; AppState focus is wired separately if needed.
 *   - refetchOnMount: 'always' -- if a screen mounts after a stale
 *     period, fetch in the background while showing stale data.
 *   - gcTime: 5 minutes -- keeps cache hot during a normal session.
 *
 * The QueryClient is constructed once at module load. Importers get
 * the SAME instance, so devtools / inspectors see the unified store.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});
