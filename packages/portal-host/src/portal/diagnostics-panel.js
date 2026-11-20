import React, { useContext, useEffect, useState } from 'react';
import { Button } from '#/components/ui/button';
import { Badge } from '#/components/ui/badge';
import { Link, useNavigate, getNavigationSettings, setPreEncode } from '#/runtime/navigation';
import { hostInfo, incrementHostClicks, mark, realmInfo, since, snapshot } from '#/runtime/diagnostics';
import { isMock, setMockPreference } from '#/runtime/api';
import { listStyles } from '#/runtime/styles';
import { loaderStats } from '#/runtime/loader';
import { runCspProbe } from '#/runtime/csp-probe';
import { LocationStoreContext } from '#/runtime/contexts';

/** Re-render on an interval while open. Polling keeps diagnostics out of the render path. */
function usePoll(active, ms) {
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!active) return undefined;
        const id = setInterval(() => setTick((t) => t + 1), ms);
        return () => clearInterval(id);
    }, [active, ms]);
}

function Section({ title, children }) {
    return (
        <section className="flex flex-col gap-1">
            <h4 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{title}</h4>
            {children}
        </section>
    );
}

function Json({ value }) {
    return (
        <pre className="bg-muted max-h-48 overflow-auto rounded p-2 text-[11px] leading-4 whitespace-pre-wrap">
            {JSON.stringify(value, null, 2)}
        </pre>
    );
}

function Lines({ children }) {
    return (
        <div className="bg-muted max-h-44 overflow-auto rounded p-2 font-mono text-[11px] leading-4">{children}</div>
    );
}

const COUNTER_ORDER = [
    'PortalApp',
    'PortalBoot',
    'PortalRouterHost',
    'RouterRoot',
    'LayoutSwitch',
    'layout',
    'layout:component',
    'PageRoute',
];

function counterRank(name) {
    const i = COUNTER_ORDER.indexOf(name);
    if (i !== -1) return i;
    if (name.indexOf('region:') === 0) return 20;
    if (name.indexOf('pageRegion:') === 0) return 21;
    if (name.indexOf('slot:') === 0) return 30;
    if (name.indexOf('widget:') === 0) return 31;
    return 40;
}

/**
 * Pinned pill (bottom-right) that opens a drawer upward. Everything here is also available as
 * window.__RP_DIAG__ (snapshot / mark / since / reset) for CDP.
 */
export default function DiagnosticsPanel({ hostId, target }) {
    const [open, setOpen] = useState(false);
    usePoll(open, 700);
    const mock = isMock();
    return (
        <div
            className="pointer-events-none fixed right-3 bottom-3 z-[2147483000] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 text-xs"
            data-rp-diagnostics=""
        >
            {open ? <Drawer hostId={hostId} target={target} mock={mock} /> : null}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="bg-card text-card-foreground hover:bg-muted pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold shadow-lg"
                aria-expanded={open}
                title={open ? 'Close diagnostics' : 'Open diagnostics'}
                data-rp-diagnostics-toggle=""
            >
                <span className={'inline-block size-2 rounded-full ' + (mock ? 'bg-amber-500' : 'bg-emerald-500')} />
                Diagnostics · host #{hostId}
                <span aria-hidden="true">{open ? '▾' : '▴'}</span>
            </button>
        </div>
    );
}

