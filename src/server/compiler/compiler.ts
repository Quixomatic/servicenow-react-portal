import { transform, version as sucraseVersion } from './vendor/sucrase.js';
import {
    compile as tailwindCompile,
    loadDesignSystem,
    sheets as tailwindSheets,
    version as tailwindVersion,
} from './vendor/tailwind.js';
import type { TailwindDesignSystem, TailwindOptions } from './vendor/tailwind.js';
import {
    moveVariantsToLayer,
    renameLayers,
    LAYER_ORDER,
    PORTAL_LAYER,
    VARIANT_LAYER,
    INSTANCE_LAYER,
    INSTANCE_VARIANT_LAYER,
} from './variant-layer.ts';
import { UTILITY_ROOTS, UTILITY_ROOTS_KEY } from './utility-roots.ts';
import { HOST_CANDIDATES } from './host-candidates.ts';

/**
 * RPCompiler: server-side component compiler (runs in the instance's JavaScript engine, no
 * WebAssembly). Pure functions — no GlideRecord here — so the same code can also run in a
 * browser (Studio) or in Node (tests, seeds).
 *
 *   TSX/TS/JSX → Sucrase (typescript + jsx + imports → CommonJS-style module per file)
 *   main.tsx + relative imports → one ES module (small linker below)
 *   react, react-dom, react/jsx-runtime, @portal/runtime, components:*, utilities:* → host registry
 *   Tailwind v4: the source's candidate class names, filtered to the ones that are utilities
 *   (`candidates`), compiled into the component's own utilities sheet (`utilities`, the fallback when
 *   no portal sheet covers the build); the author's CSS stays separate (`css`)
 *
 * Output (one build): index.js (default export = the component), index.css (author CSS),
 * utilities.css (Tailwind) and tailwind-candidates.json (the valid candidates, unioned per portal at
 * reprocess into one portal utilities sheet: compilePortalUtilities).
 */

export const COMPILER_VERSION = `rp-server-compiler/6 (sucrase ${sucraseVersion}, tailwindcss ${tailwindVersion})`;
export const ENTRY = 'main.tsx';

export interface CompilerFile {
    path: string;
    content: string;
    target: 'client' | 'server' | 'style' | 'asset';
}

export interface CompileInput {
    /** Compiler inputs: virtual main.tsx / styles.css plus extra client/style files. */
    files: CompilerFile[];
    /** Generate Tailwind utilities for the classes used. */
    tailwind: boolean;
    /** For the banner comment and diagnostics. */
    label: string;
    /**
     * The previous compile's cache (compile-cache.json of the owner's build). Used only together with
     * `hash`, and only when its format, compiler and utility roots match this compiler.
     */
    cache?: CompileCache | null;
    /** Content hash for the cache (sha256 on the instance). Without it nothing is cached. */
    hash?: (text: string) => string;
}

/**
 * What one compile remembers for the next (stored as the build's compile-cache.json). Every entry is
 * keyed by content or by compiler identity, so a stale or foreign cache only causes misses: outputs are
 * byte-identical with or without it.
 */
export interface CompileCache {
    format: number;
    compiler: string;
    roots: string;
    /** Per linked file: content hash → Sucrase output, and its possible utilities (Tailwind builds only). */
    files: Record<string, CompileCacheFile>;
    /** Possible utilities Tailwind accepted (= the build's candidates, sorted) and rejected. */
    valid: string[];
    rejected: string[];
    /** The utilities sheet compiled from `valid` (result.utilities). */
    utilities: string;
}

export interface CompileCacheFile {
    hash: string;
    code: string;
    survivors?: string[];
}

export { COMPILE_CACHE_ASSET } from './cache-asset.ts';
const COMPILE_CACHE_FORMAT = 1;

export interface Diagnostic {
    file?: string;
    line?: number;
    column?: number;
    message: string;
}

export interface CompileDependency {
    specifier: string;
    kind: 'host' | 'relative' | 'component';
    hostExport?: string;
    resolvedEntry?: string;
    /** The file that imports it (the first one, for host and record imports). */
    file?: string;
}

