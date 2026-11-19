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
		if (p.active === false) return; // inactive placements don't render (the designer still lists them)
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

// ---- page designer (Studio "Pages"): mock of /rp_studio design endpoints -------------------
// Mutates the same PORTALS data the mock bootstrap/resolve read, so the designer's canvas (the
// real runtime) shows every change.

const DESIGN_META = {
	'layout-classic': { name: 'Classic Layout' },
	'layout-split': { name: 'Split Layout' },
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
	utils: { name: 'Utilities Demo', description: 'Service Portal-style hooks', schema: null, defaults: {} }
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
	return { id: 'cmp-' + key, uniqueId: 'rp.' + key, name: (DESIGN_META[key] || {}).name || key, regions: clone(def.regions || []) };
}

function designPlacement(raw, scope) {
	const meta = DESIGN_META[raw.componentKey] || {};
	return {
		id: raw.id,
		region: raw.region,
		order: raw.order,
		active: raw.active !== false,
		component: { id: 'cmp-' + raw.componentKey, uniqueId: 'rp.' + raw.componentKey, name: meta.name || raw.componentKey },
		options: clone(raw.options || {}),
		effectiveOptions: Object.assign({}, clone(meta.defaults || {}), clone(raw.options || {})),
		scope
	};
}

function groupDesign(list, scope) {
	const out = {};
	list.slice()
		.sort((a, b) => a.order - b.order)
		.forEach((p) => (out[p.region] = out[p.region] || []).push(designPlacement(p, scope)));
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
function renumber(list, region) {
	list.filter((p) => p.region === region)
		.sort((a, b) => a.order - b.order)
		.forEach((p, i) => (p.order = (i + 1) * 10));
}

function insertAt(list, raw, index) {
	const same = list.filter((p) => p.region === raw.region && p !== raw).sort((a, b) => a.order - b.order);
	const at = index === undefined || index === null || index < 0 || index > same.length ? same.length : index;
	same.splice(at, 0, raw);
	same.forEach((p, i) => (p.order = (i + 1) * 10));
	if (!list.includes(raw)) list.push(raw);
}

function assertRegion(entry, page, region) {
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
			if (!DEFINITIONS[key] || DEFINITIONS[key].kind !== 'widget') throw designError('Component ' + body.component + ' is not a placeable widget', 400);
			// Checked against the effective layout (portal-wide placements: the portal default layout).
			assertRegion(entry, found ? found.page : null, body.region);
			designSeq += 1;
			const raw = { id: 'pl-new-' + Date.now().toString(36) + '-' + designSeq, region: body.region, order: 0, componentKey: key, options: clone(body.options || {}), active: true };
			insertAt(found ? found.page.placements : entry.placements, raw, body.index);
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
			const region = body.region || raw.region;
			if (body.region !== undefined || body.page !== undefined) assertRegion(rec.entry, targetPage, region);
			if (body.options !== undefined) raw.options = clone(body.options || {});
			if (body.active !== undefined) raw.active = !!body.active;
			if (body.region !== undefined || body.page !== undefined || body.index !== undefined) {
				const oldRegion = raw.region;
				rec.list.splice(rec.index, 1);
				renumber(rec.list, oldRegion);
				raw.region = region;
				insertAt(targetList, raw, body.index);
			}
			return delay(designPlacement(raw, targetPage ? 'page' : 'portal'), 150);
		} catch (error) {
			return Promise.reject(error);
		}
	},
	deletePlacement(id) {
		const rec = findPlacementRecord(id);
		if (!rec) return Promise.reject(designError('Placement ' + id + ' not found', 404));
		const raw = rec.list[rec.index];
		const placement = Object.assign(designPlacement(raw, rec.page ? 'page' : 'portal'), { page: rec.page ? rec.page.id : null, portal: rec.entry.portal.id });
		rec.list.splice(rec.index, 1);
		renumber(rec.list, raw.region);
		return delay({ deleted: true, placement }, 150);
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
