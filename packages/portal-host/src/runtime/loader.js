// Component loader (spec §8.4). A component build is { id, js, css, utilities?, utilitiesKey? }: js is
// the URL of an ES module whose default export is the component, css the URL of its author CSS,
// utilities the URL of its own Tailwind utilities sheet (compiler v6+; older builds have their
// utilities inside css). Everything is cached for the page load (module level), so remounts and Back
// navigation are instant.
//
// Portal utilities sheet (one per portal, manifest v5): a build whose utilitiesKey is in the portal
// sheet's covers needs no utilities sheet of its own. loadComponent(ref, covers) skips downloading
// those, and returns the uncovered utilities (utilitiesText) apart from the author CSS (authorText).
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

/** Already loaded? Returns { Component, cssText } synchronously, or null. cssText: utilities + author CSS. */
export function peekBuild(build) {
    if (!build || !build.js || !modules.has(build.js)) return null;
    if (build.css && !cssTexts.has(build.css)) return null;
    if (build.utilities && !cssTexts.has(build.utilities)) return null;
    try {
        return toLoaded(build, modules.get(build.js), ownCss(build, null));
    } catch (error) {
        return null;
    }
}

/** Load a build's JS and CSS in parallel. Resolves to { Component, cssText } (utilities + author CSS). */
export function loadBuild(build) {
    if (!build || !build.js) return Promise.reject(new Error('Component has no build (nothing compiled yet)'));
    return Promise.all([
        importModule(build.js),
        build.css ? loadCss(build.css) : Promise.resolve(''),
        build.utilities ? loadCss(build.utilities) : Promise.resolve(''),
    ]).then(([mod]) => toLoaded(build, mod, ownCss(build, null)));
}

// ---- utilities sheets ------------------------------------------------------------------------

/** Is the build's own utilities sheet covered by the portal sheet (covers: Set of keys, or null)? */
export function isCovered(build, covers) {
    return !!(covers && build && build.utilities && build.utilitiesKey && covers.has(build.utilitiesKey));
}

/** The utilities sheet URL a build still needs given `covers`, or null. */
function neededUtilities(build, covers) {
    return build && build.utilities && !isCovered(build, covers) ? build.utilities : null;
}

/** A build's uncovered utilities + author CSS, from the cache (missing texts read as ''). */
function ownCss(build, covers) {
    const util = neededUtilities(build, covers);
    const parts = [];
    if (util && cssTexts.get(util)) parts.push(cssTexts.get(util));
    if (build.css && cssTexts.get(build.css)) parts.push(cssTexts.get(build.css));
    return parts.join('\n');
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
function prefetchImport(imp, covers) {
    const build = imp.build;
    if (!build) return;
    if (needsToken(build.js) && !modules.has(build.js)) prefetchSource(build.js).catch(() => {});
    if (build.css) loadCss(build.css).catch(() => {});
    const util = neededUtilities(build, covers);
    if (util) loadCss(util).catch(() => {});
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

/**
 * The CSS of a component and its imports (dependencies first), from the cache:
 *   utilitiesText  the uncovered Tailwind utilities sheets;
 *   authorText     the author CSS;
 *   cssText        both, per build (utilities then author), as one sheet: what callers that inject a
 *                  single sheet use (Studio preview, docs, view rules); without covers it is the
 *                  complete CSS, as before the portal sheet existed.
 */
function cssOf(ref, imports, covers) {
    const builds = imports
        .map((imp) => ({ label: imp.specifier, build: imp.build }))
        .concat([{ label: ref.uniqueId || ref.build.id, build: ref.build }]);
    const utilities = [];
    const author = [];
    const both = [];
    for (const { label, build } of builds) {
        const util = neededUtilities(build, covers);
        const u = util ? cssTexts.get(util) || '' : '';
        const a = build.css ? cssTexts.get(build.css) || '' : '';
        utilities.push({ label, text: u });
        author.push({ label, text: a });
        both.push({ label, text: [u, a].filter((t) => t && t.trim()).join('\n') });
    }
    return { utilitiesText: combineCss(utilities), authorText: combineCss(author), cssText: combineCss(both) };
}

/** Every utilities sheet the component and its imports still need, given `covers`. */
function neededSheets(ref, imports, covers) {
    const urls = [];
    for (const b of imports.map((imp) => imp.build).concat([ref.build])) {
        const util = neededUtilities(b, covers);
        if (util && urls.indexOf(util) < 0) urls.push(util);
    }
    return urls;
}

/**
 * Load a component's record imports in dependency order, registering each module under its
 * specifier, then the component itself. Resolves to
 *   { Component, cssText, utilitiesText, authorText, imports }
 * (see cssOf); imports lists { specifier, buildId, cssText } for callers that inject per build.
 *
 * covers (optional): the Set of utilities keys the portal sheet covers in the caller's shadow root.
 * Covered builds' utilities sheets are neither downloaded nor returned.
 *
 * Imports load in parallel (network) but register strictly in manifest order, and every import is
 * registered before the dependent module is evaluated. Builds are deduped and cached per page load.
 * An import without a build fails the component with a clear message.
 */
export function loadComponent(ref, covers) {
    const build = ref && ref.build;
    if (!build || !build.js) return Promise.reject(new Error('Component has no build (nothing compiled yet)'));
    const imports = usableImports(ref);
    const missing = imports.find((imp) => !imp.build || !imp.build.js);
    if (missing)
        return Promise.reject(
            new Error(`Import ${missing.specifier} has no build (compile ${missing.uniqueId || missing.id} first)`)
        );
    const cover = covers || null;

    // Download everything now (sources + CSS in parallel), then evaluate strictly in manifest order:
    // a compiled module reads the registry when it evaluates, so each import is registered before
    // anything that depends on it runs.
    imports.forEach((imp) => prefetchImport(imp, cover));
    if (needsToken(build.js) && !modules.has(build.js)) prefetchSource(build.js).catch(() => {});
    const own = Promise.all(
        [build.css ? loadCss(build.css) : Promise.resolve('')].concat(
            neededSheets(ref, imports, cover).map((url) => loadCss(url))
        )
    );
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
        .then(([mod]) => {
            const loaded = toLoaded(build, mod, '');
            return {
                Component: loaded.Component,
                ...cssOf(ref, imports, cover),
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
 * load (and registered), and every utilities sheet it needs given `covers`. Same shape, or null.
 */
export function peekComponent(ref, covers) {
    const build = ref && ref.build;
    if (!build || !build.js || !modules.has(build.js)) return null;
    if (build.css && !cssTexts.has(build.css)) return null;
    const cover = covers || null;
    const imports = usableImports(ref);
    for (const imp of imports) {
        if (!importsLoaded.has(importKey(imp))) return null;
    }
    if (neededSheets(ref, imports, cover).some((url) => !cssTexts.has(url))) return null;
    for (const imp of imports) {
        const key = importKey(imp);
        if (registeredBy.get(imp.specifier) !== key) registerImport(imp.specifier, key, importsLoaded.get(key).mod);
    }
    try {
        const loaded = toLoaded(build, modules.get(build.js), '');
        return {
            Component: loaded.Component,
            ...cssOf(ref, imports, cover),
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
