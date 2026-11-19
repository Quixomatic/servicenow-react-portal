// Style injection into the host's shadow root (spec §9). Every injected sheet is a
// <style data-rp="<key>" data-rp-slot="<slot>">; the renderer mirrors <style> elements into the
// overlay layer, so dialogs, menus and popovers get them too.
//
// Load order inside the shadow root:
//   theme     theme stylesheet(s): base styles for the portal          (first)
//   framework the host's own CSS (Tailwind + shadcn), added by ui-core
//   widget    one sheet per component build, scoped by [data-rp-widget]
//   tokens    theme token variables (:host { --primary: … })            (last)

import { recordStyle } from './diagnostics';

const SLOT_ORDER = ['theme', 'widget', 'tokens'];

/** The node styles go into: the shadow root containing `node`, or document.head outside one. */
export function styleTarget(node) {
	if (!node || typeof node.getRootNode !== 'function') return null;
	const root = node.getRootNode();
	if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) return root;
	return typeof document !== 'undefined' ? document.head : null;
}

function findStyle(target, key) {
	const styles = target.querySelectorAll('style[data-rp]');
	for (let i = 0; i < styles.length; i += 1) {
		if (styles[i].getAttribute('data-rp') === key) return styles[i];
	}
	return null;
}

function place(target, el, slot) {
	if (slot === 'theme') {
		// After any earlier theme sheets, before everything else.
		const themes = target.querySelectorAll('style[data-rp-slot="theme"]');
		const anchor = themes.length ? themes[themes.length - 1].nextSibling : target.firstChild;
		target.insertBefore(el, anchor);
		return;
	}
	const laterSlots = SLOT_ORDER.slice(SLOT_ORDER.indexOf(slot) + 1);
	for (let i = 0; i < laterSlots.length; i += 1) {
		const anchor = target.querySelector(`style[data-rp-slot="${laterSlots[i]}"]`);
		if (anchor) {
			target.insertBefore(el, anchor);
			return;
		}
	}
	target.appendChild(el);
}

/** Create or update the sheet `key` in `target`. */
export function ensureStyle(target, key, cssText, slot) {
	if (!target) return null;
	let el = findStyle(target, key);
	let action = null;
	if (!el) {
		el = document.createElement('style');
		el.setAttribute('data-rp', key);
		el.setAttribute('data-rp-slot', slot);
		place(target, el, slot);
		action = 'create';
	}
	if (el.textContent !== cssText) {
		el.textContent = cssText;
		action = action || 'update';
	}
	if (action) recordStyle({ key, slot, action, bytes: cssText.length });
	return el;
}

export function removeStyle(target, key) {
	const el = target && findStyle(target, key);
	if (el) el.remove();
}

/** Keys of the sheets currently injected, in document order (diagnostics). */
export function listStyles(target) {
	if (!target) return [];
	return Array.prototype.map.call(target.querySelectorAll('style[data-rp]'), (el) => ({
		key: el.getAttribute('data-rp'),
		slot: el.getAttribute('data-rp-slot'),
		bytes: el.textContent.length
	}));
}
