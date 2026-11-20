import React, { createContext, useContext } from 'react';
import { readWindowPath, toSearchParams } from './location';
import { recordDispatch } from './diagnostics';
import { requestUrlCheck } from './use-normalized-location';
import { LocationStoreContext } from './contexts';
import { browserNavHistory } from './nav-history';
import { buildSiteHref, fieldsOfTarget, siteBaseOf } from './nav-history-core';

// Outgoing navigation (spec §8.1). The platform owns the URL: we never write window.history (Back
// reads it: history.go(-n), see nav-history.js).
// A navigation is a PORTAL_NAVIGATE action; a UI Builder event handler ("Link to destination",
// page `site`) maps its payload onto the page's URL parameters, which come back to us as
// properties. Only dispatch for user-initiated navigation, never in response to a property change.

export const PORTAL_NAVIGATE = 'PORTAL_NAVIGATE';

// Diagnostics switch: pre-encode page and q before dispatching. Off by default (the payload
// carries plain values and the platform encodes them). The property adapter decodes either way.
const settings = { preEncode: false };

export function getNavigationSettings() {
    return settings;
}

export function setPreEncode(value) {
    settings.preEncode = !!value;
}

/** Builds the PORTAL_NAVIGATE payload. Every field is a string; '' means "absent". */
export function buildNavigatePayload(current, target) {
    const to = target || {};
    const portalSlug =
        to.portalSlug !== undefined && to.portalSlug !== null && to.portalSlug !== ''
            ? String(to.portalSlug)
            : current.portalSlug || '';
    const page = to.page ? String(to.page).replace(/^\/+|\/+$/g, '') : '';
    const recordId = to.recordId !== undefined && to.recordId !== null ? String(to.recordId) : '';
    const q = toSearchParams(to.q).toString();
    // Standard record params, each its own payload field so UIB maps them onto the site page's
    // optional URL params (table, sys_id, view, query). In Studio, `view` is the activity
    // (code | pages | menus) for the studio page's `view` param.
    const str = (v) => (v === undefined || v === null ? '' : String(v));
    const record = {
        table: str(to.table),
        sysId: str(to.sysId !== undefined ? to.sysId : to.sys_id),
        view: str(to.view),
        query: str(to.query),
    };
    // replace: the handler binds Link to destination's `redirect` to it (replaceState, no new entry).
    const replace = !!to.replace;
    // title: a label for the new history entry (Back labels); the site handler may bind it to the tab title.
    const title = str(to.title);
    if (settings.preEncode) {
        return {
            portalSlug,
            page: encodeURIComponent(page),
            recordId,
            q: q ? encodeURIComponent(q) : '',
            ...record,
            query: record.query ? encodeURIComponent(record.query) : '',
            replace,
            title,
        };
    }
    return { portalSlug, page, recordId, q, ...record, replace, title };
}

/** navigate(to, opts) arguments → one target object ({ page, …opts }). */
function targetOf(to, opts) {
    if (to && typeof to === 'object') return { ...to, ...(opts || {}), page: to.to !== undefined ? to.to : to.page };
    return { ...(opts || {}), page: to === undefined || to === null ? '' : String(to) };
}

/**
 * navigate(to, { recordId?, q?, table?, sysId?, view?, query?, portalSlug?, replace?, title?, kind?,
 * skipGuard? }?) bound to a host's dispatch and current location.
 * `to` is the portal-relative page path; '' means the portal home. Cross-portal navigation is
 * explicit: pass portalSlug. (An object { page | to, recordId, q, portalSlug } is also accepted.)
 *   replace    no new history entry (state writes, new → saved record, success screens)
 *   title      label of the new history entry ("Back to <title>")
 *   skipGuard  don't ask the navigation guards (useNavigationGuard) first
 * Returns a Promise<boolean>: false when a navigation guard cancelled it.
 */
export function createNavigate(dispatch, current) {
    return function navigate(to, opts) {
        const target = targetOf(to, opts);
        const nav = browserNavHistory;
        const go = () => {
            const payload = buildNavigatePayload(current, target);
            nav.setHint(target, current.portalSlug);
            recordDispatch(payload);
            dispatch(PORTAL_NAVIGATE, payload);
            // Optional params UIB drops never arrive as property changes: re-read the URL shortly.
            requestUrlCheck();
            return true;
        };
        const slug = current.portalSlug;
        if (!target.skipGuard && nav.hasGuards(slug)) return nav.runGuards(slug).then((ok) => (ok ? go() : false));
        return Promise.resolve(go());
    };
}

export const NavigationContext = createContext(() => {
    throw new Error('navigate() used outside the portal host');
});

/** useNavigate() -> (to, { recordId?, q?, table?, sysId?, view?, query?, portalSlug? }?) => void */
export function useNavigate() {
    return useContext(NavigationContext);
}

/**
 * <Link to="orders/42" recordId="42" q={{ view: 'summary' }}>Order 42</Link>
 * `to` is the portal-relative page path ('' = home). Extras beyond the runtime contract:
 * `portalSlug` for an explicit cross-portal link, `render` to make any element (e.g. a
 * Button) the clickable element, Base UI style. `page` is accepted as an alias of `to`.
 */
export function Link({
    to,
    page,
    recordId,
    q,
    table,
    sysId,
    view,
    query,
    portalSlug,
    replace,
    title,
    render,
    children,
    className,
    onClick,
    ...rest
}) {
    const navigate = useNavigate();
    const locationStore = useContext(LocationStoreContext);
    const path = to !== undefined ? to : page || '';
    const currentSlug = locationStore && locationStore.get() ? locationStore.get().portalSlug : '';
    // A real href in the UIB URL format (James's decision 6): ctrl / middle click open a new tab.
    const href = linkHref({ page: path, recordId, q, table, sysId, view, query, portalSlug }, currentSlug);
    const handleClick = (event) => {
        if (onClick) onClick(event);
        if (event.defaultPrevented) return;
        // Modified clicks, other buttons and target=_blank are the browser's (new tab / window).
        if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (rest.target && rest.target !== '_self') return;
        event.preventDefault();
        navigate(path, { recordId, q, table, sysId, view, query, portalSlug, replace, title });
    };
    const props = { ...rest, className, onClick: handleClick, href, 'data-portal-page': path || '', children };
    return render ? React.cloneElement(render, props) : <a {...props} />;
}

/** The UIB site URL of a target, relative to the current site route ('#' outside one). */
export function linkHref(target, currentSlug) {
    const slug = target.portalSlug || currentSlug;
    if (!slug) return '#';
    const path = readWindowPath();
    const base = siteBaseOf(path, currentSlug) || '/x/312987/portal/site';
    return buildSiteHref(base, fieldsOfTarget(target, slug));
}