export interface CompileResult {
    ok: boolean;
    js: string;
    /** The author's CSS (styles.css, then imported .css files); unlayered. */
    css: string;
    /** The component's own Tailwind utilities sheet ('' without Tailwind or without utilities). */
    utilities: string;
    /** Valid Tailwind candidates (sorted), for the portal utilities sheet. */
    candidates: string[];
    dependencies: CompileDependency[];
    diagnostics: { errors: Diagnostic[]; warnings: Diagnostic[] };
    compilerVersion: string;
    ms: number;
    /** The cache for the next compile (only when the input had `hash` and the compile succeeded). */
    cache?: CompileCache;
}

/** Bare specifiers the host registry provides (prefix entries end with ':'). */
const HOST_EXACT = [
    'react',
    'react-dom',
    'react-dom/client',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    '@portal/runtime',
];
const HOST_PREFIX = ['components:', 'utilities:'];
const CODE_EXT = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'];
const STYLE_EXT = ['.css'];

/** components:<namespace>/<key> or utilities:<namespace>/<key>: another component record (primitive, utility…). */
export const RECORD_IMPORT = /^(components|utilities):([a-z][a-z0-9-]{0,39}\/[a-z][a-z0-9-]{0,79})$/;

function isHost(spec: string): boolean {
    return HOST_EXACT.indexOf(spec) >= 0 || HOST_PREFIX.some((p) => spec.indexOf(p) === 0);
}

function ext(path: string): string {
    const i = path.lastIndexOf('.');
    return i < 0 ? '' : path.substring(i).toLowerCase();
}

function dirname(path: string): string {
    const i = path.lastIndexOf('/');
    return i < 0 ? '' : path.substring(0, i);
}

/** Join and normalize a relative specifier against a directory; null if it escapes the project. */
function joinPath(dir: string, spec: string): string | null {
    const parts = (dir ? dir.split('/') : []).concat(spec.split('/'));
    const out: string[] = [];
    for (const p of parts) {
        if (p === '' || p === '.') continue;
        if (p === '..') {
            if (!out.length) return null;
            out.pop();
        } else out.push(p);
    }
    return out.join('/');
}

function resolveRelative(fromPath: string, spec: string, byPath: Record<string, CompilerFile>): string | null {
    const base = joinPath(dirname(fromPath), spec);
    if (base === null) return null;
    if (byPath[base]) return base;
    for (const e of CODE_EXT.concat(STYLE_EXT)) if (byPath[base + e]) return base + e;
    for (const e of CODE_EXT) if (byPath[base + '/index' + e]) return base + '/index' + e;
    return null;
}

/** Sucrase errors carry "(line:col)" in the message. */
function toDiagnostic(file: string, e: unknown): Diagnostic {
    const message = String((e && (e as { message?: string }).message) || e);
    const m = /\((\d+):(\d+)\)/.exec(message);
    return { file, line: m ? parseInt(m[1], 10) : undefined, column: m ? parseInt(m[2], 10) : undefined, message };
}

function transformFile(file: CompilerFile): string {
    const e = ext(file.path);
    if (e === '.json') return `module.exports = ${JSON.stringify(JSON.parse(file.content))};`;
    const transforms: Array<'typescript' | 'jsx' | 'imports'> =
        e === '.ts' ? ['typescript', 'imports'] : e === '.tsx' ? ['typescript', 'jsx', 'imports'] : ['jsx', 'imports'];
    return transform(file.content, {
        transforms,
        jsxRuntime: 'classic',
        jsxPragma: 'React.createElement',
        jsxFragmentPragma: 'React.Fragment',
        production: true,
        filePath: file.path,
    }).code;
}

