/**
 * utilities:app/markdown — GitHub-flavoured Markdown straight to React elements (no HTML strings,
 * no innerHTML, so nothing to sanitise). Tokenising is marked's lexer (v16.4.2, MIT, vendored in
 * ./vendor/marked.js); rendering is ours, and every block or inline element can be swapped.
 *
 *   import { Markdown, parseMarkdown } from 'utilities:app/markdown'
 *
 *   const doc = parseMarkdown(source)          // { tokens, headings } — heading ids assigned
 *   <Markdown doc={doc} components={{ code: MyCodeBlock, link: MyLink }} />
 *   <Markdown source="**hi**" />               // parses for you (memoised on the source)
 *
 * Components (all optional; each gets the marked token plus rendered children where it has any):
 *   heading({ token, id, depth, children })     code({ token, lang, meta, text })
 *   blockquote({ token, children })             table({ token, children })  (children = <thead>/<tbody>)
 *   link({ token, href, title, children })      image({ token, src, alt, title })
 *   codespan({ token, text })                   list({ token, ordered, start, children })
 *   paragraph({ token, children })              hr({ token })     html({ token, text })
 * Raw HTML in the source is shown as text (html → its literal source), never parsed.
 *
 * Helpers: parseMarkdown, lexMarkdown, createSlugger (GitHub slugs), tokensToText, extractHeadings,
 * decodeEntities, safeHref. Same slug algorithm as the docs seed (scripts/seed/docs-lib.mjs).
 */
import { createElement, Fragment, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Lexer } from './vendor/marked'

export type Token = { type: string; raw?: string; text?: string; tokens?: Token[]; [key: string]: any }
export type Heading = { depth: number; text: string; id: string }
export type ParsedMarkdown = { tokens: Token[]; headings: Heading[] }
export type MarkdownComponents = Partial<Record<'heading' | 'code' | 'blockquote' | 'table' | 'link' | 'image' | 'codespan' | 'list' | 'paragraph' | 'hr' | 'html', (props: any) => ReactNode>>

/** marked's GFM lexer (tables, strikethrough, task lists, autolinks). */
export function lexMarkdown(source: string): Token[] {
    return Lexer.lex(String(source || '').replace(/\r\n/g, '\n'), { gfm: true }) as Token[]
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', copy: '©', rarr: '→', larr: '←', times: '×' }
/** HTML entities in Markdown text (&amp; &lt; &#39; &#x2014; …) → characters. */
export function decodeEntities(s: string): string {
    return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
        if (e[0] === '#') {
            const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
            return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m
        }
        return ENTITIES[e.toLowerCase()] ?? m
    })
}

/** GitHub-style heading slugs: lower-case, punctuation dropped, spaces → '-', duplicates -1, -2 … */
export function createSlugger() {
    const seen: Record<string, number> = {}
    return (text: string) => {
        const base = String(text).toLowerCase().trim().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').replace(/\s/g, '-')
        if (seen[base] === undefined) {
            seen[base] = 0
            return base
        }
        seen[base]++
        return base + '-' + seen[base]
    }
}

/** Plain text of inline tokens (code spans keep their text, links their label, html its source). */
export function tokensToText(tokens: Token[] | undefined): string {
    let out = ''
    for (const t of tokens || []) {
        if (t.tokens && t.type !== 'codespan') out += tokensToText(t.tokens)
        else if (t.type === 'image') out += t.text || ''
        else if (t.type === 'br') out += ' '
        else if (t.type === 'html') out += ''
        else out += t.type === 'codespan' ? t.text || '' : decodeEntities(t.text || '')
    }
    return out
}

/** Lex and assign heading ids (stored on each heading token as `id`). */
export function parseMarkdown(source: string): ParsedMarkdown {
    const tokens = lexMarkdown(source)
    const slug = createSlugger()
    const headings: Heading[] = []
    for (const t of tokens) {
        if (t.type !== 'heading') continue
        const text = tokensToText(t.tokens).trim()
        t.id = slug(text)
        headings.push({ depth: t.depth, text, id: t.id })
    }
    return { tokens, headings }
}

