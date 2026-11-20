// Markdown ⇄ ProseMirror JSON for the Docs activity's visual mode. Pure (no imports), so it runs
// in Node for tests (scratchpad de-convert-test.mjs runs it over every page of docs/guide).
//
// Parsing uses the docs renderer's own lexer (lexMarkdown from utilities:app/markdown, marked
// 16.4.2), passed in as `lex`, so the visual model can't disagree with what /site/docs renders.
//
// Losslessness, in three layers:
//   1. Source preservation. Every top-level block remembers its original source. On save, a block
//      whose editor JSON still equals its JSON at load re-emits its original bytes; only edited or
//      new blocks are serialised. An unchanged document returns the original string exactly.
//   2. Self-check per block at load: lex(serialize(convert(block))) must equal lex(block)
//      structurally (canonTokens: raw source, soft-wrap whitespace, entity spelling and escape
//      style ignored). A block that fails, or that holds anything unsupported (raw HTML, link
//      reference definitions, task lists, images inside text…), becomes a `rawMarkdown` node: its
//      source, shown and edited as source, never converted.
//   3. On save, every serialised block is re-parsed; one that doesn't come back as the same JSON
//      is reported as a warning (it may not render exactly as it looked in the editor).
//
// Node types (TipTap names): doc, paragraph, heading{level}, text, hardBreak, bulletList{bullet,
// tight}, orderedList{start, delimiter, tight}, listItem, codeBlock{language, meta}, blockquote,
// callout{kind, label, form}, horizontalRule, image{src, alt, title}, table, tableRow,
// tableHeader / tableCell{align}, rawMarkdown{source}. Marks: link{href, title}, bold, italic,
// strike, code.

class Unsupported extends Error {}
const unsupported = (why) => {
    throw new Unsupported(why);
};

const ENTITIES = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: '\u00a0',
    mdash: '—',
    ndash: '–',
    hellip: '…',
    copy: '©',
    rarr: '→',
    larr: '←',
    times: '×',
};
/** The renderer's entity decoding (utilities:app/markdown decodeEntities). */
export function decodeEntities(s) {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
        if (e[0] === '#') {
            const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
        }
        const v = ENTITIES[e.toLowerCase()];
        return v === undefined ? m : v;
    });
}

/* ---------------- Callouts (the same rule as components:app/docs-content calloutOf) ---------------- */

export const CALLOUT_KINDS = {
    note: 'info',
    info: 'info',
    tip: 'idea',
    hint: 'idea',
    important: 'info',
    warning: 'warning',
    caution: 'warning',
    danger: 'error',
    error: 'error',
    success: 'success',
};

function calloutOf(token) {
    const first = token.tokens && token.tokens[0];
    if (!first || first.type !== 'paragraph' || !first.tokens || !first.tokens.length) return null;
    const lead = first.tokens[0];
    if (lead.type === 'strong') {
        const text = (lead.tokens || [])
            .map((t) => t.text || '')
            .join('')
            .trim();
        const m = text.match(/^([A-Za-z ]+):$/);
        if (!m || !CALLOUT_KINDS[m[1].toLowerCase()]) return null;
        let rest = first.tokens.slice(1);
        if (rest[0] && rest[0].type === 'text')
            rest = [{ ...rest[0], text: String(rest[0].text).replace(/^\s+/, '') }].concat(rest.slice(1));
        return { label: m[1], form: 'bold', first: rest, more: token.tokens.slice(1) };
    }
    if (lead.type === 'text') {
        const m = String(lead.text).match(/^\[!([A-Za-z]+)\]\s*/);
        if (!m || !CALLOUT_KINDS[m[1].toLowerCase()]) return null;
        const rest = [{ ...lead, text: String(lead.text).slice(m[0].length) }].concat(first.tokens.slice(1));
        return { label: m[1], form: 'gfm', first: rest, more: token.tokens.slice(1) };
    }
    return null;
}

/* ---------------- Tokens → JSON ---------------- */

