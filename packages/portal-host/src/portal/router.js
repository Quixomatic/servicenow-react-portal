// Minimal client-side router over the bootstrap page list. M1 replaces this with a TanStack
// memory router; the contract stays: '' resolves to portal.homeRoute, routes may declare
// :params (e.g. "orders/:id").

/** The page path to resolve: the location's page, or the portal's home route for ''. */
export function resolvePath(portal, page) {
    const path = (page || '').replace(/^\/+|\/+$/g, '');
    return path || (portal && portal.homeRoute) || '';
}

export function matchRoute(pattern, path) {
    const a = String(pattern || '').split('/');
    const b = String(path || '').split('/');
    if (a.length !== b.length) return null;
    const params = {};
    for (let i = 0; i < a.length; i += 1) {
        if (a[i].charAt(0) === ':') params[a[i].slice(1)] = safeDecode(b[i]);
        else if (a[i] !== b[i]) return null;
    }
    return params;
}

function safeDecode(value) {
    try {
        return decodeURIComponent(value);
    } catch (error) {
        return value;
    }
}

/** Match a path against the bootstrap pages: exact routes first, then patterns. */
export function matchPage(pages, path) {
    const list = pages || [];
    const exact = list.find((p) => p.route === path);
    if (exact) return { page: exact, params: {} };
    for (let i = 0; i < list.length; i += 1) {
        if (list[i].route.indexOf(':') === -1) continue;
        const params = matchRoute(list[i].route, path);
        if (params) return { page: list[i], params };
    }
    return null;
}
