// AMB (Asynchronous Message Bus) adapter: the page's existing amb-client-js connection, shared by
// every widget through one reference-counted channel registry.
//
// - The Next Experience shell already runs a connected client (window.amb / window.g_ambClient).
//   We reuse it: no second WebSocket, no bundled copy. Reconnects, resubscription and short-gap
//   redelivery are the client's job; we only follow its connection events.
// - Mock mode (?rpmock=1) gets an in-memory client with the same surface (mock/amb.js).
// - Each channel is subscribed once, however many hooks watch it. A channel is released ~1 s after
//   its last callback goes away, so StrictMode double mounts, designer re-renders and route changes
//   that remount the same watch don't churn the server's 3-in-flight subscribe flow.
// - Callbacks are isolated (try/catch): one bad widget can't break the others.
import { isMock } from './api';
import { getMockAmbClient } from './mock/amb';

export const RELEASE_DELAY_MS = 1000;
const RETRY_DELAYS = [2000, 8000, 32000]; // non-403 subscribe failures; capped at 3 tries

let client = null;

/** The page's amb client (memoized once found), the mock client, or null. */
export function getAmbClient() {
    if (client) return client;
    if (isMock()) {
        client = getMockAmbClient();
    } else if (typeof window !== 'undefined') {
        try {
            if (window.amb && typeof window.amb.getClient === 'function') client = window.amb.getClient();
        } catch (error) {
            client = null;
        }
        if (!client && window.g_ambClient && typeof window.g_ambClient.getChannel === 'function')
            client = window.g_ambClient;
    }
    if (client) watchConnection(client);
    return client;
}

// ---- connection state ------------------------------------------------------------------------

// { connection: 'connecting'|'open'|'broken'|'closed'|'unavailable', resumedAt: number|null }
let connection = { connection: 'unavailable', resumedAt: null };
const connectionListeners = new Set();
const resumeHandlers = new Set();
let watching = false;

function setConnection(next, resumed) {
    const resumedAt = resumed ? Date.now() : connection.resumedAt;
    if (next === connection.connection && resumedAt === connection.resumedAt) return;
    connection = { connection: next, resumedAt };
    connectionListeners.forEach((fn) => safe(fn));
    if (resumed) resumeHandlers.forEach((fn) => safe(fn));
}

function stateFromClient(c) {
    let s = '';
    try {
        s = typeof c.getConnectionState === 'function' ? String(c.getConnectionState() || '') : '';
    } catch (error) {
        s = '';
    }
    if (s === 'opened') return 'open';
    if (s === 'closed') return 'closed';
    if (s === 'broken' || s === 'disconnected') return 'broken';
    return 'connecting';
}

function watchConnection(c) {
    if (watching) return;
    watching = true;
    connection = { connection: stateFromClient(c), resumedAt: null };
    if (typeof c.subscribeToEvent !== 'function') return;
    let wasBroken = false;
    const on = (name, fn) => {
        try {
            c.subscribeToEvent(name, fn);
        } catch (error) {
            /* older client */
        }
    };
    on('connection.initialized', () => setConnection('connecting'));
    on('connection.opened', () => {
        const resumed = wasBroken;
        wasBroken = false;
        setConnection('open', resumed);
    });
    on('connection.broken', () => {
        wasBroken = true;
        setConnection('broken');
    });
    on('connection.closed', () => {
        wasBroken = true;
        setConnection('closed');
    });
    on('session.logged.out', () => {
        wasBroken = true;
        setConnection('closed');
    });
    on('session.invalidated', () => {
        wasBroken = true;
        setConnection('closed');
    });
    on('session.reestablished', () =>
        setConnection(stateFromClient(c) === 'open' ? 'open' : connection.connection, true)
    );
}

/** Current connection snapshot (stable identity until it changes). */
export function getConnection() {
    if (!client) getAmbClient();
    return connection;
}

export function subscribeConnection(fn) {
    connectionListeners.add(fn);
    return () => connectionListeners.delete(fn);
}

/** Called after the connection comes back (broken → opened, session re-established). */
export function onResume(fn) {
    resumeHandlers.add(fn);
    return () => resumeHandlers.delete(fn);
}

// ---- channel registry ------------------------------------------------------------------------

// name → { name, spec, callbacks: Set, listener, status, error, releaseTimer, retryTimer, tries, received }
const channels = new Map();
const statusListeners = new Set();
let statusVersion = 0;
const stats = { messages: 0, dispatched: 0, subscribes: 0, unsubscribes: 0, denied: [], lastError: null };

function safe(fn, arg) {
    try {
        fn(arg);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[react-portal] AMB callback failed', error);
    }
}

function notifyStatus() {
    statusVersion += 1;
    statusListeners.forEach((fn) => safe(fn));
}

export function subscribeStatus(fn) {
    statusListeners.add(fn);
    return () => statusListeners.delete(fn);
}

export function getStatusVersion() {
    return statusVersion;
}

/** 'idle' | 'subscribing' | 'subscribed' | 'denied' | 'error' for a channel we hold. */
export function channelStatus(name) {
    const entry = name ? channels.get(name) : null;
    return entry ? entry.status : 'idle';
}

