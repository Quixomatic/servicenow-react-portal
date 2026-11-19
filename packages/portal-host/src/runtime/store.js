/** A minimal external store for useSyncExternalStore: get / set / subscribe. */
export function createStore(initial) {
	let value = initial;
	const listeners = new Set();
	return {
		get: () => value,
		set: (next) => {
			if (Object.is(next, value)) return;
			value = next;
			listeners.forEach((listener) => listener());
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
	};
}
