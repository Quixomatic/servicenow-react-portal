// Batch-initialized data for on-load placements (POST /instances/initialize), as an external
// store keyed by instance id. Each widget subscribes to its own record only, so a page's batch
// result re-renders that page's widgets and nothing else.
import { useSyncExternalStore } from 'react';
import { initializeInstances, emitServerMessages } from './api';

// Batch results whose server messages were already shown (cached results are re-applied on navigation).
const announced = new WeakSet();

const EMPTY = Object.freeze({ entry: undefined, pending: false, error: null });

/** On-load placement ids in a region map, including those nested inside blocks (children by drop zone). */
export function onLoadIds(byRegion) {
    const ids = [];
    const walk = (map, depth) => {
        if (!map || depth > 12) return;
        Object.keys(map).forEach((name) =>
            (map[name] || []).forEach((p) => {
                if (p.component && p.component.serverMode === 'on-load') ids.push(p.id);
                if (p.children) walk(p.children, depth + 1);
            })
        );
    };
    walk(byRegion, 0);
    return ids;
}

/** getContext() → { params, recordId } for server calls (the current URL params), or null. */
export function createInstanceInitStore(queryClient, getContext) {
    const records = new Map(); // id -> { entry, pending, error } (replaced on change)
    const listeners = new Set();
    const notify = () => listeners.forEach((l) => l());
    const setRecord = (id, record) => records.set(id, Object.freeze(record));

    // Embedded instances (embed.js): descriptors registered during a commit's layout effects are
    // sent in ONE initialize per microtask, deduped by id + options hash.
    const embedHashes = new Map(); // composite id -> options hash last requested (or seeded)
    let queue = [];
    let flushScheduled = false;
    const flushEmbeds = () => {
        flushScheduled = false;
        const batch = queue;
        queue = [];
        const byTarget = new Map(); // `${portal}|${page}` -> descriptors
        batch.forEach((item) => {
            const k = `${item.portal}|${item.page}`;
            if (!byTarget.has(k))
                byTarget.set(k, { portal: item.portal, page: item.page, context: item.context, list: [] });
            byTarget.get(k).list.push(item.descriptor);
        });
        byTarget.forEach(({ portal, page, context, list }) => {
            // The server takes 50 descriptors per request.
            for (let i = 0; i < list.length; i += 50) {
                const chunk = list.slice(i, i + 50);
                // The client-side options hash isn't part of the wire descriptor; plain instances
                // (a layout root, requestInstance) go as their id string.
                const wire = chunk.map(({ hash, plain, ...d }) => (plain ? d.id : d)); // eslint-disable-line no-unused-vars
                initializeInstances(portal, page, wire, context).then(
                    (data) => {
                        const instances = (data && data.instances) || {};
                        chunk.forEach((d) => {
                            if (embedHashes.get(d.id) !== d.hash) return; // superseded by newer options
                            const entry = instances[d.id];
                            if (entry) emitServerMessages(entry.messages);
                            setRecord(d.id, {
                                entry,
                                pending: false,
                                error: entry ? null : new Error(`No init result for ${d.id}`),
                            });
                        });
                        notify();
                    },
                    (error) => {
                        chunk.forEach((d) => {
                            if (embedHashes.get(d.id) === d.hash)
                                setRecord(d.id, { entry: undefined, pending: false, error });
                        });
                        notify();
                    }
                );
            }
        });
    };

    /** Queue one entry for the next microtask flush (skipped when id + hash is cached or in flight). */
    const enqueue = (portal, page, descriptor, hash, context) => {
        if (embedHashes.get(descriptor.id) === hash) {
            const r = records.get(descriptor.id);
            if (r && (r.entry || r.pending)) return;
        }
        embedHashes.set(descriptor.id, hash);
        const prev = records.get(descriptor.id);
        setRecord(descriptor.id, { entry: prev ? prev.entry : undefined, pending: true, error: null });
        queue.push({ portal, page: page || '', descriptor: { ...descriptor, hash }, context: context || null });
        if (!flushScheduled) {
            flushScheduled = true;
            queueMicrotask(flushEmbeds);
        }
        notify();
    };

    return {
        /**
         * Embedded widgets: put a known result (a server-built model) under `id` without a request.
         * Silent (no notify): it's called while the embed renders, and its subtree reads the record
         * in that same render.
         */
        seed(id, entry, hash) {
            embedHashes.set(id, hash || '');
            setRecord(id, { entry, pending: false, error: null });
        },
        /** True when `id` already has (or is fetching) data for options `hash`. */
        hasEmbed(id, hash) {
            const r = records.get(id);
            return embedHashes.get(id) === hash && !!r && (!!r.entry || r.pending);
        },
        /**
         * Queue an embedded instance's initialize: { id, placement, path, keys, options, token }.
         * Skipped when the same id + options hash is cached or in flight.
         */
        requestEmbed(portal, page, descriptor, hash, context) {
            enqueue(portal, page, descriptor, hash, context);
        },
        /**
         * Queue a plain instance id (an on-load layout's root, 'layout:<component sys_id>') into the
         * same batched initialize. Fetched once per id; it stays cached while the store lives.
         */
        requestInstance(portal, page, id, context) {
            if (id) enqueue(portal, page, { id, plain: true }, 'instance', context);
        },
        record: (id) => records.get(id) || EMPTY,
        get: (id) => (records.get(id) || EMPTY).entry,
        pending: (id) => (records.get(id) || EMPTY).pending,
        error: (id) => (records.get(id) || EMPTY).error,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        /**
         * One batch call for `ids` (cached in the QueryClient per portal/scope/path), filling the
         * records as it resolves. Not awaited by loaders: widgets render with pending=true.
         */
        fetch(portal, page, ids, scope) {
            if (!ids || !ids.length) return Promise.resolve(null);
            // URL params reach the server scripts (context); page results are cached per params.
            const context = getContext ? getContext() : null;
            const paramsKey = scope === 'portal' || !context ? '' : JSON.stringify(context);
            const queryKey = ['rp', 'init', portal, scope, scope === 'portal' ? '' : page, ids.join(','), paramsKey];
            const cached = queryClient.getQueryData(queryKey);
            const apply = (data) => {
                const instances = (data && data.instances) || {};
                if (data && typeof data === 'object' && !announced.has(data)) {
                    announced.add(data);
                    ids.forEach((id) => instances[id] && emitServerMessages(instances[id].messages));
                }
                ids.forEach((id) =>
                    setRecord(id, {
                        entry: instances[id],
                        pending: false,
                        error: instances[id] ? null : new Error(`No init result for ${id}`),
                    })
                );
                notify();
                return data;
            };
            if (cached) return Promise.resolve(apply(cached));
            ids.forEach((id) => {
                const current = records.get(id);
                if (!current || !current.entry) setRecord(id, { entry: undefined, pending: true, error: null });
            });
            notify();
            return queryClient
                .fetchQuery({
                    queryKey,
                    queryFn: () => initializeInstances(portal, page, ids, context),
                    staleTime: Infinity,
                    retry: false,
                })
                .then(apply, (error) => {
                    ids.forEach((id) => setRecord(id, { entry: undefined, pending: false, error }));
                    notify();
                    return null;
                });
        },
    };
}

/** The record for one instance: { entry, pending, error }; stable until it changes. */
export function useInstanceRecord(store, id) {
    return useSyncExternalStore(
        store ? store.subscribe : noopSubscribe,
        () => (store && id ? store.record(id) : EMPTY),
        () => EMPTY
    );
}

function noopSubscribe() {
    return () => {};
}