export function channelError(name) {
    const entry = name ? channels.get(name) : null;
    return entry ? entry.error : undefined;
}

function open(entry) {
    const c = getAmbClient();
    if (!c) {
        entry.status = 'idle';
        return;
    }
    entry.status = 'subscribing';
    entry.error = undefined;
    stats.subscribes += 1;
    const opts = {
        subscriptionCallback: (resp) => {
            if (channels.get(entry.name) !== entry || entry.listener !== listenerRef.current) return;
            if (resp && resp.successful === false) {
                const error = String(resp.error || 'subscribe failed');
                const denied = /403|denied|not authorized/i.test(error);
                entry.status = denied ? 'denied' : 'error';
                entry.error = error;
                stats.lastError = `${entry.name}: ${error}`;
                if (denied) {
                    if (stats.denied.indexOf(entry.name) < 0) stats.denied.push(entry.name);
                } else if (entry.tries < RETRY_DELAYS.length) {
                    const delay = RETRY_DELAYS[entry.tries];
                    entry.tries += 1;
                    entry.retryTimer = setTimeout(() => {
                        entry.retryTimer = null;
                        if (channels.get(entry.name) !== entry) return;
                        close(entry);
                        open(entry);
                        notifyStatus();
                    }, delay);
                }
            } else {
                entry.status = 'subscribed';
                entry.tries = 0;
            }
            notifyStatus();
        },
    };
    if (entry.spec.graphQLSubscription) opts.serializedGraphQLSubscription = entry.spec.graphQLSubscription;
    const listenerRef = { current: null };
    try {
        const spec = entry.spec;
        const listener =
            spec.table && typeof c.getRecordWatcherChannel === 'function'
                ? c.getRecordWatcherChannel(spec.table, spec.query, null, opts)
                : c.getChannel(entry.name, opts);
        listenerRef.current = listener;
        entry.listener = listener;
        listener.subscribe((message) => dispatch(entry, message));
    } catch (error) {
        entry.status = 'error';
        entry.error = String((error && error.message) || error);
        stats.lastError = `${entry.name}: ${entry.error}`;
    }
}

function close(entry) {
    if (entry.retryTimer) clearTimeout(entry.retryTimer);
    entry.retryTimer = null;
    const listener = entry.listener;
    entry.listener = null;
    if (listener && typeof listener.unsubscribe === 'function') {
        stats.unsubscribes += 1;
        try {
            listener.unsubscribe();
        } catch (error) {
            /* already gone */
        }
    }
}

function dispatch(entry, message) {
    stats.messages += 1;
    entry.received += 1;
    Array.from(entry.callbacks).forEach((cb) => {
        stats.dispatched += 1;
        safe(cb, message);
    });
}

/**
 * Subscribe `callback` to an AMB channel. spec: { table?, query? } for record-watch channels (the
 * client's getRecordWatcherChannel builds the same name), { graphQLSubscription? } for GraphQL.
 * Returns the release function. With no AMB client it's a no-op.
 */
export function subscribeChannel(name, callback, spec) {
    if (!name || typeof callback !== 'function') return () => {};
    let entry = channels.get(name);
    if (!entry) {
        entry = {
            name,
            spec: spec || {},
            callbacks: new Set(),
            listener: null,
            status: 'idle',
            error: undefined,
            releaseTimer: null,
            retryTimer: null,
            tries: 0,
            received: 0,
        };
        channels.set(name, entry);
        open(entry);
        notifyStatus();
    } else if (entry.releaseTimer) {
        clearTimeout(entry.releaseTimer);
        entry.releaseTimer = null;
    }
    const cb = (message) => callback(message);
    entry.callbacks.add(cb);
    const held = entry;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        held.callbacks.delete(cb);
        if (held.callbacks.size || held.releaseTimer || channels.get(name) !== held) return;
        held.releaseTimer = setTimeout(() => {
            held.releaseTimer = null;
            if (held.callbacks.size || channels.get(name) !== held) return;
            close(held);
            channels.delete(name);
            notifyStatus();
        }, RELEASE_DELAY_MS);
    };
}

/** Specs of the channels currently held (for resume invalidation). */
export function heldChannels() {
    return Array.from(channels.values()).map((e) => ({ name: e.name, spec: e.spec, listeners: e.callbacks.size }));
}

/** Diagnostics: connection, channels with listener counts, counters. */
export function ambDiagnostics() {
    const c = client;
    let clientChannels = null;
    try {
        clientChannels = c && typeof c.getChannels === 'function' ? Object.keys(c.getChannels() || {}) : null;
    } catch (error) {
        clientChannels = null;
    }
    return {
        source: !c ? 'none' : isMock() ? 'mock' : 'page',
        connection: connection.connection,
        resumedAt: connection.resumedAt,
        channels: Array.from(channels.values()).map((e) => ({
            name: e.name,
            table: e.spec.table || null,
            query: e.spec.query || null,
            listeners: e.callbacks.size,
            status: e.status,
            error: e.error || null,
            releasing: !!e.releaseTimer,
            received: e.received,
        })),
        clientChannels,
        ...stats,
        denied: stats.denied.slice(),
    };
}
