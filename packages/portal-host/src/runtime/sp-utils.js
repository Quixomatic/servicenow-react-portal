// Service Portal-style utilities for widgets, exported from @portal/runtime: the current user,
// system properties, translated messages, spUtils-like helpers, and Table API hooks. Data goes
// through the module-level QueryClient (cached per portal / language), so widgets share it.
import { useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PortalContext } from './contexts';
import { useComponent } from './widgets';
import { fetchJson, getHeaders, getMessages, getProperties, tableApi } from './api';

const EMPTY = Object.freeze({});

function usePortalValue() {
	return useContext(PortalContext);
}

// ---- user -----------------------------------------------------------------------------------

/**
 * useUser() → the bootstrap user ({ sysId, userName, name, firstName, lastName, email, title,
 * avatar, roles, timeZone, language, isImpersonating }) plus hasRole(name) / hasAnyRole(names).
 * hasRole is true for admin, like gs.hasRole.
 */
export function useUser() {
	const portal = usePortalValue();
	const user = (portal && portal.user) || null;
	return useMemo(() => {
		const roles = (user && user.roles) || [];
		const hasRole = (name) => roles.includes('admin') || roles.includes(name);
		const hasAnyRole = (names) => roles.includes('admin') || (names || []).some((n) => roles.includes(n));
		return { ...(user || {}), roles, signedIn: !!user, hasRole, hasAnyRole };
	}, [user]);
}

// ---- properties -----------------------------------------------------------------------------

/** useProperties(names) → { values: { name: value | null }, isLoading, error }. Cached per portal. */
export function useProperties(names) {
	const portal = usePortalValue();
	const slug = portal ? portal.slug : '';
	const list = (names || []).slice().sort();
	const query = useQuery({
		queryKey: ['rp', 'props', slug, list.join(',')],
		queryFn: () => getProperties(slug, list),
		enabled: list.length > 0,
		staleTime: 5 * 60_000
	});
	return { values: query.data || EMPTY, isLoading: list.length > 0 && query.isPending, error: query.error };
}

/** useProperty(name) → { value, isLoading, error }. */
export function useProperty(name) {
	const { values, isLoading, error } = useProperties(name ? [name] : []);
	return { value: name && values[name] !== undefined ? values[name] : null, isLoading, error };
}

// ---- messages (batched per tick, cached per language) -------------------------------------

const messageCache = new Map(); // `${lang}|${key}` -> string
const pendingByLang = new Map(); // lang -> { keys: Set, promise, resolve, reject }

function languageOf(portal) {
	return (portal && portal.user && portal.user.language) || 'en';
}

/** Resolve one message; every key requested in the same tick goes out in one POST /messages. */
function loadMessage(lang, key) {
	const cacheKey = `${lang}|${key}`;
	if (messageCache.has(cacheKey)) return Promise.resolve(messageCache.get(cacheKey));
	let batch = pendingByLang.get(lang);
	if (!batch) {
		batch = { keys: new Set() };
		batch.promise = new Promise((resolve, reject) => {
			batch.resolve = resolve;
			batch.reject = reject;
		});
		pendingByLang.set(lang, batch);
		setTimeout(() => {
			pendingByLang.delete(lang);
			const keys = Array.from(batch.keys);
			getMessages(keys).then(
				(messages) => {
					keys.forEach((k) => messageCache.set(`${lang}|${k}`, messages && messages[k] != null ? messages[k] : k));
					batch.resolve();
				},
				(error) => batch.reject(error)
			);
		}, 0);
	}
	batch.keys.add(key);
	return batch.promise.then(() => messageCache.get(cacheKey));
}

/** useMessages(keys) → { messages: { key: translated }, isLoading }. */
export function useMessages(keys) {
	const portal = usePortalValue();
	const lang = languageOf(portal);
	const list = (keys || []).filter(Boolean);
	const query = useQuery({
		queryKey: ['rp', 'messages', lang, list.join('\u0000')],
		queryFn: () => Promise.all(list.map((k) => loadMessage(lang, k))).then((values) => Object.fromEntries(list.map((k, i) => [k, values[i]]))),
		enabled: list.length > 0,
		staleTime: Infinity
	});
	return { messages: query.data || EMPTY, isLoading: list.length > 0 && query.isPending, error: query.error };
}

/** useMessage(key, fallback?) → the translated string (fallback, then the key, while loading). */
export function useMessage(key, fallback) {
	const { messages } = useMessages(key ? [key] : []);
	if (key && messages[key] != null) return messages[key];
	return fallback !== undefined ? fallback : key;
}

