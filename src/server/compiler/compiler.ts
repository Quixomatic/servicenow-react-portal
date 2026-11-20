import { transform, version as sucraseVersion } from './vendor/sucrase.js';
import { compile as tailwindCompile, sheets as tailwindSheets, version as tailwindVersion } from './vendor/tailwind.js';
import { moveVariantsToLayer, LAYER_ORDER } from './variant-layer.ts';

/**
 * RPCompiler: server-side component compiler (runs in the instance's JavaScript engine, no
 * WebAssembly). Pure functions — no GlideRecord here — so the same code can also run in a
 * browser (Studio) or in Node (tests, seeds).
 *
 *   TSX/TS/JSX → Sucrase (typescript + jsx + imports → CommonJS-style module per file)
 *   main.tsx + relative imports → one ES module (small linker below)
 *   react, react-dom, react/jsx-runtime, @portal/runtime, components:*, utilities:* → host registry
 *   Tailwind v4 compile() over the classes used, then the author's CSS appended after it
 *
 * Output (one build): index.js (default export = the component) and index.css.
 */

export const COMPILER_VERSION = `rp-server-compiler/5 (sucrase ${sucraseVersion}, tailwindcss ${tailwindVersion})`;
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
}

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
}

export interface CompileResult {
    ok: boolean;
    js: string;
    css: string;
    dependencies: CompileDependency[];
    diagnostics: { errors: Diagnostic[]; warnings: Diagnostic[] };
    compilerVersion: string;
    ms: number;
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

/** Walk the import graph from main.tsx, transforming each reachable code file once. */
function link(byPath: Record<string, CompilerFile>): Linked {
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
            code = transformFile(file);
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
                linked.dependencies.push({ specifier: spec, kind: 'relative', resolvedEntry: target });
            } else if (isHost(spec)) {
                map[spec] = '@host:' + spec;
                if (!seenHost[spec]) {
                    seenHost[spec] = true;
                    // Record imports load another component's build into the registry at runtime
                    // (resolved and validated by the build service); the rest are host built-ins.
                    const rec = RECORD_IMPORT.exec(spec);
                    if (rec) linked.dependencies.push({ specifier: spec, kind: 'component', resolvedEntry: rec[2] });
                    else linked.dependencies.push({ specifier: spec, kind: 'host', hostExport: spec });
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

export const TAILWIND_INPUT = [
    // rp-variants: variant rules move there after the build (variant-layer.ts), so a variant from
    // any sheet in the shadow root beats a base utility from any other sheet.
    `@layer ${LAYER_ORDER};`,
    '@import "tailwindcss/theme" layer(theme);',
    '@import "tailwindcss/utilities" layer(utilities);',
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

export function compileTailwind(candidates: string[]): Promise<string> {
    return tailwindCompile(TAILWIND_INPUT, {
        base: '/',
        loadStylesheet: (id, base) => {
            const content = tailwindSheets[id];
            if (content === undefined) return Promise.reject(new Error(`Unknown stylesheet ${id}`));
            return Promise.resolve({ content, base, path: id });
        },
    }).then((c) => moveVariantsToLayer(c.build(candidates)));
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

    const linked = link(byPath);
    result.diagnostics.errors.push(...linked.errors);
    result.dependencies = linked.dependencies;
    if (linked.errors.length) return Promise.resolve(finish());
    result.js = emitModule(linked, input.label);

    // Author CSS: styles.css first, then style files imported by the code (import order).
    const authorCss: string[] = [];
    if (byPath['styles.css'] && byPath['styles.css'].content.trim())
        authorCss.push(`/* styles.css */\n${byPath['styles.css'].content}`);
    for (const p of linked.styles) if (p !== 'styles.css') authorCss.push(`/* ${p} */\n${byPath[p].content}`);

    if (!input.tailwind) {
        result.css = authorCss.join('\n\n');
        return Promise.resolve(finish());
    }
    const candidates = extractCandidates(linked.order.map((p) => byPath[p].content));
    return compileTailwind(candidates).then(
        (tw) => {
            result.css = [`/* tailwind v${tailwindVersion} utilities */\n${tw}`].concat(authorCss).join('\n\n');
            return finish();
        },
        (e) => {
            result.diagnostics.errors.push({ file: 'tailwind', message: String((e && e.message) || e) });
            return finish();
        }
    );
}