/** Headings of a given depth range (default 2–3), for a table of contents. */
export function extractHeadings(doc: ParsedMarkdown, min = 2, max = 3): Heading[] {
    return doc.headings.filter((h) => h.depth >= min && h.depth <= max)
}

/** href rule: http(s), mailto, tel, anchors and relative paths; anything else (javascript:, data:) → ''. */
export function safeHref(href: string): string {
    const h = String(href || '').trim()
    if (!h) return ''
    const scheme = h.replace(/[\u0000- ]/g, '').match(/^([a-z][a-z0-9+.-]*):/i)
    if (!scheme) return h
    return ['http', 'https', 'mailto', 'tel'].includes(scheme[1].toLowerCase()) ? h : ''
}

type Ctx = { c: MarkdownComponents; key: number }
const k = (ctx: Ctx) => ctx.key++

function inline(tokens: Token[] | undefined, ctx: Ctx): ReactNode[] {
    const out: ReactNode[] = []
    for (const t of tokens || []) out.push(inlineToken(t, ctx))
    return out
}

function inlineToken(t: Token, ctx: Ctx): ReactNode {
    const key = k(ctx)
    switch (t.type) {
        case 'strong':
            return createElement('strong', { key }, inline(t.tokens, ctx))
        case 'em':
            return createElement('em', { key }, inline(t.tokens, ctx))
        case 'del':
            return createElement('del', { key }, inline(t.tokens, ctx))
        case 'br':
            return createElement('br', { key })
        case 'codespan':
            return ctx.c.codespan ? createElement(ctx.c.codespan, { key, token: t, text: t.text }) : createElement('code', { key }, t.text)
        case 'link': {
            const href = safeHref(t.href)
            const children = inline(t.tokens, ctx)
            if (ctx.c.link) return createElement(ctx.c.link, { key, token: t, href, title: t.title || undefined, children })
            return createElement('a', { key, href: href || undefined, title: t.title || undefined, rel: /^https?:/i.test(href) ? 'noopener noreferrer' : undefined, target: /^https?:/i.test(href) ? '_blank' : undefined }, children)
        }
        case 'image': {
            const src = safeHref(t.href)
            if (ctx.c.image) return createElement(ctx.c.image, { key, token: t, src, alt: t.text, title: t.title || undefined })
            return src && !/^(mailto|tel):/i.test(src) ? createElement('img', { key, src, alt: t.text || '', title: t.title || undefined, loading: 'lazy' }) : null
        }
        case 'html':
            return ctx.c.html ? createElement(ctx.c.html, { key, token: t, text: t.text }) : createElement(Fragment, { key }, t.text)
        case 'escape':
            return createElement(Fragment, { key }, t.text)
        case 'checkbox':
            return createElement('input', { key, type: 'checkbox', checked: !!t.checked, disabled: true, readOnly: true })
        case 'text':
            return t.tokens ? createElement(Fragment, { key }, inline(t.tokens, ctx)) : createElement(Fragment, { key }, decodeEntities(t.text || ''))
        default:
            return t.tokens ? createElement(Fragment, { key }, inline(t.tokens, ctx)) : t.text ? createElement(Fragment, { key }, decodeEntities(t.text)) : null
    }
}

function blocks(tokens: Token[] | undefined, ctx: Ctx, tight = false): ReactNode[] {
    const out: ReactNode[] = []
    for (const t of tokens || []) out.push(blockToken(t, ctx, tight))
    return out
}

