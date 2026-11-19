// Offline stand-in for the Studio API, used when the host runs on mock data (?rpmock=1).
// Components are the runtime mock widgets (registry-style ES modules, valid as main.tsx), so the
// preview can run a saved build without a compiler: the "compile" is a bracket check, and the
// build JS is the saved main.tsx itself.
import * as S from '#/runtime/mock/sources';
import { SEED_PROJECTS } from './mock-projects';

const delay = (value, ms) => new Promise((resolve) => setTimeout(() => resolve(value), ms === undefined ? 150 : ms));

function apiError(status, code, message, details) {
	const error = new Error(message);
	error.name = 'ApiError';
	error.status = status;
	error.code = code;
	error.details = details;
	return error;
}

const json = (value) => JSON.stringify(value, null, 2) + '\n';

const SERVER_STUB = [
	'// Runs on the server with input, data, options, component and context.',
	'data.serverTime = new Date().toISOString()',
	'if (input && input.message) data.echo = "Server got: " + input.message',
	''
].join('\n');

const UTIL_TS = ['// Extra source file (mock).', 'export function formatCount(n: number): string {', '    return n.toLocaleString()', '}', ''].join('\n');
const BADGE_TSX = [
	"import { Badge } from 'components:badge'",
	'',
	'export function CountBadge({ value }: { value: number }) {',
	'    return <Badge variant="secondary">{value}</Badge>',
	'}',
	''
].join('\n');

const COUNTER_SOURCE = {
	'main.tsx': [
		"import { useState } from 'react'",
		"import { useComponent } from '@portal/runtime'",
		"import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card'",
		"import { Button } from 'components:button'",
		"import { CountBadge } from './parts/CountBadge'",
		"import { formatCount } from './lib/format'",
		'',
		'type Props = { options?: { label?: string; start?: number } }',
		'',
		'/** Page widget: local state plus an on-load server script. */',
		'export default function Counter({ options = {} }: Props) {',
		'    const { data, pending, server } = useComponent()',
		'    const [count, setCount] = useState(options.start ?? 0)',
		'    return (',
		'        <Card>',
		'            <CardHeader>',
		"                <CardTitle>{options.label || 'Counter'}</CardTitle>",
		"                <CardDescription>{pending ? 'initializing…' : data?.serverTime}</CardDescription>",
		'            </CardHeader>',
		'            <CardContent className="flex items-center gap-3">',
		'                <CountBadge value={count} />',
		'                <span className="counter-value text-2xl font-bold">{formatCount(count)}</span>',
		'                <Button onClick={() => setCount((c) => c + 1)}>Increment</Button>',
		'                <Button variant="outline" onClick={() => server.get({ count })}>server.get()</Button>',
		'            </CardContent>',
		'        </Card>',
		'    )',
		'}',
		''
	].join('\n'),
	'styles.css': '.counter-value {\n    font-variant-numeric: tabular-nums;\n}\n',
	'server.js': SERVER_STUB,
	'lib/format.ts': UTIL_TS,
	'parts/CountBadge.tsx': BADGE_TSX
};

const BROKEN_SOURCE = [
	'/** Throws on render: the host shows an error placeholder instead of the widget. */',
	'export default function Broken({ options = {} }: { options?: { message?: string } }) {',
	"    throw new Error(options.message || 'This widget throws on purpose')",
	'}',
	''
].join('\n');

const LAYOUT_REGIONS = [
	{ name: 'header', acceptsContributions: true },
	{ name: 'sidebar', acceptsContributions: false },
	{ name: 'main', acceptsContributions: false },
	{ name: 'footer', acceptsContributions: true }
];

const db = { components: {}, themes: {}, seq: 0 };

/**
 * A mock component: its source files are real TSX (what Studio edits); `built` is the
 * pre-compiled runtime module the mock serves as the build asset, since TSX can't be compiled
 * offline. The author's styles.css is appended to the built CSS, so CSS edits do show.
 */
