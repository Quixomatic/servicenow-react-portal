// Record watch for widgets (exported from @portal/runtime): React hooks over the shared AMB
// registry (amb.js).
//
//   useAmbChannel(channel, onMessage, { enabled?, graphQLSubscription? })
//   useAmbStatus()
//   useRecordWatch(table, query, onChange?, { enabled?, invalidate?, debounceMs? })
//
// A message is a signal, not data: by default useRecordWatch invalidates the page cache for the
// table (Table API hooks, app/list-data lists, app/graphql record reads), which re-read through
// ACL-enforced APIs. `event.record` is the raw server payload; don't render it without re-reading.
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { queryClient } from './query-client';
import {
    channelError,
    channelStatus,
    getAmbClient,
    getConnection,
    getStatusVersion,
    heldChannels,
    onResume,
    subscribeChannel,
    subscribeConnection,
    subscribeStatus,
    ambDiagnostics,
} from './amb';

// ---- channel names ---------------------------------------------------------------------------

/** UTF-8-safe base64 of an encoded query, '=' → '-' (identical to amb-client-js base64EncodeQuery). */
export function encodeQuery(query) {
    const bytes = encodeURIComponent(String(query || '')).replace(/%([0-9A-F]{2})/g, (_, h) =>
        String.fromCharCode(parseInt(h, 16))
    );
    return btoa(bytes).replace(/=/g, '-');
}

/**
 * Normalize a watch query: drop ORDERBY / ORDERBYDESC / GROUPBY terms and empty terms (they change
 * the channel name, not the filter); '' → 'sys_idISNOTEMPTY' (an empty filter never delivers).
 */
export function normalizeQuery(query) {
    const terms = String(query || '')
        .split('^')
        .map((t) => t.trim())
        .filter((t) => t && !/^(ORDERBY|ORDERBYDESC|GROUPBY)/.test(t) && t !== 'EQ');
    // A dangling OR / NQ prefix left by a removed term would change the meaning; keep it simple.
    return terms.length ? terms.join('^') : 'sys_idISNOTEMPTY';
}

/** '/rw/default/<table>/<base64 query>' (the client's getRecordWatcherChannel builds the same). */
export function rwChannel(table, query) {
    return `/rw/default/${table}/${encodeQuery(query)}`;
}

/** AMB record-watch message → RecordWatchEvent. */
export function toRecordWatchEvent(message) {
    const data = (message && message.data) || {};
    const record = data.record || {};
    const valueOf = (name) => (record[name] && record[name].value !== undefined ? String(record[name].value) : null);
    const mod = valueOf('sys_mod_count');
    return {
        table: data.table_name || '',
        sysId: data.sys_id || '',
        action: data.action || 'change',
        operation: data.operation || 'update',
        changes: Array.isArray(data.changes) ? data.changes : [],
        modCount: mod === null || mod === '' || isNaN(Number(mod)) ? null : Number(mod),
        updatedOn: valueOf('sys_updated_on'),
        fromUser: (message && message.ext && message.ext.from_user) || null,
        displayValue: data.display_value || '',
        record,
        raw: message,
    };
}

// ---- cache invalidation (throttled per key) --------------------------------------------------

const pending = new Map(); // key string → timer

/**
 * Invalidate a query-key prefix once within `ms` (trailing; bursts coalesce, nothing starves).
 * Returns nothing; safe to call per message.
 */
export function scheduleInvalidate(queryKey, ms) {
    const id = JSON.stringify(queryKey);
    if (pending.has(id)) return;
    pending.set(
        id,
        setTimeout(
            () => {
                pending.delete(id);
                queryClient.invalidateQueries({ queryKey });
            },
            Math.max(0, ms === undefined ? 250 : ms)
        )
    );
}

/** Everything the page caches for a table: Table API hooks, app/list-data lists, app/graphql reads. */
export function invalidateTable(table, ms) {
    if (!table) return;
    scheduleInvalidate(['rp', 'table', table], ms);
    scheduleInvalidate(['rp-list', 'page', table], ms);
    scheduleInvalidate(['rp-gql', 'record', table], ms);
}

