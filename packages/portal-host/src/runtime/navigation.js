import React, { createContext, useContext } from 'react';
import { toSearchParams } from './location';
import { recordDispatch } from './diagnostics';

// Outgoing navigation (spec §8.1). The platform owns the URL: we never touch window.history.
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
	const portalSlug = to.portalSlug !== undefined && to.portalSlug !== null && to.portalSlug !== '' ? String(to.portalSlug) : current.portalSlug || '';
	const page = to.page ? String(to.page).replace(/^\/+|\/+$/g, '') : '';
	const recordId = to.recordId !== undefined && to.recordId !== null ? String(to.recordId) : '';
	const q = toSearchParams(to.q).toString();
	if (settings.preEncode) {
		return { portalSlug, page: encodeURIComponent(page), recordId, q: q ? encodeURIComponent(q) : '' };
	}
	return { portalSlug, page, recordId, q };
}

/**
 * navigate(to, { recordId?, q?, portalSlug? }?) bound to a host's dispatch and current location.
 * `to` is the portal-relative page path; '' means the portal home. Cross-portal navigation is
 * explicit: pass portalSlug. (An object { page | to, recordId, q, portalSlug } is also accepted.)
 */
export function createNavigate(dispatch, current) {
	return function navigate(to, opts) {
		let target;
		if (to && typeof to === 'object') target = { ...to, page: to.to !== undefined ? to.to : to.page };
		else target = { ...(opts || {}), page: to === undefined || to === null ? '' : String(to) };
		const payload = buildNavigatePayload(current, target);
		recordDispatch(payload);
		dispatch(PORTAL_NAVIGATE, payload);
	};
}

export const NavigationContext = createContext(() => {
	throw new Error('navigate() used outside the portal host');
});

/** useNavigate() -> (to, { recordId?, q?, portalSlug? }?) => void */
export function useNavigate() {
	return useContext(NavigationContext);
}

/**
 * <Link to="orders/42" recordId="42" q={{ view: 'summary' }}>Order 42</Link>
 * `to` is the portal-relative page path ('' = home). Extras beyond the runtime contract:
 * `portalSlug` for an explicit cross-portal link, `render` to make any element (e.g. a
 * Button) the clickable element, Base UI style. `page` is accepted as an alias of `to`.
 */
export function Link({ to, page, recordId, q, portalSlug, render, children, className, onClick, ...rest }) {
	const navigate = useNavigate();
	const path = to !== undefined ? to : page || '';
	const handleClick = (event) => {
		if (onClick) onClick(event);
		if (event.defaultPrevented) return;
		event.preventDefault();
		navigate(path, { recordId, q, portalSlug });
	};
	const props = { ...rest, className, onClick: handleClick, href: '#', 'data-portal-page': path || '', children };
	return render ? React.cloneElement(render, props) : <a {...props} />;
}
