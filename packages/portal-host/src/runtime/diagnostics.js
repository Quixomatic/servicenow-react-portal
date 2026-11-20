// Module-level diagnostics: survives host remounts for as long as the browser page (JS realm)
// lives. No React in here: components report into plain counters (see diag-hooks.js), and
// nothing re-renders because of them. The drawer polls while open.
//
// Exposed for CDP / console as window.__RP_DIAG__:
//   __RP_DIAG__()             JSON-safe snapshot
//   __RP_DIAG__.mark(label)   remember the counters/logs now
//   __RP_DIAG__.since(label)  what changed since that mark
//   __RP_DIAG__.reset()       clear counters, logs and marks
const hasWindow = typeof window !== 'undefined';
const VERSION = 2;

function createRealm() {
    return {
        version: VERSION,
        loadedAt: new Date().toLocaleTimeString(),
        loadedAtMs: Date.now(),
        seq: 0,
        instances: 0,
        mounts: 0,
        hosts: {},
        counters: {},
        log: [],
        trail: [],
        dispatches: [],
        nav: [],
        loads: [],
        styles: [],
        cspViolations: [],
        cspProbe: null,
        queryFetches: {},
        marks: {},
        listeners: new Set(),
    };
}

const existing = hasWindow && window.__reactPortalHost;
const realm = existing && existing.version === VERSION ? existing : createRealm();
if (hasWindow) window.__reactPortalHost = realm;

const MAX = 200;

function push(list, entry) {
    realm.seq += 1;
    const stamped = { seq: realm.seq, ...entry };
    list.push(stamped);
    if (list.length > MAX) list.splice(0, list.length - MAX);
    notify();
    return stamped;
}

// Listeners run in a microtask and only exist while something (the open drawer) listens.
let scheduled = false;
function notify() {
    if (scheduled || realm.listeners.size === 0) return;
    scheduled = true;
    Promise.resolve().then(() => {
        scheduled = false;
        realm.listeners.forEach((listener) => {
            try {
                listener();
            } catch (error) {
                /* ignore */
            }
        });
    });
}

export function now() {
    return new Date().toLocaleTimeString();
}

function iso() {
    return new Date().toISOString();
}

export function subscribeDiagnostics(listener) {
    realm.listeners.add(listener);
    return () => realm.listeners.delete(listener);
}

// ---- hosts ----------------------------------------------------------------------------------

export function nextInstanceId() {
    realm.instances += 1;
    return realm.instances;
}

export function recordMount(instanceId, where, tag) {
    realm.mounts += 1;
    const host = (realm.hosts[instanceId] = realm.hosts[instanceId] || {
        id: instanceId,
        mounts: 0,
        clicks: 0,
        props: null,
    });
    host.mounts += 1;
    host.mounted = true;
    host.tag = tag || host.tag || 'x-312987-portal-host';
    host.mountNumber = realm.mounts;
    push(realm.log, { time: now(), text: `mount #${realm.mounts}: instance ${instanceId} on ${where}` });
    return realm.mounts;
}

export function recordUnmount(instanceId) {
    if (realm.hosts[instanceId]) realm.hosts[instanceId].mounted = false;
    push(realm.log, { time: now(), text: `unmount: instance ${instanceId}` });
}

export function hostInfo(instanceId) {
    return realm.hosts[instanceId] || { id: instanceId, mounts: 0, clicks: 0 };
}

/** The host's "local state" counter: lives as long as the instance id (a remount gets a new id). */
export function incrementHostClicks(instanceId) {
    const host = (realm.hosts[instanceId] = realm.hosts[instanceId] || { id: instanceId, mounts: 0, clicks: 0 });
    host.clicks += 1;
    notify();
}

export function recordEvent(text) {
    push(realm.log, { time: now(), text });
}

/** One entry per distinct set of raw properties an instance receives. */
export function recordProperties(instanceId, raw) {
    const host = (realm.hosts[instanceId] = realm.hosts[instanceId] || { id: instanceId, mounts: 0, clicks: 0 });
    host.props = raw;
    push(realm.trail, { time: now(), at: iso(), instance: instanceId, raw });
}

