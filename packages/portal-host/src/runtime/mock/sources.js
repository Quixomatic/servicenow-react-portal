// Mock compiled widgets: plain ES modules, the shape the Studio compiler will emit (spec §8.4).
// They contain no React and no UI kit: everything comes from the host registry,
// globalThis.__REACT_PORTAL__.modules. The default export is the component.
//
// Tailwind classes used here are picked up by the host's Tailwind build (@source "../"), which
// stands in for the saved-source Tailwind step of M2. Plain CSS is scoped by the build id:
// the host wraps each instance in [data-rp-widget="<build id>"].

const PRELUDE = `
const M = globalThis.__REACT_PORTAL__.modules;
const React = M['react'];
const { createElement: h, Fragment, useState, useRef, useEffect } = React;
const { Region, RegionPortal, Link, usePortal, usePortalLocation, useComponent, useNavigate } = M['@portal/runtime'];
`;

export const LAYOUT_CLASSIC_JS = PRELUDE + `
export default function ClassicLayout({ regions }) {
	return h('div', { className: 'rp-classic' },
		h(Region, { name: 'header', className: 'rp-classic__header' }),
		h(Region, { name: 'sidebar', className: 'rp-classic__sidebar' }),
		h(Region, { name: 'main', className: 'rp-classic__main flex flex-col gap-4' }),
		h(Region, { name: 'footer', className: 'rp-classic__footer' })
	);
}
`;

export const LAYOUT_CLASSIC_CSS = `
[data-rp-widget="b-layout-classic"] .rp-classic {
	display: grid;
	grid-template-columns: 230px minmax(0, 1fr);
	grid-template-areas: "header header" "sidebar main" "footer footer";
	gap: 1rem;
	padding: 1rem;
}
[data-rp-widget="b-layout-classic"] .rp-classic__header { grid-area: header; }
[data-rp-widget="b-layout-classic"] .rp-classic__sidebar { grid-area: sidebar; }
[data-rp-widget="b-layout-classic"] .rp-classic__main { grid-area: main; min-width: 0; }
[data-rp-widget="b-layout-classic"] .rp-classic__footer { grid-area: footer; }
@media (max-width: 760px) {
	[data-rp-widget="b-layout-classic"] .rp-classic {
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: "header" "main" "sidebar" "footer";
	}
}
`;

export const LAYOUT_SPLIT_JS = PRELUDE + `
export default function SplitLayout({ regions }) {
	return h('div', { className: 'rp-split' },
		h('div', { className: 'rp-split__band' }),
		h(Region, { name: 'header', className: 'rp-split__header' }),
		h(Region, { name: 'main', className: 'rp-split__main flex flex-col gap-4' }),
		h(Region, { name: 'sidebar', className: 'rp-split__sidebar' }),
		h(Region, { name: 'footer', className: 'rp-split__footer' })
	);
}
`;

export const LAYOUT_SPLIT_CSS = `
[data-rp-widget="b-layout-split"] .rp-split {
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr) 260px;
	grid-template-areas: "header header" "main sidebar" "footer footer";
	gap: 1.25rem;
	padding: 1.25rem;
}
[data-rp-widget="b-layout-split"] .rp-split__band {
	position: absolute; inset: 0 0 auto 0; height: 6px;
	background: linear-gradient(90deg, var(--primary), transparent);
}
[data-rp-widget="b-layout-split"] .rp-split__header { grid-area: header; }
[data-rp-widget="b-layout-split"] .rp-split__main { grid-area: main; min-width: 0; }
[data-rp-widget="b-layout-split"] .rp-split__sidebar { grid-area: sidebar; }
[data-rp-widget="b-layout-split"] .rp-split__footer { grid-area: footer; }
@media (max-width: 760px) {
	[data-rp-widget="b-layout-split"] .rp-split {
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: "header" "main" "sidebar" "footer";
	}
}
`;

