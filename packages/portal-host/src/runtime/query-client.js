import { QueryClient } from '@tanstack/react-query';
import { attachQueryClient } from './diagnostics';

// One QueryClient per browser page load (spec §8.2). It lives at module level, so it survives
// host remounts (portal switches, cached pages) and data stays warm. Query keys must include
// portalSlug (and later release, user and instance). Writes are mutations: no retries, no
// refetch-on-focus.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
        mutations: {
            retry: false,
        },
    },
});

// Per-key fetch counts and cache state for window.__RP_DIAG__.
attachQueryClient(queryClient);
