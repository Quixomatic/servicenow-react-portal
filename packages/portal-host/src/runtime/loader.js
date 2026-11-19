// Component loader (spec §8.4). A component build is { id, js, css }: js is the URL of an ES
// module whose default export is the component, css the URL of its stylesheet. Both are cached
// for the page load (module level), so remounts and Back navigation are instant.
//
// The same path serves mock Blob URLs today and the runtime asset API
// (/api/x_312987_portal/rp/assets/{build}/{file}) later.
import { fetchText, assetHeaders, needsToken } from './api';
import { recordLoad } from './diagnostics';

const modulePromises = new Map(); // url -> Promise<module>
const modules = new Map(); // url -> module (resolved)
const cssPromises = new Map(); // url -> Promise<string>
const cssTexts = new Map(); // url -> string (resolved)

function shortUrl(url) {
	return url && url.indexOf('blob:') === 0 ? 'blob:…' + url.slice(-12) : url;
}

function nativeImport(url) {
	// webpackIgnore keeps the ServiceNow build from bundling the expression: the browser performs
	// the import at runtime (verified in the deployed asset: a plain import(e)).
	return import(/* webpackIgnore: true */ url);
}

/**
 * Fallback when a direct import() fails (CSP on the URL, wrong MIME type): fetch the source and
 * import it from a Blob URL. Only for non-blob URLs.
 */
async function blobImport(url) {
	const response = await fetch(url, { credentials: 'same-origin', headers: assetHeaders('text/javascript,*/*') });
	if (!response.ok) throw new Error(`GET ${url} failed: HTTP ${response.status}`);
	const blobUrl = URL.createObjectURL(new Blob([await response.text()], { type: 'text/javascript' }));
	try {
		return await nativeImport(blobUrl);
	} finally {
		URL.revokeObjectURL(blobUrl);
	}
}

const loadMethods = new Map(); // url -> 'import' | 'blob-fallback'

/** import() an ES module by URL (direct first, then fetch + Blob URL). Cached per page load. */
export function importModule(url) {
	if (!modulePromises.has(url)) {
		const started = Date.now();
		const done = (mod, method) => {
			modules.set(url, mod);
			loadMethods.set(url, method);
			recordLoad({ kind: 'js', method, url: shortUrl(url), ms: Date.now() - started, ok: true });
			return mod;
		};
		// Scripted REST asset URLs need X-UserToken, which import() can't send: fetch + Blob URL.
		const first = needsToken(url) ? blobImport(url).then((mod) => done(mod, 'blob')) : nativeImport(url).then((mod) => done(mod, 'import'));
		const promise = first
			.catch((directError) => {
				const directMessage = String((directError && directError.message) || directError);
				if (url.indexOf('blob:') === 0 || url.indexOf('data:') === 0 || needsToken(url)) throw directError;
				recordLoad({ kind: 'js', method: 'import', url: shortUrl(url), ms: Date.now() - started, ok: false, error: directMessage + ' (trying fetch + Blob URL)' });
				return blobImport(url).then((mod) => done(mod, 'blob-fallback'));
			})
			.catch((error) => {
				modulePromises.delete(url); // allow a retry
				recordLoad({ kind: 'js', url: shortUrl(url), ms: Date.now() - started, ok: false, error: String((error && error.message) || error) });
				throw error;
			});
		modulePromises.set(url, promise);
	}
	return modulePromises.get(url);
}

/** How each module URL was loaded: { [url]: 'import' | 'blob-fallback' } (diagnostics). */
export function loadMethodsSnapshot() {
	const out = {};
	loadMethods.forEach((method, url) => {
		out[shortUrl(url)] = method;
	});
	return out;
}

/** Cached CSS text for a URL (synchronous), or undefined if not loaded yet this page load. */
export function peekCss(url) {
	return cssTexts.has(url) ? cssTexts.get(url) : undefined;
}

export function loadCss(url) {
	if (!cssPromises.has(url)) {
		const started = Date.now();
		const promise = fetchText(url).then(
			(text) => {
				cssTexts.set(url, text);
				recordLoad({ kind: 'css', url: shortUrl(url), ms: Date.now() - started, ok: true });
				return text;
			},
			(error) => {
				cssPromises.delete(url);
				recordLoad({ kind: 'css', url: shortUrl(url), ms: Date.now() - started, ok: false, error: String((error && error.message) || error) });
				throw error;
			}
		);
		cssPromises.set(url, promise);
	}
	return cssPromises.get(url);
}

function toLoaded(build, mod, cssText) {
	const Component = mod && mod.default;
	if (typeof Component !== 'function' && !(Component && typeof Component === 'object' && Component.$$typeof)) {
		throw new Error(`Build ${build.id}: the module has no default-exported component`);
	}
	return { Component, cssText: cssText || '' };
}

/** Already loaded? Returns { Component, cssText } synchronously, or null. */
export function peekBuild(build) {
	if (!build || !build.js || !modules.has(build.js)) return null;
	if (build.css && !cssTexts.has(build.css)) return null;
	try {
		return toLoaded(build, modules.get(build.js), build.css ? cssTexts.get(build.css) : '');
	} catch (error) {
		return null;
	}
}

/** Load a build's JS and CSS in parallel. Resolves to { Component, cssText }. */
export function loadBuild(build) {
	if (!build || !build.js) return Promise.reject(new Error('Component has no build (nothing compiled yet)'));
	return Promise.all([importModule(build.js), build.css ? loadCss(build.css) : Promise.resolve('')]).then(([mod, css]) =>
		toLoaded(build, mod, css)
	);
}

/** Cache contents, for diagnostics. */
export function loaderStats() {
	return { modules: modules.size, stylesheets: cssTexts.size };
}
