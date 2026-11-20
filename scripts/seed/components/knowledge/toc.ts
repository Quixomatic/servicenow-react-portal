/**
 * Table of contents: heading ids for sanitised article HTML, and a scroll-spy over them.
 *
 * The sanitiser (components:rich-text) drops every `id`, so ids are added AFTER sanitising, to a
 * parsed copy: only ids we generate (`kb-<slug>`) are added, nothing else changes. Render the result
 * with `<RichText html={…} sanitize={false} />`.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { sanitizeHtml } from 'components:rich-text'

export type TocHeading = { id: string; text: string; level: number; depth: number }

export function slugify(text: string): string {
    return (
        String(text || '')
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'section'
    )
}

/**
 * Sanitise article HTML, give its section headings ids and return them as a TOC. The TOC uses the
 * two highest heading levels the article actually has (h2 + h3 usually; h1 + h2 for articles that use
 * h1 for sections). Headings without text are skipped; a leading heading that repeats the title is
 * left out of the TOC (`title`). Tables are wrapped in a scroll container.
 */
export function prepareArticleHtml(html: string, opts: { title?: string; maxLevels?: number } = {}): { html: string; headings: TocHeading[] } {
    const clean = sanitizeHtml(html || '')
    if (typeof DOMParser === 'undefined' || !clean) return { html: clean, headings: [] }
    const doc = new DOMParser().parseFromString(`<!doctype html><body><div>${clean}</div></body>`, 'text/html')
    const root = doc.body.firstElementChild as HTMLElement
    const all = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[]
    const withText = all.filter((h) => (h.textContent || '').replace(/\s+/g, ' ').trim())
    const title = String(opts.title || '').trim().toLowerCase()
    const levels = Array.from(new Set(withText.map((h) => Number(h.tagName.charAt(1))))).sort()
    const keep = levels.slice(0, Math.max(1, opts.maxLevels || 2))
    const used: Record<string, number> = {}
    const headings: TocHeading[] = []
    withText.forEach((h, i) => {
        const text = (h.textContent || '').replace(/\s+/g, ' ').trim()
        const level = Number(h.tagName.charAt(1))
        let id = 'kb-' + slugify(text)
        if (used[id]) id += '-' + ++used[id]
        else used[id] = 1
        h.setAttribute('id', id)
        if (keep.indexOf(level) < 0) return
        if (i === 0 && title && text.toLowerCase() === title) return
        headings.push({ id, text, level, depth: keep.indexOf(level) })
    })
    // Legacy KB HTML is full of spacer paragraphs (<p>&nbsp;</p>, <p><br></p>, empty divs): drop them,
    // the typography provides the rhythm.
    Array.from(root.querySelectorAll('p, div, span')).forEach((el) => {
        if (el.querySelector('img, table, hr, iframe, video, pre, code, ul, ol')) return
        if (!(el.textContent || '').replace(/[\s\u00a0\u200b]+/g, '')) el.remove()
    })
    // Editors often write one <ul> per bullet: merge adjacent lists of the same kind into one list.
    Array.from(root.querySelectorAll('ul + ul, ol + ol')).forEach((list) => {
        const prev = list.previousElementSibling
        if (!prev || prev.tagName !== list.tagName || (list.previousSibling && list.previousSibling !== prev && (list.previousSibling.textContent || '').trim())) return
        while (list.firstChild) prev.appendChild(list.firstChild)
        list.remove()
    })
    // Wide tables scroll inside the column instead of widening the page.
    Array.from(root.querySelectorAll('table')).forEach((t) => {
        const wrap = doc.createElement('div')
        wrap.setAttribute('data-kb-table', '')
        t.parentNode!.insertBefore(wrap, t)
        wrap.appendChild(t)
    })
    return { html: root.innerHTML, headings }
}

/** `prepareArticleHtml`, memoised. */
export function useArticleToc(html: string, opts: { title?: string; maxLevels?: number } = {}) {
    return useMemo(() => prepareArticleHtml(html, opts), [html, opts.title, opts.maxLevels])
}

/** The nearest scrolling ancestor (crossing shadow roots), or the document's scroller. */
export function scrollParent(el: Element | null): HTMLElement {
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

/**
 * Scroll-spy: the id of the heading the reader is in (the last one whose top passed `offset` px
 * below the scroller's top). `root` is the element that contains the headings (shadow DOM safe:
 * ids are looked up inside it). At the very bottom the last heading wins.
 */
export function useTocSpy(root: { current: HTMLElement | null }, ids: string[], offset = 96): string {
    const [active, setActive] = useState(ids[0] || '')
    const key = ids.join('|')
    useEffect(() => {
        const el = root.current
        if (!el || !ids.length) return undefined
        const scroller = scrollParent(el)
        const target: any = scroller === document.scrollingElement || scroller === document.documentElement ? window : scroller
        let frame = 0
        const measure = () => {
            frame = 0
            const top = target === window ? 0 : scroller.getBoundingClientRect().top
            let current = ids[0]
            for (const id of ids) {
                const h = el.querySelector('#' + CSS.escape(id))
                if (!h) continue
                if (h.getBoundingClientRect().top - top <= offset) current = id
                else break
            }
            if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) current = ids[ids.length - 1]
            setActive(current)
        }
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(measure)
        }
        measure()
        target.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)
        return () => {
            if (frame) cancelAnimationFrame(frame)
            target.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
        }
    }, [root.current, key, offset])
    return active
}

/** Smooth-scroll a heading (by id, inside `root`) into view and move focus to it for screen readers. */
export function scrollToHeading(root: HTMLElement | null, id: string, opts: { focus?: boolean } = {}) {
    if (!root || !id) return
    const h = root.querySelector('#' + CSS.escape(id)) as HTMLElement | null
    if (!h) return
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    h.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    if (opts.focus !== false) {
        if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1')
        h.focus({ preventScroll: true })
    }
}

/** A stable ref helper for callers that need the content element. */
export function useContentRef<T extends HTMLElement = HTMLDivElement>() {
    return useRef<T | null>(null)
}