// ---- spUtils equivalent -------------------------------------------------------------------

/** format('Hello {0}', ['Ada']) / format('Hello {name}', { name: 'Ada' }) / format('{0} {1}', a, b) */
export function format(template, ...args) {
	const values = args.length === 1 && args[0] && typeof args[0] === 'object' ? args[0] : args;
	return String(template == null ? '' : template).replace(/\{(\w+)\}/g, (match, name) => {
		const v = values[name];
		return v === undefined || v === null ? match : String(v);
	});
}

/** Scroll an element (or the first match of a selector in the portal) into view in main. */
function scrollToIn(root, target, options) {
	const el = typeof target === 'string' ? root && root.querySelector(target) : target;
	if (!el || typeof el.scrollIntoView !== 'function') return false;
	el.scrollIntoView({ behavior: 'smooth', block: 'start', ...(options || {}) });
	return true;
}

/**
 * usePortalUtils(): the spUtils equivalent.
 *   addInfoMessage / addErrorMessage / addTrivialMessage(msg)  toasts (Sonner); `toast` for more
 *   format(template, values)  getMessage(key) → Promise  scrollTo(selectorOrElement)
 *   fetchJson(url, init)  refresh()  getHeaders()
 */
export function usePortalUtils() {
	const portal = usePortalValue();
	return useMemo(() => {
		const lang = languageOf(portal);
		return {
			addInfoMessage: (msg, opts) => toast.info(String(msg), opts),
			addErrorMessage: (msg, opts) => toast.error(String(msg), opts),
			addTrivialMessage: (msg, opts) => toast(String(msg), { duration: 2500, ...(opts || {}) }),
			toast,
			format,
			getMessage: (key) => loadMessage(lang, key),
			scrollTo: (target, options) => scrollToIn(portal && portal.shadowRoot, target, options),
			fetchJson,
			refresh: () => (portal && portal.refresh ? portal.refresh() : Promise.resolve()),
			getHeaders
		};
	}, [portal]);
}

/**
 * useServer(options?): the current component's server calls and data (same as useComponent()).
 * Server errors toast automatically; opt out with useServer({ toastErrors: false }) or per call
 * with server.get(input, { toast: false }).
 */
export function useServer(options) {
	return useComponent(options);
}

// ---- Table API ------------------------------------------------------------------------------

/** useRecord(table, sysId, { fields?, displayValue? }) → { data, isLoading, error, refetch } */
export function useRecord(table, sysId, options) {
	const o = options || {};
	const fields = Array.isArray(o.fields) ? o.fields.join(',') : o.fields || '';
	const displayValue = o.displayValue === undefined ? '' : String(o.displayValue);
	const query = useQuery({
		queryKey: ['rp', 'table', table, 'record', sysId, fields, displayValue],
		queryFn: () => tableApi(table, sysId, { sysparm_fields: fields, sysparm_display_value: displayValue }),
		enabled: !!table && !!sysId
	});
	return { data: query.data, isLoading: !!table && !!sysId && query.isPending, error: query.error, refetch: query.refetch };
}

/**
 * useTableQuery(table, { query, fields, limit, orderBy, displayValue }) →
 * { data: rows, isLoading, error, refetch }. orderBy: 'field' or '-field' (descending), or a list.
 */
export function useTableQuery(table, options) {
	const o = options || {};
	const fields = Array.isArray(o.fields) ? o.fields.join(',') : o.fields || '';
	const orders = (Array.isArray(o.orderBy) ? o.orderBy : o.orderBy ? [o.orderBy] : []).map((f) =>
		String(f).charAt(0) === '-' ? `ORDERBYDESC${String(f).slice(1)}` : `ORDERBY${f}`
	);
	const encoded = [o.query || ''].concat(orders).filter(Boolean).join('^');
	const limit = o.limit === undefined ? '' : String(o.limit);
	const displayValue = o.displayValue === undefined ? '' : String(o.displayValue);
	const query = useQuery({
		queryKey: ['rp', 'table', table, 'query', encoded, fields, limit, displayValue],
		queryFn: () => tableApi(table, null, { sysparm_query: encoded, sysparm_fields: fields, sysparm_limit: limit, sysparm_display_value: displayValue }),
		enabled: !!table
	});
	return { data: query.data, isLoading: !!table && query.isPending, error: query.error, refetch: query.refetch };
}

export { toast };