function sameMarks(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function pushText(out, text, marks) {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.type === 'text' && sameMarks(last.marks || [], marks)) {
        last.text += text;
        return;
    }
    const node = { type: 'text', text };
    if (marks.length) node.marks = marks.slice();
    out.push(node);
}

function inline(tokens, marks, out, ctx) {
    for (const t of tokens || []) {
        switch (t.type) {
            case 'text':
                if (t.tokens) inline(t.tokens, marks, out, ctx);
                else pushText(out, decodeEntities(t.text || '').replace(/[ \t]*\n[ \t]*/g, ' '), marks);
                break;
            case 'escape':
                pushText(out, t.text || '', marks);
                break;
            case 'strong':
                inline(t.tokens, marks.concat([{ type: 'bold' }]), out, ctx);
                break;
            case 'em':
                inline(t.tokens, marks.concat([{ type: 'italic' }]), out, ctx);
                break;
            case 'del':
                inline(t.tokens, marks.concat([{ type: 'strike' }]), out, ctx);
                break;
            case 'codespan':
                pushText(out, t.text || '', marks.concat([{ type: 'code' }]));
                break;
            case 'link': {
                if (marks.some((m) => m.type === 'link')) unsupported('nested link');
                if ((t.tokens || []).some((x) => x.type === 'image')) unsupported('image inside a link');
                inline(
                    t.tokens,
                    [{ type: 'link', attrs: { href: t.href || '', title: t.title || null } }].concat(marks),
                    out,
                    ctx
                );
                break;
            }
            case 'br':
                if (ctx.inTable) unsupported('line break in a table cell');
                out.push({ type: 'hardBreak' });
                break;
            default:
                // html, image inside text, checkbox, footnotes …
                unsupported('inline ' + t.type);
        }
    }
    return out;
}

function paragraphOf(tokens, ctx) {
    const content = inline(tokens, [], [], ctx || {});
    return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
}

function blocks(tokens, ctx) {
    const out = [];
    for (const t of tokens || []) {
        if (t.type === 'space') continue;
        out.push(block(t, ctx));
    }
    return out;
}

function block(t, ctx) {
    switch (t.type) {
        case 'heading': {
            const node = { type: 'heading', attrs: { level: t.depth }, content: inline(t.tokens, [], [], {}) };
            if (!node.content.length) delete node.content;
            return node;
        }
        case 'paragraph': {
            const only = (t.tokens || []).filter((x) => !(x.type === 'text' && !String(x.text).trim()));
            if (only.length === 1 && only[0].type === 'image') {
                const img = only[0];
                return { type: 'image', attrs: { src: img.href || '', alt: img.text || '', title: img.title || null } };
            }
            return paragraphOf(t.tokens);
        }
        case 'text':
            // A tight list item's text block.
            return paragraphOf(t.tokens || [{ type: 'text', text: t.text || '' }]);
        case 'code': {
            const info = String(t.lang || '').trim();
            const language = info.split(/\s+/)[0] || '';
            const meta = info.slice(language.length).trim();
            const node = { type: 'codeBlock', attrs: { language: language || null, meta: meta || null } };
            if (t.text) node.content = [{ type: 'text', text: t.text }];
            return node;
        }
        case 'blockquote': {
            const c = calloutOf(t);
            if (c) {
                const content = [];
                const firstPara = paragraphOf(c.first);
                if (firstPara.content) content.push(firstPara);
                content.push(...blocks(c.more, ctx));
                if (!content.length) content.push({ type: 'paragraph' });
                return {
                    type: 'callout',
                    attrs: { kind: c.label.toLowerCase(), label: c.label, form: c.form },
                    content,
                };
            }
            const content = blocks(t.tokens, ctx);
            return { type: 'blockquote', content: content.length ? content : [{ type: 'paragraph' }] };
        }
        case 'list': {
            const items = t.items || [];
            if (items.some((i) => i.task)) unsupported('task list');
            const first = String((items[0] && items[0].raw) || '').trim();
            const content = items.map((item) => {
                const kids = blocks(item.tokens, ctx);
                if (!kids.length) kids.push({ type: 'paragraph' });
                if (kids[0].type !== 'paragraph') unsupported('list item starting with ' + kids[0].type);
                return { type: 'listItem', content: kids };
            });
            if (t.ordered) {
                const m = first.match(/^\d+([.)])/);
                return {
                    type: 'orderedList',
                    attrs: { start: Number(t.start) || 1, delimiter: m ? m[1] : '.', tight: !t.loose },
                    content,
                };
            }
            return {
                type: 'bulletList',
                attrs: { bullet: /^[*+-]/.test(first) ? first[0] : '-', tight: !t.loose },
                content,
            };
        }
        case 'table': {
            const align = t.align || [];
            const cell = (c, header, i) => ({
                type: header ? 'tableHeader' : 'tableCell',
                attrs: { align: align[i] || null },
                content: [paragraphOf(c.tokens, { inTable: true })],
            });
            const rows = [{ type: 'tableRow', content: (t.header || []).map((c, i) => cell(c, true, i)) }];
            (t.rows || []).forEach((r) => rows.push({ type: 'tableRow', content: r.map((c, i) => cell(c, false, i)) }));
            return { type: 'table', content: rows };
        }
        case 'hr':
            return { type: 'horizontalRule' };
        default:
            // html, def (link reference definitions), anything a marked extension adds.
            unsupported(t.type);
    }
    return null;
}

