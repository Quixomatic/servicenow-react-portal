import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from 'components:icon'
import { cn } from 'utilities:cn'

/**
 * components:app/toc: a generic "On this page", after fumadocs' TOC (default style), for any page
 * whose headings have ids. Shadow-DOM safe: headings are looked up inside `root` (or the TOC's own
 * root node), and the spy listens to the scroller you name, never `document`.
 *
 *   <Toc items={[{ depth: 2, text: 'Overview', id: 'overview' }, …]} />                  rail (sticky column)
 *   <Toc items container={() => scrollerEl} root={articleEl} offset={96} />
 *   <Toc items variant="compact" title="On this page" />                                  a bar that opens the list
 *   <TocList items active={ids} onSelect={go} />                                          just the track + links
 *   const { active, current } = useTocActive(items, { container, root, offset, anchorRef })
 *   scrollToTocItem(id, { container, root, offset, anchor })                              smooth scroll + focus
 *   <TocProgress value={0.4} />                                                           the bar's progress ring
 *
 * Props: items ({ depth, text, id }), container (scroll container: element or getter; default the
 * nearest scrolling ancestor), root (element or getter that contains the headings; default the TOC's
 * root node), offset (px hidden under sticky bars at the top), onSelect(id) (replaces the built-in
 * smooth scroll), title, footer, className, maxHeight (rail list), variant ('rail' | 'compact').
 *
 * Look: a thin track that bends for nested headings, a primary segment sliding over every section in
 * view, a dot riding the track, muted items that brighten when active, a list with faded edges that
 * keeps the active item in view. Theme tokens, light and dark; reduced motion respected.
 */

export type TocItem = { depth: number; text: string; id: string }
type Target = HTMLElement | null | undefined | (() => HTMLElement | null | undefined)
export type TocSpyOptions = { container?: Target; root?: Target; offset?: number; anchorRef?: { current: HTMLElement | null } }

const resolve = (t: Target): HTMLElement | null => (typeof t === 'function' ? t() || null : t || null)

/** The nearest scrolling ancestor of `el`, crossing shadow roots; the document scroller as a last resort. */
export function scrollParentOf(el: Element | null): HTMLElement {
    let n: any = el
    while (n) {
        n = n.parentElement || (n.parentNode && n.parentNode.host) || null
        if (n && n.nodeType === 1) {
            const s = getComputedStyle(n)
            if (/(auto|scroll|overlay)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) return n
        }
    }
    return (document.scrollingElement as HTMLElement) || document.documentElement
}

/** A heading by id: inside `root` when given, else in the anchor's root node (shadow root or document). */
export function findHeading(id: string, root?: Target, anchor?: Element | null): HTMLElement | null {
    const r = resolve(root)
    const sel = '#' + (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id)
    if (r) return r.querySelector(sel) as HTMLElement | null
    const node: any = anchor ? anchor.getRootNode() : document
    return (node && (node.getElementById ? node.getElementById(id) : node.querySelector(sel))) || null
}

function containerOf(opts: TocSpyOptions): HTMLElement {
    const c = resolve(opts.container)
    if (c) return c
    const r = resolve(opts.root)
    return scrollParentOf(r || (opts.anchorRef && opts.anchorRef.current) || null)
}

const isDoc = (el: HTMLElement) => el === document.scrollingElement || el === document.documentElement || el === document.body

