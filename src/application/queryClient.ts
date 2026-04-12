import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // Data is "fresh" for 60 seconds — no refetch
      gcTime: 5 * 60_000,       // Keep unused data in cache for 5 minutes
      refetchOnWindowFocus: true, // Refresh when user returns to tab
      retry: 1,                  // Retry failed queries once
    },
  },
});