const REQUIRE_RE = /\brequire\(\s*(['"])([^'"]+)\1\s*\)/g;

interface Linked {
    order: string[];
    code: Record<string, string>;
    maps: Record<string, Record<string, string>>;
    styles: string[];
    dependencies: CompileDependency[];
    errors: Diagnostic[];
}

/** Per-compile cache state: the previous cache (when usable) and the entries for the next one. */
interface CacheState {
    hash: (text: string) => string;
    prev: CompileCache | null;
    next: Record<string, CompileCacheFile>;
}

function usableCache(cache: CompileCache | null | undefined): CompileCache | null {
    if (!cache || typeof cache !== 'object') return null;
    if (cache.format !== COMPILE_CACHE_FORMAT || cache.compiler !== COMPILER_VERSION) return null;
    if (cache.roots !== UTILITY_ROOTS_KEY || !cache.files || typeof cache.files !== 'object') return null;
    return cache;
}

/** Sucrase output of a file, reused from the previous compile when the content hash matches. */
function transformCached(file: CompilerFile, state: CacheState | null): string {
    if (!state) return transformFile(file);
    const hash = state.hash(file.content);
    const prev = state.prev ? state.prev.files[file.path] : undefined;
    if (prev && prev.hash === hash && typeof prev.code === 'string') {
        state.next[file.path] = { hash, code: prev.code, survivors: prev.survivors };
        return prev.code;
    }
    const code = transformFile(file);
    state.next[file.path] = { hash, code };
    return code;
}

/** Walk the import graph from main.tsx, transforming each reachable code file once. */
function link(byPath: Record<string, CompilerFile>, state: CacheState | null): Linked {
    const linked: Linked = { order: [], code: {}, maps: {}, styles: [], dependencies: [], errors: [] };
    const seenHost: Record<string, boolean> = {};
    const queue = [ENTRY];
    const visited: Record<string, boolean> = {};
    while (queue.length) {
        const path = queue.shift() as string;
        if (visited[path]) continue;
        visited[path] = true;
        const file = byPath[path];
        if (!file) {
            linked.errors.push({ file: path, message: `File not found: ${path}` });
            continue;
        }
        let code: string;
        try {
            code = transformCached(file, state);
        } catch (e) {
            linked.errors.push(toDiagnostic(path, e));
            continue;
        }
        linked.order.push(path);
        linked.code[path] = code;
        const map: Record<string, string> = {};
        linked.maps[path] = map;
        REQUIRE_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = REQUIRE_RE.exec(code))) {
            const spec = m[2];
            if (map[spec]) continue;
            if (spec.charAt(0) === '.') {
                const target = resolveRelative(path, spec, byPath);
                if (!target) {
                    linked.errors.push({ file: path, message: `Cannot resolve "${spec}" from ${path}` });
                    continue;
                }
                if (STYLE_EXT.indexOf(ext(target)) >= 0) {
                    map[spec] = '@css';
                    if (linked.styles.indexOf(target) < 0) linked.styles.push(target);
                } else {
                    map[spec] = target;
                    queue.push(target);
                }
                linked.dependencies.push({ specifier: spec, kind: 'relative', resolvedEntry: target, file: path });
            } else if (isHost(spec)) {
                map[spec] = '@host:' + spec;
                if (!seenHost[spec]) {
                    seenHost[spec] = true;
                    // Record imports load another component's build into the registry at runtime
                    // (resolved and validated by the build service); the rest are host built-ins.
                    const rec = RECORD_IMPORT.exec(spec);
                    if (rec)
                        linked.dependencies.push({
                            specifier: spec,
                            kind: 'component',
                            resolvedEntry: rec[2],
                            file: path,
                        });
                    else linked.dependencies.push({ specifier: spec, kind: 'host', hostExport: spec, file: path });
                }
            } else {
                linked.errors.push({
                    file: path,
                    message: `Unknown import "${spec}". Import relative files ("./…") or host modules: ${HOST_EXACT.join(', ')}, components:<name>, utilities:<name>.`,
                });
            }
        }
    }
    return linked;
}

function emitModule(linked: Linked, label: string): string {
    const defs = linked.order
        .map((p) => `${JSON.stringify(p)}: function (module, exports, require, React) {\n${linked.code[p]}\n}`)
        .join(',\n');
    return [
        `// React Portal compiled component: ${label} (${COMPILER_VERSION})`,
        `const __rpm = globalThis.__REACT_PORTAL__.modules;`,
        `function __rpHost(id) { const m = __rpm[id]; if (!m) throw new Error('React Portal host does not provide "' + id + '"'); return m; }`,
        `const React = __rpHost('react');`,
        `const __rpDefs = {\n${defs}\n};`,
        `const __rpMaps = ${JSON.stringify(linked.maps)};`,
        `const __rpCache = {};`,
        `function __rpLoad(path) {`,
        `  if (__rpCache[path]) return __rpCache[path].exports;`,
        `  const module = { exports: {} };`,
        `  __rpCache[path] = module;`,
        `  const map = __rpMaps[path];`,
        `  __rpDefs[path](module, module.exports, function (spec) {`,
        `    const t = map[spec];`,
        `    if (t === '@css') return {};`,
        `    if (t.indexOf('@host:') === 0) return __rpHost(t.substring(6));`,
        `    return __rpLoad(t);`,
        `  }, React);`,
        `  return module.exports;`,
        `}`,
        `const __rpEntry = __rpLoad(${JSON.stringify(ENTRY)});`,
        // Every named export, so other records can import { useField } from 'components:app/field'.
        `export const __rpExports = __rpEntry;`,
        `export default (__rpEntry && __rpEntry.__esModule ? __rpEntry.default : __rpEntry.default || __rpEntry);`,
        ``,
    ].join('\n');
}

/* ---------------- Tailwind ---------------- */

/** shadcn token names → Tailwind colors/radii, so bg-primary, text-muted-foreground, rounded-lg follow the portal theme. */
export const SHADCN_COLORS = [
    'background',
    'foreground',
    'card',
    'card-foreground',
    'popover',
    'popover-foreground',
    'primary',
    'primary-foreground',
    'secondary',
    'secondary-foreground',
    'muted',
    'muted-foreground',
    'accent',
    'accent-foreground',
    'destructive',
    'destructive-foreground',
    // Status tones (success / warning / info), same values as ReUI's theme; the chart gallery uses them.
    'success',
    'success-foreground',
    'warning',
    'warning-foreground',
    'info',
    'info-foreground',
    'border',
    'input',
    'ring',
    'chart-1',
    'chart-2',
    'chart-3',
    'chart-4',
    'chart-5',
    'sidebar',
    'sidebar-foreground',
    'sidebar-primary',
    'sidebar-primary-foreground',
    'sidebar-accent',
    'sidebar-accent-foreground',
    'sidebar-border',
    'sidebar-ring',
];

function tailwindInput(utilitiesLayer: string, hostCss: boolean): string {
    return [
        // rp-variants: in component sheets, variant rules move there after the build (variant-layer.ts),
        // so a variant from any sheet in the shadow root beats a base utility from any other sheet.
        // rp-portal: the portal sheet's own layer, last.
        `@layer ${LAYER_ORDER};`,
        '@import "tailwindcss/theme" layer(theme);',
        // The portal sheet also compiles the host's classes, so it imports what the host's framework
        // CSS imports (packages/portal-host/src/styles/tailwind.css): tw-animate-css utilities and
        // shadcn's keyframes, utilities and data-* variants.
        ...(hostCss ? ['@import "tw-animate-css";', '@import "shadcn/tailwind.css";'] : []),
        `@import "tailwindcss/utilities" layer(${utilitiesLayer});`,
        // Widgets render inside the host's shadow root; dark mode keys off the host's .dark class.
        '@custom-variant dark (&:where(:host(.dark), :host(.dark) *, .dark, .dark *));',
        '@theme inline {',
        ...SHADCN_COLORS.map((c) => `  --color-${c}: var(--${c});`),
        '  --radius-sm: calc(var(--radius) - 4px);',
        '  --radius-md: calc(var(--radius) - 2px);',
        '  --radius-lg: var(--radius);',
        '  --radius-xl: calc(var(--radius) + 4px);',
        '}',
    ].join('\n');
}

/** Input of every component's own utilities sheet (and of instance classes: design/instance-style.ts). */
export const TAILWIND_INPUT = tailwindInput('utilities', false);

/** Input of the portal utilities sheet: the host's CSS packages too, utilities in @layer rp-portal. */
export const PORTAL_TAILWIND_INPUT = tailwindInput(PORTAL_LAYER, true);

/**
 * Candidate class names from source text (Tailwind's own extractor is native Rust; this
 * over-collects on purpose — build() silently ignores anything that isn't a utility).
 */
/**
 * Split on JSX/JS punctuation that can't occur in a class name, but only OUTSIDE square brackets:
 * arbitrary variants/values keep their contents (group-data-[collapsible=icon]:hidden,
 * [&>[data-slot=x]]:p-0, data-[side=left]:border-r).
 */
const SPLIT_CHARS = '{}<>=;' + String.fromCharCode(92); // 92 = backslash

function splitOutsideBrackets(raw: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < raw.length; i++) {
        const ch = raw.charAt(i);
        if (ch === '[') depth++;
        else if (ch === ']' && depth > 0) depth--;
        if (depth === 0 && SPLIT_CHARS.indexOf(ch) >= 0) {
            if (current) parts.push(current);
            current = '';
        } else current += ch;
    }
    if (current) parts.push(current);
    return parts;
}

