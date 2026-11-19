/**
 * Path rules for source files, build assets and routes.
 */

/**
 * Normalize a project-relative source path: forward slashes, no leading './' or '/',
 * collapse '.' segments, and reject anything that escapes the project ('..').
 * Returns null when the path is invalid.
 */
export function normalizeSourcePath(raw: string): string | null {
    if (!raw) return null
    let p = String(raw).trim().replace(/\\/g, '/')
    if (p.indexOf('\u0000') >= 0) return null
    const out: string[] = []
    for (const seg of p.split('/')) {
        if (seg === '' || seg === '.') continue
        if (seg === '..') return null
        if (!/^[A-Za-z0-9._@+-]+$/.test(seg)) return null
        out.push(seg)
    }
    if (!out.length) return null
    p = out.join('/')
    return p.length > 255 ? null : p
}

/** Build asset paths are flat file names so they map to one URL segment. */
export function isValidAssetPath(p: string): boolean {
    return !!p && p.length <= 200 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p) && p.indexOf('..') < 0
}

/** Infer a source target from a path's extension. */
export function inferTarget(path: string): 'client' | 'server' | 'style' | 'asset' {
    const lower = path.toLowerCase()
    if (/\.server\.(t|j)s$/.test(lower)) return 'server'
    if (/\.(css|scss|sass)$/.test(lower)) return 'style'
    if (/\.(tsx?|jsx?|mjs|cjs|json)$/.test(lower)) return 'client'
    return 'asset'
}

export function mimeFor(path: string): string {
    const lower = path.toLowerCase()
    if (/\.(m?js|cjs)$/.test(lower)) return 'text/javascript'
    if (/\.tsx?$/.test(lower)) return 'text/plain'
    if (/\.jsx$/.test(lower)) return 'text/plain'
    if (/\.css$/.test(lower)) return 'text/css'
    if (/\.s[ac]ss$/.test(lower)) return 'text/plain'
    if (/\.json$/.test(lower) || /\.map$/.test(lower)) return 'application/json'
    if (/\.wasm$/.test(lower)) return 'application/wasm'
    if (/\.svg$/.test(lower)) return 'image/svg+xml'
    if (/\.html?$/.test(lower)) return 'text/html'
    return 'text/plain'
}

/* ---------------- Routes ---------------- */

/**
 * Normalize a page route pattern: no leading/trailing slashes, segments are static
 * ([a-z0-9-_.]), ':param', or a final '*'. '' is the home route.
 * Returns null when invalid.
 */
export function normalizeRoutePattern(raw: string): string | null {
    const trimmed = (raw || '').trim().replace(/^\/+|\/+$/g, '')
    if (trimmed === '') return ''
    const segs = trimmed.split('/')
    for (let i = 0; i < segs.length; i++) {
        const s = segs[i]
        if (s === '*') {
            if (i !== segs.length - 1) return null
            continue
        }
        if (s.charAt(0) === ':') {
            if (!/^:[A-Za-z_][A-Za-z0-9_]*$/.test(s)) return null
            continue
        }
        if (!/^[A-Za-z0-9._~-]+$/.test(s)) return null
    }
    return segs.join('/')
}

export interface RouteMatch {
    params: Record<string, string>
    score: number
}

/**
 * Match a decoded portal-relative path against a route pattern.
 * Score favors static segments over params over splats, so the most specific route wins.
 */
export function matchRoute(pattern: string, path: string): RouteMatch | null {
    const p = (path || '').replace(/^\/+|\/+$/g, '')
    if (pattern === '') return p === '' ? { params: {}, score: 1000 } : null
    const pSegs = pattern.split('/')
    const vSegs = p === '' ? [] : p.split('/')
    const params: Record<string, string> = {}
    let score = 0
    for (let i = 0; i < pSegs.length; i++) {
        const ps = pSegs[i]
        if (ps === '*') {
            params['*'] = vSegs.slice(i).join('/')
            return { params, score: score + 1 }
        }
        if (i >= vSegs.length) return null
        if (ps.charAt(0) === ':') {
            params[ps.substring(1)] = vSegs[i]
            score += 10
        } else if (ps === vSegs[i]) {
            score += 100
        } else {
            return null
        }
    }
    return vSegs.length === pSegs.length ? { params, score } : null
}