export function recordDispatch(payload) {
    push(realm.dispatches, { time: now(), at: iso(), payload });
}

// ---- component counters ---------------------------------------------------------------------

function counter(name) {
    let c = realm.counters[name];
    if (!c) c = realm.counters[name] = { mounts: 0, unmounts: 0, renders: 0, lastReason: '' };
    return c;
}

/** Called during render. `reason` is a short string (changed prop names, 'mount', 'state/context'). */
export function countRender(name, reason) {
    const c = counter(name);
    c.renders += 1;
    if (reason) c.lastReason = reason;
}

export function countMount(name) {
    counter(name).mounts += 1;
}

export function countUnmount(name) {
    counter(name).unmounts += 1;
}

// ---- navigation log -------------------------------------------------------------------------

let pendingNav = null;

/** A property change or route change. Returns the entry; resolveNav() fills in the duration. */
export function navStart(kind, from, to, extra) {
    const entry = push(realm.nav, {
        time: now(),
        at: iso(),
        startedAt: Date.now(),
        kind,
        from,
        to,
        noop: false,
        ms: null,
        ...(extra || {}),
    });
    pendingNav = entry;
    return entry;
}

export function navNoop(kind, from, to, extra) {
    return push(realm.nav, { time: now(), at: iso(), kind, from, to, noop: true, ms: 0, ...(extra || {}) });
}

/** The router resolved `location` (its page loader finished). */
export function navResolved(location) {
    if (pendingNav && pendingNav.ms === null) {
        pendingNav.ms = Date.now() - pendingNav.startedAt;
        pendingNav.resolved = location;
        pendingNav = null;
        notify();
        return;
    }
    push(realm.nav, {
        time: now(),
        at: iso(),
        kind: 'route',
        from: null,
        to: location,
        noop: false,
        ms: null,
        note: 'resolved without a property change',
    });
}

// ---- loads, styles, CSP ---------------------------------------------------------------------

/** Module/CSS loads: { kind: 'js'|'css', method, url, ms, ok, error } */
export function recordLoad(entry) {
    push(realm.loads, { time: now(), ...entry });
}

/** Style injection: { key, slot, action: 'create'|'update', bytes } */
export function recordStyle(entry) {
    push(realm.styles, { time: now(), at: iso(), ...entry });
}

export function setCspProbe(result) {
    realm.cspProbe = result;
    notify();
}

export function realmInfo() {
    return realm;
}

if (hasWindow && typeof document !== 'undefined' && !realm.cspListening) {
    realm.cspListening = true;
    document.addEventListener('securitypolicyviolation', (event) => {
        push(realm.cspViolations, {
            time: now(),
            directive: event.effectiveDirective || event.violatedDirective,
            blockedURI: event.blockedURI,
            disposition: event.disposition,
        });
    });
}

// ---- query cache and router -----------------------------------------------------------------

let queryClientRef = null;
export function attachQueryClient(queryClient) {
    if (queryClientRef === queryClient) return;
    queryClientRef = queryClient;
    queryClient.getQueryCache().subscribe((event) => {
        if (event && event.type === 'updated' && event.action && event.action.type === 'fetch') {
            const key = JSON.stringify(event.query.queryKey);
            realm.queryFetches[key] = (realm.queryFetches[key] || 0) + 1;
        }
    });
}

let activeRouter = null;
export function setActiveRouter(router) {
    activeRouter = router;
}
export function clearActiveRouter(router) {
    if (activeRouter === router) activeRouter = null;
}

function routerSnapshot() {
    if (!activeRouter) return null;
    try {
        const state = activeRouter.state;
        return {
            location: state.location && state.location.href,
            resolvedLocation: state.resolvedLocation && state.resolvedLocation.href,
            status: state.status,
            isLoading: !!state.isLoading,
            pending: state.status === 'pending' || !!state.isLoading,
            matches: (state.matches || []).map((m) => ({
                routeId: m.routeId,
                pathname: m.pathname,
                status: m.status,
                isFetching: m.isFetching || false,
            })),
            routes: Object.keys(activeRouter.routesById || {}),
        };
    } catch (error) {
        return { error: String(error && error.message) };
    }
}