// After a reconnect or session renewal, messages may have been lost: refresh every watched table once.
onResume(() => {
    const tables = new Set();
    heldChannels().forEach((c) => {
        if (c.spec && c.spec.table) tables.add(c.spec.table);
    });
    tables.forEach((t) => invalidateTable(t, 500));
});

// ---- live context (Studio's designer canvas turns live data off) ----------------------------

const LIVE_ON = Object.freeze({ enabled: true });
export const LIVE_OFF = Object.freeze({ enabled: false });
export const LiveContext = createContext(LIVE_ON);
export function useLiveEnabled() {
    const value = useContext(LiveContext);
    return !value || value.enabled !== false;
}

// ---- hooks -----------------------------------------------------------------------------------

/** useAmbStatus() → { connection: 'connecting'|'open'|'broken'|'closed'|'unavailable', resumedAt } */
export function useAmbStatus() {
    return useSyncExternalStore(subscribeConnection, getConnection, getConnection);
}

function useChannelState(name, active) {
    useSyncExternalStore(subscribeStatus, getStatusVersion, getStatusVersion);
    return active ? { status: channelStatus(name), error: channelError(name) } : { status: 'idle', error: undefined };
}

/**
 * useAmbChannel(channel, onMessage, { enabled?, graphQLSubscription? }) →
 * { status: 'idle'|'subscribing'|'subscribed'|'denied'|'error', error?, connection }.
 * Any AMB channel; `onMessage` may change identity freely. Shares one subscription per channel.
 */
export function useAmbChannel(channel, onMessage, options) {
    const o = options || {};
    const live = useLiveEnabled();
    const active = !!channel && o.enabled !== false && live;
    const handler = useRef(onMessage);
    handler.current = onMessage;
    const gql = o.graphQLSubscription || '';
    useEffect(() => {
        if (!active) return undefined;
        return subscribeChannel(
            channel,
            (message) => handler.current && handler.current(message),
            gql ? { graphQLSubscription: gql } : {}
        );
    }, [active, channel, gql]);
    const state = useChannelState(channel, active);
    const { connection } = useAmbStatus();
    return { status: state.status, error: state.error, connection };
}

/**
 * useRecordWatch(table, query, onChange?, { enabled?, invalidate? = true, debounceMs? = 250 }) →
 * { status, error?, connection, channel, lastEvent }.
 * query: an encoded query ('' or null → the whole table, 'sys_idISNOTEMPTY'). onChange runs per
 * message with a RecordWatchEvent; with `invalidate` the table's cached reads refresh (throttled).
 */
export function useRecordWatch(table, query, onChange, options) {
    const o = options || {};
    const live = useLiveEnabled();
    const normalized = normalizeQuery(query);
    const channel = table ? rwChannel(table, normalized) : null;
    const active = !!channel && o.enabled !== false && live;
    const handler = useRef(onChange);
    handler.current = onChange;
    const settings = useRef(o);
    settings.current = o;
    const [lastEvent, setLastEvent] = useState(null);
    useEffect(() => {
        if (!active) return undefined;
        return subscribeChannel(
            channel,
            (message) => {
                const event = toRecordWatchEvent(message);
                const s = settings.current;
                if (s.invalidate !== false) invalidateTable(event.table || table, s.debounceMs);
                setLastEvent(event);
                if (handler.current) handler.current(event);
            },
            { table, query: normalized }
        );
    }, [active, channel, table, normalized]);
    const state = useChannelState(channel, active);
    const { connection } = useAmbStatus();
    return { status: state.status, error: state.error, connection, channel, lastEvent };
}

/** True when this page has an AMB client (the shell's, or the mock). */
export function hasAmb() {
    return !!getAmbClient();
}

if (typeof window !== 'undefined') {
    window.__rpAmb = Object.assign(window.__rpAmb || {}, { diagnostics: ambDiagnostics, encodeQuery, rwChannel });
}