export const HEADER_JS = PRELUDE + `
const { Button } = M['components:button'];
const {
	DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup,
	DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator
} = M['components:dropdown-menu'];
const { cn } = M['utilities:cn'];

export default function PortalHeader({ options }) {
	const { portal } = usePortal();
	const location = usePortalLocation();
	const navigate = useNavigate();
	const { theme, setTheme, resolvedTheme, themes } = M['@portal/runtime'].useTheme();
	const current = location.page || portal.homeRoute;
	const nav = portal.navigation || [];
	const portals = options.portals || [];
	return h('header', { className: 'flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-card-foreground shadow-sm' },
		h('div', { className: 'flex items-center gap-2' },
			h('span', { className: 'rp-header__logo' }, (portal.name || '?').slice(0, 1)),
			h('div', null,
				h('div', { className: 'font-semibold leading-tight' }, portal.name),
				h('div', { className: 'text-xs text-muted-foreground' }, options.tagline || '')
			)
		),
		h('nav', { className: 'flex flex-1 flex-wrap gap-1' },
			nav.map((item) => {
				const target = item.page || portal.homeRoute;
				return h(Link, {
					key: item.label,
					to: item.page,
					recordId: item.recordId,
					q: item.q,
					render: h(Button, { variant: target === current ? 'secondary' : 'ghost', size: 'sm', className: cn(target === current && 'font-semibold') })
				}, item.label);
			})
		),
		h(DropdownMenu, null,
			h(DropdownMenuTrigger, { render: h(Button, { variant: 'outline', size: 'sm' }) }, 'Portals'),
			h(DropdownMenuContent, { align: 'end', className: 'min-w-48' },
				h(DropdownMenuGroup, null,
					h(DropdownMenuLabel, null, 'Switch portal'),
					portals.map((p) => h(DropdownMenuItem, {
						key: p.slug,
						disabled: p.slug === portal.slug,
						onClick: () => navigate('', { portalSlug: p.slug })
					}, p.name + (p.slug === portal.slug ? ' (current)' : '')))
				),
				h(DropdownMenuSeparator, null),
				h(DropdownMenuGroup, null,
					h(DropdownMenuItem, { onClick: () => navigate('') }, 'Home of this portal')
				),
				h(DropdownMenuSeparator, null),
				h(DropdownMenuGroup, null,
					h(DropdownMenuLabel, null, 'Theme · ' + resolvedTheme),
					themes.map((t) => h(DropdownMenuItem, { key: t, onClick: () => setTheme(t), 'data-theme-option': t }, (t === theme ? '✓ ' : '') + t[0].toUpperCase() + t.slice(1)))
				)
			)
		)
	);
}
`;

export const HEADER_CSS = `
[data-rp-widget="b-header"] .rp-header__logo {
	display: inline-grid; place-items: center;
	width: 2rem; height: 2rem; border-radius: var(--radius);
	background: var(--primary); color: var(--primary-foreground);
	font-weight: 700;
}
`;

export const NAV_JS = PRELUDE + `
const { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } = M['components:card'];
const { Badge } = M['components:badge'];
const { Button } = M['components:button'];
const { Separator } = M['components:separator'];

// Module scope of the widget: lives as long as the loaded module (cached for the page load).
let mounts = 0;

export default function PortalNav({ options }) {
	const { portal, pages } = usePortal();
	const location = usePortalLocation();
	const [mountedAt] = useState(() => new Date().toLocaleTimeString());
	const [mountNo] = useState(() => { mounts += 1; return mounts; });
	const [clicks, setClicks] = useState(0);
	const renders = useRef(0);
	renders.current += 1;
	const current = location.page || portal.homeRoute;
	const links = (pages || []).filter((p) => p.route.indexOf(':') === -1);
	return h(Card, { size: 'sm' },
		h(CardHeader, null,
			h(CardTitle, null, options.title || 'Pages'),
			h(CardDescription, null, 'Portal-level widget (sidebar)')
		),
		h(CardContent, { className: 'flex flex-col gap-1' },
			links.map((p) => h(Link, {
				key: p.id,
				to: p.route === portal.homeRoute ? '' : p.route,
				className: 'rp-nav__link' + (p.route === current ? ' is-active' : '')
			}, p.title))
		),
		h(Separator, null),
		h(CardFooter, { className: 'flex flex-col items-start gap-2 text-xs text-muted-foreground' },
			h('div', { 'data-rp-probe': 'nav-mount' }, 'mounted ' + mountedAt + ' · mount #' + mountNo + ' · renders ' + renders.current),
			h('div', { className: 'flex items-center gap-2' },
				h(Badge, { variant: 'outline', 'data-rp-probe': 'nav-clicks' }, 'local clicks ' + clicks),
				h(Button, { size: 'xs', variant: 'secondary', onClick: () => setClicks((c) => c + 1) }, '+1')
			),
			h('div', null, 'If this widget stays mounted across page navigation, the mount time and clicks stay put.')
		)
	);
}
`;

export const NAV_CSS = `
[data-rp-widget="b-nav"] .rp-nav__link {
	display: block; padding: 0.35rem 0.6rem; border-radius: calc(var(--radius) - 2px);
	color: inherit; text-decoration: none; font-size: 0.875rem;
}
[data-rp-widget="b-nav"] .rp-nav__link:hover { background: var(--accent); color: var(--accent-foreground); }
[data-rp-widget="b-nav"] .rp-nav__link.is-active { background: var(--primary); color: var(--primary-foreground); }
`;