function Drawer({ hostId, target, mock }) {
    const navigate = useNavigate();
    const locationStore = useContext(LocationStoreContext);
    const location = locationStore ? locationStore.get() : {};
    const realm = realmInfo();
    const host = hostInfo(hostId);
    const snap = snapshot();
    const [preEncode, setPreEncodeState] = useState(getNavigationSettings().preEncode);
    const [probing, setProbing] = useState(false);
    const [markLabel, setMarkLabel] = useState('');
    const [diff, setDiff] = useState(null);
    const slug = location.portalSlug;
    const other = slug === 'crm' ? 'sp' : 'crm';
    const list = slug === 'crm' ? 'accounts' : 'orders';
    const rid = slug === 'crm' ? '7' : '42';
    const stats = loaderStats();
    const styles = listStyles(target);
    const counters = Object.keys(snap.counters).sort((a, b) => counterRank(a) - counterRank(b) || a.localeCompare(b));

    const tests = [
        { label: 'Home', target: { page: '' } },
        { label: list, target: { page: list } },
        { label: `${list}/${rid} (slash)`, target: { page: `${list}/${rid}` } },
        { label: `recordId ${rid}`, target: { page: `${list}/${rid}`, recordId: rid } },
        { label: 'q view=summary&tab=2', target: { page: list, q: 'view=summary&tab=2' } },
        { label: 'all three', target: { page: `${list}/${rid}`, recordId: rid, q: { view: 'summary', tab: '2' } } },
        { label: `switch to ${other}`, target: { portalSlug: other } },
    ];

    return (
        <div
            className="bg-card text-card-foreground pointer-events-auto max-h-[70vh] w-[min(820px,calc(100vw-1.5rem))] overflow-auto rounded-lg border shadow-xl"
            data-rp-diagnostics-drawer=""
        >
            <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                <span className="font-semibold">Diagnostics</span>
                <Badge variant="outline" data-rp-probe="instance">
                    host #{hostId}
                </Badge>
                <Badge variant="outline" data-rp-probe="mount">
                    mount {host.mountNumber} of {realm.mounts}
                </Badge>
                <Badge variant="outline" data-rp-probe="clicks">
                    clicks {host.clicks}
                </Badge>
                <Badge variant={mock ? 'secondary' : 'default'}>{mock ? 'mock data' : 'live API'}</Badge>
                <span className="text-muted-foreground truncate">
                    {slug || '(no portal)'} / {location.page || '(home)'}
                    {location.recordId ? ` · id ${location.recordId}` : ''}
                    {location.q ? ` · q ${location.q}` : ''}
                </span>
                <span className="text-muted-foreground ml-auto">window.__RP_DIAG__()</span>
            </div>
            <div className="grid gap-4 p-3 md:grid-cols-2">
                <Section title="Host">
                    <div>
                        instance <b>#{hostId}</b> · mount <b>{host.mountNumber}</b> of <b>{realm.mounts}</b> · page load{' '}
                        {realm.loadedAt}
                    </div>
                    <div className="flex items-center gap-2">
                        local state clicks=<b data-rp-probe="local-clicks">{host.clicks}</b>
                        <Button size="xs" variant="outline" onClick={() => incrementHostClicks(hostId)}>
                            +1
                        </Button>
                        <span className="text-muted-foreground">(kept while this host instance lives)</span>
                    </div>
                    <div className="break-all">
                        URL <code>{typeof window !== 'undefined' ? window.location.href : ''}</code>
                    </div>
                </Section>

                <Section title="Mark / since">
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            className="bg-background w-28 rounded border px-1.5 py-0.5"
                            placeholder="label"
                            value={markLabel}
                            onChange={(e) => setMarkLabel(e.target.value)}
                        />
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setDiff({ marked: mark(markLabel || 'mark') })}
                            data-rp-mark=""
                        >
                            Mark
                        </Button>
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setDiff(since(markLabel || 'mark'))}
                            data-rp-since=""
                        >
                            Since
                        </Button>
                        <span className="text-muted-foreground">__RP_DIAG__.mark(label) / .since(label)</span>
                    </div>
                    {diff ? (
                        <Json
                            value={
                                diff.counters
                                    ? {
                                          elapsedMs: diff.elapsedMs,
                                          counters: diff.counters,
                                          queryFetches: diff.queryFetches,
                                          nav: diff.nav,
                                      }
                                    : diff
                            }
                        />
                    ) : null}
                </Section>

                <Section title="Navigation tests (PORTAL_NAVIGATE)">
                    <div className="flex flex-wrap gap-1">
                        {tests.map((t) => (
                            <Button key={t.label} size="xs" variant="outline" onClick={() => navigate(t.target)}>
                                {t.label}
                            </Button>
                        ))}
                        <Link
                            to={`${list}/${rid}`}
                            recordId={rid}
                            q="tab=2"
                            className="text-primary self-center px-1 underline"
                        >
                            &lt;Link&gt; {list}/{rid}?tab=2
                        </Link>
                    </div>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={preEncode}
                            onChange={(e) => {
                                setPreEncode(e.target.checked);
                                setPreEncodeState(e.target.checked);
                            }}
                        />
                        pre-encode page and q in the payload
                    </label>
                </Section>

                <Section title="Navigation log">
                    <Lines>
                        {snap.nav
                            .slice(-14)
                            .reverse()
                            .map((n) => (
                                <div key={n.seq} className={n.noop ? 'text-muted-foreground' : ''}>
                                    {n.time} {n.kind} {n.noop ? 'no-op' : n.ms === null ? 'pending' : n.ms + 'ms'}{' '}
                                    {n.from || '∅'} → {n.to}
                                </div>
                            ))}
                    </Lines>
                </Section>

                <Section title="Component counters (mounts / unmounts / renders)">
                    <Lines>
                        {counters.map((name) => {
                            const c = snap.counters[name];
                            return (
                                <div key={name}>
                                    {name}: {c.mounts}/{c.unmounts}/{c.renders}{' '}
                                    <span className="text-muted-foreground">{c.lastReason}</span>
                                </div>
                            );
                        })}
                    </Lines>
                </Section>

                <Section title="Router">
                    <Json value={snap.router} />
                </Section>

                <Section title={`Query cache (${snap.queries.length})`}>
                    <Lines>
                        {snap.queries.map((q) => (
                            <div key={q.key}>
                                {q.key} {q.status}/{q.fetchStatus} ×{q.fetches}
                            </div>
                        ))}
                    </Lines>
                </Section>

                <Section title={`Loader (${stats.modules} modules, ${stats.stylesheets} stylesheets)`}>
                    <Lines>
                        {snap.loads.slice(-12).map((l) => (
                            <div key={l.seq} className={l.ok ? '' : 'text-destructive'}>
                                {l.time} {l.kind}
                                {l.method ? ' via ' + l.method : ''} {l.ok ? 'ok' : 'FAIL'} {l.ms}ms {l.url}{' '}
                                {l.error || ''}
                            </div>
                        ))}
                    </Lines>
                </Section>

                <Section title="Styles">
                    <Lines>
                        {snap.styles.slice(-10).map((s) => (
                            <div key={s.seq}>
                                {s.time} {s.action} {s.key} ({s.slot}, {s.bytes}b)
                            </div>
                        ))}
                    </Lines>
                    <div className="text-muted-foreground">
                        shadow root: {styles.map((s) => s.key).join(' → ') || '(none)'}
                    </div>
                </Section>

                <Section title="Property trail">
                    <Lines>
                        {realm.trail
                            .slice(-10)
                            .reverse()
                            .map((entry) => (
                                <div key={entry.seq}>
                                    {entry.time} #{entry.instance} {JSON.stringify(entry.raw)}
                                </div>
                            ))}
                    </Lines>
                </Section>

                <Section title="CSP evidence">
                    <div className="flex items-center gap-2">
                        <Button
                            size="xs"
                            variant="outline"
                            disabled={probing}
                            onClick={() => {
                                setProbing(true);
                                runCspProbe().finally(() => setProbing(false));
                            }}
                        >
                            {probing ? 'Probing…' : 'Run import() probe'}
                        </Button>
                        <span className={realm.cspViolations.length ? 'text-destructive' : 'text-muted-foreground'}>
                            violations: {realm.cspViolations.length}
                        </span>
                    </div>
                    {realm.cspProbe ? (
                        <Json value={{ results: realm.cspProbe.results, violations: realm.cspProbe.violations }} />
                    ) : null}
                </Section>

                <Section title="Data source">
                    <div className="flex flex-wrap items-center gap-2">
                        <span>{mock ? 'mock (in-browser)' : 'live scripted REST'} · ?rpmock=1 / ?rpmock=0 or</span>
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                                setMockPreference(!mock);
                                window.location.reload();
                            }}
                        >
                            use {mock ? 'live API' : 'mock'} and reload
                        </Button>
                    </div>
                </Section>
            </div>
        </div>
    );
}
