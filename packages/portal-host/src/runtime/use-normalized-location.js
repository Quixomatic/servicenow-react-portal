import { useEffect, useMemo, useRef, useState } from 'react';
import { OPTIONAL_PARAMS, normalizeLocation, present, rawKey, rawProperties, readWindowPath, readWindowSearch, staleParams, urlParamsOf, urlValueOf } from './location';

/** A property value that changed less than this ago is trusted over a URL that lacks it. */
const FRESH_MS = 1500;

// A real ?query is merged once per page load: by the first host instance that sees it. A later
// remount (e.g. a portal switch) on the same URL must not re-apply a stale direct-link query.
const consumedSearches = new Set();

function claimSearch() {
	const search = readWindowSearch();
	if (!search || consumedSearches.has(search)) return '';
	consumedSearches.add(search);
	return search;
}

/** Fired after an outgoing PORTAL_NAVIGATE so hosts re-read the URL once the platform has moved. */
export const URL_CHECK_EVENT = 'rp-url-check';

export function requestUrlCheck() {
	try {
		if (typeof window === 'undefined') return;
		[50, 400].forEach((ms) => setTimeout(() => window.dispatchEvent(new Event(URL_CHECK_EVENT)), ms));
	} catch (error) {
		/* no window */
	}
}

/**
 * Normalized location for this host instance.
 *
 * A direct link may carry a real ?query (e.g. /site/crm?view=summary). It only applies to the
 * properties this instance received on its first render: once the platform navigates, it drops
 * the query string, and the q property is the only source.
 *
 * UI Builder never delivers an absent optional param (Back from …/params/q/x to the page without
 * q keeps q = 'x'). On popstate and after our own navigations the URL path is re-read: an optional
 * param the URL lacks, whose property value didn't just change, is treated as ''.
 */
export function useNormalizedLocation(properties) {
	const key = rawKey(properties);
	const [first] = useState(() => ({ key, search: claimSearch() }));
	const initialSearch = key === first.key ? first.search : '';

	const [path, setPath] = useState(readWindowPath);
	useEffect(() => {
		if (typeof window === 'undefined') return undefined;
		const check = () => setPath(readWindowPath());
		window.addEventListener('popstate', check);
		window.addEventListener(URL_CHECK_EVENT, check);
		return () => {
			window.removeEventListener('popstate', check);
			window.removeEventListener(URL_CHECK_EVENT, check);
		};
	}, []);
	// A property change also re-reads the URL (UIB has usually pushed it by then).
	const currentPath = readWindowPath();
	if (currentPath !== path) setPath(currentPath);

	// When each optional property last changed: a value delivered moments ago is trusted even if
	// the URL hasn't caught up yet.
	const seen = useRef(null);
	const raw = rawProperties(properties);
	const now = Date.now();
	if (!seen.current) {
		seen.current = { raw, changedAt: {} };
		Object.keys(OPTIONAL_PARAMS).forEach((name) => {
			if (raw[name]) seen.current.changedAt[name] = now;
		});
	}
	else if (seen.current.raw !== raw) {
		Object.keys(OPTIONAL_PARAMS).forEach((name) => {
			if (String(seen.current.raw[name] || '') !== String(raw[name] || '')) seen.current.changedAt[name] = now;
		});
		seen.current.raw = raw;
	}
	const changedAt = seen.current.changedAt;
	const fresh = (name) => changedAt[name] !== undefined && now - changedAt[name] < FRESH_MS;
	const urlParams = present(raw.mode).toLowerCase() === 'studio' ? null : urlParamsOf(path, present(raw.portalSlug));
	const stale = staleParams(properties, fresh, urlParams);
	const staleKey = stale ? Object.keys(stale).sort().join(',') : '';
	// Values the URL has that the bindings didn't deliver.
	let fromUrl = null;
	if (urlParams) {
		Object.keys(OPTIONAL_PARAMS).forEach((name) => {
			const v = urlValueOf(urlParams, name);
			if (v && !present(raw[name])) (fromUrl = fromUrl || {})[name] = v;
		});
	}
	const fromUrlKey = fromUrl ? JSON.stringify(fromUrl) : '';
	const location = useMemo(
		() => normalizeLocation(properties, initialSearch, stale, fromUrl),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[key, initialSearch, staleKey, fromUrlKey]
	);
	return location;
}
