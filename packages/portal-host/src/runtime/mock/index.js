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
	broken: { kind: 'widget', js: S.BROKEN_JS, css: null },
	utils: { kind: 'widget', js: S.UTILS_JS, css: null }
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
			},
			{
				id: 'page-sp-utils',
				route: 'utils',
				title: 'Utilities',
				placements: [placement('pl-sp-utils', 'main', 'utils', {})]
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