function blockToken(t: Token, ctx: Ctx, tight: boolean): ReactNode {
    const key = k(ctx)
    switch (t.type) {
        case 'space':
        case 'def':
            return null
        case 'heading': {
            const children = inline(t.tokens, ctx)
            const tag = 'h' + Math.min(6, Math.max(1, t.depth))
            if (ctx.c.heading) return createElement(ctx.c.heading, { key, token: t, id: t.id, depth: t.depth, children })
            return createElement(tag, { key, id: t.id }, children)
        }
        case 'paragraph': {
            const children = inline(t.tokens, ctx)
            if (ctx.c.paragraph) return createElement(ctx.c.paragraph, { key, token: t, children })
            return createElement('p', { key }, children)
        }
        case 'text':
            // A tight list item's text: inline content without a <p>.
            return tight || !ctx.c.paragraph ? createElement(Fragment, { key }, t.tokens ? inline(t.tokens, ctx) : decodeEntities(t.text || '')) : createElement('p', { key }, inline(t.tokens, ctx))
        case 'code': {
            const info = String(t.lang || '').trim()
            const lang = info.split(/\s+/)[0] || ''
            const meta = info.slice(lang.length).trim()
            if (ctx.c.code) return createElement(ctx.c.code, { key, token: t, lang, meta, text: t.text })
            return createElement('pre', { key }, createElement('code', { 'data-lang': lang || undefined }, t.text))
        }
        case 'blockquote': {
            const children = blocks(t.tokens, ctx)
            if (ctx.c.blockquote) return createElement(ctx.c.blockquote, { key, token: t, children })
            return createElement('blockquote', { key }, children)
        }
        case 'list': {
            const items = (t.items || []).map((item: Token) =>
                createElement('li', { key: k(ctx), 'data-task': item.task ? (item.checked ? 'done' : 'open') : undefined }, blocks(item.tokens, ctx, !t.loose))
            )
            if (ctx.c.list) return createElement(ctx.c.list, { key, token: t, ordered: t.ordered, start: t.start, children: items })
            return createElement(t.ordered ? 'ol' : 'ul', { key, start: t.ordered && t.start !== 1 && t.start !== '' ? t.start : undefined }, items)
        }
        case 'table': {
            const align = (a: string | null) => (a ? { textAlign: a as any } : undefined)
            const head = createElement('thead', { key: 'h' }, createElement('tr', null, (t.header || []).map((cell: Token, i: number) => createElement('th', { key: i, style: align(t.align[i]) }, inline(cell.tokens, ctx)))))
            const body = createElement(
                'tbody',
                { key: 'b' },
                (t.rows || []).map((row: Token[], r: number) => createElement('tr', { key: r }, row.map((cell: Token, i: number) => createElement('td', { key: i, style: align(t.align[i]) }, inline(cell.tokens, ctx)))))
            )
            if (ctx.c.table) return createElement(ctx.c.table, { key, token: t, children: [head, body] })
            return createElement('table', { key }, head, body)
        }
        case 'hr':
            return ctx.c.hr ? createElement(ctx.c.hr, { key, token: t }) : createElement('hr', { key })
        case 'html':
            return ctx.c.html ? createElement(ctx.c.html, { key, token: t, text: t.text }) : createElement('p', { key }, t.text)
        default:
            return t.tokens ? createElement(Fragment, { key }, inline(t.tokens, ctx)) : null
    }
}

/** Render tokens (block level) to React nodes. */
export function renderTokens(tokens: Token[], components: MarkdownComponents = {}): ReactNode {
    return blocks(tokens, { c: components, key: 0 })
}

/** Render inline tokens (a heading's or a table cell's content) to React nodes. */
export function renderInline(tokens: Token[] | undefined, components: MarkdownComponents = {}): ReactNode {
    return inline(tokens, { c: components, key: 0 })
}

export function Markdown({ source, doc, components, skip }: { source?: string; doc?: ParsedMarkdown; components?: MarkdownComponents; skip?: (token: Token, index: number) => boolean }) {
    const parsed = useMemo(() => doc || parseMarkdown(source || ''), [doc, source])
    const tokens = skip ? parsed.tokens.filter((t, i) => !skip(t, i)) : parsed.tokens
    return createElement(Fragment, null, renderTokens(tokens, components || {}))
}

export default Markdown