function addComponent(key, meta, sourceFiles, built) {
	const cmpId = `cmp-${key}`;
	const kind = meta.kind || 'widget';
	const files = [
		{ path: 'main.tsx', target: 'client', virtual: true, content: sourceFiles['main.tsx'] || '' },
		{ path: 'styles.css', target: 'style', virtual: true, content: sourceFiles['styles.css'] || '' },
		{ path: 'server.js', target: 'server', virtual: true, content: sourceFiles['server.js'] || '' },
		{ path: 'options.schema.json', target: 'asset', virtual: true, content: meta.optionsSchema ? json(meta.optionsSchema) : '{}\n' },
		{ path: 'options.defaults.json', target: 'asset', virtual: true, content: meta.defaults ? json(meta.defaults) : '{}\n' }
	];
	if (kind === 'layout') files.push({ path: 'regions.json', target: 'asset', virtual: true, content: json(meta.regions || LAYOUT_REGIONS) });
	Object.keys(sourceFiles)
		.filter((p) => ['main.tsx', 'styles.css', 'server.js'].indexOf(p) === -1)
		.forEach((p) => files.push({ path: p, target: targetFor(p), content: sourceFiles[p] }));
	db.components[cmpId] = {
		id: cmpId,
		uniqueId: `rp/${key}`,
		name: meta.name || key,
		kind,
		placeable: kind !== 'utility',
		active: true,
		serverMode: meta.serverMode || 'none',
		description: meta.description || '',
		tailwind: meta.tailwind !== false,
		revision: 1,
		files,
		built: built || { js: S.TEXT_JS, css: S.TEXT_CSS },
		build: null
	};
	compile(db.components[cmpId], 'component');
}

function addTheme(key, name, css, tokens) {
	const themeId = `theme-${key}`;
	db.themes[themeId] = {
		id: themeId,
		key,
		name,
		active: true,
		revision: 1,
		files: [
			{ path: 'theme.css', target: 'style', virtual: true, content: css },
			{ path: 'tokens.json', target: 'asset', virtual: true, content: json(tokens) }
		],
		build: null
	};
	compile(db.themes[themeId], 'theme');
}

// ---- "compiler" -----------------------------------------------------------------------------

/** Bracket balance per file, skipping strings and comments: enough to drive the problems UI. */
function bracketCheck(path, text) {
	const errors = [];
	if (!/\.(tsx?|jsx?|mjs|css)$/.test(path)) {
		if (/\.json$/.test(path) && text.trim()) {
			try {
				JSON.parse(text);
			} catch (error) {
				errors.push({ file: path, line: 1, column: 1, message: 'Invalid JSON: ' + error.message });
			}
		}
		return errors;
	}
	const stack = [];
	const pairs = { ')': '(', ']': '[', '}': '{' };
	let line = 1;
	let col = 0;
	let mode = null; // ' " ` // /*
	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i];
		const next = text[i + 1];
		col += 1;
		if (ch === '\n') {
			line += 1;
			col = 0;
			if (mode === '//') mode = null;
			continue;
		}
		if (mode === '//') continue;
		if (mode === '/*') {
			if (ch === '*' && next === '/') {
				mode = null;
				i += 1;
				col += 1;
			}
			continue;
		}
		if (mode) {
			if (ch === '\\') {
				i += 1;
				col += 1;
			} else if (ch === mode) mode = null;
			continue;
		}
		if (ch === '/' && next === '/' && !/\.css$/.test(path)) {
			mode = '//';
			continue;
		}
		if (ch === '/' && next === '*') {
			mode = '/*';
			continue;
		}
		if ((ch === '"' || ch === "'" || ch === '`') && !/\.css$/.test(path)) {
			mode = ch;
			continue;
		}
		if (ch === '(' || ch === '[' || ch === '{') stack.push({ ch, line, col });
		else if (pairs[ch]) {
			const open = stack.pop();
			if (!open || open.ch !== pairs[ch]) {
				errors.push({ file: path, line, column: col, message: `Unexpected "${ch}"` });
				return errors;
			}
		}
	}
	if (stack.length) {
		const open = stack[stack.length - 1];
		errors.push({ file: path, line: open.line, column: open.col, message: `Unclosed "${open.ch}"` });
	}
	if (/ERROR!/.test(text)) {
		const at = text.indexOf('ERROR!');
		const before = text.slice(0, at).split('\n');
		errors.push({ file: path, line: before.length, column: before[before.length - 1].length + 1, message: 'Mock compiler: "ERROR!" marker found' });
	}
	return errors;
}