/* ---------------- Token canonical form (the self-check) ---------------- */

function canonInline(tokens) {
    const out = [];
    for (const t of tokens || []) {
        if (t.type === 'text' && !t.tokens) {
            const v = decodeEntities(t.text || '');
            const last = out[out.length - 1];
            if (last && last.type === 'text') last.text += v;
            else out.push({ type: 'text', text: v });
            continue;
        }
        if (t.type === 'escape') {
            const last = out[out.length - 1];
            if (last && last.type === 'text') last.text += t.text;
            else out.push({ type: 'text', text: t.text });
            continue;
        }
        const c = { type: t.type };
        if (t.type === 'codespan') c.text = t.text;
        if (t.type === 'link' || t.type === 'image') {
            c.href = t.href || '';
            c.title = t.title || '';
        }
        if (t.type === 'image') c.alt = t.text || '';
        if (t.type === 'html') c.text = t.text;
        if (t.tokens && t.type !== 'image') c.tokens = canonInline(t.tokens);
        out.push(c);
    }
    // Whitespace runs render as one space (soft wraps included); trim the edges.
    out.forEach((c) => {
        if (c.type === 'text') c.text = c.text.replace(/\s+/g, ' ');
    });
    const f = out[0];
    if (f && f.type === 'text') f.text = f.text.replace(/^\s+/, '');
    const l = out[out.length - 1];
    if (l && l.type === 'text') l.text = l.text.replace(/\s+$/, '');
    return out.filter((c) => !(c.type === 'text' && !c.text));
}

export function canonTokens(tokens) {
    const out = [];
    for (const t of tokens || []) {
        if (t.type === 'space') continue;
        let type = t.type;
        if (type === 'text' && t.tokens) type = 'paragraph';
        const c = { type };
        switch (t.type) {
            case 'heading':
                c.depth = t.depth;
                c.tokens = canonInline(t.tokens);
                break;
            case 'paragraph':
            case 'text':
                c.tokens = canonInline(t.tokens || [{ type: 'text', text: t.text }]);
                break;
            case 'code':
                c.lang = String(t.lang || '')
                    .trim()
                    .replace(/\s+/g, ' ');
                c.text = t.text;
                break;
            case 'blockquote':
                c.tokens = canonTokens(t.tokens);
                break;
            case 'list':
                c.ordered = !!t.ordered;
                c.start = t.ordered ? Number(t.start) || 1 : '';
                c.loose = !!t.loose;
                c.items = (t.items || []).map((i) => ({
                    task: !!i.task,
                    checked: !!i.checked,
                    tokens: canonTokens(i.tokens),
                }));
                break;
            case 'table':
                c.align = t.align;
                c.header = (t.header || []).map((h) => canonInline(h.tokens));
                c.rows = (t.rows || []).map((r) => r.map((h) => canonInline(h.tokens)));
                break;
            case 'html':
                c.text = t.text;
                break;
            case 'def':
                c.tag = t.tag;
                c.href = t.href;
                c.title = t.title;
                break;
            default:
                break;
        }
        out.push(c);
    }
    return out;
}

