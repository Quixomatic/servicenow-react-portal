// Shell state shared by every widget and layout of one portal: shadcn's SidebarProvider, hoisted
// to the portal shell. The header's trigger and the sidebar are different widgets in different
// regions, so neither can own the state.
//
//   useSidebar() → { state: 'expanded'|'collapsed', open, setOpen, toggleSidebar,
//                    isMobile, openMobile, setOpenMobile, available }
//   (available: a collapsible components:sidebar is mounted on this page)
//
// - open (desktop) persists per portal in localStorage['rp-sidebar:<slug>'].
// - isMobile follows the portal frame's width (< 768px), not the window: the page designer's
//   device frames get the mobile shell too.
// - Ctrl/⌘+B toggles, but only while a sidebar is mounted (components:sidebar registers itself)
//   and the host is visible; never from an editable field.
import React, { createContext, useContext, useLayoutEffect, useEffect, useRef, useSyncExternalStore } from 'react';

export const MOBILE_BREAKPOINT = 768;
const KEY_PREFIX = 'rp-sidebar:';

function readStored(key, fallback) {
	try {
		const value = window.localStorage.getItem(key);
		return value === 'true' ? true : value === 'false' ? false : fallback;
	} catch (error) {
		return fallback;
	}
}

function writeStored(key, value) {
	try {
		window.localStorage.setItem(key, value ? 'true' : 'false');
	} catch (error) {
		/* private mode / quota: the state still applies for this page */
	}
}

/** One store per portal shell. */
export function createSidebarStore(slug, opts) {
	const options = opts || {};
	const key = KEY_PREFIX + (slug || 'portal');
	// persist: false (Studio's Menus preview) keeps the state in memory only.
	const persist = options.persist !== false;
	let open = typeof window !== 'undefined' && persist ? readStored(key, options.defaultOpen !== false) : options.defaultOpen !== false;
	let openMobile = false;
	let isMobile = false;
	let sidebars = 0;
	const listeners = new Set();

	const emit = () => {
		snapshot = build();
		listeners.forEach((l) => l());
	};

	const setOpen = (value) => {
		const next = !!(typeof value === 'function' ? value(open) : value);
		if (next === open) return;
		open = next;
		if (persist) writeStored(key, open);
		emit();
	};
	const setOpenMobile = (value) => {
		const next = !!(typeof value === 'function' ? value(openMobile) : value);
		if (next === openMobile) return;
		openMobile = next;
		emit();
	};
	const toggleSidebar = () => (isMobile ? setOpenMobile(!openMobile) : setOpen(!open));

	function build() {
		// available: a collapsible sidebar is mounted (a trigger has something to toggle).
		return { state: open ? 'expanded' : 'collapsed', open, setOpen, toggleSidebar, isMobile, openMobile, setOpenMobile, available: sidebars > 0 };
	}
	let snapshot = build();

	return {
		get: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		setMobile(value) {
			const next = !!value;
			if (next === isMobile) return;
			isMobile = next;
			// Leaving mobile closes the sheet, so it doesn't pop up again on the next resize.
			if (!isMobile) openMobile = false;
			emit();
		},
		/** components:sidebar registers while mounted; the keyboard shortcut needs one. */
		register() {
			sidebars += 1;
			if (sidebars === 1) emit();
			return () => {
				sidebars = Math.max(0, sidebars - 1);
				if (sidebars === 0) {
					openMobile = false;
					emit();
				}
			};
		},
		hasSidebar: () => sidebars > 0,
		toggleSidebar,
		key
	};
}

export const SidebarStoreContext = createContext(null);

const INERT = Object.freeze({
	state: 'expanded',
	open: true,
	setOpen: () => {},
	toggleSidebar: () => {},
	isMobile: false,
	openMobile: false,
	setOpenMobile: () => {},
	available: false
});
const noopSubscribe = () => () => {};
const inertGet = () => INERT;

/** useSidebar(): the portal shell's sidebar state. Outside a portal shell: an inert expanded state. */
export function useSidebar() {
	const store = useContext(SidebarStoreContext);
	return useSyncExternalStore(store ? store.subscribe : noopSubscribe, store ? store.get : inertGet, store ? store.get : inertGet);
}

/** Internal (components:sidebar): register a mounted sidebar for the keyboard shortcut. */
export function useRegisterSidebar(enabled) {
	const store = useContext(SidebarStoreContext);
	useEffect(() => (store && enabled ? store.register() : undefined), [store, enabled]);
}

function isEditable(node) {
	if (!node || node.nodeType !== 1) return false;
	if (node.isContentEditable) return true;
	const tag = node.tagName;
	return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (node.closest && !!node.closest('.cm-editor'));
}

/**
 * Provides the store and measures the portal frame. The sentinel is absolutely positioned
 * against [data-rp-root] (position: relative), so its width is the frame's width.
 */
export function SidebarShell({ store, shortcut, children }) {
	const ref = useRef(null);

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return undefined;
		const measure = () => {
			const width = el.getBoundingClientRect().width;
			if (width > 0) store.setMobile(width < MOBILE_BREAKPOINT);
		};
		measure();
		if (typeof ResizeObserver === 'undefined') return undefined;
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [store]);

	useEffect(() => {
		if (!shortcut) return undefined;
		const onKey = (event) => {
			if (event.defaultPrevented || event.altKey || event.shiftKey) return;
			if (!(event.ctrlKey || event.metaKey) || String(event.key).toLowerCase() !== 'b') return;
			if (!store.hasSidebar()) return;
			const el = ref.current;
			// Hidden host instances (UI Builder keeps old screens alive) never react.
			if (!el || !el.isConnected || !el.getClientRects().length || el.getBoundingClientRect().width === 0) return;
			const origin = event.composedPath ? event.composedPath()[0] : event.target;
			if (isEditable(origin)) return;
			event.preventDefault();
			store.toggleSidebar();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [store, shortcut]);

	return (
		<SidebarStoreContext.Provider value={store}>
			<div ref={ref} aria-hidden="true" data-rp-shell-measure="" style={SENTINEL} />
			{children}
		</SidebarStoreContext.Provider>
	);
}

const SENTINEL = Object.freeze({ position: 'absolute', insetInline: 0, top: 0, height: 0, visibility: 'hidden', pointerEvents: 'none' });
