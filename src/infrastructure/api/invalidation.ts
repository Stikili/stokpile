/**
 * Auto-invalidation: after any successful write (POST/PUT/DELETE),
 * invalidate all React Query caches so views refresh automatically.
 *
 * This is a brute-force approach — invalidates everything rather than
 * surgically invalidating specific keys. It's simple and correct.
 * The staleTime (60s) means most reads will use cache anyway, so
 * the invalidation only triggers a background refetch for active queries.
 */

import { queryClient } from '@/application/queryClient';

let enabled = false;

export function enableAutoInvalidation() {
  if (enabled) return;
  enabled = true;

  const originalFetch = window.fetch;

  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch.apply(this, args);

    // Only invalidate on successful mutations (POST/PUT/DELETE)
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
    const method = ((args[1] as RequestInit)?.method || 'GET').toUpperCase();

    if (
      response.ok &&
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) &&
      url.includes('supabase.co/functions') &&
      !url.includes('/session') &&
      !url.includes('/health')
    ) {
      // Small delay so the server has time to commit
      setTimeout(() => {
        queryClient.invalidateQueries();
      }, 300);
    }

    return response;
  };
}