/* ---------------- JSON → Markdown ---------------- */

const MARK_ORDER = { link: 0, bold: 1, italic: 2, strike: 3, code: 4 };
const OPEN = { bold: '**', italic: '*', strike: '~~' };

function sortMarks(marks) {
    return (marks || [])
        .filter((m) => MARK_ORDER[m.type] !== undefined)
        .slice()
        .sort((a, b) => MARK_ORDER[a.type] - MARK_ORDER[b.type]);
}
function markKey(m) {
    return m.type === 'link'
        ? 'link:' + ((m.attrs && m.attrs.href) || '') + ':' + ((m.attrs && m.attrs.title) || '')
        : m.type;
}

function escapeText(s, ctx) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        const prev = s[i - 1] || '';
        const next = s[i + 1] || '';
        if (ch === '\\' || ch === '*' || ch === '`' || ch === '[' || ch === ']' || ch === '~') out += '\\' + ch;
        else if (ch === '_') out += /[A-Za-z0-9]/.test(prev) && /[A-Za-z0-9]/.test(next) ? '_' : '\\_';
        else if (ch === '<' && /[A-Za-z/!?]/.test(next)) out += '\\<';
        else if (ch === '&' && /^&(#x[0-9a-f]+|#\d+|[a-z]+);/i.test(s.slice(i))) out += '&amp;';
        else if (ch === '|' && ctx.inTable) out += '\\|';
        else if (ch === '\u00a0') out += '&nbsp;';
        else out += ch;
    }
    return out;
}