function diagnosticsFor(files) {
	const errors = [];
	files.forEach((f) => {
		if (f.target === 'server' || f.path === 'server.js') return;
		bracketCheck(f.path, f.content || '').forEach((e) => errors.push(e));
	});
	const warnings = [];
	files.forEach((f) => {
		if (/console\.log\(/.test(f.content || '')) {
			const before = f.content.slice(0, f.content.indexOf('console.log(')).split('\n');
			warnings.push({ file: f.path, line: before.length, column: before[before.length - 1].length + 1, message: 'console.log left in the code' });
		}
	});
	return { errors, warnings };
}

const blobs = new Map();
function blobUrl(key, text, type) {
	const old = blobs.get(key);
	if (old) URL.revokeObjectURL(old);
	const url = URL.createObjectURL(new Blob([text], { type }));
	blobs.set(key, url);
	return url;
}

function compile(owner, type) {
	const started = Date.now();
	const d = diagnosticsFor(owner.files);
	const ok = d.errors.length === 0;
	const prev = owner.build;
	db.seq += 1;
	const buildId = `build-${owner.id}`;
	owner.build = {
		id: buildId,
		state: ok ? 'ready' : 'failed',
		builtRevision: ok ? owner.revision : prev ? prev.builtRevision : 0,
		pendingRevision: 0,
		inputHash: `mock-${owner.revision}-${db.seq}`,
		upToDate: ok,
		diagnostics: { errors: d.errors, warnings: d.warnings, ms: Date.now() - started + 40 }
	};
	if (ok && type === 'component') {
		const authored = owner.files.find((f) => f.path === 'styles.css');
		const cssText = [owner.built.css || '', authored ? authored.content : ''].filter(Boolean).join('\n');
		owner.assets = {
			id: buildId,
			js: blobUrl(`${buildId}:js`, owner.built.js, 'text/javascript'),
			css: cssText ? blobUrl(`${buildId}:css`, cssText, 'text/css') : null
		};
	}
	return owner.build;
}

// ---- endpoints ------------------------------------------------------------------------------

function summary(c) {
	return { id: c.id, uniqueId: c.uniqueId, name: c.name, kind: c.kind, placeable: c.placeable, active: c.active, serverMode: c.serverMode, revision: c.revision, build: c.build };
}

function project(owner, type) {
	const meta =
		type === 'theme'
			? { name: owner.name }
			: { name: owner.name, description: owner.description, kind: owner.kind, serverMode: owner.serverMode, tailwind: owner.tailwind, placeable: owner.placeable, active: owner.active };
	return {
		owner: { type, id: owner.id, uniqueId: owner.uniqueId || owner.key, name: owner.name },
		meta,
		revision: owner.revision,
		files: owner.files.map((f) => ({ ...f, hash: `h${f.content.length}`, revision: owner.revision })),
		latestBuild: owner.build
	};
}

function find(type, ownerId) {
	const owner = type === 'theme' ? db.themes[ownerId] : db.components[ownerId];
	if (!owner) throw apiError(404, 'not_found', `${type} ${ownerId} not found`);
	return owner;
}

function save(type, ownerId, body) {
	const owner = find(type, ownerId);
	if (body.expectedRevision !== owner.revision) {
		throw apiError(409, 'revision_conflict', `Revision conflict: expected ${body.expectedRevision}, current ${owner.revision}`, { currentRevision: owner.revision });
	}
	(body.files || []).forEach((f) => {
		const existing = owner.files.find((x) => x.path === f.path);
		if (f.deleted) {
			if (existing && existing.virtual) throw apiError(400, 'invalid_request', `${f.path} is a virtual file and can't be deleted`);
			owner.files = owner.files.filter((x) => x.path !== f.path);
			return;
		}
		if (existing) existing.content = f.content;
		else owner.files.push({ path: f.path, target: f.target || targetFor(f.path), content: f.content || '' });
	});
	if (body.meta) {
		['name', 'description', 'kind', 'serverMode', 'tailwind', 'placeable', 'active'].forEach((k) => {
			if (body.meta[k] !== undefined) owner[k] = body.meta[k];
		});
	}
	owner.revision += 1;
	const build = compile(owner, type);
	return { revision: owner.revision, build, files: owner.files.filter((f) => f.target !== 'server'), registry: { runtimeAbiVersion: '0.1.0' } };
}

function targetFor(path) {
	if (/\.css$/.test(path)) return 'style';
	if (/\.(tsx?|jsx?|mjs)$/.test(path)) return 'client';
	return 'asset';
}

function check(ownerId, files) {
	const owner = find('component', ownerId);
	const started = Date.now();
	const merged = owner.files.map((f) => {
		const over = (files || []).find((x) => x.path === f.path);
		return over ? { ...f, content: over.content } : f;
	});
	(files || []).forEach((x) => {
		if (!merged.find((f) => f.path === x.path)) merged.push({ path: x.path, target: targetFor(x.path), content: x.content });
	});
	const d = diagnosticsFor(merged);
	return { ok: d.errors.length === 0, diagnostics: d, ms: Date.now() - started + 20 };
}

const STARTERS = {
	widget: [
		"import { Card, CardHeader, CardTitle, CardContent } from 'components:card'",
		'',
		'type Props = { options?: { title?: string } }',
		'',
		'export default function Widget({ options = {} }: Props) {',
		'    return (',
		'        <Card>',
		'            <CardHeader>',
		"                <CardTitle>{options.title || 'New widget'}</CardTitle>",
		'            </CardHeader>',
		'            <CardContent className="text-sm text-muted-foreground">Edit main.tsx to get started.</CardContent>',
		'        </Card>',
		'    )',
		'}',
		''
	].join('\n'),
	layout: [
		"import { Region } from '@portal/runtime'",
		'',
		'export default function Layout() {',
		'    return (',
		'        <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] bg-background text-foreground">',
		'            <header className="border-b"><Region name="header" /></header>',
		'            <main className="min-h-0 overflow-auto p-6"><Region name="main" /></main>',
		'            <footer className="border-t px-6 py-3 text-xs text-muted-foreground"><Region name="footer" /></footer>',
		'        </div>',
		'    )',
		'}',
		''
	].join('\n'),
	utility: ['// Shared helpers for other components.', 'export function hello(name: string): string {', '    return `Hello, ${name}`', '}', ''].join('\n')
};

function create(body) {
	const kind = body.kind || 'widget';
	const key = (body.key || body.name || 'new').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'new';
	let unique = key;
	let n = 1;
	while (db.components[`cmp-${unique}`]) unique = `${key}-${(n += 1)}`;
	const built = kind === 'layout' ? { js: S.LAYOUT_CLASSIC_JS, css: S.LAYOUT_CLASSIC_CSS } : { js: S.TEXT_JS, css: S.TEXT_CSS };
	addComponent(unique, { name: body.name || unique, kind, defaults: kind === 'widget' ? { title: body.name || 'New widget' } : undefined }, { 'main.tsx': STARTERS[kind] || STARTERS.widget }, built);
	return project(db.components[`cmp-${unique}`], 'component');
}

function previewOf(buildId) {
	const owner = Object.values(db.components).find((c) => c.build && c.build.id === buildId);
	if (!owner) {
		const theme = Object.values(db.themes).find((t) => t.build && t.build.id === buildId);
		if (theme) return { build: { ...theme.build, assets: null }, owner: { type: 'theme', id: theme.id, revision: theme.revision }, component: null, theme: { id: theme.id, key: theme.key }, options: {} };
		throw apiError(404, 'not_found', 'Build not found');
	}
	const defaults = owner.files.find((f) => f.path === 'options.defaults.json');
	let options = {};
	try {
		options = defaults && defaults.content.trim() ? JSON.parse(defaults.content) : {};
	} catch (error) {
		options = {};
	}
	const regionsFile = owner.files.find((f) => f.path === 'regions.json');
	let regions;
	try {
		regions = regionsFile ? JSON.parse(regionsFile.content) : undefined;
	} catch (error) {
		regions = undefined;
	}
	return {
		build: { ...owner.build, assets: owner.assets || null },
		owner: { type: 'component', id: owner.id, revision: owner.revision },
		component: { id: owner.id, uniqueId: owner.uniqueId, kind: owner.kind, build: owner.assets || null, serverMode: owner.serverMode, regions },
		theme: null,
		options
	};
}

/** Simulate a concurrent edit (for testing the 409 banner): window.__RP_STUDIO_MOCK__.bump(id) */
if (typeof window !== 'undefined') {
	window.__RP_STUDIO_MOCK__ = {
		db,
		bump(ownerId) {
			const owner = db.components[ownerId] || db.themes[ownerId];
			if (owner) owner.revision += 1;
			return owner && owner.revision;
		}
	};
}

export function handle(method, path, body) {
	try {
		let m;
		if (method === 'GET' && path === '/components') return delay(Object.values(db.components).map(summary));
		if (method === 'GET' && path === '/themes') return delay(Object.values(db.themes).map((t) => ({ id: t.id, key: t.key, name: t.name, active: t.active, revision: t.revision, build: t.build })));
		if (method === 'GET' && path === '/portals') return delay([{ id: 'portal-sp', slug: 'sp', name: 'Service Portal' }, { id: 'portal-crm', slug: 'crm', name: 'CRM' }]);
		if (method === 'POST' && path === '/components') return delay(create(body || {}), 250);
		if ((m = path.match(/^\/(components|themes)\/([^/]+)\/project$/)) && method === 'GET') {
			const type = m[1] === 'themes' ? 'theme' : 'component';
			return delay(project(find(type, decodeURIComponent(m[2])), type));
		}
		if ((m = path.match(/^\/(components|themes)\/([^/]+)\/save$/)) && method === 'POST') {
			return delay(save(m[1] === 'themes' ? 'theme' : 'component', decodeURIComponent(m[2]), body || {}), 300);
		}
		if ((m = path.match(/^\/components\/([^/]+)\/check$/)) && method === 'POST') return delay(check(decodeURIComponent(m[1]), (body || {}).files), 120);
		if ((m = path.match(/^\/components\/([^/]+)\/dependencies$/)) && method === 'GET') {
			const c = find('component', decodeURIComponent(m[1]));
			return delay({ component: { id: c.id, uniqueId: c.uniqueId, name: c.name, kind: c.kind }, build: c.build ? c.build.id : null, imports: [], importedBy: [] });
		}
		if ((m = path.match(/^\/builds\/([^/]+)\/preview$/)) && method === 'POST') return delay(previewOf(decodeURIComponent(m[1])));
		throw apiError(404, 'not_found', `Mock studio API: no route for ${method} ${path}`);
	} catch (error) {
		return Promise.reject(error);
	}
}

// Seeded last: compile() uses module-level helpers declared above. Each seed project maps to
// the compiled runtime mock module that best matches it (used for the preview).
const BUILT = {
	'site-header': { js: S.HEADER_JS, css: S.HEADER_CSS },
	'nav-sidebar': { js: S.NAV_JS, css: S.NAV_CSS },
	'record-detail': { js: S.RECORD_JS, css: '' },
	'hello-card': { js: S.TEXT_JS, css: S.TEXT_CSS },
	'server-clock': { js: S.COUNTER_JS, css: S.COUNTER_CSS },
	'site-footer': { js: S.TEXT_JS, css: S.TEXT_CSS },
	'standard-layout': { js: S.LAYOUT_CLASSIC_JS, css: S.LAYOUT_CLASSIC_CSS },
	'centered-layout': { js: S.LAYOUT_SPLIT_JS, css: S.LAYOUT_SPLIT_CSS }
};

function seed() {
	Object.keys(SEED_PROJECTS).forEach((key) => {
		const p = SEED_PROJECTS[key];
		addComponent(key, p.meta, p.files, BUILT[key]);
	});
	addComponent('counter', { name: 'Counter', kind: 'widget', serverMode: 'on-load', defaults: { label: 'Preview counter', start: 3 } }, COUNTER_SOURCE, { js: S.COUNTER_JS, css: S.COUNTER_CSS });
	addComponent('broken', { name: 'Broken (throws)', kind: 'widget', defaults: { message: 'Deliberate failure' } }, { 'main.tsx': BROKEN_SOURCE }, { js: S.BROKEN_JS, css: '' });
	addTheme('sp-light', 'Service Portal Light', '[data-rp-root] { font-family: system-ui, sans-serif; }\n', { primary: 'oklch(0.55 0.2 260)', radius: '0.75rem' });
	addTheme('crm-dark', 'CRM Dark', '[data-rp-root] { letter-spacing: -0.01em; }\n', { primary: 'oklch(0.74 0.17 160)', background: 'oklch(0.18 0.02 260)' });
}
seed();
