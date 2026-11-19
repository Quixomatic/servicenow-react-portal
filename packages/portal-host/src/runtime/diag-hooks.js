import { useEffect, useRef } from 'react';
import { countMount, countRender, countUnmount } from './diagnostics';

/**
 * Counts renders, mounts and unmounts of a component under `name` (module store, no state).
 * The render reason is the names of props that changed by identity since the last render,
 * 'mount' on the first render, or 'state/context' when no watched prop changed.
 */
export function useDiagCounter(name, props) {
	const prev = useRef(null);
	let reason;
	if (prev.current === null) reason = 'mount';
	else if (props) {
		const changed = [];
		const keys = Object.keys(props);
		for (let i = 0; i < keys.length; i += 1) if (prev.current[keys[i]] !== props[keys[i]]) changed.push(keys[i]);
		reason = changed.length ? 'props: ' + changed.join(',') : 'state/context';
	} else reason = 'state/context';
	prev.current = props || {};
	countRender(name, reason);

	useEffect(() => {
		countMount(name);
		return () => countUnmount(name);
	}, [name]);
}