export const COUNTER_JS = PRELUDE + `
const { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } = M['components:card'];
const { Badge } = M['components:badge'];
const { Button } = M['components:button'];

export default function Counter({ options }) {
	const { data, pending, error, server } = useComponent();
	const [count, setCount] = useState(options.start || 0);
	const [reply, setReply] = useState(null);
	const [busy, setBusy] = useState(false);
	const call = () => {
		setBusy(true);
		server.get({ count: count }).then((r) => setReply(r), (e) => setReply({ error: String(e && e.message || e) })).finally(() => setBusy(false));
	};
	return h(Card, null,
		h(CardHeader, null,
			h(CardTitle, null, options.label || 'Counter'),
			h(CardDescription, null, 'Page widget · shadcn Card/Button/Badge from the registry'),
			h(CardAction, null, h(Badge, { variant: 'secondary' }, 'on-load'))
		),
		h(CardContent, { className: 'flex flex-col gap-3' },
			h('div', { className: 'flex items-center gap-3' },
				h('span', { className: 'rp-counter__value' }, String(count)),
				h(Button, { onClick: () => setCount((c) => c + 1) }, 'Increment'),
				h(Button, { variant: 'outline', onClick: call, disabled: busy }, busy ? 'Calling…' : 'server.get()')
			),
			h('div', { className: 'text-xs text-muted-foreground' },
				pending ? 'initializing…' : error ? 'init error: ' + error.message : 'init data: ' + JSON.stringify(data)
			),
			reply ? h('pre', { className: 'rounded-md bg-muted p-2 text-xs whitespace-pre-wrap' }, JSON.stringify(reply, null, 2)) : null
		)
	);
}
`;

export const COUNTER_CSS = `
[data-rp-widget="b-counter"] .rp-counter__value {
	min-width: 3ch; font-size: 2rem; font-weight: 700; font-variant-numeric: tabular-nums;
	color: var(--primary);
}
`;

export const RECORD_JS = PRELUDE + `
const { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } = M['components:card'];
const { Badge } = M['components:badge'];
const { Button } = M['components:button'];
const { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription } = M['components:popover'];

export default function RecordDetail({ options }) {
	const { page } = usePortal();
	const location = usePortalLocation();
	const id = (page && page.params && page.params.id) || location.recordId || '';
	const entity = options.entity || 'Record';
	const next = String((parseInt(id, 10) || 0) + 1);
	const base = options.listPage || '';
	return h(Fragment, null,
		// Contributes into the layout's header region while this page is shown.
		h(RegionPortal, { region: 'header' },
			h('div', { className: 'flex items-center gap-2 px-1 pt-2 text-sm' },
				h(Badge, null, 'Viewing ' + entity + ' ' + (id || '?')),
				h('span', { className: 'text-muted-foreground' }, 'contributed by the page via RegionPortal')
			)
		),
		h(Card, null,
			h(CardHeader, null,
				h(CardTitle, null, entity + ' ' + (id || '(no id)')),
				h(CardDescription, null, 'Route ' + (page ? page.route : '?') + ' · recordId=' + (location.recordId || '(none)'))
			),
			h(CardContent, { className: 'flex flex-col gap-2 text-sm' },
				h('div', null, 'Query: ', h('code', null, location.q || '(none)')),
				h('div', null, 'view = ', h('b', null, location.query.view || '(unset)'), ' · tab = ', h('b', null, location.query.tab || '(unset)'))
			),
			h(CardFooter, { className: 'flex flex-wrap gap-2' },
				h(Link, { to: base, render: h(Button, { variant: 'ghost', size: 'sm' }) }, 'Back to list'),
				h(Link, { to: base + '/' + next, recordId: next, render: h(Button, { variant: 'outline', size: 'sm' }) }, entity + ' ' + next),
				h(Link, { to: base + '/' + (id || '1'), recordId: id, q: { view: 'summary', tab: '2' }, render: h(Button, { variant: 'outline', size: 'sm' }) }, 'Summary tab 2'),
				h(Popover, null,
					h(PopoverTrigger, { render: h(Button, { variant: 'secondary', size: 'sm' }) }, 'Details'),
					h(PopoverContent, { align: 'start', className: 'w-80' },
						h(PopoverHeader, null,
							h(PopoverTitle, null, 'Normalized location'),
							h(PopoverDescription, null, 'Rendered in the overlay layer via usePortalContainer()')
						),
						h('pre', { className: 'mt-2 max-h-60 overflow-auto rounded-md bg-muted p-2 text-xs' },
							JSON.stringify({ portalSlug: location.portalSlug, page: location.page, recordId: location.recordId, q: location.q, params: page && page.params }, null, 2))
					)
				)
			)
		)
	);
}
`;

