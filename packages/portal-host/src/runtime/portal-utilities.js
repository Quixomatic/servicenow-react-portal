// The portal utilities sheet (manifest v5): one Tailwind sheet per portal, compiled at reprocess from
// the union of every component build in the portal's manifest plus the host's classes, in
// @layer rp-portal. The bootstrap describes it as { css, hash, covers }.
//
// Rule: a build's own utilities sheet is skipped exactly when its utilitiesKey is in `covers` AND the
// portal sheet is loaded and injected into the same shadow root. Everything else (dynamic models
// outside the manifest, Studio preview, a build compiled after the last reprocess) falls back to its
// own utilities sheet, in the `fallback` slot before the portal sheet. The framework CSS is never
// touched: if the portal sheet is missing or fails, the host keeps its styles.
import { useLayoutEffect } from 'react';
import { ensureStyle, removeStyle } from './styles';
import { loadCss, peekCss } from './loader';

const STYLE_KEY = 'portal-utilities';
const coverSets = new WeakMap(); // descriptor -> Set of utilities keys

function coversOf(utilities) {
    let set = coverSets.get(utilities);
    if (!set) coverSets.set(utilities, (set = new Set(Array.isArray(utilities.covers) ? utilities.covers : [])));
    return set;
}

/** Start downloading the sheet (route loader). Never rejects; resolves true when it loaded. */
export function loadPortalUtilities(utilities) {
    if (!utilities || !utilities.css) return Promise.resolve(false);
    return loadCss(utilities.css).then(
        () => true,
        () => false
    );
}

/**
 * The keys the portal sheet covers, once its text is loaded (synchronous); null otherwise. Pass
 * `optimistic` to get them before the sheet arrives (prefetch only skips downloads with it; the
 * widgets themselves re-check, and fall back if the sheet failed).
 */
export function portalCovers(utilities, optimistic) {
    if (!utilities || !utilities.css) return null;
    if (!optimistic && peekCss(utilities.css) === undefined) return null;
    return coversOf(utilities);
}

/** Injects the portal sheet into `target` (the host's shadow root) while it is loaded. */
export function usePortalUtilities(target, utilities) {
    const url = utilities && utilities.css ? utilities.css : '';
    const text = url ? peekCss(url) : undefined;
    useLayoutEffect(() => {
        if (!target) return;
        if (text === undefined) removeStyle(target, STYLE_KEY);
        else
            ensureStyle(
                target,
                STYLE_KEY,
                `/* portal utilities ${utilities.hash.slice(0, 12)} */\n${text}`,
                'utilities'
            );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, url, text]);
}
