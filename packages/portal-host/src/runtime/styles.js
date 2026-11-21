// Style injection into the host's shadow root (spec §9). Every injected sheet is a
// <style data-rp="<key>" data-rp-slot="<slot>">; the renderer mirrors <style> elements into the
// overlay layer, so dialogs, menus and popovers get them too.
//
// Load order inside the shadow root:
//   theme      theme stylesheet(s): base styles for the portal          (first)
//   framework  the host's own CSS (Tailwind + shadcn), a <style> injected by the host view
//              (runtime/framework-css.js); always present, so the host never loses its styles
//   fallback   per-component Tailwind utilities sheets of builds the portal sheet doesn't cover
//              (a dynamic model outside the manifest, a Studio edit until its reprocess)
//   utilities  the portal utilities sheet: ONE Tailwind sheet for every component of the portal plus
//              the host's classes, compiled at reprocess, in @layer rp-portal
//   widget     author CSS per component build (styles.css, unlayered), scoped by [data-rp-widget]
//   instance   one sheet per placement (placement.css: classes, style tokens, grid layout,
//              responsive option variables), unlayered, so it wins over Tailwind utilities
//   tokens     theme token variables (:host { --primary: … })            (last)
//
// Cascade layers (merged across all sheets): theme, base, components, utilities, rp-variants,
// rp-portal, rp-instance, rp-instance-variants (placement classes, above the portal sheet). The portal sheet is one correctly ordered Tailwind sheet in the last layer, so every
// class it holds beats the same class re-emitted by the framework or a fallback sheet, base and
// variant alike. The framework and fallback sheets keep their variant rules in rp-variants (a variant
// in any of them beats a base utility in any other). Widget styles.css stays unlayered (beats all
// layers).

import { recordStyle } from './diagnostics';

const SLOT_ORDER = ['theme', 'framework', 'fallback', 'utilities', 'widget', 'instance', 'tokens'];

// Reference counts for shared sheets (a placement's instance CSS), per style target.
const refCounts = new WeakMap(); // target -> Map(key -> count)

/**
 * Add (or update) a shared sheet and count the user; the returned release() removes the sheet
 * when its last user is gone. Used for per-placement instance CSS.
 */
export function acquireStyle(target, key, cssText, slot) {
    if (!target) return () => {};
    ensureStyle(target, key, cssText, slot);
    let counts = refCounts.get(target);
    if (!counts) refCounts.set(target, (counts = new Map()));
    counts.set(key, (counts.get(key) || 0) + 1);
    let released = false;
    return () => {
        if (released) return;
        released = true;
        const n = (counts.get(key) || 1) - 1;
        if (n > 0) counts.set(key, n);
        else {
            counts.delete(key);
            removeStyle(target, key);
        }
    };
}

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
        bytes: el.textContent.length,
    }));
}
