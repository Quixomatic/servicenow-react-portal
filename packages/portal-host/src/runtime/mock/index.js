// Mock data source for the host, matching the scripted REST contract in ../api.js. Two portals
// (sp, crm) with different themes, layouts and home routes; portal-level placements in header,
// sidebar and footer; a few pages whose placements fill main.
//
// Widget JS is served as Blob URLs and loaded with the same import() path real asset URLs use.
// CSS URLs look like the real asset URLs and are served from memory by api.fetchText().
import * as S from './sources';

const LATENCY_MS = 120;

class MockError extends Error {
	constructor(message, status) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
const clone = (value) => JSON.parse(JSON.stringify(value));

// ---- assets ---------------------------------------------------------------------------------

const textAssets = new Map(); // url -> text (CSS)

function cssUrl(buildId, text) {
	const url = `/api/x_312987_portal/rp/assets/${buildId}/index.css`;
	textAssets.set(url, text);
	return url;
}

const jsUrls = new Map(); // buildId -> blob URL
function jsUrl(buildId, source) {
	if (!jsUrls.has(buildId)) {
		const blob = new Blob([source], { type: 'text/javascript' });
		jsUrls.set(buildId, URL.createObjectURL(blob));
	}
	return jsUrls.get(buildId);
}

export function assetText(url) {
	return textAssets.get(url);
}

// ---- components -----------------------------------------------------------------------------

const DEFINITIONS = {
	'layout-classic': {
		kind: 'layout',
		js: S.LAYOUT_CLASSIC_JS,
		css: S.LAYOUT_CLASSIC_CSS,
		regions: [
			{ name: 'header', acceptsContributions: true },
			{ name: 'sidebar', acceptsContributions: false },
			{ name: 'main', acceptsContributions: false },
			{ name: 'footer', acceptsContributions: true }
		]
	},
	'layout-split': {
		kind: 'layout',
		js: S.LAYOUT_SPLIT_JS,
		css: S.LAYOUT_SPLIT_CSS,
		regions: [
			{ name: 'header', acceptsContributions: true },
			{ name: 'main', acceptsContributions: false },
			{ name: 'sidebar', acceptsContributions: true },
			{ name: 'footer', acceptsContributions: false }
		]
	},
	'layout-shell': {
		kind: 'layout',
		js: S.LAYOUT_SHELL_JS,
		css: S.LAYOUT_SHELL_CSS,
		regions: [
			{ name: 'header', acceptsContributions: true },
			{ name: 'sidebar', acceptsContributions: true },
			{ name: 'main', acceptsContributions: false },
			{ name: 'footer', acceptsContributions: true }
		]
	},
	'shell-sidebar': { kind: 'widget', js: S.SHELL_SIDEBAR_JS, css: null },
	'shell-topbar': { kind: 'widget', js: S.SHELL_TOPBAR_JS, css: null },
	header: { kind: 'widget', js: S.HEADER_JS, css: S.HEADER_CSS },
	nav: { kind: 'widget', js: S.NAV_JS, css: S.NAV_CSS },
	counter: { kind: 'widget', js: S.COUNTER_JS, css: S.COUNTER_CSS, serverMode: 'on-load' },
	record: { kind: 'widget', js: S.RECORD_JS, css: null },
	text: { kind: 'widget', js: S.TEXT_JS, css: S.TEXT_CSS },
	broken: { kind: 'widget', js: S.BROKEN_JS, css: null },
	utils: { kind: 'widget', js: S.UTILS_JS, css: null },
	// Blocks: page-structure building blocks; drop zones come from their spec (regions_json).
	section: { kind: 'block', js: S.SECTION_JS, css: S.SECTION_CSS, spec: [{ name: 'content', label: 'Content' }] },
	container: { kind: 'block', js: S.CONTAINER_JS, css: S.CONTAINER_CSS, spec: [{ name: 'content', label: 'Content' }] },
	grid: { kind: 'block', js: S.GRID_JS, css: S.GRID_CSS, spec: [{ name: 'items', label: 'Items' }] },
	columns: { kind: 'block', js: S.COLUMNS_JS, css: S.COLUMNS_CSS, spec: [{ repeat: 'tracks', name: 'col-{n}', label: 'Column {n}' }] },
	stack: { kind: 'block', js: S.STACK_JS, css: S.STACK_CSS, spec: [{ name: 'items', label: 'Items' }] },
	split: { kind: 'block', js: S.SPLIT_JS, css: S.SPLIT_CSS, spec: [{ name: 'start', label: 'Start' }, { name: 'end', label: 'End' }] },
	// Record imports: a primitive and a utility, and a widget that imports both
	// (components:rp/mock-badge, utilities:rp/mock-format). The ref lists them dependencies first.
	'mock-format': { kind: 'utility', js: S.MOCK_FORMAT_JS, css: null },
	'mock-badge': { kind: 'primitive', js: S.MOCK_BADGE_JS, css: S.MOCK_BADGE_CSS, imports: ['mock-format'] },
	'mock-imports': { kind: 'widget', js: S.MOCK_IMPORTS_JS, css: null, imports: ['mock-format', 'mock-badge'] }
};

const IMPORT_PREFIX = { utility: 'utilities:rp/', primitive: 'components:rp/', widget: 'components:rp/', block: 'components:rp/' };

function importRefs(keys) {
	return keys.map((k) => {
		const r = component(k);
		return { specifier: IMPORT_PREFIX[r.kind] + k, id: r.id, uniqueId: r.uniqueId, kind: r.kind, build: r.build };
	});
}

const refs = new Map();
function component(key) {
	if (!refs.has(key)) {
		const def = DEFINITIONS[key];
		const buildId = `b-${key}`;
		const ref = {
			id: `cmp-${key}`,
			uniqueId: `rp.${key}`,
			kind: def.kind,
			build: { id: buildId, js: jsUrl(buildId, def.js), css: def.css ? cssUrl(buildId, def.css) : null },
			serverMode: def.serverMode || 'none'
		};
		if (def.regions) ref.regions = def.regions;
		if (def.kind === 'layout') ref.defaultOptions = clone((DESIGN_META[key] || {}).defaults || {});
		if (def.imports) ref.imports = importRefs(def.imports);
		refs.set(key, ref);
	}
	return refs.get(key);
}

let placementSeq = 0;
function placement(id, region, key, options, order) {
	placementSeq += 1;
	return { id, region, order: order !== undefined ? order : placementSeq * 10, componentKey: key, options: options || {} };
}

/** A placement with block fields: { parent, styleTokens, layout, classes }. */
function blk(id, region, key, options, extra) {
	return Object.assign(placement(id, region, key, options), extra || {});
}

function materialize(p) {
	const def = DEFINITIONS[p.componentKey] || {};
	const options = effectiveOptions(p);
	const out = {
		id: p.id,
		region: p.region,
		order: p.order,
		parentId: p.parent || null,
		component: component(p.componentKey),
		options,
		styleTokens: clone(p.styleTokens || {}),
		layout: clone(p.layout || {}),
		classes: p.classes || '',
		css: instanceCss(p, options)
	};
	if (def.kind === 'block') {
		out.regions = resolveZones(def.spec || [], options);
		out.children = {};
	}
	return out;
}

/** Top-level placements by layout region; block children nested by drop zone (v2 manifest). */
function groupByRegion(list) {
	const items = {};
	list.forEach((p) => {
		if (p.active === false) return; // inactive placements don't render (the designer still lists them)
		items[p.id] = materialize(p);
	});
	const regions = {};
	list.slice()
		.sort((a, b) => a.order - b.order)
		.forEach((p) => {
			const m = items[p.id];
			if (!m) return;
			if (!m.parentId) (regions[m.region] = regions[m.region] || []).push(m);
			else {
				const parent = items[m.parentId];
				if (parent && parent.children) (parent.children[m.region] = parent.children[m.region] || []).push(m);
			}
		});
	return regions;
}

// ---- blocks: zones, effective options and instance CSS (mirrors src/server/design) ---------

const ZONE_RE = /^[a-z][a-z0-9_-]{0,39}$/;

function resolveZones(spec, options) {
	const out = [];
	const seen = {};
	const push = (name, label) => {
		const clean = String(name).trim().toLowerCase();
		if (!ZONE_RE.test(clean) || seen[clean] || out.length >= 24) return;
		seen[clean] = true;
		out.push(label ? { name: clean, acceptsContributions: true, label } : { name: clean, acceptsContributions: true });
	};
	const fill = (t, n, item) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k === 'n' ? String(n) : item && item[k] != null ? String(item[k]) : ''));
	spec.forEach((entry) => {
		const e = typeof entry === 'string' ? { name: entry } : entry;
		if (!e.repeat) return push(e.name, e.label);
		const src = options[e.repeat];
		const list = Array.isArray(src) ? src : typeof src === 'number' && src > 0 ? Array.from({ length: Math.min(src, 24) }, () => null) : [];
		list.forEach((item, i) => push(fill(e.name, i + 1, item), e.label ? fill(e.label, i + 1, item) : undefined));
	});
	return out;
}

