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
const sourcePromises = new Map(); // url -> Promise<string> (JS source text, fetched with the token)

/** Fetch a module's source text once per page load (lets imports download in parallel). */
export function prefetchSource(url) {
    if (!sourcePromises.has(url)) {
        const promise = fetch(url, { credentials: 'same-origin', headers: assetHeaders('text/javascript,*/*') }).then(
            async (response) => {
                if (!response.ok) throw new Error(`GET ${url} failed: HTTP ${response.status}`);
                return response.text();
            }
        );
        promise.catch(() => sourcePromises.delete(url));
        sourcePromises.set(url, promise);
    }
    return sourcePromises.get(url);
}

async function blobImport(url) {
    const source = await prefetchSource(url);
    sourcePromises.delete(url); // evaluated once; the module cache takes over
    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
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
        const first = needsToken(url)
            ? blobImport(url).then((mod) => done(mod, 'blob'))
            : nativeImport(url).then((mod) => done(mod, 'import'));
        const promise = first
            .catch((directError) => {
                const directMessage = String((directError && directError.message) || directError);
                if (url.indexOf('blob:') === 0 || url.indexOf('data:') === 0 || needsToken(url)) throw directError;
                recordLoad({
                    kind: 'js',
                    method: 'import',
                    url: shortUrl(url),
                    ms: Date.now() - started,
                    ok: false,
                    error: directMessage + ' (trying fetch + Blob URL)',
                });
                return blobImport(url).then((mod) => done(mod, 'blob-fallback'));
            })
            .catch((error) => {
                modulePromises.delete(url); // allow a retry
                recordLoad({
                    kind: 'js',
                    url: shortUrl(url),
                    ms: Date.now() - started,
                    ok: false,
                    error: String((error && error.message) || error),
                });
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
                recordLoad({
                    kind: 'css',
                    url: shortUrl(url),
                    ms: Date.now() - started,
                    ok: false,
                    error: String((error && error.message) || error),
                });
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
    return Promise.all([importModule(build.js), build.css ? loadCss(build.css) : Promise.resolve('')]).then(
        ([mod, css]) => toLoaded(build, mod, css)
    );
}

// ---- record imports -------------------------------------------------------------------------
//
// A component can import other component records: `components:<ns>/<key>` (primitive, widget,
// block) or `utilities:<ns>/<key>` (utility). The compiled module reads
// globalThis.__REACT_PORTAL__.modules['<specifier>'] when it evaluates, so every import must be
// loaded and registered first. ComponentRef.imports lists them transitively, dependencies first:
//   imports: [{ specifier, id, uniqueId, kind, build: { id, js, css } }]
// Each import's module namespace (named exports + default) is registered under its specifier.

// Widget-kind imports render as embedded instances: embed.js installs a wrapper that replaces the
// namespace's default export (named exports and `.Raw` stay presentational).
let importWrapper = null;
export function setImportWrapper(fn) {
    importWrapper = typeof fn === 'function' ? fn : null;
}
function wrapNamespace(ns, imp) {
    return importWrapper && imp && imp.kind === 'widget' ? importWrapper(ns, imp) : ns;
}

const importPromises = new Map(); // build id -> Promise<{ mod, cssText }>
const importsLoaded = new Map(); // build id -> { mod, cssText } (resolved)
const registeredBy = new Map(); // specifier -> build id currently registered

function registryOf() {
    const g = globalThis;
    g.__REACT_PORTAL__ = g.__REACT_PORTAL__ || { modules: {} };
    g.__REACT_PORTAL__.modules = g.__REACT_PORTAL__.modules || {};
    return g.__REACT_PORTAL__;
}

function registerImport(specifier, buildId, mod) {
    const registry = registryOf();
    if (typeof registry.register === 'function') registry.register(specifier, mod);
    else registry.modules[specifier] = mod;
    registeredBy.set(specifier, buildId);
}

function importKey(imp) {
    return imp && imp.build ? imp.build.id || imp.build.js : '';
}

/**
 * The module object to register: the compiled module's CommonJS-style exports (every named export)
 * when the compiler publishes them as `__rpExports`, plus `default`; otherwise the ES namespace.
 */
function namespaceOf(mod) {
    if (mod && mod.__rpExports && typeof mod.__rpExports === 'object') {
        const ns = { ...mod.__rpExports };
        if (!('default' in ns) && 'default' in mod) ns.default = mod.default;
        return esModule(ns);
    }
    return mod;
}

/**
 * Mark a registered namespace as an ES module. Compiled code reads a default import through
 * sucrase's interop (`obj.__esModule ? obj : { default: obj }`); spreading the compiled exports
 * drops the non-enumerable __esModule flag, which made `import X from 'components:…'` resolve
 * to the whole namespace instead of its default export.
 */
export function esModule(ns) {
    if (ns && typeof ns === 'object' && !ns.__esModule) Object.defineProperty(ns, '__esModule', { value: true });
    return ns;
}

/** Start downloading an import's JS source and CSS without evaluating anything. */
function prefetchImport(imp) {
    const build = imp.build;
    if (!build) return;
    if (needsToken(build.js) && !modules.has(build.js)) prefetchSource(build.js).catch(() => {});
    if (build.css) loadCss(build.css).catch(() => {});
}

/**
 * Evaluate one import (its own imports must already be registered) and load its CSS. Cached per
 * build for the page load.
 */
function loadImport(imp) {
    const key = importKey(imp);
    if (!importPromises.has(key)) {
        const build = imp.build;
        const promise = Promise.all([
            importModule(build.js),
            build.css ? loadCss(build.css) : Promise.resolve(''),
        ]).then(
            ([mod, cssText]) => {
                const loaded = { mod: wrapNamespace(namespaceOf(mod), imp), cssText: cssText || '' };
                importsLoaded.set(key, loaded);
                return loaded;
            },
            (error) => {
                importPromises.delete(key);
                throw new Error(
                    `Import ${imp.specifier} (${imp.uniqueId || imp.id}) failed to load: ${(error && error.message) || error}`
                );
            }
        );
        importPromises.set(key, promise);
    }
    return importPromises.get(key);
}

function usableImports(ref) {
    const list = (ref && Array.isArray(ref.imports) ? ref.imports : []).filter((imp) => imp && imp.specifier);
    const seen = new Set();
    const out = [];
    for (const imp of list) {
        // A component never imports itself (the server rejects it; guard against stale manifests).
        if (ref.id && imp.id === ref.id) continue;
        const dedupe = `${imp.specifier}|${importKey(imp)}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        out.push(imp);
    }
    return out;
}

function combineCss(parts) {
    return parts
        .filter((p) => p && p.text && p.text.trim())
        .map((p) => `/* ${p.label} */\n${p.text}`)
        .join('\n');
}

function importsCss(imports) {
    return imports.map((imp) => {
        const loaded = importsLoaded.get(importKey(imp));
        return { label: imp.specifier, text: loaded ? loaded.cssText : '' };
    });
}

/**
 * Load a component's record imports in dependency order, registering each module under its
 * specifier, then the component itself. Resolves to { Component, cssText, imports } where cssText
 * is the imports' CSS (dependencies first) followed by the component's own, and imports lists
 * { specifier, buildId, cssText } for callers that inject per build.
 *
 * Imports load in parallel (network) but register strictly in manifest order, and every import is
 * registered before the dependent module is evaluated. Builds are deduped and cached per page load.
 * An import without a build fails the component with a clear message.
 */
export function loadComponent(ref) {
    const build = ref && ref.build;
    if (!build || !build.js) return Promise.reject(new Error('Component has no build (nothing compiled yet)'));
    const imports = usableImports(ref);
    const missing = imports.find((imp) => !imp.build || !imp.build.js);
    if (missing)
        return Promise.reject(
            new Error(`Import ${missing.specifier} has no build (compile ${missing.uniqueId || missing.id} first)`)
        );

    // Download everything now (sources + CSS in parallel), then evaluate strictly in manifest order:
    // a compiled module reads the registry when it evaluates, so each import is registered before
    // anything that depends on it runs.
    imports.forEach(prefetchImport);
    if (needsToken(build.js) && !modules.has(build.js)) prefetchSource(build.js).catch(() => {});
    const own = Promise.all([build.css ? loadCss(build.css) : Promise.resolve('')]);
    let chain = Promise.resolve();
    imports.forEach((imp) => {
        chain = chain.then(() =>
            loadImport(imp).then((loaded) => {
                const key = importKey(imp);
                if (registeredBy.get(imp.specifier) !== key) registerImport(imp.specifier, key, loaded.mod);
            })
        );
    });
    return chain
        .then(() => Promise.all([importModule(build.js), own]))
        .then(([mod, [css]]) => {
            const loaded = toLoaded(build, mod, css);
            return {
                Component: loaded.Component,
                cssText: combineCss([
                    ...importsCss(imports),
                    { label: ref.uniqueId || build.id, text: loaded.cssText },
                ]),
                imports: imports.map((imp) => ({
                    specifier: imp.specifier,
                    buildId: importKey(imp),
                    cssText: (importsLoaded.get(importKey(imp)) || {}).cssText || '',
                })),
            };
        });
}

/**
 * Synchronous cache hit for loadComponent: the component and every import already loaded this page
 * load (and registered). Returns the same shape as loadComponent, or null.
 */
export function peekComponent(ref) {
    const build = ref && ref.build;
    if (!build || !build.js || !modules.has(build.js)) return null;
    if (build.css && !cssTexts.has(build.css)) return null;
    const imports = usableImports(ref);
    for (const imp of imports) {
        const key = importKey(imp);
        if (!importsLoaded.has(key)) return null;
        if (registeredBy.get(imp.specifier) !== key) registerImport(imp.specifier, key, importsLoaded.get(key).mod);
    }
    try {
        const loaded = toLoaded(build, modules.get(build.js), build.css ? cssTexts.get(build.css) : '');
        return {
            Component: loaded.Component,
            cssText: combineCss([...importsCss(imports), { label: ref.uniqueId || build.id, text: loaded.cssText }]),
            imports: imports.map((imp) => ({
                specifier: imp.specifier,
                buildId: importKey(imp),
                cssText: importsLoaded.get(importKey(imp)).cssText,
            })),
        };
    } catch (error) {
        return null;
    }
}

/** Cache contents, for diagnostics. */
export function loaderStats() {
    return {
        modules: modules.size,
        stylesheets: cssTexts.size,
        imports: importsLoaded.size,
        registeredImports: Object.fromEntries(registeredBy),
    };
}