export const TEXT_JS = PRELUDE + `
const { Button } = M['components:button'];

export default function TextBlock({ options }) {
	const links = options.links || [];
	return h('section', { className: options.variant === 'footer' ? 'rp-text rp-text--footer' : 'rp-text rounded-xl border bg-card p-4 text-card-foreground' },
		options.title ? h('h2', { className: 'text-lg font-semibold' }, options.title) : null,
		options.text ? h('p', { className: 'text-sm text-muted-foreground' }, options.text) : null,
		links.length ? h('div', { className: 'mt-3 flex flex-wrap gap-2' },
			links.map((l) => h(Link, {
				key: l.label,
				to: l.page,
				recordId: l.recordId,
				q: l.q,
				portalSlug: l.portalSlug,
				render: h(Button, { variant: l.primary ? 'default' : 'outline', size: 'sm' })
			}, l.label))
		) : null
	);
}
`;

export const TEXT_CSS = `
[data-rp-widget="b-text"] .rp-text--footer {
	padding: 0.75rem 0.25rem; font-size: 0.8rem; color: var(--muted-foreground);
	border-top: 1px solid var(--border);
}
[data-rp-widget="b-text"] .rp-text--footer p { font-size: 0.8rem; }
`;

export const BROKEN_JS = PRELUDE + `
export default function Broken({ options }) {
	throw new Error(options.message || 'This widget throws on purpose');
}
`;

export const UTILS_JS = PRELUDE + `
const { Card, CardHeader, CardTitle, CardDescription, CardContent } = M['components:card'];
const { Button } = M['components:button'];
const { Badge } = M['components:badge'];
const RT = M['@portal/runtime'];

// Exercises the Service Portal-style hooks (mock page "utils").
export default function UtilsDemo() {
	const user = RT.useUser();
	const banner = RT.useProperty('x_312987_portal.public.banner');
	const hidden = RT.useProperty('glide.product.name');
	const props = RT.useProperties(['css.base.color', 'x_312987_portal.public.support_email']);
	const welcome = RT.useMessage('Welcome back, {0}', 'Welcome!');
	const msgs = RT.useMessages(['Save', 'Cancel', 'No records']);
	const utils = RT.usePortalUtils();
	const rows = RT.useTableQuery('incident', { query: 'priority=1', fields: ['number', 'short_description'], orderBy: '-number', limit: 5 });
	const rec = RT.useRecord('incident', 'inc-2', { fields: 'number,state' });
	const [fetched, setFetched] = useState(null);
	return h(Card, { 'data-utils-demo': '' },
		h(CardHeader, null,
			h(CardTitle, { 'data-u': 'welcome' }, utils.format(welcome, [user.firstName])),
			h(CardDescription, null, user.name + ' · ' + user.title)
		),
		h(CardContent, { className: 'flex flex-col gap-2 text-sm' },
			h('div', { 'data-u': 'roles' }, 'itil=' + user.hasRole('itil') + ' admin=' + user.hasRole('admin') + ' any=' + user.hasAnyRole(['nope', 'itil'])),
			h('div', { 'data-u': 'props' }, 'banner=' + banner.value + ' hidden=' + hidden.value + ' color=' + props.values['css.base.color'] + ' email=' + props.values['x_312987_portal.public.support_email']),
			h('div', { 'data-u': 'msgs' }, ['Save', 'Cancel', 'No records'].map((k) => msgs.messages[k]).join(' | ')),
			h('div', { 'data-u': 'rows' }, rows.isLoading ? 'loading…' : (rows.data || []).map((r) => r.number).join(',')),
			h('div', { 'data-u': 'record' }, rec.isLoading ? 'loading…' : rec.data ? rec.data.number + ' ' + rec.data.state : 'none'),
			h('div', { 'data-u': 'format' }, utils.format('{a}-{0}', { a: 'x', 0: 'y' })),
			h('div', { className: 'flex flex-wrap gap-2' },
				h(Button, { size: 'sm', 'data-u': 'info', onClick: () => utils.addInfoMessage('Info toast') }, 'Info'),
				h(Button, { size: 'sm', variant: 'destructive', 'data-u': 'error', onClick: () => utils.addErrorMessage('Error toast') }, 'Error'),
				h(Button, { size: 'sm', variant: 'outline', 'data-u': 'trivial', onClick: () => utils.addTrivialMessage('Trivial toast') }, 'Trivial'),
				h(Button, { size: 'sm', variant: 'outline', 'data-u': 'getmsg', onClick: () => utils.getMessage('Save').then((m) => setFetched('msg:' + m)) }, 'getMessage'),
				h(Button, { size: 'sm', variant: 'outline', 'data-u': 'refresh', onClick: () => utils.refresh().then(() => setFetched('refreshed')) }, 'refresh()'),
				h(Button, { size: 'sm', variant: 'outline', 'data-u': 'headers', onClick: () => setFetched(Object.keys(utils.getHeaders()).join(',')) }, 'headers')
			),
			fetched ? h(Badge, { variant: 'secondary', 'data-u': 'fetched' }, fetched) : null
		)
	);
}
`;