function codeSpan(text, ctx) {
    let t = ctx.inTable ? text.replace(/\|/g, '\\|') : text;
    const runs = t.match(/`+/g) || [];
    const n = runs.reduce((m, r) => Math.max(m, r.length), 0) + 1;
    const fence = '`'.repeat(n);
    const pad = /^`|`$/.test(t) || /^ .*[^ ].* $/.test(t) ? ' ' : '';
    return fence + pad + t + pad + fence;
}

function linkTail(attrs) {
    const href = String((attrs && attrs.href) || '');
    const title = attrs && attrs.title;
    const h = /[\s()<>]/.test(href) ? '<' + href.replace(/[<>]/g, (c) => encodeURIComponent(c)) + '>' : href;
    return '](' + h + (title ? ' "' + String(title).replace(/(["\\])/g, '\\$1') + '"' : '') + ')';
}

function closeMark(m) {
    return m.type === 'link' ? linkTail(m.attrs) : OPEN[m.type] || '';
}

function inlineMd(nodes, ctx) {
    let out = '';
    let open = [];
    const closeFrom = (k) => {
        if (open.length <= k) return;
        const trailing = out.match(/[ \t]+$/);
        if (trailing) out = out.slice(0, -trailing[0].length);
        for (let i = open.length - 1; i >= k; i--) out += closeMark(open[i]);
        if (trailing) out += trailing[0];
        open = open.slice(0, k);
    };
    for (const node of nodes || []) {
        if (node.type === 'hardBreak') {
            if (ctx.inTable) {
                ctx.warn('A line break in a table cell became a space (Markdown tables are one line per row).');
                out += ' ';
            } else out += '\\\n';
            continue;
        }
        if (node.type === 'image') {
            closeFrom(0);
            out += imageMd(node);
            continue;
        }
        if (node.type !== 'text') continue;
        const marks = sortMarks(node.marks).filter((m) => m.type !== 'code');
        const code = (node.marks || []).some((m) => m.type === 'code');
        let keep = 0;
        while (keep < open.length && keep < marks.length && markKey(open[keep]) === markKey(marks[keep])) keep++;
        closeFrom(keep);
        let text = node.text || '';
        if (marks.length > keep) {
            const lead = text.match(/^[ \t]+/);
            if (lead) {
                out += lead[0];
                text = text.slice(lead[0].length);
            }
            for (let i = keep; i < marks.length; i++) out += marks[i].type === 'link' ? '[' : OPEN[marks[i].type] || '';
            open = marks.slice();
        }
        out += code ? codeSpan(text, ctx) : escapeText(text, ctx);
    }
    closeFrom(0);
    return out;
}

/** Escape what would start a different block at the beginning of a line. */
function escapeLineStarts(s) {
    return s
        .split('\n')
        .map((line) => {
            const l = line.replace(/^[ \t]+/, '');
            if (
                /^#{1,6}(\s|$)/.test(l) ||
                /^>/.test(l) ||
                /^[-+*](\s|$)/.test(l) ||
                /^=+\s*$/.test(l) ||
                /^-+\s*$/.test(l)
            )
                return '\\' + l;
            const num = l.match(/^(\d{1,9})([.)])(\s|$)/);
            if (num) return num[1] + '\\' + l.slice(num[1].length);
            return l;
        })
        .join('\n');
}

function imageMd(node) {
    const a = node.attrs || {};
    return '![' + escapeText(String(a.alt || ''), {}) + linkTail({ href: a.src || '', title: a.title || null });
}

function indent(text, pad) {
    return text
        .split('\n')
        .map((l, i) => (i === 0 || !l ? l : pad + l))
        .join('\n');
}

function blocksMd(nodes, ctx, sep) {
    return (nodes || [])
        .map((n) => serializeBlock(n, ctx))
        .filter((s) => s !== '')
        .join(sep || '\n\n');
}

/** One block node → Markdown (no trailing newline). `ctx.warn(message)` collects warnings. */
export function serializeBlock(node, ctxIn) {
    const ctx = ctxIn || { warn() {} };
    if (!ctx.warn) ctx.warn = () => {};
    const attrs = node.attrs || {};
    switch (node.type) {
        case 'paragraph':
            return escapeLineStarts(inlineMd(node.content, ctx).replace(/^\s+|\s+$/g, ''));
        case 'heading': {
            const level = Math.min(6, Math.max(1, Number(attrs.level) || 1));
            const text = inlineMd(node.content, ctx)
                .replace(/\\\n/g, ' ')
                .trim()
                .replace(/#+$/, (m) => '\\' + m);
            return '#'.repeat(level) + (text ? ' ' + text : '');
        }
        case 'codeBlock': {
            const text = (node.content || []).map((c) => c.text || '').join('');
            const runs = text.match(/^`{3,}/gm) || [];
            const n = Math.max(
                3,
                runs.reduce((m, r) => Math.max(m, r.length + 1), 0)
            );
            const fence = '`'.repeat(n);
            const info = (attrs.language || '') + (attrs.meta ? ' ' + attrs.meta : '');
            return fence + info + '\n' + (text ? text.replace(/\n$/, '') + '\n' : '') + fence;
        }
        case 'blockquote':
            return quote(blocksMd(node.content, ctx));
        case 'callout': {
            const label = attrs.label || cap(attrs.kind || 'note');
            const kids = (node.content || []).slice();
            if (attrs.form === 'gfm')
                return quote(
                    '[!' + label + ']' + (kids.length && blocksMd(kids, ctx) ? '\n' + blocksMd(kids, ctx) : '')
                );
            let head = '**' + label + ':**';
            if (kids[0] && kids[0].type === 'paragraph') {
                const first = serializeBlock(kids.shift(), ctx);
                if (first) head += ' ' + first;
            }
            const rest = blocksMd(kids, ctx);
            return quote(head + (rest ? '\n\n' + rest : ''));
        }
        case 'bulletList':
        case 'orderedList': {
            const ordered = node.type === 'orderedList';
            const tight = attrs.tight !== false;
            const start = Number(attrs.start) || 1;
            const delim = attrs.delimiter === ')' ? ')' : '.';
            const bullet = /^[*+-]$/.test(attrs.bullet || '') ? attrs.bullet : '-';
            return (node.content || [])
                .map((item, i) => {
                    const marker = ordered ? start + i + delim : bullet;
                    const body = blocksMd(item.content, ctx, tight ? '\n' : '\n\n');
                    return marker + (body ? ' ' + indent(body, ' '.repeat(marker.length + 1)) : '');
                })
                .join(tight ? '\n' : '\n\n');
        }
        case 'table': {
            const rows = node.content || [];
            if (!rows.length) return '';
            const cells = (row) =>
                (row.content || []).map((cell) => {
                    const paras = (cell.content || []).filter((p) => p.type === 'paragraph');
                    if ((cell.content || []).length > 1)
                        ctx.warn(
                            'A table cell holds more than one paragraph; they were joined (Markdown cells are one line).'
                        );
                    return paras
                        .map((p) => inlineMd(p.content, { ...ctx, inTable: true }).trim())
                        .filter(Boolean)
                        .join(' ');
                });
            const header = cells(rows[0]);
            const aligns = (rows[0].content || []).map((c) => (c.attrs && c.attrs.align) || null);
            const width = header.length;
            const line = (vals) => '| ' + Array.from({ length: width }, (_, i) => vals[i] || '').join(' | ') + ' |';
            const delim =
                '|' +
                aligns
                    .map((a) =>
                        a === 'left' ? ' :--- ' : a === 'center' ? ' :---: ' : a === 'right' ? ' ---: ' : ' --- '
                    )
                    .join('|') +
                '|';
            return [line(header), delim].concat(rows.slice(1).map((r) => line(cells(r)))).join('\n');
        }
        case 'horizontalRule':
            return '---';
        case 'image':
            return imageMd(node);
        case 'rawMarkdown':
            return String(attrs.source || '').replace(/\n+$/, '');
        default:
            ctx.warn('Unknown block "' + node.type + '" was left out.');
            return '';
    }
}

function quote(text) {
    return text
        .split('\n')
        .map((l) => (l ? '> ' + l : '>'))
        .join('\n');
}

function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------------- Documents ---------------- */

/**
 * Markdown → { doc, blocks, rawCount, reasons, mappable }.
 * blocks[i] = { core, after, raw: bool, reason } for doc.content[i]: core = the block's source
 * without trailing newlines, after = the newlines (and blank lines) that followed it.
 * mappable = false when the token sources don't add up to the input (never seen; the editor then
 * refuses visual mode for the page).
 */
export function markdownToDoc(source, lex) {
    const src = String(source || '').replace(/\r\n/g, '\n');
    const tokens = lex(src);
    const mappable = tokens.map((t) => t.raw || '').join('') === src;
    const content = [];
    const blocksOut = [];
    const reasons = [];
    let lead = '';
    let rawCount = 0;
    for (const t of tokens) {
        const raw = t.raw || '';
        if (t.type === 'space') {
            if (blocksOut.length) blocksOut[blocksOut.length - 1].after += raw;
            else lead += raw;
            continue;
        }
        const core = raw.replace(/\n+$/, '');
        const after = raw.slice(core.length);
        let node = null;
        let reason = '';
        try {
            node = block(t, {});
            const back = canonTokens(lex(serializeBlock(node)));
            const want = canonTokens([t]);
            if (JSON.stringify(back) !== JSON.stringify(want)) reason = 'round trip differs';
        } catch (e) {
            if (!(e instanceof Unsupported)) throw e;
            reason = e.message;
        }
        if (reason) {
            node = { type: 'rawMarkdown', attrs: { source: core } };
            rawCount++;
            reasons.push({ index: content.length, type: t.type, reason, line: lineOf(src, tokens, t) });
        }
        content.push(node);
        blocksOut.push({ core, after, raw: !!reason, reason });
    }
    if (!content.length) content.push({ type: 'paragraph' });
    return { doc: { type: 'doc', content }, blocks: blocksOut, lead, rawCount, reasons, mappable, source: src };
}

function lineOf(src, tokens, target) {
    let offset = 0;
    for (const t of tokens) {
        if (t === target) break;
        offset += (t.raw || '').length;
    }
    return src.slice(0, offset).split('\n').length;
}

/**
 * Source map for an editor: pair the editor's normalised JSON of each top-level node (what
 * editor.getJSON() returns right after loading `parsed.doc`, defaults filled in) with its source.
 */
export function createSourceMap(parsed, normalizedContent) {
    const entries = (normalizedContent || []).map((node, i) => ({
        key: JSON.stringify(node),
        block: parsed.blocks[i] || null,
        index: i,
    }));
    return {
        entries,
        lead: parsed.lead || '',
        source: parsed.source,
        whole: JSON.stringify(normalizedContent || []),
        count: parsed.blocks.length,
    };
}

/**
 * Editor JSON → { markdown, warnings, changed }. Unchanged blocks re-emit their original bytes;
 * edited and new blocks are serialised, then re-parsed with `lex` to verify they come back as
 * the same JSON (a mismatch is a warning: it may render differently from the editor).
 */
export function docToMarkdown(doc, map, lex) {
    const content = (doc && doc.content) || [];
    const warnings = [];
    if (map && map.count === content.length && JSON.stringify(content) === map.whole)
        return { markdown: map.source, warnings, changed: 0 };
    const used = new Set();
    const pick = (key, from) => {
        if (!map) return null;
        for (let i = from; i < map.entries.length; i++)
            if (!used.has(i) && map.entries[i].key === key && map.entries[i].block) return i;
        for (let i = 0; i < from && i < map.entries.length; i++)
            if (!used.has(i) && map.entries[i].key === key && map.entries[i].block) return i;
        return null;
    };
    const parts = [];
    let cursor = 0;
    let changed = 0;
    content.forEach((node, n) => {
        const key = JSON.stringify(node);
        const hit = pick(key, cursor);
        if (hit !== null) {
            used.add(hit);
            cursor = hit + 1;
            parts.push({ text: map.entries[hit].block.core, index: hit, after: map.entries[hit].block.after });
            return;
        }
        const ctx = { warn: (m) => warnings.push({ block: n, message: m }) };
        const text = serializeBlock(node, ctx);
        if (text === '') return;
        changed++;
        if (lex && node.type !== 'rawMarkdown') {
            try {
                const back = markdownToDoc(text, lex).doc.content;
                const again = back.map((b) => serializeBlock(b)).join('\n\n');
                if (again !== text)
                    warnings.push({
                        block: n,
                        message:
                            'This ' +
                            label(node) +
                            ' may not render exactly as it looks in the editor. Check the preview.',
                    });
            } catch (e) {
                warnings.push({ block: n, message: 'Could not verify this ' + label(node) + ': ' + e.message });
            }
        }
        parts.push({ text, index: null, after: null });
    });
    let out = map ? map.lead : '';
    parts.forEach((p, i) => {
        out += p.text;
        const next = parts[i + 1];
        if (!next) return;
        // The original separator only between two blocks that were adjacent in the source.
        if (p.index !== null && next.index === p.index + 1 && p.after) out += p.after;
        else out += '\n\n';
    });
    return { markdown: out.replace(/\n*$/, '\n'), warnings, changed };
}

function label(node) {
    return (
        {
            paragraph: 'paragraph',
            heading: 'heading',
            table: 'table',
            bulletList: 'list',
            orderedList: 'list',
            blockquote: 'quote',
            callout: 'callout',
            codeBlock: 'code block',
        }[node.type] || 'block'
    );
}