export function extractCandidates(sources: string[]): string[] {
    const set: Record<string, boolean> = {};
    const add = (t: string) => {
        if (t.length < 2 || t.length > 160) return;
        if (!/^[!-]?[a-z@\[*][\w\-:/.\[\]#%!&@*+,'">=~^$|()]*$/i.test(t)) return;
        set[t] = true;
    };
    for (const src of sources) {
        // Split on whitespace and quotes only, so arbitrary values keep their parentheses and
        // commas (grid-cols-[7rem_minmax(0,1fr)_auto], bg-[rgb(0,0,0)]); then on JSX/JS punctuation
        // outside brackets.
        for (const raw of src.split(/[\s"'`]+/)) {
            for (const part of splitOutsideBrackets(raw)) {
                add(part);
                add(part.replace(/^[.,:()!?]+/, '').replace(/[.,:;)]+$/, ''));
            }
        }
    }
    return Object.keys(set);
}

function tailwindOptions(polyfills?: number): TailwindOptions {
    const options: TailwindOptions = {
        base: '/',
        loadStylesheet: (id, base) => {
            const content = tailwindSheets[id];
            if (content === undefined) return Promise.reject(new Error(`Unknown stylesheet ${id}`));
            return Promise.resolve({ content, base, path: id });
        },
    };
    if (polyfills !== undefined) options.polyfills = polyfills;
    return options;
}

/** A component's own utilities sheet: Tailwind's output with variant rules moved to rp-variants. */
export function compileTailwind(candidates: string[]): Promise<string> {
    return tailwindCompile(TAILWIND_INPUT, tailwindOptions()).then((c) => moveVariantsToLayer(c.build(candidates)));
}

/**
 * Placement classes (instance CSS): a component sheet whose layers are renamed to rp-instance /
 * rp-instance-variants, above the portal sheet, so a placement's classes still beat the component's.
 */
export function compileInstanceTailwind(candidates: string[]): Promise<string> {
    return compileTailwind(candidates).then((css) =>
        renameLayers(css, { utilities: INSTANCE_LAYER, [VARIANT_LAYER]: INSTANCE_VARIANT_LAYER })
    );
}

/**
 * The portal utilities sheet: one Tailwind build over the union of a portal's candidates (every
 * component build in its manifest plus the host's classes), in @layer rp-portal. No variant pass:
 * inside one sheet Tailwind's own order is right, and the layer puts it above every other sheet.
 * Polyfills: @property fallbacks only (needed in shadow roots); the color-mix fallbacks are skipped
 * (about 8% faster and 12% smaller on the instance).
 */
export function compilePortalUtilities(candidates: string[]): Promise<string> {
    return tailwindCompile(PORTAL_TAILWIND_INPUT, tailwindOptions(1)).then((c) => c.build(candidates));
}

/**
 * The design system of the portal input, loaded once per script (a seed compiles hundreds of
 * components in one script). Used only to tell utilities from other words.
 */
let designSystem: Promise<TailwindDesignSystem> | null = null;

function portalDesignSystem(): Promise<TailwindDesignSystem> {
    if (!designSystem) {
        designSystem = loadDesignSystem(PORTAL_TAILWIND_INPUT, tailwindOptions());
        designSystem.then(null, () => (designSystem = null));
    }
    return designSystem;
}

/**
 * The candidates that are Tailwind utilities, sorted. extractCandidates over-collects every word of
 * the source: a portal union of raw candidates was about 20 times larger and took 10-15 s to compile
 * on the instance, for byte-identical output. Checked against the portal input (a superset of the
 * component input), so classes from the host's CSS packages count too.
 */
export function validCandidates(candidates: string[]): Promise<string[]> {
    return verdicts(candidates.filter((t) => isPossibleUtility(t))).then((valid) => valid.sort());
}

/** The candidates Tailwind accepts, in input order (the design system only loads for a non-empty list). */
function verdicts(candidates: string[]): Promise<string[]> {
    if (!candidates.length) return Promise.resolve([]);
    return portalDesignSystem().then((ds) => {
        const css = ds.candidatesToCss(candidates);
        const out: string[] = [];
        for (let i = 0; i < candidates.length; i++) {
            if (css[i] !== null && css[i] !== undefined) out.push(candidates[i]);
        }
        return out;
    });
}

/**
 * Root pre-filter (Tailwind's own findRoots rule): after its variants (up to the last ':' outside
 * brackets and parentheses) and its !/- markers, a utility starts with an arbitrary property ([…]) or
 * with one of the design system's utility roots, as the whole word or up to a '-'. Anything else can't
 * be a utility, so it skips candidatesToCss, which costs about 0.5 ms per rejected word on the instance.
 * The roots come from the portal input (utility-roots.ts, generated and checked by vendor:compiler).
 */
const ROOT_SET: Record<string, boolean> = {};
for (const r of UTILITY_ROOTS) ROOT_SET[r] = true;

export function isPossibleUtility(token: string, roots?: Record<string, boolean>): boolean {
    const set = roots || ROOT_SET;
    let depth = 0;
    let cut = -1;
    for (let i = 0; i < token.length; i++) {
        const ch = token.charAt(i);
        if (ch === '[' || ch === '(') depth++;
        else if ((ch === ']' || ch === ')') && depth > 0) depth--;
        else if (ch === ':' && depth === 0) cut = i;
    }
    let base = token.substring(cut + 1);
    if (base.charAt(0) === '!') base = base.substring(1);
    if (base.charAt(base.length - 1) === '!') base = base.substring(0, base.length - 1);
    if (base.charAt(0) === '-') base = base.substring(1);
    if (base.charAt(0) === '[') return true;
    if (set[base] === true || set[base.split('/')[0]] === true) return true;
    let dash = base.indexOf('-');
    while (dash > 0) {
        if (set[base.substring(0, dash)] === true) return true;
        dash = base.indexOf('-', dash + 1);
    }
    return false;
}

/** The host's classes, verified valid for the portal input (host-candidates.ts): no design system needed. */
let hostSet: Record<string, boolean> | null = null;

function isHostCandidate(token: string): boolean {
    if (!hostSet) {
        hostSet = {};
        for (const c of HOST_CANDIDATES) hostSet[c] = true;
    }
    return hostSet[token] === true;
}

/** A file's possible utilities (extracted, then root-filtered). */
function survivorsOf(content: string): string[] {
    return extractCandidates([content]).filter((t) => isPossibleUtility(t));
}

/**
 * The valid candidates of a compile (sorted) and the rejected possible utilities. Verdicts known from
 * the previous compile and the host's classes need no design system; only new words load it.
 */
function cachedCandidates(
    survivors: string[],
    prev: CompileCache | null
): Promise<{ valid: string[]; rejected: string[] }> {
    const known: Record<string, boolean> = Object.create(null);
    if (prev) {
        for (const t of prev.valid || []) known[t] = true;
        for (const t of prev.rejected || []) known[t] = false;
    }
    const unknown: string[] = [];
    for (const t of survivors) {
        if (known[t] === true || known[t] === false) continue;
        if (isHostCandidate(t)) known[t] = true;
        else unknown.push(t);
    }
    return verdicts(unknown).then((accepted) => {
        for (const t of unknown) known[t] = false;
        for (const t of accepted) known[t] = true;
        const valid: string[] = [];
        const rejected: string[] = [];
        for (const t of survivors) (known[t] ? valid : rejected).push(t);
        return { valid: valid.sort(), rejected: rejected.sort() };
    });
}

/* ---------------- Entry point ---------------- */

/**
 * Compile a component. Always resolves (never rejects): failures come back as ok=false with
 * diagnostics. Asynchronous only because Tailwind's compile() is; on the instance the Promise
 * settles before the calling script finishes.
 */
export function compileComponent(input: CompileInput): Promise<CompileResult> {
    const started = Date.now();
    const byPath: Record<string, CompilerFile> = {};
    for (const f of input.files) if (f.target !== 'server') byPath[f.path] = f;

    const result: CompileResult = {
        ok: false,
        js: '',
        css: '',
        utilities: '',
        candidates: [],
        dependencies: [],
        diagnostics: { errors: [], warnings: [] },
        compilerVersion: COMPILER_VERSION,
        ms: 0,
    };
    const finish = (): CompileResult => {
        result.ok = result.diagnostics.errors.length === 0;
        result.ms = Date.now() - started;
        return result;
    };

    if (!byPath[ENTRY] || !byPath[ENTRY].content.trim()) {
        result.diagnostics.errors.push({
            file: ENTRY,
            message: 'The client script is empty; it must export default a React component.',
        });
        return Promise.resolve(finish());
    }

    const state: CacheState | null = input.hash ? { hash: input.hash, prev: usableCache(input.cache), next: {} } : null;
    const linked = link(byPath, state);
    result.diagnostics.errors.push(...linked.errors);
    result.dependencies = linked.dependencies;
    if (linked.errors.length) return Promise.resolve(finish());
    result.js = emitModule(linked, input.label);

    // Author CSS: styles.css first, then style files imported by the code (import order).
    const authorCss: string[] = [];
    if (byPath['styles.css'] && byPath['styles.css'].content.trim())
        authorCss.push(`/* styles.css */\n${byPath['styles.css'].content}`);
    for (const p of linked.styles) if (p !== 'styles.css') authorCss.push(`/* ${p} */\n${byPath[p].content}`);

    result.css = authorCss.join('\n\n');
    const cacheOf = (valid: string[], rejected: string[], utilities: string): CompileCache | undefined =>
        state
            ? {
                  format: COMPILE_CACHE_FORMAT,
                  compiler: COMPILER_VERSION,
                  roots: UTILITY_ROOTS_KEY,
                  files: state.next,
                  valid,
                  rejected,
                  utilities,
              }
            : undefined;
    if (!input.tailwind) {
        result.cache = cacheOf([], [], '');
        return Promise.resolve(finish());
    }

    // Possible utilities of the linked files: per file through the cache, else in one pass. Extraction
    // is a per-file union, so both give the same set as extracting from all sources together.
    let survivors: string[];
    if (state) {
        const seen: Record<string, boolean> = Object.create(null);
        survivors = [];
        for (const p of linked.order) {
            const entry = state.next[p];
            if (!Array.isArray(entry.survivors)) entry.survivors = survivorsOf(byPath[p].content);
            for (const t of entry.survivors) {
                if (seen[t] === true) continue;
                seen[t] = true;
                survivors.push(t);
            }
        }
    } else
        survivors = extractCandidates(linked.order.map((p) => byPath[p].content)).filter((t) => isPossibleUtility(t));

    const prev = state ? state.prev : null;
    let rejected: string[] = [];
    return cachedCandidates(survivors, prev)
        .then((c): Promise<string> => {
            result.candidates = c.valid;
            rejected = c.rejected;
            // Same candidates as the previous compile: same utilities sheet (Tailwind is deterministic).
            if (prev && typeof prev.utilities === 'string' && (prev.valid || []).join(' ') === c.valid.join(' '))
                return Promise.resolve(prev.utilities);
            if (!c.valid.length) return Promise.resolve('');
            return compileTailwind(c.valid).then((tw) =>
                tw.trim() ? `/* tailwind v${tailwindVersion} utilities */\n${tw}` : ''
            );
        })
        .then(
            (utilities) => {
                result.utilities = utilities;
                result.cache = cacheOf(result.candidates, rejected, result.utilities);
                return finish();
            },
            (e) => {
                result.diagnostics.errors.push({ file: 'tailwind', message: String((e && e.message) || e) });
                return finish();
            }
        );
}
