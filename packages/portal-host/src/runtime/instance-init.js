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

export function createInstanceInitStore(queryClient) {
	const records = new Map(); // id -> { entry, pending, error } (replaced on change)
	const listeners = new Set();
	const notify = () => listeners.forEach((l) => l());
	const setRecord = (id, record) => records.set(id, Object.freeze(record));

	return {
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
			const queryKey = ['rp', 'init', portal, scope, scope === 'portal' ? '' : page, ids.join(',')];
			const cached = queryClient.getQueryData(queryKey);
			const apply = (data) => {
				const instances = (data && data.instances) || {};
				if (data && typeof data === 'object' && !announced.has(data)) {
					announced.add(data);
					ids.forEach((id) => instances[id] && emitServerMessages(instances[id].messages));
				}
				ids.forEach((id) => setRecord(id, { entry: instances[id], pending: false, error: instances[id] ? null : new Error(`No init result for ${id}`) }));
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
				.fetchQuery({ queryKey, queryFn: () => initializeInstances(portal, page, ids), staleTime: Infinity, retry: false })
				.then(apply, (error) => {
					ids.forEach((id) => setRecord(id, { entry: undefined, pending: false, error }));
					notify();
					return null;
				});
		}
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
