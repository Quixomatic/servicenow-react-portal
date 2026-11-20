// Doc links for the Docs activity: resolution (the same rule as utilities:app/docs
// resolveDocHref), relative links for the link picker, and the broken-link scan.

/** GitHub-style heading slugs (utilities:app/markdown createSlugger, scripts' docs-text.ts). */
export function createSlugger() {
    const seen = {};
    return (text) => {
        const base = String(text)
            .toLowerCase()
            .trim()
            .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
            .replace(/\s/g, '-');
        if (seen[base] === undefined) {
            seen[base] = 0;
            return base;
        }
        seen[base]++;
        return base + '-' + seen[base];
    };
}

/** Heading text → plain text, close to the renderer's tokensToText (inline markup dropped). */
function headingText(s) {
    return String(s)
        .replace(/`([^`]*)`/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/(\*\*|__)(.+?)\1/g, '$2')
        .replace(/(\*|_)(\S(?:.*?\S)?)\1/g, '$2')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/<\/?[a-z][\w-]*(\s[^<>]*)?\/?>/gi, '')
        .replace(/\\([\\`*_{}\[\]()#+\-.!|<>])/g, '$1')
        .trim();
}

/** Every heading of a Markdown body with its anchor id (all depths, like the renderer). */
export function headingsOf(markdown) {
    const slug = createSlugger();
    const out = [];
    let fence = null;
    String(markdown || '')
        .split('\n')
        .forEach((line, i) => {
            const f = line.match(/^\s{0,3}(`{3,}|~{3,})/);
            if (f) {
                if (!fence) fence = f[1];
                else if (line.trim().startsWith(fence)) fence = null;
                return;
            }
            if (fence) return;
            const h = line.match(/^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
            if (h) {
                const text = headingText(h[2]);
                out.push({ depth: h[1].length, text, slug: slug(text), line: i + 1 });
            }
        });
    return out;
}

/** Doc route path ('' / 'index' / 'concepts/layouts') → doc path. */
export function docPathOf(route) {
    const p = String(route || '')
        .replace(/^\/+|\/+$/g, '')
        .replace(/\.md$/, '');
    return !p || p === 'index' ? 'index' : p.replace(/\/index$/, '') || 'index';
}

/** A Markdown href relative to the doc at `fromPath` (utilities:app/docs resolveDocHref). */
export function resolveDocHref(href, fromPath) {
    const h = String(href || '');
    if (h.startsWith('#')) return { kind: 'hash', hash: safeDecode(h.slice(1)) };
    if (/^[a-z][a-z0-9+.-]*:/i.test(h) || h.startsWith('//') || h.startsWith('/')) return { kind: 'external', href: h };
    const [file, hash = ''] = h.split('#');
    if (!/\.md$/i.test(file)) return { kind: 'external', href: h };
    const base = (fromPath || 'index').split('/').slice(0, -1);
    for (const seg of file.split('/')) {
        if (seg === '..') base.pop();
        else if (seg && seg !== '.') base.push(seg);
    }
    return { kind: 'doc', path: docPathOf(base.join('/')), hash: safeDecode(hash) };
}

function safeDecode(s) {
    try {
        return decodeURIComponent(s);
    } catch (e) {
        return s;
    }
}

/** The relative .md link from the doc at fromPath to toPath (and #hash). */
export function relativeDocLink(fromPath, toPath, hash) {
    const tail = hash ? '#' + hash : '';
    if (fromPath === toPath) return tail || '#';
    const from = (fromPath || 'index').split('/').slice(0, -1);
    const to = String(toPath).split('/');
    let i = 0;
    while (i < from.length && i < to.length - 1 && from[i] === to[i]) i++;
    const ups = from.length - i;
    const rel = (ups ? '../'.repeat(ups) : '') + to.slice(i).join('/') + '.md';
    return rel + tail;
}

/**
 * Inline links / images in a Markdown body with their positions, outside fenced code and code
 * spans: [{ href, image, line (1-based), from, to (offsets of the target in the document) }].
 */
export function linksOf(markdown) {
    const src = String(markdown || '');
    const out = [];
    let fence = null;
    let offset = 0;
    src.split('\n').forEach((line, i) => {
        const start = offset;
        offset += line.length + 1;
        const f = line.match(/^\s{0,3}(`{3,}|~{3,})/);
        if (f) {
            if (!fence) fence = f[1];
            else if (line.trim().startsWith(fence)) fence = null;
            return;
        }
        if (fence) return;
        // Blank out code spans so their brackets don't count.
        const text = line.replace(/(`+)[\s\S]*?\1/g, (m) => ' '.repeat(m.length));
        const re = /(!?)\[(?:[^\]\\]|\\.)*\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
        let m;
        while ((m = re.exec(text))) {
            let target = m[2];
            const at = m.index + m[0].indexOf(target, m[0].indexOf(']('));
            if (target.startsWith('<')) target = target.slice(1, -1);
            out.push({
                href: target,
                image: m[1] === '!',
                line: i + 1,
                from: start + at,
                to: start + at + m[2].length,
            });
        }
    });
    return out;
}

/**
 * Broken internal links: .md targets that aren't an active page, anchors missing from the target's
 * headings (this page's anchors come from the current text). pagesByPath: { path: { active, headings } }.
 * → [{ line, from, to, message, severity }]
 */
export function brokenLinks(markdown, path, pagesByPath) {
    const own = new Set(headingsOf(markdown).map((h) => h.slug));
    const problems = [];
    linksOf(markdown).forEach((l) => {
        if (l.image) return;
        const r = resolveDocHref(l.href, path);
        if (r.kind === 'external') {
            if (/^\.{0,2}\//.test(l.href) && !/\.md(#|$)/.test(l.href))
                problems.push({
                    ...l,
                    severity: 'warning',
                    message: `"${l.href}" isn't a .md link, so the docs portal opens it as a plain URL`,
                });
            return;
        }
        if (r.kind === 'hash') {
            if (r.hash && !own.has(r.hash))
                problems.push({
                    ...l,
                    severity: 'warning',
                    message: `No heading on this page has the anchor #${r.hash}`,
                });
            return;
        }
        const page = r.path === path ? { active: true, headings: null } : pagesByPath[r.path];
        if (!page) problems.push({ ...l, severity: 'error', message: `No doc page "${r.path}" (from ${l.href})` });
        else if (page.active === false)
            problems.push({ ...l, severity: 'warning', message: `"${r.path}" is deactivated` });
        else if (r.hash) {
            const ids = page.headings ? new Set(page.headings.map((h) => h.slug || h.id)) : own;
            // Saved headings_json holds depths 2–4; deeper or h1 anchors are checked loosely.
            if (!ids.has(r.hash) && !(page.headings && page.headings.length === 0))
                problems.push({ ...l, severity: 'warning', message: `"${r.path}" has no heading #${r.hash}` });
        }
    });
    return problems;
}