/** Component defaults overlaid by the instance's options; tablet/mobile overrides merge too. */
function effectiveOptions(p) {
	const d = (DESIGN_META[p.componentKey] || {}).defaults || {};
	const o = p.options || {};
	const out = Object.assign({}, clone(d), clone(o));
	['tablet', 'mobile'].forEach((dev) => {
		if (d[dev] || o[dev]) out[dev] = Object.assign({}, clone(d[dev] || {}), clone(o[dev] || {}));
	});
	return out;
}

const TOKEN_PROPS = {
	padding: 'padding', paddingX: 'padding-inline', paddingY: 'padding-block', margin: 'margin', marginX: 'margin-inline', marginY: 'margin-block',
	background: 'background', color: 'color', border: 'border', borderColor: 'border-color', radius: 'border-radius', shadow: 'box-shadow',
	minHeight: 'min-height', maxWidth: 'max-width', width: 'width', gap: 'gap', opacity: 'opacity', textAlign: 'text-align', overflow: 'overflow'
};
const THEME_COLORS = ['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'border', 'input', 'ring'];

function cssVal(raw, colorish) {
	if (raw === null || raw === undefined || raw === '' || (typeof raw !== 'string' && typeof raw !== 'number')) return null;
	const v = String(raw).trim();
	if (!v || /[;{}<>]/.test(v)) return null;
	return colorish && THEME_COLORS.indexOf(v) >= 0 ? 'var(--' + v + ')' : v;
}

function declsFor(tokens, layout, options, schema) {
	const out = [];
	const props = schema && schema.properties ? schema.properties : {};
	Object.keys(props).forEach((k) => {
		const varName = props[k] && props[k]['x-css-var'];
		if (!varName || options[k] === undefined) return;
		const raw = options[k];
		const v = Array.isArray(raw) ? cssVal(raw.map((x) => (x && typeof x === 'object' ? x.size : x)).join(' ')) : cssVal(raw);
		if (v !== null) out.push(varName + ': ' + v);
	});
	Object.keys(TOKEN_PROPS).forEach((k) => {
		const v = cssVal(tokens[k], k === 'background' || k === 'color' || k === 'borderColor');
		if (v !== null) out.push(TOKEN_PROPS[k] + ': ' + v);
	});
	const n = (v) => (typeof v === 'number' ? v : /^\d+$/.test(String(v || '')) ? parseInt(v, 10) : null);
	if (layout.colSpan === 'full') out.push('grid-column: 1 / -1');
	else if (n(layout.colSpan) || n(layout.colStart)) out.push('grid-column: ' + (n(layout.colStart) ? n(layout.colStart) + ' / ' : '') + 'span ' + (n(layout.colSpan) || 1));
	if (n(layout.rowSpan) || n(layout.rowStart)) out.push('grid-row: ' + (n(layout.rowStart) ? n(layout.rowStart) + ' / ' : '') + 'span ' + (n(layout.rowSpan) || 1));
	if (typeof layout.order === 'number') out.push('order: ' + Math.round(layout.order));
	if (layout.alignSelf) out.push('align-self: ' + layout.alignSelf);
	if (layout.justifySelf) out.push('justify-self: ' + layout.justifySelf);
	return out;
}

/** placement.css: style tokens, grid layout and x-css-var options, with container queries. */
function instanceCss(p, options) {
	const schema = (DESIGN_META[p.componentKey] || {}).schema;
	const sel = '[data-rp-placement="' + p.id + '"][data-rp-placement]';
	const sub = (o, d) => (o && typeof o[d] === 'object' && o[d]) || {};
	const tokens = p.styleTokens || {};
	const layout = p.layout || {};
	const rules = [];
	const base = declsFor(tokens, layout, options, schema);
	if (base.length) rules.push(sel + ' { ' + base.join('; ') + ' }');
	[['tablet', '(max-width: 1023px)'], ['mobile', '(max-width: 639px)']].forEach(([dev, q]) => {
		const d = declsFor(sub(tokens, dev), sub(layout, dev), sub(options, dev), schema);
		if (d.length) rules.push('@container rp-page ' + q + ' { ' + sel + ' { ' + d.join('; ') + ' } }');
	});
	return rules.join('\n');
}

// ---- themes ---------------------------------------------------------------------------------

const BASE_THEME_CSS = `
[data-rp-root] {
	font-family: var(--rp-font, ui-sans-serif, system-ui, sans-serif);
	background: var(--rp-canvas, var(--background));
	color: var(--foreground);
	min-height: 100%;
}
[data-rp-root] h1, [data-rp-root] h2, [data-rp-root] h3 { letter-spacing: var(--rp-heading-tracking, normal); }
`;

const THEMES = {
	'sp-light': {
		id: 'theme-sp-light',
		key: 'sp-light',
		css: BASE_THEME_CSS,
		tokens: {
			radius: '0.75rem',
			background: 'oklch(0.985 0.004 250)',
			foreground: 'oklch(0.22 0.03 260)',
			card: 'oklch(1 0 0)',
			'card-foreground': 'oklch(0.22 0.03 260)',
			popover: 'oklch(1 0 0)',
			'popover-foreground': 'oklch(0.22 0.03 260)',
			primary: 'oklch(0.55 0.2 260)',
			'primary-foreground': 'oklch(0.98 0.01 260)',
			secondary: 'oklch(0.95 0.02 255)',
			'secondary-foreground': 'oklch(0.3 0.06 260)',
			muted: 'oklch(0.96 0.012 255)',
			'muted-foreground': 'oklch(0.5 0.03 260)',
			accent: 'oklch(0.93 0.035 255)',
			'accent-foreground': 'oklch(0.3 0.08 260)',
			border: 'oklch(0.9 0.015 255)',
			input: 'oklch(0.9 0.015 255)',
			ring: 'oklch(0.6 0.16 260)',
			'rp-font': 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
			'rp-canvas': 'linear-gradient(180deg, oklch(0.96 0.03 250), oklch(0.99 0.003 250) 320px)'
		},
		// Dark mode: deep navy, same blue accent.
		tokensDark: {
			background: 'oklch(0.17 0.03 262)',
			foreground: 'oklch(0.95 0.01 255)',
			card: 'oklch(0.22 0.035 262)',
			'card-foreground': 'oklch(0.95 0.01 255)',
			popover: 'oklch(0.23 0.04 262)',
			'popover-foreground': 'oklch(0.95 0.01 255)',
			primary: 'oklch(0.68 0.17 258)',
			'primary-foreground': 'oklch(0.16 0.04 262)',
			secondary: 'oklch(0.28 0.04 262)',
			'secondary-foreground': 'oklch(0.95 0.01 255)',
			muted: 'oklch(0.26 0.03 262)',
			'muted-foreground': 'oklch(0.72 0.03 258)',
			accent: 'oklch(0.3 0.06 258)',
			'accent-foreground': 'oklch(0.95 0.01 255)',
			destructive: 'oklch(0.7 0.19 22)',
			border: 'oklch(1 0 0 / 11%)',
			input: 'oklch(1 0 0 / 15%)',
			ring: 'oklch(0.68 0.17 258)',
			'rp-canvas': 'linear-gradient(180deg, oklch(0.22 0.05 262), oklch(0.17 0.03 262) 320px)'
		}
	},
	'crm-dark': {
		id: 'theme-crm-dark',
		key: 'crm-dark',
		css: BASE_THEME_CSS,
		// Light mode: the same emerald accent on a cool white.
		tokens: {
			radius: '0.375rem',
			background: 'oklch(0.985 0.005 260)',
			foreground: 'oklch(0.2 0.02 260)',
			card: 'oklch(1 0 0)',
			'card-foreground': 'oklch(0.2 0.02 260)',
			popover: 'oklch(1 0 0)',
			'popover-foreground': 'oklch(0.2 0.02 260)',
			primary: 'oklch(0.6 0.15 160)',
			'primary-foreground': 'oklch(0.99 0.01 160)',
			secondary: 'oklch(0.95 0.01 260)',
			'secondary-foreground': 'oklch(0.25 0.02 260)',
			muted: 'oklch(0.95 0.01 260)',
			'muted-foreground': 'oklch(0.5 0.02 260)',
			accent: 'oklch(0.94 0.04 160)',
			'accent-foreground': 'oklch(0.3 0.06 160)',
			destructive: 'oklch(0.58 0.22 27)',
			border: 'oklch(0.91 0.01 260)',
			input: 'oklch(0.91 0.01 260)',
			ring: 'oklch(0.6 0.15 160)',
			'rp-font': 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
			'rp-canvas': 'oklch(0.985 0.005 260)',
			'rp-heading-tracking': '-0.01em'
		},
		// Dark mode: the original CRM look (slate with emerald).
		tokensDark: {
			background: 'oklch(0.18 0.02 260)',
			foreground: 'oklch(0.96 0.01 260)',
			card: 'oklch(0.23 0.025 260)',
			'card-foreground': 'oklch(0.96 0.01 260)',
			popover: 'oklch(0.24 0.03 260)',
			'popover-foreground': 'oklch(0.96 0.01 260)',
			primary: 'oklch(0.74 0.17 160)',
			'primary-foreground': 'oklch(0.2 0.05 160)',
			secondary: 'oklch(0.3 0.03 260)',
			'secondary-foreground': 'oklch(0.96 0.01 260)',
			muted: 'oklch(0.28 0.02 260)',
			'muted-foreground': 'oklch(0.72 0.02 260)',
			accent: 'oklch(0.33 0.06 160)',
			'accent-foreground': 'oklch(0.96 0.01 260)',
			destructive: 'oklch(0.7 0.19 22)',
			border: 'oklch(1 0 0 / 12%)',
			input: 'oklch(1 0 0 / 16%)',
			ring: 'oklch(0.74 0.17 160)',
			'rp-canvas': 'oklch(0.18 0.02 260)'
		}
	}
};

// sp-light ships its stylesheet as a URL (css: [url]); crm-dark inline (cssText), so both
// theme paths of the contract are exercised.
function themeRef(key) {
	const theme = THEMES[key];
	const inline = key === 'crm-dark';
	return {
		id: theme.id,
		key: theme.key,
		tokens: clone(theme.tokens),
		tokensDark: theme.tokensDark ? clone(theme.tokensDark) : undefined,
		cssText: inline ? theme.css : null,
		css: inline ? [] : [cssUrl(`theme-${theme.key}`, theme.css)]
	};
}

// ---- portals and pages ----------------------------------------------------------------------

const PORTAL_LIST = [
	{ slug: 'sp', name: 'Service Portal' },
	{ slug: 'crm', name: 'CRM' },
	{ slug: 'app', name: 'Dashboard' }
];

const PORTALS = {
	sp: {
		portal: {
			id: 'portal-sp',
			slug: 'sp',
			name: 'Service Portal',
			homeRoute: 'home',
			settings: {},
			navigation: [
				{ label: 'Home', page: '' },
				{ label: 'Orders', page: 'orders' },
				{ label: 'Order 42', page: 'orders/42', recordId: '42' },
				{ label: 'Broken widget', page: 'broken' },
				{ label: 'Layouts', page: 'layouts' }
			]
		},
		theme: 'sp-light',
		layout: 'layout-classic',
		placements: [
			placement('pl-sp-header', 'header', 'header', { tagline: 'Light theme · classic layout', portals: PORTAL_LIST }),
			placement('pl-sp-nav', 'sidebar', 'nav', { title: 'Service Portal' }),
			placement('pl-sp-footer', 'footer', 'text', { variant: 'footer', text: 'Service Portal footer: a portal-level placement (mock data).' })
		],
		pages: [
			{
				id: 'page-sp-home',
				route: 'home',
				title: 'Home',
				placements: [
					placement('pl-sp-home-hero', 'main', 'text', {
						title: 'Welcome to the Service Portal',
						text: 'Every block on this page is a widget loaded at runtime with import() and rendered through the host registry.',
						links: [
							{ label: 'Orders', page: 'orders', primary: true },
							{ label: 'Order 42 (encoded slash)', page: 'orders/42', recordId: '42' },
							{ label: 'Order 42, summary tab 2', page: 'orders/42', recordId: '42', q: 'view=summary&tab=2' },
							{ label: 'Go to CRM', portalSlug: 'crm' }
						]
					}),
					placement('pl-sp-home-counter', 'main', 'counter', { label: 'Home counter', start: 0 })
				]
			},
			{
				id: 'page-sp-orders',
				route: 'orders',
				title: 'Orders',
				placements: [
					placement('pl-sp-orders-list', 'main', 'text', {
						title: 'Orders',
						text: 'Pick an order. Each link dispatches PORTAL_NAVIGATE with page orders/<n> and recordId <n>.',
						links: [
							{ label: 'Order 41', page: 'orders/41', recordId: '41' },
							{ label: 'Order 42', page: 'orders/42', recordId: '42' },
							{ label: 'Order 43 (summary)', page: 'orders/43', recordId: '43', q: { view: 'summary' } }
						]
					})
				]
			},
			{
				id: 'page-sp-order',
				route: 'orders/:id',
				title: 'Order',
				placements: [
					placement('pl-sp-order-record', 'main', 'record', { entity: 'Order', listPage: 'orders' }),
					placement('pl-sp-order-counter', 'main', 'counter', { label: 'Order counter', start: 10 })
				]
			},
			{
				id: 'page-sp-broken',
				route: 'broken',
				title: 'Broken widget',
				placements: [
					placement('pl-sp-broken', 'main', 'broken', { message: 'Deliberate failure: the error boundary should contain this.' }),
					placement('pl-sp-broken-counter', 'main', 'counter', { label: 'Still works next to a broken widget' })
				]
			},
			{
				id: 'page-sp-utils',
				route: 'utils',
				title: 'Utilities',
				placements: [placement('pl-sp-utils', 'main', 'utils', {}), placement('pl-sp-imports', 'main', 'mock-imports', {})]
			},
			{
				id: 'page-sp-layouts',
				route: 'layouts',
				title: 'Layouts',
				placements: [
					blk('pl-lay-section', 'main', 'section', {}, { styleTokens: { background: 'muted', radius: '0.75rem', paddingX: '1.5rem' } }),
					blk('pl-lay-sec-text', 'content', 'text', { title: 'A Section band', text: 'Muted background and radius from style tokens.' }, { parent: 'pl-lay-section' }),
					blk('pl-lay-cols', 'main', 'columns', { tracks: [{ size: 'minmax(0, 1fr)' }, { size: 'minmax(0, 2fr)' }] }),
					blk('pl-lay-c1-text', 'col-1', 'text', { title: 'Column 1', text: 'One third.' }, { parent: 'pl-lay-cols' }),
					blk('pl-lay-c1-counter', 'col-1', 'counter', { label: 'In column 1' }, { parent: 'pl-lay-cols' }),
					blk('pl-lay-grid', 'col-2', 'grid', { itemSpan: 6, tablet: { itemSpan: 6 }, mobile: { itemSpan: 12 } }, { parent: 'pl-lay-cols' }),
					blk('pl-lay-g1', 'items', 'text', { title: 'Card A', text: 'Spans 6 of 12.' }, { parent: 'pl-lay-grid' }),
					blk('pl-lay-g2', 'items', 'text', { title: 'Card B', text: 'Spans 6 of 12.' }, { parent: 'pl-lay-grid' }),
					blk('pl-lay-sub', 'items', 'grid', { itemSpan: 4, subgrid: 'columns', tablet: { itemSpan: 6 }, mobile: { itemSpan: 12 } }, { parent: 'pl-lay-grid', layout: { colSpan: 'full' }, classes: 'rounded-xl border border-dashed p-3' }),
					blk('pl-lay-s1', 'items', 'text', { title: 'Sub 1' }, { parent: 'pl-lay-sub' }),
					blk('pl-lay-s2', 'items', 'text', { title: 'Sub 2' }, { parent: 'pl-lay-sub' }),
					blk('pl-lay-s3', 'items', 'text', { title: 'Sub 3' }, { parent: 'pl-lay-sub' })
				]
			}
		]
	},
	crm: {
		portal: {
			id: 'portal-crm',
			slug: 'crm',
			name: 'CRM',
			homeRoute: 'dashboard',
			settings: {},
			navigation: [
				{ label: 'Dashboard', page: '' },
				{ label: 'Accounts', page: 'accounts' },
				{ label: 'Account 7', page: 'accounts/7', recordId: '7' }
			]
		},
		theme: 'crm-dark',
		layout: 'layout-split',
		placements: [
			placement('pl-crm-header', 'header', 'header', { tagline: 'Dark theme · split layout', portals: PORTAL_LIST }),
			placement('pl-crm-nav', 'sidebar', 'nav', { title: 'CRM' }),
			placement('pl-crm-footer', 'footer', 'text', { variant: 'footer', text: 'CRM footer (mock data).' })
		],
		pages: [
			{
				id: 'page-crm-dashboard',
				route: 'dashboard',
				title: 'Dashboard',
				placements: [
					placement('pl-crm-dash-hero', 'main', 'text', {
						title: 'CRM dashboard',
						text: 'Same widgets, different portal: theme tokens re-skin the shipped shadcn components.',
						links: [
							{ label: 'Accounts', page: 'accounts', primary: true },
							{ label: 'Account 7', page: 'accounts/7', recordId: '7' },
							{ label: 'Back to Service Portal', portalSlug: 'sp' }
						]
					}),
					placement('pl-crm-dash-counter', 'main', 'counter', { label: 'Pipeline counter', start: 100 })
				]
			},
			{
				id: 'page-crm-accounts',
				route: 'accounts',
				title: 'Accounts',
				placements: [
					placement('pl-crm-accounts-list', 'main', 'text', {
						title: 'Accounts',
						links: [
							{ label: 'Account 7', page: 'accounts/7', recordId: '7' },
							{ label: 'Account 8', page: 'accounts/8', recordId: '8' },
							{ label: 'Account 9 (tab 2)', page: 'accounts/9', recordId: '9', q: 'tab=2' }
						]
					})
				]
			},
			{
				id: 'page-crm-account',
				route: 'accounts/:id',
				title: 'Account',
				placements: [placement('pl-crm-account-record', 'main', 'record', { entity: 'Account', listPage: 'accounts' })]
			}
		]
	}
};

// The app shell portal: layout options (portal default beside-sidebar, one page overrides it),
// useSidebar (icon-collapsible sidebar + trigger in another region) and useNavigation (groups, icons).
PORTALS.app = {
	portal: {
		id: 'portal-app',
		slug: 'app',
		name: 'Dashboard',
		homeRoute: 'home',
		settings: { layoutOptions: { header: 'beside-sidebar' } },
		navigation: [
			{ label: 'Home', to: '', icon: 'house' },
			{ label: 'Work', children: [
				{ label: 'Orders', to: 'orders', icon: 'shopping-cart', badge: '3' },
				{ label: 'Order 42', to: 'orders/42', recordId: '42', icon: 'receipt' }
			] },
			{ label: 'Design', children: [
				{ label: 'Layouts', to: 'layouts', icon: 'layout-grid' },
				{ label: 'Full header', to: 'wide', icon: 'panel-left' },
				{ label: 'Docs', href: 'https://www.servicenow.com', icon: 'book-open' }
			] }
		]
	},
	theme: 'sp-light',
	layout: 'layout-shell',
	placements: [
		placement('pl-app-sidebar', 'sidebar', 'shell-sidebar', { collapsible: 'icon' }),
		placement('pl-app-topbar', 'header', 'shell-topbar', {})
	],
	pages: [
		{ id: 'page-app-home', route: 'home', title: 'Home', placements: [
			placement('pl-app-home-text', 'main', 'text', { title: 'App shell', text: 'Ctrl+B toggles the sidebar. The header sits beside the sidebar (portal layout option).' }),
			placement('pl-app-home-counter', 'main', 'counter', { label: 'Survives sidebar toggles' })
		] },
		{ id: 'page-app-orders', route: 'orders', title: 'Orders', placements: [placement('pl-app-orders', 'main', 'text', { title: 'Orders', links: [{ label: 'Order 42', page: 'orders/42', recordId: '42' }] })] },
		{ id: 'page-app-order', route: 'orders/:id', title: 'Order', placements: [placement('pl-app-order', 'main', 'record', { entity: 'Order', listPage: 'orders' })] },
		{ id: 'page-app-layouts', route: 'layouts', title: 'Layouts', placements: [placement('pl-app-layouts', 'main', 'text', { title: 'Layouts', text: 'Portal default layout options.' })] },
		{ id: 'page-app-wide', route: 'wide', title: 'Full header', layoutOptions: { header: 'full' }, placements: [placement('pl-app-wide', 'main', 'text', { title: 'Full-width header', text: 'This page overrides the layout option: header full width over the sidebar.' })] }
	]
};

/** Layout defaults → portal settings.layoutOptions (default layout only) → the page's own. */
function layoutOptionsOf(entry, page) {
	const key = (page && page.layout) || entry.layout;
	const out = clone((DESIGN_META[key] || {}).defaults || {});
	if (key === entry.layout) Object.assign(out, clone((entry.portal.settings || {}).layoutOptions || {}));
	if (page && page.layoutOptions) Object.assign(out, clone(page.layoutOptions));
	return out;
}

function findPortal(slug) {
	const entry = PORTALS[slug];
	if (!entry) throw new MockError(`Portal "${slug}" not found (mock has: ${Object.keys(PORTALS).join(', ')})`, 404);
	return entry;
}

function matchRoute(pattern, path) {
	const a = pattern.split('/');
	const b = path.split('/');
	if (a.length !== b.length) return null;
	const params = {};
	for (let i = 0; i < a.length; i += 1) {
		if (a[i].charAt(0) === ':') params[a[i].slice(1)] = b[i];
		else if (a[i] !== b[i]) return null;
	}
	return params;
}

// ---- API ------------------------------------------------------------------------------------

export function getBootstrap(slug) {
	try {
		const entry = findPortal(slug);
		return delay({
			portal: clone(entry.portal),
			release: { id: `release-${slug}-mock`, version: '0.0.0-mock' },
			theme: themeRef(entry.theme),
			layout: component(entry.layout),
			layoutOptions: layoutOptionsOf(entry, null),
			regions: groupByRegion(entry.placements),
			pages: entry.pages.map((p) => ({ id: p.id, route: p.route, title: p.title })),
			user: clone(MOCK_USER)
		});
	} catch (error) {
		return Promise.reject(error);
	}
}

export function resolvePage(slug, pagePath) {
	try {
		const entry = findPortal(slug);
		const path = pagePath || entry.portal.homeRoute;
		const exact = entry.pages.find((p) => p.route === path);
		let found = exact ? { page: exact, params: {} } : null;
		if (!found) {
			for (let i = 0; i < entry.pages.length && !found; i += 1) {
				const params = matchRoute(entry.pages[i].route, path);
				if (params) found = { page: entry.pages[i], params };
			}
		}
		if (!found) throw new MockError(`No page "${path}" in portal "${slug}"`, 404);
		const { page, params } = found;
		return delay({
			page: { id: page.id, route: page.route, title: page.title, params },
			layout: component(page.layout || entry.layout),
			layoutOptions: layoutOptionsOf(entry, page),
			regions: groupByRegion(page.placements)
		});
	} catch (error) {
		return Promise.reject(error);
	}
}

function initData(instanceId, body) {
	return { greeting: `Hello from the mock server for ${instanceId}`, at: new Date().toLocaleTimeString(), portal: body.portal, page: body.page };
}

export function initializeInstances(body) {
	const instances = {};
	(body.instances || []).forEach((id) => {
		instances[id] = { ok: true, data: initData(id, body), options: null };
	});
	return delay({ instances });
}

export function executeInstance(instanceId, body) {
	const b = body || {};
	if (b.action === 'initialize') return delay(initData(instanceId, b));
	if (b.action === 'update') return delay({ ...(b.data || {}), updatedAt: new Date().toLocaleTimeString() });
	return delay({ instance: instanceId, action: b.action || 'get', echo: b.input === undefined ? null : b.input, at: new Date().toLocaleTimeString() });
}

// ---- Service Portal-style utilities ---------------------------------------------------------

const MOCK_USER = {
	sysId: 'mock-user-6816f79cc0a8016401c5a33be04be441',
	userName: 'abel.tuter',
	name: 'Abel Tuter',
	firstName: 'Abel',
	lastName: 'Tuter',
	email: 'abel.tuter@example.com',
	title: 'Service Desk Analyst',
	avatar: '',
	roles: ['itil', 'x_312987_portal.designer'],
	timeZone: 'America/Los_Angeles',
	language: 'en',
	isImpersonating: false
};

// Portal-exposed or x_312987_portal.public.* properties answer; everything else is null.
const MOCK_PROPERTIES = {
	'glide.product.name': null,
	'x_312987_portal.public.support_email': 'support@example.com',
	'x_312987_portal.public.banner': 'Mock banner from a public property',
	'css.base.color': '#2563eb'
};
const EXPOSED = { sp: ['css.base.color'], crm: [] };

export function getProperties(portal, names) {
	const values = {};
	(names || []).forEach((n) => {
		const allowed = n.indexOf('x_312987_portal.public.') === 0 || (EXPOSED[portal] || []).includes(n);
		values[n] = allowed && MOCK_PROPERTIES[n] !== undefined ? MOCK_PROPERTIES[n] : null;
	});
	return delay(values);
}

const MOCK_MESSAGES = { Save: 'Save', Cancel: 'Cancel', 'Welcome back, {0}': 'Welcome back, {0}', 'No records': 'No records found' };

export function getMessages(keys) {
	const messages = {};
	(keys || []).forEach((k) => {
		messages[k] = MOCK_MESSAGES[k] !== undefined ? MOCK_MESSAGES[k] : k;
	});
	return delay(messages);
}

const MOCK_ROWS = {
	incident: [
		{ sys_id: 'inc-1', number: 'INC0010001', short_description: 'Email not syncing on mobile', priority: '2', state: 'In Progress' },
		{ sys_id: 'inc-2', number: 'INC0010002', short_description: 'VPN drops every hour', priority: '1', state: 'New' },
		{ sys_id: 'inc-3', number: 'INC0010003', short_description: 'Printer on floor 3 offline', priority: '3', state: 'On Hold' },
		{ sys_id: 'inc-4', number: 'INC0010004', short_description: 'Laptop battery swelling', priority: '1', state: 'New' }
	]
};

/** Table API stand-in: filters by simple field=value terms, orders, limits and picks fields. */
export function tableApi(table, sysId, params) {
	const p = params || {};
	let rows = (MOCK_ROWS[table] || [{ sys_id: `${table}-1`, name: `${table} record 1` }, { sys_id: `${table}-2`, name: `${table} record 2` }]).map((r) => ({ ...r }));
	const pick = (r) => {
		if (!p.sysparm_fields) return r;
		const out = {};
		String(p.sysparm_fields).split(',').forEach((f) => {
			if (r[f.trim()] !== undefined) out[f.trim()] = r[f.trim()];
		});
		return out;
	};
	if (sysId) {
		const row = rows.find((r) => r.sys_id === sysId);
		if (!row) {
			const error = new Error(`No Record found: ${table}/${sysId}`);
			error.name = 'ApiError';
			error.status = 404;
			return Promise.reject(error);
		}
		return delay(pick(row));
	}
	let order = null;
	String(p.sysparm_query || '')
		.split('^')
		.filter(Boolean)
		.forEach((term) => {
			const m = /^ORDERBY(DESC)?(.+)$/.exec(term);
			if (m) order = { desc: !!m[1], field: m[2] };
			else {
				const eq = /^([\w.]+)=(.*)$/.exec(term);
				if (eq) rows = rows.filter((r) => String(r[eq[1]]) === eq[2]);
			}
		});
	if (order) rows.sort((a, b) => (String(a[order.field]) < String(b[order.field]) ? -1 : 1) * (order.desc ? -1 : 1));
	if (p.sysparm_limit) rows = rows.slice(0, Number(p.sysparm_limit));
	return delay(rows.map(pick));
}

// ---- page designer (Studio "Pages"): mock of /rp_studio design endpoints -------------------
// Mutates the same PORTALS data the mock bootstrap/resolve read, so the designer's canvas (the
// real runtime) shows every change.

const DESIGN_META = {
	'layout-classic': { name: 'Classic Layout' },
	'layout-split': { name: 'Split Layout' },
	'layout-shell': {
		name: 'Shell Layout',
		schema: {
			type: 'object',
			properties: {
				header: { type: 'string', title: 'Header placement', enum: ['full', 'beside-sidebar'], enumNames: ['Full width, over the sidebar', 'Beside the sidebar (full-height sidebar)'] }
			}
		},
		defaults: { header: 'full' }
	},
	'shell-sidebar': {
		name: 'Shell Sidebar',
		description: 'Collapsible sidebar (components:sidebar)',
		schema: { type: 'object', properties: { collapsible: { type: 'string', title: 'Collapsible', enum: ['icon', 'offcanvas', 'none'] }, variant: { type: 'string', title: 'Variant', enum: ['sidebar', 'floating', 'inset'] }, menu: { type: 'string', title: 'Menu' } } },
		defaults: { collapsible: 'icon', menu: 'primary' }
	},
	'shell-topbar': { name: 'Shell Topbar', description: 'Sidebar trigger and breadcrumbs', schema: { type: 'object', properties: { menu: { type: 'string', title: 'Menu' } } }, defaults: { menu: 'primary' } },
	header: {
		name: 'Portal Header',
		description: 'Brand, navigation and the portal switcher',
		schema: {
			type: 'object',
			properties: {
				tagline: { type: 'string', title: 'Tagline' },
				portals: { type: 'array', title: 'Switchable portals', items: { type: 'object', properties: { slug: { type: 'string', title: 'Slug' }, name: { type: 'string', title: 'Name' } } } }
			}
		},
		defaults: { tagline: '' }
	},
	nav: { name: 'Portal Nav', description: 'Page list for the sidebar', schema: { type: 'object', properties: { title: { type: 'string', title: 'Title', default: 'Pages' } } }, defaults: { title: 'Pages' } },
	counter: {
		name: 'Counter',
		description: 'Local state plus an on-load server script',
		schema: { type: 'object', properties: { label: { type: 'string', title: 'Label' }, start: { type: 'integer', title: 'Start value', default: 0 } }, required: ['label'] },
		defaults: { label: 'Counter', start: 0 }
	},
	record: {
		name: 'Record Detail',
		description: 'Shows the current record and contributes to the header',
		schema: { type: 'object', properties: { entity: { type: 'string', title: 'Entity label' }, listPage: { type: 'string', title: 'List page route' } } },
		defaults: { entity: 'Record', listPage: '' }
	},
	text: {
		name: 'Text Block',
		description: 'Title, text and a row of links',
		schema: {
			type: 'object',
			properties: {
				title: { type: 'string', title: 'Title' },
				text: { type: 'string', title: 'Text', format: 'textarea' },
				variant: { type: 'string', title: 'Variant', enum: ['card', 'footer'], enumNames: ['Card', 'Footer'], default: 'card' },
				links: {
					type: 'array',
					title: 'Links',
					items: { type: 'object', properties: { label: { type: 'string', title: 'Label' }, page: { type: 'string', title: 'Page' }, primary: { type: 'boolean', title: 'Primary' } } }
				}
			}
		},
		defaults: { title: 'Text', text: '', variant: 'card', links: [] }
	},
	broken: { name: 'Broken (throws)', description: 'Fails on render (error boundary demo)', schema: { type: 'object', properties: { message: { type: 'string', title: 'Error message' } } }, defaults: {} },
	utils: { name: 'Utilities Demo', description: 'Service Portal-style hooks', schema: null, defaults: {} },
	section: {
		name: 'Section',
		description: 'A full-width band; content can be width-capped',
		schema: { type: 'object', properties: { paddingY: { type: 'string', title: 'Vertical padding', 'x-css-var': '--rp-section-py' }, maxWidth: { type: 'string', title: 'Content max width', 'x-css-var': '--rp-section-max' }, gap: { type: 'string', title: 'Gap between items', 'x-css-var': '--rp-section-gap' } } },
		defaults: { paddingY: '2rem', maxWidth: 'none', gap: '1.5rem' }
	},
	container: {
		name: 'Container',
		description: 'A centred, max-width container',
		schema: { type: 'object', properties: { maxWidth: { type: 'string', title: 'Max width', 'x-css-var': '--rp-container-max' }, paddingX: { type: 'string', title: 'Side padding', 'x-css-var': '--rp-container-px' }, gap: { type: 'string', title: 'Gap', 'x-css-var': '--rp-container-gap' } } },
		defaults: { maxWidth: '72rem', paddingX: '1rem', gap: '1.5rem' }
	},
	grid: {
		name: 'Grid',
		description: 'A real CSS grid (12 tracks by default); nested grids can use subgrid',
		schema: {
			type: 'object',
			properties: {
				columns: { type: 'string', title: 'Column tracks', 'x-css-var': '--rp-grid-cols', 'x-presets': ['repeat(12, minmax(0, 1fr))', 'repeat(auto-fit, minmax(16rem, 1fr))', '1fr 1fr', '1fr 2fr', '2fr 1fr', 'repeat(3, minmax(0, 1fr))', 'repeat(4, minmax(0, 1fr))'] },
				gap: { type: 'string', title: 'Gap', 'x-css-var': '--rp-grid-gap' },
				itemSpan: { type: 'integer', title: 'Default item span', 'x-css-var': '--rp-grid-span' },
				alignItems: { type: 'string', title: 'Align items', enum: ['stretch', 'start', 'center', 'end', 'baseline'], 'x-css-var': '--rp-grid-align' },
				subgrid: { type: 'string', title: 'Subgrid', enum: ['none', 'columns', 'rows', 'both'], enumNames: ['Off', 'Columns', 'Rows', 'Columns and rows'] }
			}
		},
		defaults: { columns: 'repeat(12, minmax(0, 1fr))', gap: '1rem', itemSpan: 4, subgrid: 'none', tablet: { itemSpan: 6 }, mobile: { itemSpan: 12 } }
	},
	columns: {
		name: 'Columns',
		description: 'One drop zone per column (½+½, ⅓+⅔, ⅓×3 …); stacks on mobile',
		schema: {
			type: 'object',
			properties: {
				tracks: {
					type: 'array',
					title: 'Columns',
					'x-css-var': '--rp-cols',
					'x-presets': [
						{ label: '½ + ½', value: [{ size: 'minmax(0, 1fr)' }, { size: 'minmax(0, 1fr)' }] },
						{ label: '⅓ + ⅔', value: [{ size: 'minmax(0, 1fr)' }, { size: 'minmax(0, 2fr)' }] },
						{ label: '⅔ + ⅓', value: [{ size: 'minmax(0, 2fr)' }, { size: 'minmax(0, 1fr)' }] },
						{ label: '⅓ × 3', value: [{ size: 'minmax(0, 1fr)' }, { size: 'minmax(0, 1fr)' }, { size: 'minmax(0, 1fr)' }] },
						{ label: '¼ × 4', value: [{ size: 'minmax(0, 1fr)' }, { size: 'minmax(0, 1fr)' }, { size: 'minmax(0, 1fr)' }, { size: 'minmax(0, 1fr)' }] },
						{ label: 'Sidebar + main', value: [{ size: '18rem' }, { size: 'minmax(0, 1fr)' }] }
					],
					items: { type: 'object', properties: { size: { type: 'string', title: 'Size' } } }
				},
				gap: { type: 'string', title: 'Gap', 'x-css-var': '--rp-cols-gap' },
				align: { type: 'string', title: 'Align columns', enum: ['start', 'center', 'end', 'stretch'], 'x-css-var': '--rp-cols-align' }
			}
		},
		defaults: { tracks: [{ size: 'minmax(0, 1fr)' }, { size: 'minmax(0, 2fr)' }], gap: '1.5rem', align: 'start', mobile: { tracks: [{ size: 'minmax(0, 1fr)' }] } }
	},
	stack: {
		name: 'Stack',
		description: 'A flex stack, vertical or horizontal',
		schema: { type: 'object', properties: { direction: { type: 'string', title: 'Direction', enum: ['column', 'row'], 'x-css-var': '--rp-stack-dir' }, gap: { type: 'string', title: 'Gap', 'x-css-var': '--rp-stack-gap' }, wrap: { type: 'string', title: 'Wrap', enum: ['nowrap', 'wrap'], 'x-css-var': '--rp-stack-wrap' } } },
		defaults: { direction: 'column', gap: '1rem', wrap: 'nowrap' }
	},
	split: {
		name: 'Split',
		description: 'Two panes with an optional divider; stacks on mobile',
		schema: { type: 'object', properties: { template: { type: 'string', title: 'Pane sizes', 'x-css-var': '--rp-split', 'x-presets': ['minmax(0, 1fr) minmax(0, 1fr)', '18rem minmax(0, 1fr)', 'minmax(0, 2fr) minmax(0, 1fr)'] }, gap: { type: 'string', title: 'Gap', 'x-css-var': '--rp-split-gap' }, divider: { type: 'boolean', title: 'Divider' } } },
		defaults: { template: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', divider: false, mobile: { template: 'minmax(0, 1fr)' } }
	}
};

const keyOfComponentId = (id) => (id && id.indexOf('cmp-') === 0 ? id.slice(4) : id);

function designError(message, status) {
	return new MockError(message, status || 400);
}

function portalEntryById(portalId) {
	const slug = Object.keys(PORTALS).find((s) => PORTALS[s].portal.id === portalId || s === portalId);
	if (!slug) throw designError('Portal ' + portalId + ' not found', 404);
	return PORTALS[slug];
}

function findPage(pageId) {
	for (const slug of Object.keys(PORTALS)) {
		const page = PORTALS[slug].pages.find((p) => p.id === pageId);
		if (page) return { entry: PORTALS[slug], page };
	}
	return null;
}

function findPlacementRecord(placementId) {
	for (const slug of Object.keys(PORTALS)) {
		const entry = PORTALS[slug];
		const i = entry.placements.findIndex((p) => p.id === placementId);
		if (i !== -1) return { entry, list: entry.placements, index: i, page: null };
		for (const page of entry.pages) {
			const j = page.placements.findIndex((p) => p.id === placementId);
			if (j !== -1) return { entry, list: page.placements, index: j, page };
		}
	}
	return null;
}

function layoutRef(key) {
	const def = DEFINITIONS[key];
	const meta = DESIGN_META[key] || {};
	return { id: 'cmp-' + key, uniqueId: 'rp.' + key, name: meta.name || key, regions: clone(def.regions || []), optionsSchema: clone(meta.schema || null), defaultOptions: clone(meta.defaults || {}) };
}

function designPlacement(raw, scope) {
	const meta = DESIGN_META[raw.componentKey] || {};
	const def = DEFINITIONS[raw.componentKey] || {};
	const dto = {
		id: raw.id,
		region: raw.region,
		order: raw.order,
		active: raw.active !== false,
		scope,
		parentId: raw.parent || null,
		component: { id: 'cmp-' + raw.componentKey, uniqueId: 'rp.' + raw.componentKey, name: meta.name || raw.componentKey, kind: def.kind || 'widget' },
		options: clone(raw.options || {}),
		effectiveOptions: effectiveOptions(raw),
		styleTokens: clone(raw.styleTokens || {}),
		layout: clone(raw.layout || {}),
		classes: raw.classes || ''
	};
	if (def.kind === 'block') {
		dto.regions = resolveZones(def.spec || [], dto.effectiveOptions);
		dto.children = {};
	}
	return dto;
}

function groupDesign(list, scope) {
	const items = {};
	list.forEach((p) => (items[p.id] = designPlacement(p, scope)));
	const out = {};
	list.slice()
		.sort((a, b) => a.order - b.order)
		.forEach((p) => {
			const d = items[p.id];
			if (!d.parentId) (out[d.region] = out[d.region] || []).push(d);
			else if (items[d.parentId] && items[d.parentId].children) (items[d.parentId].children[d.region] = items[d.parentId].children[d.region] || []).push(d);
		});
	return out;
}

function pageSummary(entry, page, index) {
	return {
		id: page.id,
		name: page.name || page.title,
		title: page.title,
		route: page.route,
		order: page.order !== undefined ? page.order : (index + 1) * 10,
		active: page.active !== false,
		layoutOverride: page.layout ? 'cmp-' + page.layout : null,
		layoutOptions: page.layoutOptions && Object.keys(page.layoutOptions).length ? clone(page.layoutOptions) : null,
		access: page.access || null
	};
}

function portalSummary(entry) {
	const home = entry.pages.find((p) => p.route === entry.portal.homeRoute);
	const slug = entry.portal.slug;
	return {
		id: entry.portal.id,
		slug,
		name: entry.portal.name,
		active: entry.portal.active !== false,
		isDefault: slug === 'sp',
		theme: THEMES[entry.theme].id,
		defaultLayout: 'cmp-' + entry.layout,
		homePage: home ? home.id : null,
		navigation: clone(entry.portal.navigation || []),
		settings: clone(entry.portal.settings || {})
	};
}

function effectiveLayoutKey(entry, page) {
	return (page && page.layout) || entry.layout;
}

/** Renumber orders in `list` for one region (10, 20, 30…) after an insert or move. */
/** Renumber orders (10, 20, …) among siblings: same parent, same region/zone. */
function renumber(list, region, parent) {
	list.filter((p) => p.region === region && (p.parent || null) === (parent || null))
		.sort((a, b) => a.order - b.order)
		.forEach((p, i) => (p.order = (i + 1) * 10));
}

function insertAt(list, raw, index) {
	const same = list.filter((p) => p !== raw && p.region === raw.region && (p.parent || null) === (raw.parent || null)).sort((a, b) => a.order - b.order);
	const at = index === undefined || index === null || index < 0 || index > same.length ? same.length : index;
	same.splice(at, 0, raw);
	same.forEach((p, i) => (p.order = (i + 1) * 10));
	if (!list.includes(raw)) list.push(raw);
}

/** Every placement nested under id (in the same owner list), parents first. */
function descendantsIn(list, id) {
	const out = [];
	const walk = (pid) => list.filter((p) => p.parent === pid).forEach((c) => (out.push(c), walk(c.id)));
	walk(id);
	return out;
}

function assertRegion(entry, page, region, parentRaw) {
	if (parentRaw) {
		const def = DEFINITIONS[parentRaw.componentKey] || {};
		if (def.kind !== 'block') throw designError('Only blocks can contain placements', 400);
		const zones = resolveZones(def.spec || [], effectiveOptions(parentRaw)).map((z) => z.name);
		if (!zones.includes(region)) throw designError('Zone "' + region + '" is not on this ' + ((DESIGN_META[parentRaw.componentKey] || {}).name || 'block') + ' (zones: ' + zones.join(', ') + ')', 400);
		return;
	}
	const key = effectiveLayoutKey(entry, page);
	const regions = (DEFINITIONS[key].regions || []).map((r) => r.name);
	if (!regions.includes(region)) {
		throw designError('Region "' + region + '" is not on layout ' + ((DESIGN_META[key] || {}).name || key) + ' (regions: ' + regions.join(', ') + ')', 400);
	}
}

let designSeq = 0;

export const designApi = {
	resolve(id) {
		if (Object.keys(PORTALS).some((s) => PORTALS[s].portal.id === id)) return delay({ kind: 'portal', portalId: id, pageId: null });
		const found = findPage(id);
		if (found) return delay({ kind: 'page', portalId: found.entry.portal.id, pageId: id });
		return delay({ kind: 'unknown', portalId: null, pageId: null });
	},
	listPortals() {
		return delay(Object.keys(PORTALS).map((s) => ({ id: PORTALS[s].portal.id, slug: s, name: PORTALS[s].portal.name })));
	},
	portalDesign(portalId) {
		try {
			const entry = portalEntryById(portalId);
			return delay({
				portal: portalSummary(entry),
				themes: Object.keys(THEMES).map((k) => ({ id: THEMES[k].id, key: k, name: k })),
				layouts: Object.keys(DEFINITIONS)
					.filter((k) => DEFINITIONS[k].kind === 'layout')
					.map(layoutRef),
				palette: Object.keys(DEFINITIONS)
					.filter((k) => DEFINITIONS[k].kind === 'widget')
					.map((k) => ({
						id: 'cmp-' + k,
						uniqueId: 'rp.' + k,
						name: (DESIGN_META[k] || {}).name || k,
						description: (DESIGN_META[k] || {}).description || '',
						serverMode: DEFINITIONS[k].serverMode || 'none',
						optionsSchema: clone((DESIGN_META[k] || {}).schema || null),
						defaultOptions: clone((DESIGN_META[k] || {}).defaults || {})
					})),
				blocks: Object.keys(DEFINITIONS)
					.filter((k) => DEFINITIONS[k].kind === 'block')
					.map((k) => ({
						id: 'cmp-' + k,
						uniqueId: 'rp.' + k,
						name: (DESIGN_META[k] || {}).name || k,
						description: (DESIGN_META[k] || {}).description || '',
						regionSpec: clone(DEFINITIONS[k].spec || []),
						optionsSchema: clone((DESIGN_META[k] || {}).schema || null),
						defaultOptions: clone((DESIGN_META[k] || {}).defaults || {})
					})),
				pages: entry.pages.map((p, i) => pageSummary(entry, p, i)),
				portalPlacements: groupDesign(entry.placements, 'portal')
			});
		} catch (error) {
			return Promise.reject(error);
		}
	},
	pageDesign(pageId) {
		const found = findPage(pageId);
		if (!found) return Promise.reject(designError('Page ' + pageId + ' not found', 404));
		const entry = found.entry;
		const page = found.page;
		return delay({
			page: pageSummary(entry, page, entry.pages.indexOf(page)),
			layout: layoutRef(effectiveLayoutKey(entry, page)),
			placements: groupDesign(page.placements, 'page'),
			portalPlacements: groupDesign(entry.placements, 'portal')
		});
	},
	createPlacement(body) {
		try {
			const entry = portalEntryById(body.portal);
			const found = body.page ? findPage(body.page) : null;
			if (body.page && !found) throw designError('Page ' + body.page + ' not found', 404);
			const key = keyOfComponentId(body.component);
			if (!DEFINITIONS[key] || (DEFINITIONS[key].kind !== 'widget' && DEFINITIONS[key].kind !== 'block')) throw designError('Component ' + body.component + ' is not placeable', 400);
			const list = found ? found.page.placements : entry.placements;
			const parentRaw = body.parent ? list.find((p) => p.id === body.parent) : null;
			if (body.parent && !parentRaw) throw designError('Parent block ' + body.parent + ' not found here', 400);
			// Checked against the parent block's zones, or the effective layout's regions.
			assertRegion(entry, found ? found.page : null, body.region, parentRaw);
			designSeq += 1;
			const raw = {
				id: 'pl-new-' + Date.now().toString(36) + '-' + designSeq,
				region: body.region,
				order: 0,
				componentKey: key,
				options: clone(body.options || {}),
				active: true,
				parent: parentRaw ? parentRaw.id : undefined,
				styleTokens: clone(body.styleTokens || {}),
				layout: clone(body.layout || {}),
				classes: body.classes || ''
			};
			insertAt(list, raw, body.index);
			return delay(designPlacement(raw, found ? 'page' : 'portal'), 180);
		} catch (error) {
			return Promise.reject(error);
		}
	},
	patchPlacement(id, body) {
		try {
			const rec = findPlacementRecord(id);
			if (!rec) throw designError('Placement ' + id + ' not found', 404);
			const raw = rec.list[rec.index];
			let targetList = rec.list;
			let targetPage = rec.page;
			if (body.page !== undefined) {
				targetPage = body.page ? (findPage(body.page) || {}).page : null;
				if (body.page && !targetPage) throw designError('Page ' + body.page + ' not found', 404);
				targetList = targetPage ? targetPage.placements : rec.entry.placements;
			}
			const fromParent = raw.parent || null;
			let toParent = fromParent;
			if (body.parent !== undefined) toParent = body.parent || null;
			else if (targetList !== rec.list) toParent = null; // changing scope without a target block → top level
			const region = body.region || raw.region;
			const moved = targetList !== rec.list || toParent !== fromParent || region !== raw.region;
			let parentRaw = null;
			if (toParent) {
				parentRaw = targetList.find((p) => p.id === toParent);
				if (!parentRaw) throw designError('Parent block ' + toParent + ' not found here', 400);
				if (toParent === id || descendantsIn(rec.list, id).some((d) => d.id === toParent)) throw designError("A block can't be moved inside itself", 400);
			}
			if (moved) assertRegion(rec.entry, targetPage, region, parentRaw);
			if (body.options !== undefined) raw.options = clone(body.options || {});
			if (body.active !== undefined) raw.active = !!body.active;
			if (body.styleTokens !== undefined) raw.styleTokens = clone(body.styleTokens || {});
			if (body.layout !== undefined) raw.layout = clone(body.layout || {});
			if (body.classes !== undefined) raw.classes = String(body.classes || '');
			if (moved || body.index !== undefined) {
				const oldRegion = raw.region;
				// A block moves with its subtree (across scopes too).
				const subtree = targetList !== rec.list ? descendantsIn(rec.list, id) : [];
				rec.list.splice(rec.list.indexOf(raw), 1);
				subtree.forEach((d) => {
					rec.list.splice(rec.list.indexOf(d), 1);
					targetList.push(d);
				});
				renumber(rec.list, oldRegion, fromParent);
				raw.region = region;
				raw.parent = toParent || undefined;
				insertAt(targetList, raw, body.index);
			}
			return delay(designPlacement(raw, targetPage ? 'page' : 'portal'), 150);
		} catch (error) {
			return Promise.reject(error);
		}
	},
	deletePlacement(id, mode) {
		const rec = findPlacementRecord(id);
		if (!rec) return Promise.reject(designError('Placement ' + id + ' not found', 404));
		const raw = rec.list[rec.index];
		const children = rec.list.filter((p) => p.parent === id).sort((a, b) => a.region.localeCompare(b.region) || a.order - b.order);
		if (children.length && mode !== 'lift' && mode !== 'cascade') {
			const err = designError('This block contains ' + children.length + ' placement(s): delete with mode "lift" (move them out) or "cascade" (delete them too)', 409);
			err.code = 'has_children';
			err.details = { children: children.length };
			return Promise.reject(err);
		}
		const scope = rec.page ? 'page' : 'portal';
		const placement = Object.assign(designPlacement(raw, scope), { pageId: rec.page ? rec.page.id : null, portal: rec.entry.portal.id });
		const lifted = [];
		if (mode === 'cascade') {
			descendantsIn(rec.list, id).forEach((d) => rec.list.splice(rec.list.indexOf(d), 1));
		}
		// Index of the block among its siblings, so lifted children land where it was.
		const siblings = rec.list.filter((p) => p.region === raw.region && (p.parent || null) === (raw.parent || null)).sort((a, b) => a.order - b.order);
		let at = siblings.indexOf(raw);
		rec.list.splice(rec.list.indexOf(raw), 1);
		if (mode === 'lift') {
			children.forEach((c) => {
				c.parent = raw.parent || undefined;
				c.region = raw.region;
				insertAt(rec.list, c, at++);
				lifted.push(c.id);
			});
		}
		renumber(rec.list, raw.region, raw.parent || null);
		return delay({ deleted: true, placement, lifted }, 150);
	},
	createPage(body) {
		try {
			const entry = portalEntryById(body.portal);
			const route = String(body.route || '').replace(/^\/+|\/+$/g, '');
			if (!route) throw designError('A route is required', 400);
			if (entry.pages.some((p) => p.route === route)) throw designError('Route "' + route + '" already exists in ' + entry.portal.name, 400);
			designSeq += 1;
			const page = {
				id: 'page-new-' + Date.now().toString(36) + '-' + designSeq,
				name: body.name || body.title || route,
				route,
				title: body.title || body.name || route,
				placements: [],
				layout: body.layoutOverride ? keyOfComponentId(body.layoutOverride) : undefined
			};
			entry.pages.push(page);
			return delay(pageSummary(entry, page, entry.pages.length - 1), 150);
		} catch (error) {
			return Promise.reject(error);
		}
	},
	patchPage(id, body) {
		const found = findPage(id);
		if (!found) return Promise.reject(designError('Page ' + id + ' not found', 404));
		const entry = found.entry;
		const page = found.page;
		if (body.route !== undefined) {
			const route = String(body.route || '').replace(/^\/+|\/+$/g, '');
			if (!route) return Promise.reject(designError('A route is required', 400));
			if (entry.pages.some((p) => p !== page && p.route === route)) return Promise.reject(designError('Route "' + route + '" already exists', 400));
			if (entry.portal.homeRoute === page.route) entry.portal.homeRoute = route;
			page.route = route;
		}
		['name', 'title', 'order', 'access'].forEach((k) => {
			if (body[k] !== undefined) page[k] = body[k];
		});
		if (body.active !== undefined) page.active = !!body.active;
		if (body.layoutOptions !== undefined) {
			const o = body.layoutOptions && typeof body.layoutOptions === 'object' && !Array.isArray(body.layoutOptions) ? body.layoutOptions : null;
			page.layoutOptions = o && Object.keys(o).length ? clone(o) : undefined;
		}
		if (body.layoutOverride !== undefined) {
			const key = body.layoutOverride ? keyOfComponentId(body.layoutOverride) : undefined;
			// Page placements must fit the new layout's regions.
			const regions = ((DEFINITIONS[key || entry.layout] || {}).regions || []).map((r) => r.name);
			const misfit = page.placements.find((p) => !regions.includes(p.region));
			if (misfit) return Promise.reject(designError('A placement in region "' + misfit.region + '" does not fit that layout (regions: ' + regions.join(', ') + ')', 400));
			page.layout = key;
		}
		return delay(pageSummary(entry, page, entry.pages.indexOf(page)), 150);
	},
	deletePage(id) {
		const found = findPage(id);
		if (!found) return Promise.reject(designError('Page ' + id + ' not found', 404));
		const entry = found.entry;
		const page = found.page;
		if (entry.portal.homeRoute === page.route) return Promise.reject(designError('The home page cannot be deleted: choose another home page first', 400));
		entry.pages.splice(entry.pages.indexOf(page), 1);
		return delay({ deleted: true }, 150);
	},
	patchPortal(id, body) {
		try {
			const entry = portalEntryById(id);
			if (body.name !== undefined) entry.portal.name = body.name;
			if (body.active !== undefined) entry.portal.active = !!body.active;
			if (body.navigation !== undefined) entry.portal.navigation = clone(body.navigation || []);
			if (body.settings !== undefined) entry.portal.settings = clone(body.settings || {});
			if (body.theme !== undefined) {
				const key = Object.keys(THEMES).find((k) => THEMES[k].id === body.theme);
				if (!key) throw designError('Theme ' + body.theme + ' not found', 400);
				entry.theme = key;
			}
			if (body.defaultLayout !== undefined) {
				const key = keyOfComponentId(body.defaultLayout);
				if (!DEFINITIONS[key] || DEFINITIONS[key].kind !== 'layout') throw designError(body.defaultLayout + ' is not a layout', 400);
				const regions = DEFINITIONS[key].regions.map((r) => r.name);
				const misfit = entry.placements.find((p) => !regions.includes(p.region));
				if (misfit) throw designError('A portal-wide placement in "' + misfit.region + '" does not fit that layout (regions: ' + regions.join(', ') + ')', 400);
				entry.layout = key;
			}
			if (body.homePage !== undefined) {
				const page = entry.pages.find((p) => p.id === body.homePage);
				if (!page) throw designError('Page ' + body.homePage + ' not found', 400);
				entry.portal.homeRoute = page.route;
			}
			return delay(portalSummary(entry), 150);
		} catch (error) {
			return Promise.reject(error);
		}
	}
};
