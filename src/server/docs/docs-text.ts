/**
 * Doc page analysis shared by the docs seed (scripts/seed/docs-lib.mjs, run by Node with native
 * type stripping) and the server (./docs-service.ts, Studio saves; it lives under src/server because only src/server modules are packaged). Both sides must
 * compute byte-identical headings_json / search_text / content_hash for the same content, so this
 * is the only copy. Pure: no imports, no platform APIs; the caller supplies sha256 (node:crypto on
 * the seed, GlideDigest on the instance).
 *
 * Keep it erasable TypeScript (type annotations only: no enums, namespaces or parameter
 * properties) so Node can run it without a build step.
 *
 * Heading slugs follow GitHub's algorithm (lower-case, punctuation dropped, spaces → '-',
 * duplicates suffixed -1, -2 …), the same as utilities:app/markdown's createSlugger on the client.
 */

export type DocHeading = { depth: number; text: string; slug: string };
export type DocSearchSection = { h: string; t: string; x: string };

/** `key: value` frontmatter (strings, numbers, [a, b] lists). Returns { data, body }. */
export function parseFrontmatter(text: string): { data: Record<string, any>; body: string } {
    const src = String(text).replace(/\r\n/g, '\n');
    const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!m) return { data: {}, body: src };
    const data: Record<string, any> = {};
    for (const line of m[1].split('\n')) {
        const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!kv) continue;
        let v: any = kv[2].trim();
        if (/^\[.*\]$/.test(v))
            v = v
                .slice(1, -1)
                .split(',')
                .map((s: string) => s.trim().replace(/^['"]|['"]$/g, ''))
                .filter(Boolean);
        else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
        else v = v.replace(/^['"]|['"]$/g, '');
        data[kv[1]] = v;
    }
    return { data, body: src.slice(m[0].length) };
}

/**
 * A frontmatter value that parseFrontmatter reads back as exactly `value` (a string, or a list of
 * strings). Strings it would misread (numbers, [lists], surrounding quotes) are wrapped in quotes.
 */
export function frontmatterValue(value: string | string[]): string {
    if (Array.isArray(value))
        return (
            '[' +
            value
                .map((s) => String(s).trim())
                .filter(Boolean)
                .join(', ') +
            ']'
        );
    const v = String(value == null ? '' : value)
        .replace(/[\r\n]+/g, ' ')
        .trim();
    const misread = /^-?\d+(\.\d+)?$/.test(v) || /^\[.*\]$/.test(v) || /^['"]|['"]$/.test(v);
    return misread ? '"' + v + '"' : v;
}

/** Inline Markdown → plain text (code spans keep their text, links their label). */
export function inlineText(s: string): string {
    // Code spans are set aside first, so their underscores, asterisks and <tags> stay literal.
    const codes: string[] = [];
    const out = s
        .replace(
            /(`+)([\s\S]*?[^`])\1(?!`)/g,
            (_: string, __: string, code: string) => '\u0000' + (codes.push(code.trim()) - 1) + '\u0000'
        )
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/(^|[^\w])__(.+?)__(?=[^\w]|$)/g, '$1$2')
        .replace(/\*(\S(?:.*?\S)?)\*/g, '$1')
        .replace(/(^|[^\w])_(\S(?:.*?\S)?)_(?=[^\w]|$)/g, '$1$2')
        .replace(/<\/?[a-z][\w-]*(\s[^<>]*)?\/?>/gi, '')
        .replace(/\\([\\`*_{}\[\]()#+\-.!|<>])/g, '$1');
    return out.replace(/\u0000(\d+)\u0000/g, (_: string, i: string) => codes[Number(i)]).trim();
}

/** GitHub-style heading slugs, deduplicated per document. */
export function createSlugger(): (text: string) => string {
    const seen: Record<string, number> = {};
    return (text: string) => {
        const base = String(text)
            .toLowerCase()
            .trim()
            .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
            .replace(/\s/g, '-');
        let slug = base;
        if (seen[base] !== undefined) {
            seen[base]++;
            slug = base + '-' + seen[base];
        } else seen[base] = 0;
        return slug;
    };
}

/**
 * Headings (depth 2–4) and the search sections of a Markdown body. Fenced code is skipped for
 * headings and kept out of the search text (identifiers in inline code stay searchable).
 */
export function analyse(body: string): { headings: DocHeading[]; search: DocSearchSection[] } {
    const slug = createSlugger();
    const headings: DocHeading[] = [];
    const sections: { h: string; t: string; x: string[] }[] = [{ h: '', t: '', x: [] }];
    let fence: string | null = null;
    for (const line of String(body).split('\n')) {
        const f = line.match(/^\s{0,3}(`{3,}|~{3,})/);
        if (f) {
            if (!fence) fence = f[1];
            else if (line.trim().startsWith(fence)) fence = null;
            continue;
        }
        if (fence) continue;
        const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
        if (h) {
            const text = inlineText(h[2]);
            const id = slug(text);
            if (h[1].length >= 2 && h[1].length <= 4) headings.push({ depth: h[1].length, text, slug: id });
            if (h[1].length >= 2) sections.push({ h: id, t: text, x: [] });
            continue;
        }
        const plain = inlineText(
            line
                .replace(/^\s*>\s?/, '')
                .replace(/^\s*([-*+]|\d+[.)])\s+/, '')
                .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/, '')
                .replace(/\|/g, ' ')
        );
        if (plain) sections[sections.length - 1].x.push(plain);
    }
    const search = sections
        .map((s) => ({ h: s.h, t: s.t, x: s.x.join(' ').replace(/\s+/g, ' ').trim() }))
        .filter((s) => s.h || s.x);
    return { headings, search };
}

/** Sorted-key JSON (the hash input): the same bytes for the same data on Node and the instance. */
export function canonical(x: any): string {
    if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
    if (x && typeof x === 'object')
        return (
            '{' +
            Object.keys(x)
                .sort()
                .map((k) => JSON.stringify(k) + ':' + canonical(x[k]))
                .join(',') +
            '}'
        );
    return JSON.stringify(x);
}

/** The fields of a doc row that the seed writes and the hash covers (everything but the hash). */
export const DOC_HASH_FIELDS = [
    'path',
    'title',
    'description',
    'section',
    'section_slug',
    'section_order',
    'order',
    'tags',
    'icon',
    'source_path',
    'markdown',
    'headings_json',
    'search_text',
    'active',
];

export type DocRowInput = {
    path: string;
    title: string;
    description: string;
    section: string;
    section_slug: string;
    section_order: number;
    order: number;
    tags: string;
    icon: string;
    markdown: string;
    active: boolean;
};

export type DocRow = DocRowInput & {
    source_path: string;
    headings_json: DocHeading[];
    search_text: string;
    content_hash?: string;
};

/**
 * The full row for the given content: derived fields (source_path, headings_json, search_text)
 * computed exactly as the seed does. The caller adds content_hash = docHash(row, sha256).
 */
export function buildDocRow(input: DocRowInput): DocRow {
    const { headings, search } = analyse(input.markdown);
    return {
        path: input.path,
        title: String(input.title || input.path),
        description: String(input.description || ''),
        section: String(input.section || ''),
        section_slug: String(input.section_slug || ''),
        section_order: Number(input.section_order),
        order: Number(input.order),
        tags: String(input.tags || ''),
        icon: String(input.icon || ''),
        source_path: 'docs/guide/' + input.path + '.md',
        markdown: String(input.markdown || ''),
        headings_json: headings,
        search_text: JSON.stringify(search),
        active: input.active !== false,
    };
}

/** Hash input of a row: canonical JSON of every hashed field (content_hash excluded). */
export function docHashInput(row: Record<string, any>): string {
    const copy: Record<string, any> = {};
    for (const k of Object.keys(row)) if (k !== 'content_hash') copy[k] = row[k];
    return canonical(copy);
}

/** content_hash: the first 32 hex digits of sha256(docHashInput(row)). */
export function docHash(row: Record<string, any>, sha256Hex: (text: string) => string): string {
    return sha256Hex(docHashInput(row)).toLowerCase().slice(0, 32);
}
