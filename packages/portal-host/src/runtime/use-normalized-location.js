import { useMemo, useState } from 'react';
import { normalizeLocation, rawKey, readWindowSearch } from './location';

// A real ?query is merged once per page load: by the first host instance that sees it. A later
// remount (e.g. a portal switch) on the same URL must not re-apply a stale direct-link query.
const consumedSearches = new Set();

function claimSearch() {
	const search = readWindowSearch();
	if (!search || consumedSearches.has(search)) return '';
	consumedSearches.add(search);
	return search;
}

/**
 * Normalized location for this host instance.
 *
 * A direct link may carry a real ?query (e.g. /site/crm?view=summary). It only applies to the
 * properties this instance received on its first render: once the platform navigates, it drops
 * the query string, and the q property is the only source.
 */
export function useNormalizedLocation(properties) {
	const key = rawKey(properties);
	const [first] = useState(() => ({ key, search: claimSearch() }));
	const initialSearch = key === first.key ? first.search : '';
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(() => normalizeLocation(properties, initialSearch), [key, initialSearch]);
}
