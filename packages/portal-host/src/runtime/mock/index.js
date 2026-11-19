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
	header: { kind: 'widget', js: S.HEADER_JS, css: S.HEADER_CSS },
	nav: { kind: 'widget', js: S.NAV_JS, css: S.NAV_CSS },
	counter: { kind: 'widget', js: S.COUNTER_JS, css: S.COUNTER_CSS, serverMode: 'on-load' },
	record: { kind: 'widget', js: S.RECORD_JS, css: null },
	text: { kind: 'widget', js: S.TEXT_JS, css: S.TEXT_CSS },
	broken: { kind: 'widget', js: S.BROKEN_JS, css: null }
};

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
		refs.set(key, ref);
	}
	return refs.get(key);
}

let placementSeq = 0;
function placement(id, region, key, options, order) {
	placementSeq += 1;
	return { id, region, order: order !== undefined ? order : placementSeq * 10, componentKey: key, options: options || {} };
}

function materialize(p) {
	return { id: p.id, region: p.region, order: p.order, component: component(p.componentKey), options: clone(p.options) };
}

function groupByRegion(list) {
	const regions = {};
	list.forEach((p) => {
		const m = materialize(p);
		(regions[m.region] = regions[m.region] || []).push(m);
	});
	Object.keys(regions).forEach((name) => regions[name].sort((a, b) => a.order - b.order));
	return regions;
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
		}
	},
	'crm-dark': {
		id: 'theme-crm-dark',
		key: 'crm-dark',
		css: BASE_THEME_CSS,
		tokens: {
			radius: '0.375rem',
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
			'rp-font': 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif',
			'rp-canvas': 'oklch(0.18 0.02 260)',
			'rp-heading-tracking': '-0.01em'
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
		cssText: inline ? theme.css : null,
		css: inline ? [] : [cssUrl(`theme-${theme.key}`, theme.css)]
	};
}

// ---- portals and pages ----------------------------------------------------------------------

const PORTAL_LIST = [
	{ slug: 'sp', name: 'Service Portal' },
	{ slug: 'crm', name: 'CRM' }
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
				{ label: 'Broken widget', page: 'broken' }
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
			regions: groupByRegion(entry.placements),
			pages: entry.pages.map((p) => ({ id: p.id, route: p.route, title: p.title }))
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