/** Smooth-scroll a heading to just below `offset` inside the container, then focus it (without scrolling). */
export function scrollToTocItem(id: string, opts: TocSpyOptions & { anchor?: Element | null } = {}) {
    const h = findHeading(id, opts.root, opts.anchor || (opts.anchorRef && opts.anchorRef.current))
    if (!h) return
    const c = containerOf({ ...opts, anchorRef: opts.anchorRef || { current: (opts.anchor as HTMLElement) || null } })
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const cTop = isDoc(c) ? 0 : c.getBoundingClientRect().top
    const target = h.getBoundingClientRect().top - cTop + (isDoc(c) ? window.scrollY : c.scrollTop) - (opts.offset || 0) - 12
    ;(isDoc(c) ? window : c).scrollTo({ top: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' })
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1')
    h.focus({ preventScroll: true })
}

/**
 * Scroll-spy. A heading is active while its section (from the heading to the next one) overlaps the
 * visible part of the container below `offset`, so every section in view lights up. Above the first
 * heading, or between sections, the nearest heading above wins. `current` = the first active id.
 */
export function useTocActive(items: TocItem[], opts: TocSpyOptions = {}): { active: string[]; current: string } {
    const [active, setActive] = useState<string[]>([])
    const key = items.map((i) => i.id).join('|')
    const optsRef = useRef(opts)
    optsRef.current = opts
    useEffect(() => {
        if (!items.length) {
            setActive([])
            return undefined
        }
        let frame = 0
        let c: HTMLElement | null = null
        let target: any = null
        const measure = () => {
            frame = 0
            const o = optsRef.current
            const container = containerOf(o)
            if (container !== c) attach(container)
            const doc = isDoc(container)
            const top = (doc ? 0 : container.getBoundingClientRect().top) + (o.offset || 0)
            const bottom = doc ? window.innerHeight : container.getBoundingClientRect().bottom
            const anchor = o.anchorRef && o.anchorRef.current
            const tops = items.map((it) => {
                const h = findHeading(it.id, o.root, anchor)
                return h ? h.getBoundingClientRect().top : NaN
            })
            const out: string[] = []
            let above = -1
            for (let i = 0; i < items.length; i++) {
                const t = tops[i]
                if (isNaN(t)) continue
                let next = Infinity
                for (let j = i + 1; j < items.length; j++)
                    if (!isNaN(tops[j])) {
                        next = tops[j]
                        break
                    }
                if (t <= top + 8) above = i
                if (t < bottom - 24 && next > top + 24) out.push(items[i].id)
            }
            // At the very bottom the last section is being read too.
            const atEnd = doc ? window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 : container.scrollTop + container.clientHeight >= container.scrollHeight - 4
            if (atEnd) {
                const last = items[items.length - 1].id
                if (out.indexOf(last) < 0 && !isNaN(tops[items.length - 1])) out.push(last)
            }
            if (!out.length) out.push(items[Math.max(0, above)].id)
            setActive((prev) => (prev.join('|') === out.join('|') ? prev : out))
        }
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(measure)
        }
        const attach = (container: HTMLElement) => {
            if (target) target.removeEventListener('scroll', onScroll)
            c = container
            target = isDoc(container) ? window : container
            target.addEventListener('scroll', onScroll, { passive: true })
        }
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null
        const r = resolve(opts.root)
        if (ro && r) ro.observe(r)
        window.addEventListener('resize', onScroll)
        measure()
        const late = setTimeout(onScroll, 600)
        return () => {
            if (frame) cancelAnimationFrame(frame)
            clearTimeout(late)
            if (target) target.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
            if (ro) ro.disconnect()
        }
    }, [key])
    return { active, current: active[0] || '' }
}

/* ---------------- Track geometry (fumadocs default style) ---------------- */

const lineX = (level: number) => (level <= 0 ? 8 : level === 1 ? 16 : 24)
const itemPad = (level: number) => (level <= 0 ? 20 : level === 1 ? 32 : 44)

type Geometry = { d: string; w: number; h: number; pos: [number, number][]; len: [number, number][] }

function measureTrack(list: HTMLElement, items: TocItem[], levels: number[]): Geometry | null {
    if (!list.clientHeight) return null
    let d = ''
    let w = 0
    let h = 0
    const pos: [number, number][] = []
    const xs: number[] = []
    items.forEach((it, i) => {
        const a = list.querySelector('a[data-toc-id="' + it.id.replace(/"/g, '\\"') + '"]') as HTMLElement | null
        if (!a) return
        const s = getComputedStyle(a)
        const x = lineX(levels[i]) + 0.5
        const top = a.offsetTop + parseFloat(s.paddingTop)
        const bottom = a.offsetTop + a.clientHeight - parseFloat(s.paddingBottom)
        w = Math.max(w, x + 8)
        h = Math.max(h, bottom)
        if (!pos.length) d += `M${x} ${top} L${x} ${bottom}`
        else {
            const [, ub] = pos[pos.length - 1]
            const ux = xs[xs.length - 1]
            d += ` C ${ux} ${top - 4} ${x} ${ub + 4} ${x} ${top} L${x} ${bottom}`
        }
        pos.push([top, bottom])
        xs.push(x)
    })
    if (!pos.length) return null
    const len: [number, number][] = []
    try {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        p.setAttribute('d', d)
        const total = p.getTotalLength()
        for (let i = 0; i < pos.length; i++) {
            const [top, bottom] = pos[i]
            let l = i > 0 ? len[i - 1][1] + (top - pos[i - 1][1]) : top
            let guard = 0
            while (l < total && p.getPointAtLength(l).y < top && guard++ < 400) l++
            len.push([l, l + bottom - top])
        }
    } catch (e) {
        pos.forEach(([t, b]) => len.push([t, b]))
    }
    return { d, w, h, pos, len }
}

export type TocListProps = {
    items: TocItem[]
    active: string[]
    onSelect: (id: string, e: any) => void
    className?: string
}

/** The track and links. Put it in your own bar or panel; `Toc` uses it for both variants. */
export function TocList({ items, active, onSelect, className }: TocListProps) {
    const listRef = useRef<HTMLDivElement | null>(null)
    const [geo, setGeo] = useState<Geometry | null>(null)
    const prev = useRef<{ start: number; end: number; up: boolean } | null>(null)
    const min = useMemo(() => items.reduce((m, it) => Math.min(m, it.depth), Infinity), [items])
    const levels = useMemo(() => items.map((it) => Math.min(2, it.depth - (isFinite(min) ? min : it.depth))), [items, min])
    const key = items.map((i) => i.id + ':' + i.depth).join('|')
    const remeasure = useCallback(() => {
        if (listRef.current) setGeo(measureTrack(listRef.current, items, levels))
    }, [key])
    useLayoutEffect(() => {
        remeasure()
        const el = listRef.current
        if (!el || typeof ResizeObserver === 'undefined') return undefined
        const ro = new ResizeObserver(() => remeasure())
        ro.observe(el)
        return () => ro.disconnect()
    }, [remeasure])

    const start = items.findIndex((it) => active.indexOf(it.id) >= 0)
    let end = -1
    for (let i = items.length - 1; i >= 0; i--)
        if (active.indexOf(items[i].id) >= 0) {
            end = i
            break
        }
    const vars: Record<string, string> = {}
    if (geo && start >= 0 && geo.pos[start] && geo.pos[end]) {
        let up = false
        if (prev.current) up = prev.current.start > start || prev.current.end > end || (prev.current.start === start && prev.current.end === end && prev.current.up)
        vars['--rp-toc-top'] = geo.pos[start][0] + 'px'
        vars['--rp-toc-bottom'] = geo.pos[end][1] + 'px'
        vars['--rp-toc-dist'] = (up ? geo.len[start][0] : geo.len[end][1]) + 'px'
        vars['--rp-toc-thumb'] = '1'
    }
    useEffect(() => {
        if (start >= 0) prev.current = { start, end, up: !!(prev.current && (prev.current.start > start || prev.current.end > end)) }
    }, [start, end])

    // Keep the first active entry in view inside the list's own scroll area (never the page).
    useEffect(() => {
        const list = listRef.current
        if (!list || start < 0) return
        const area = list.closest('.rp-toc-scroll') as HTMLElement | null
        const a = list.querySelector('a[data-toc-id="' + items[start].id.replace(/"/g, '\\"') + '"]') as HTMLElement | null
        if (!area || !a || area.scrollHeight <= area.clientHeight) return
        const top = a.offsetTop - area.offsetTop
        if (top < area.scrollTop + 16 || top + a.offsetHeight > area.scrollTop + area.clientHeight - 16) area.scrollTo({ top: Math.max(0, top - area.clientHeight / 2 + a.offsetHeight / 2), behavior: 'smooth' })
    }, [start])

    return (
        <div ref={listRef} className={cn('rp-toc-list', className)}>
            {geo ? (
                <div aria-hidden className="rp-toc-track" style={{ width: geo.w, height: geo.h, ...(vars as any) }}>
                    <svg width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`}>
                        <path d={geo.d} className="rp-toc-base" strokeWidth="1" fill="none" />
                    </svg>
                    <svg width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} className="rp-toc-active-svg">
                        <path d={geo.d} className="rp-toc-fill" strokeWidth="1.5" fill="none" />
                    </svg>
                    <span className="rp-toc-thumb" style={{ offsetPath: `path("${geo.d}")` } as any} />
                </div>
            ) : null}
            <ul className="rp-toc-items">
            {items.map((it, i) => {
                const on = active.indexOf(it.id) >= 0
                return (
                    <li key={it.id}>
                        <a
                            href={'#' + it.id}
                            data-toc-id={it.id}
                            data-active={on ? 'true' : 'false'}
                            aria-current={i === start ? 'location' : undefined}
                            className="rp-toc-link"
                            style={{ paddingLeft: itemPad(levels[i]) }}
                            onClick={(e) => {
                                e.preventDefault()
                                onSelect(it.id, e)
                            }}
                        >
                            {it.text}
                        </a>
                    </li>
                )
            })}
            </ul>
        </div>
    )
}

/** A small progress ring (0–1), as in fumadocs' TOC popover trigger. */
export function TocProgress({ value, className }: { value: number; className?: string }) {
    const r = 7
    const c = 2 * Math.PI * r
    const v = Math.max(0, Math.min(1, value || 0))
    return (
        <svg viewBox="0 0 18 18" aria-hidden className={cn('size-4 shrink-0 -rotate-90', className)}>
            <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2" className="stroke-current opacity-20" />
            <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-current" style={{ strokeDasharray: c, strokeDashoffset: c * (1 - v), transition: 'stroke-dashoffset 0.3s' }} />
        </svg>
    )
}

export type TocProps = {
    items: TocItem[]
    /** The scroll container to spy on (element or getter). Default: the nearest scrolling ancestor. */
    container?: Target
    /** The element (or getter) that contains the headings. Default: the TOC's own root node. */
    root?: Target
    /** Pixels covered by sticky bars at the top of the container. */
    offset?: number
    /** Replaces the built-in smooth scroll. */
    onSelect?: (id: string) => void
    variant?: 'rail' | 'compact'
    title?: string
    /** Under the list (rail), e.g. "Back to top". */
    footer?: any
    /** Rail list max height (CSS), default calc(100vh - 12rem). */
    maxHeight?: string
    className?: string
}

/** "On this page": the rail (sticky column) or a compact bar that opens the list. */
export function Toc({ items, container, root, offset = 0, onSelect, variant = 'rail', title = 'On this page', footer, maxHeight, className }: TocProps) {
    const anchorRef = useRef<HTMLElement | null>(null)
    const spy = useTocActive(items, { container, root, offset, anchorRef })
    const [open, setOpen] = useState(false)
    const go = (id: string) => {
        if (onSelect) onSelect(id)
        else scrollToTocItem(id, { container, root, offset, anchor: anchorRef.current })
        if (variant === 'compact') setOpen(false)
    }
    if (!items.length) return footer ? <div className={className}>{footer}</div> : null
    if (variant === 'compact') {
        const idx = items.findIndex((it) => it.id === spy.current)
        let last = -1
        items.forEach((it, i) => spy.active.indexOf(it.id) >= 0 && (last = i))
        const current = idx >= 0 ? items[idx] : null
        return (
            <nav ref={anchorRef as any} aria-label={title} className={cn('rounded-xl border border-border bg-card/95 backdrop-blur-sm', open ? 'shadow-lg' : '', className)} data-rp-toc="compact">
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpen(!open)}
                    className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3.5 text-left text-sm text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                    <TocProgress value={(last + 1) / Math.max(1, items.length)} className={open ? 'text-primary' : 'text-primary/80'} />
                    <span className="relative grid min-w-0 flex-1">
                        <span className={cn('col-start-1 row-start-1 truncate transition-[opacity,transform] duration-300', current && !open ? '-translate-y-1 opacity-0' : 'opacity-100')}>{title}</span>
                        <span className={cn('col-start-1 row-start-1 truncate text-foreground transition-[opacity,transform] duration-300', current && !open ? 'opacity-100' : 'translate-y-1 opacity-0')} aria-hidden={!current || open}>
                            {current ? current.text : ''}
                        </span>
                    </span>
                    <Icon name="chevron-down" className={cn('size-4 shrink-0 transition-transform duration-200', open ? 'rotate-180' : '')} aria-hidden />
                </button>
                {open ? (
                    <div className="rp-toc-scroll border-t border-border px-3.5" style={{ maxHeight: '60vh' }}>
                        <TocList items={items} active={spy.active} onSelect={go} />
                    </div>
                ) : null}
            </nav>
        )
    }
    return (
        <nav ref={anchorRef as any} aria-label={title} className={cn('flex min-h-0 flex-col', className)} data-rp-toc="rail">
            <p className="m-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Icon name="text" className="size-4" aria-hidden />
                {title}
            </p>
            <div className="rp-toc-scroll" style={{ maxHeight: maxHeight || 'calc(100vh - 12rem)' }}>
                <TocList items={items} active={spy.active} onSelect={go} />
            </div>
            {footer}
        </nav>
    )
}

export default function TocPreview() {
    return null
}