function querySnapshot() {
    if (!queryClientRef) return [];
    return queryClientRef
        .getQueryCache()
        .getAll()
        .map((q) => {
            const key = JSON.stringify(q.queryKey);
            return {
                key,
                status: q.state.status,
                fetchStatus: q.state.fetchStatus,
                dataUpdatedAt: q.state.dataUpdatedAt ? new Date(q.state.dataUpdatedAt).toISOString() : null,
                fetches: realm.queryFetches[key] || 0,
                observers: typeof q.getObserversCount === 'function' ? q.getObserversCount() : undefined,
            };
        });
}

// ---- snapshot / mark / since / reset --------------------------------------------------------

function clone(value) {
    return JSON.parse(JSON.stringify(value === undefined ? null : value));
}

function loaderStatsByUrl() {
    const byUrl = {};
    realm.loads.forEach((l) => {
        if (!l.ok) return;
        byUrl[l.url] = { kind: l.kind, method: l.method || null, ms: l.ms };
    });
    return byUrl;
}

export function snapshot() {
    return clone({
        at: iso(),
        pageLoadedAt: realm.loadedAt,
        hosts: Object.keys(realm.hosts).map((id) => {
            const h = realm.hosts[id];
            return { id: h.id, mounts: h.mounts, mounted: !!h.mounted, tag: h.tag, props: h.props, clicks: h.clicks };
        }),
        counters: realm.counters,
        nav: realm.nav.slice(-50),
        dispatches: realm.dispatches.slice(-20),
        queries: querySnapshot(),
        router: routerSnapshot(),
        styles: realm.styles.slice(-50),
        loads: realm.loads.slice(-50),
        loaderByUrl: loaderStatsByUrl(),
        cspViolations: realm.cspViolations.slice(-20),
        cspProbe: realm.cspProbe,
        log: realm.log.slice(-30),
    });
}

export function mark(label) {
    const name = String(label || 'mark');
    realm.marks[name] = {
        at: iso(),
        atMs: Date.now(),
        seq: realm.seq,
        counters: clone(realm.counters),
        queryFetches: clone(realm.queryFetches),
    };
    return { label: name, at: realm.marks[name].at };
}

export function since(label) {
    const name = String(label || 'mark');
    const m = realm.marks[name];
    if (!m) return { error: `no mark "${name}"`, marks: Object.keys(realm.marks) };
    const counters = {};
    Object.keys(realm.counters).forEach((key) => {
        const nowC = realm.counters[key];
        const was = m.counters[key] || { mounts: 0, unmounts: 0, renders: 0 };
        const diff = {
            mounts: nowC.mounts - was.mounts,
            unmounts: nowC.unmounts - was.unmounts,
            renders: nowC.renders - was.renders,
        };
        if (diff.mounts || diff.unmounts || diff.renders) counters[key] = { ...diff, lastReason: nowC.lastReason };
    });
    const queryFetches = {};
    Object.keys(realm.queryFetches).forEach((key) => {
        const d = realm.queryFetches[key] - (m.queryFetches[key] || 0);
        if (d) queryFetches[key] = d;
    });
    const after = (list) => list.filter((e) => e.seq > m.seq);
    return clone({
        label: name,
        markedAt: m.at,
        elapsedMs: Date.now() - m.atMs,
        counters,
        queryFetches,
        nav: after(realm.nav),
        dispatches: after(realm.dispatches),
        loads: after(realm.loads),
        styles: after(realm.styles),
        trail: after(realm.trail),
    });
}

export function reset() {
    realm.counters = {};
    realm.nav = [];
    realm.loads = [];
    realm.styles = [];
    realm.dispatches = [];
    realm.trail = [];
    realm.log = [];
    realm.queryFetches = {};
    realm.marks = {};
    notify();
    return { reset: iso() };
}

if (hasWindow) {
    const api = function RP_DIAG() {
        return snapshot();
    };
    api.snapshot = snapshot;
    api.mark = mark;
    api.since = since;
    api.reset = reset;
    api.counters = () => clone(realm.counters);
    window.__RP_DIAG__ = api;
}
