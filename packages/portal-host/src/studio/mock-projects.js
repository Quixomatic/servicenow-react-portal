// Generated from react-portal/scripts/seed/components (the demo widgets' real TSX source)
// for the offline Studio mock. Regenerate rather than edit by hand.
export const SEED_PROJECTS = {
	"centered-layout": {
		"meta": {
			"name": "Centered Layout",
			"kind": "layout",
			"tailwind": false,
			"regions": [
				{
					"name": "header",
					"acceptsContributions": true
				},
				{
					"name": "main",
					"acceptsContributions": false
				},
				{
					"name": "footer",
					"acceptsContributions": true
				}
			]
		},
		"files": {
			"main.tsx": "import { Region } from '@portal/runtime'\n\n/** Header / main / footer with a centered content column. Main still fills and scrolls. */\nexport default function CenteredLayout() {\n    return (\n        <div className=\"rp-ctr\">\n            <header className=\"rp-ctr__header\">\n                <Region name=\"header\" />\n            </header>\n            <main className=\"rp-ctr__main\">\n                <Region name=\"main\" />\n            </main>\n            <footer className=\"rp-ctr__footer\">\n                <Region name=\"footer\" />\n            </footer>\n        </div>\n    )\n}\n",
			"styles.css": "/* Same contract: main fills what header/footer leave and scrolls; only its content column is centered. */\n.rp-ctr { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; width: 100%; min-height: 0; overflow: hidden; background: var(--muted); color: var(--foreground); }\n.rp-ctr__header { border-bottom: 1px solid var(--border); background: var(--background); }\n.rp-ctr__main { min-width: 0; min-height: 0; overflow: auto; }\n.rp-ctr__main > [data-rp-region] { display: grid; gap: 16px; align-content: start; width: min(760px, 100%); margin: 0 auto; padding: 32px 16px; box-sizing: border-box; }\n.rp-ctr__footer { padding: 12px; text-align: center; color: var(--muted-foreground); font-size: 12px; }\n.rp-ctr__header:not(:has([data-rp-widget])), .rp-ctr__footer:not(:has([data-rp-widget])) { display: none; }\n"
		}
	},
	"hello-card": {
		"meta": {
			"name": "Hello Card",
			"kind": "widget",
			"tailwind": true,
			"defaults": {
				"title": "Hello",
				"body": ""
			}
		},
		"files": {
			"main.tsx": "import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card'\nimport { LinkList, type LinkItem } from './parts/LinkList'\n\ntype Props = { options?: { title?: string; body?: string; links?: LinkItem[] } }\n\n/** Page widget: title, body and links from its placement's options. */\nexport default function HelloCard({ options = {} }: Props) {\n    return (\n        <Card>\n            <CardHeader>\n                <CardTitle>{options.title || 'Hello'}</CardTitle>\n                {options.body ? <CardDescription>{options.body}</CardDescription> : null}\n            </CardHeader>\n            {options.links?.length ? (\n                <CardContent>\n                    <LinkList links={options.links} />\n                </CardContent>\n            ) : null}\n        </Card>\n    )\n}\n",
			"parts/LinkList.tsx": "// An extra source file, imported from main.tsx with a relative path.\nimport { Link } from '@portal/runtime'\nimport { Button } from 'components:button'\n\nexport type LinkItem = { label: string; to?: string; recordId?: string; q?: string }\n\nexport function LinkList({ links }: { links: LinkItem[] }) {\n    return (\n        <div className=\"flex flex-wrap gap-2\">\n            {links.map((l) => (\n                <Link key={l.label} to={l.to || ''} recordId={l.recordId} q={l.q}>\n                    <Button variant=\"outline\" size=\"sm\">\n                        {l.label}\n                    </Button>\n                </Link>\n            ))}\n        </div>\n    )\n}\n"
		}
	},
	"nav-sidebar": {
		"meta": {
			"name": "Navigation Sidebar",
			"kind": "widget",
			"tailwind": true,
			"defaults": {
				"title": "Pages"
			}
		},
		"files": {
			"main.tsx": "import { usePortal, Link } from '@portal/runtime'\n\ntype Props = { options?: { title?: string } }\n\n/** Portal-level sidebar: one link per page without route parameters; highlights the current page. */\nexport default function NavSidebar({ options }: Props) {\n    const { pages = [], page } = usePortal()\n    const links = pages.filter((p) => !p.route.includes(':') && !p.route.includes('*'))\n\n    return (\n        <div className=\"grid gap-1\">\n            <div className=\"mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase\">{options?.title || 'Pages'}</div>\n            {links.map((p) => {\n                const active = page?.route === p.route\n                return (\n                    <Link\n                        key={p.id}\n                        to={p.route}\n                        className={\n                            'block rounded-md px-2.5 py-1.5 text-sm no-underline ' +\n                            (active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted')\n                        }\n                    >\n                        {p.title || '/' + p.route}\n                    </Link>\n                )\n            })}\n        </div>\n    )\n}\n"
		}
	},
	"record-detail": {
		"meta": {
			"name": "Record Detail",
			"kind": "widget",
			"tailwind": true,
			"defaults": {
				"label": "Record",
				"back": ""
			}
		},
		"files": {
			"main.tsx": "import { usePortal, RegionPortal, Link } from '@portal/runtime'\nimport { Card, CardHeader, CardTitle, CardContent } from 'components:card'\nimport { Badge } from 'components:badge'\n\ntype Props = { options?: { label?: string; back?: string } }\n\n/** For routes like orders/:id — shows the params and contributes a breadcrumb to the header. */\nexport default function RecordDetail({ options = {} }: Props) {\n    const { page } = usePortal()\n    const params = page?.params || {}\n    const id = params.id || params['*'] || '?'\n    const label = options.label || 'Record'\n\n    return (\n        <Card>\n            <RegionPortal region=\"header\">\n                <Badge className=\"mr-6\">\n                    Viewing {label} {id}\n                </Badge>\n            </RegionPortal>\n            <CardHeader>\n                <CardTitle>\n                    {label} {id}\n                </CardTitle>\n            </CardHeader>\n            <CardContent className=\"space-y-3 text-sm\">\n                <p className=\"text-muted-foreground\">Route pattern: {page?.route}</p>\n                <pre className=\"rounded-md bg-muted p-2 text-xs\">{JSON.stringify(params, null, 2)}</pre>\n                <Link to={options.back || ''} className=\"text-primary no-underline hover:underline\">\n                    ← Back\n                </Link>\n            </CardContent>\n        </Card>\n    )\n}\n"
		}
	},
	"server-clock": {
		"meta": {
			"name": "Server Clock",
			"kind": "widget",
			"tailwind": true,
			"serverMode": "on-load"
		},
		"files": {
			"main.tsx": "import { useState } from 'react'\nimport { useComponent } from '@portal/runtime'\nimport { Card, CardHeader, CardTitle, CardContent } from 'components:card'\nimport { Button } from 'components:button'\nimport { Badge } from 'components:badge'\n\ntype ClockData = { serverTime?: string; user?: string; action?: string; echo?: string }\n\n/** On-load widget: initial data comes from its server script; buttons call it again. */\nexport default function ServerClock() {\n    const { data, pending, error, server } = useComponent()\n    const d = (data || {}) as ClockData\n    const [reply, setReply] = useState<unknown>(null)\n\n    return (\n        <Card>\n            <CardHeader className=\"flex flex-row items-center justify-between\">\n                <CardTitle>Server script</CardTitle>\n                <Badge variant=\"secondary\">{d.action || (pending ? 'loading' : '—')}</Badge>\n            </CardHeader>\n            <CardContent className=\"space-y-4\">\n                {error ? <p className=\"text-sm text-destructive\">{String((error as Error).message || error)}</p> : null}\n                <dl className=\"grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm\">\n                    <dt className=\"text-muted-foreground\">Server time</dt>\n                    <dd className=\"font-mono\">{d.serverTime || '—'}</dd>\n                    <dt className=\"text-muted-foreground\">Hello</dt>\n                    <dd className=\"font-mono\">{d.user || '—'}</dd>\n                </dl>\n                <div className=\"flex gap-2\">\n                    <Button size=\"sm\" onClick={() => server.get({ message: 'ping from the browser' }).then(setReply, (e: Error) => setReply({ error: e.message }))}>\n                        server.get()\n                    </Button>\n                    <Button size=\"sm\" variant=\"outline\" onClick={() => server.refresh()}>\n                        server.refresh()\n                    </Button>\n                </div>\n                {reply ? <pre className=\"overflow-auto rounded-md bg-muted p-2 text-xs\">{JSON.stringify(reply, null, 2)}</pre> : null}\n            </CardContent>\n        </Card>\n    )\n}\n",
			"server.js": "// Runs on the server with input, data, options, component and context (Service Portal style).\ndata.serverTime = new GlideDateTime().getDisplayValue()\ndata.user = gs.getUserDisplayName()\ndata.action = context.action\ndata.portal = context.portal\nif (input && input.message) data.echo = 'Server got: ' + input.message\n"
		}
	},
	"site-footer": {
		"meta": {
			"name": "Site Footer",
			"kind": "widget",
			"tailwind": true,
			"entry": "main.jsx",
			"defaults": {
				"text": ""
			}
		},
		"files": {
			"main.tsx": "// Plain JSX on purpose: components can be written in JS/JSX as well as TS/TSX.\nimport { usePortal } from '@portal/runtime'\n\nexport default function SiteFooter({ options }) {\n    const { release, theme } = usePortal()\n    const parts = [options?.text || 'React Portal', release ? `release rev ${release.version}` : 'unprocessed', theme ? theme.name || theme.key : 'no theme']\n    return <div className=\"text-xs text-muted-foreground\">{parts.join(' · ')}</div>\n}\n"
		}
	},
	"site-header": {
		"meta": {
			"name": "Site Header",
			"kind": "widget",
			"tailwind": true,
			"defaults": {
				"brand": ""
			}
		},
		"files": {
			"main.tsx": "import { useState } from 'react'\nimport { usePortal, Link } from '@portal/runtime'\nimport { Button } from 'components:button'\n\ntype NavItem = { label: string; to: string }\ntype Props = { options?: { brand?: string } }\n\n/** Portal-level header. The click counter proves it stays mounted across page navigation. */\nexport default function SiteHeader({ options }: Props) {\n    const { portal } = usePortal()\n    const [clicks, setClicks] = useState(0)\n    const nav: NavItem[] = Array.isArray(portal?.navigation) ? portal.navigation : []\n\n    return (\n        <div className=\"flex items-center gap-6 bg-card px-6 py-3 text-card-foreground\">\n            <div className=\"text-lg font-bold text-primary\">{options?.brand || portal?.name || 'Portal'}</div>\n            <nav className=\"flex flex-1 items-center gap-4\">\n                {nav.map((item) => (\n                    <Link key={item.label} to={item.to} className=\"text-sm text-foreground no-underline hover:text-primary\">\n                        {item.label}\n                    </Link>\n                ))}\n            </nav>\n            <Button variant=\"outline\" size=\"sm\" onClick={() => setClicks(clicks + 1)} title=\"Local state survives page navigation\">\n                Header clicks: {clicks}\n            </Button>\n        </div>\n    )\n}\n"
		}
	},
	"standard-layout": {
		"meta": {
			"name": "Standard Layout",
			"kind": "layout",
			"tailwind": false,
			"regions": [
				{
					"name": "header",
					"acceptsContributions": true
				},
				{
					"name": "sidebar",
					"acceptsContributions": true
				},
				{
					"name": "main",
					"acceptsContributions": false
				},
				{
					"name": "footer",
					"acceptsContributions": true
				}
			]
		},
		"files": {
			"main.tsx": "import { Region } from '@portal/runtime'\n\n/** Header / sidebar / main / footer. Main takes all remaining space and is the only scroller. */\nexport default function StandardLayout() {\n    return (\n        <div className=\"rp-std\">\n            <header className=\"rp-std__header\">\n                <Region name=\"header\" />\n            </header>\n            <div className=\"rp-std__body\">\n                <aside className=\"rp-std__sidebar\">\n                    <Region name=\"sidebar\" />\n                </aside>\n                <main className=\"rp-std__main\">\n                    <Region name=\"main\" />\n                </main>\n            </div>\n            <footer className=\"rp-std__footer\">\n                <Region name=\"footer\" />\n            </footer>\n        </div>\n    )\n}\n",
			"styles.css": "/* Fills the frame the host gives it; main takes all remaining space and is the only scroller. */\n.rp-std { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; height: 100%; width: 100%; min-height: 0; overflow: hidden; background: var(--background); color: var(--foreground); }\n.rp-std__header { border-bottom: 1px solid var(--border); }\n.rp-std__body { display: grid; grid-template-columns: auto minmax(0, 1fr); min-height: 0; }\n.rp-std__sidebar { width: 220px; overflow-y: auto; border-right: 1px solid var(--border); padding: 16px 12px; box-sizing: border-box; }\n.rp-std__main { min-width: 0; min-height: 0; overflow: auto; }\n.rp-std__main > [data-rp-region] { display: grid; gap: 16px; align-content: start; padding: 24px; min-height: 100%; box-sizing: border-box; }\n.rp-std__footer { border-top: 1px solid var(--border); padding: 12px 24px; color: var(--muted-foreground); font-size: 12px; }\n.rp-std__header:not(:has([data-rp-widget])), .rp-std__sidebar:not(:has([data-rp-widget])), .rp-std__footer:not(:has([data-rp-widget])) { display: none; }\n"
		}
	}
};
