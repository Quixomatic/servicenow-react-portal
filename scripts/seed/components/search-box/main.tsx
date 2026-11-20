/**
 * components:app/search-box: the portal search combobox (Service Portal's typeahead search, Next
 * Experience's sn-search-combobox), over utilities:app/search.
 *
 *   <SearchBox size="lg" resultsPage="search" targets={{ catalogPage: 'catalog', kbPage: 'kb', recordPage: 'form' }} />
 *
 * - Typeahead grouped by source (catalog, knowledge, my requests, my incidents, pages), debounced,
 *   each group with "See all" into the results page.
 * - WAI-ARIA combobox: the input owns the listbox (aria-expanded, aria-controls,
 *   aria-activedescendant); options in labelled groups. ↑ / ↓ move (wrapping), Home / End, Enter opens
 *   the active option or, with none, the results page; Escape closes, then clears; Tab closes.
 * - Empty input: the user's recent searches (utilities:app/search useRecentSearches, our own
 *   localStorage namespace) and optional suggestions.
 * - "/" focuses the box from anywhere on the page (shortcut, default on for size lg).
 * - The listbox renders in the top layer (app/combobox Popup), so cards and bands never clip it.
 *
 * Props: size ('default' | 'lg'), placeholder, sources, limit (per group, 4), targets, resultsPage
 * ('search'; '' = no results page), defaultValue, autoFocus, shortcut, suggestions, onSubmit(term)
 * (replaces the results-page navigation), showButton (lg: a Search button inside the box),
 * className, 'aria-label'.
 *
 * Also exported: SearchHitRow (one result row, for results pages), HitMedia (a hit's picture or
 * icon tile), SOURCE_TINT.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@portal/runtime'
import { Icon } from 'components:icon'
import { Button } from 'components:button'
import { Kbd } from 'components:kbd'
import { Skeleton } from 'components:skeleton'
import { Popup } from 'components:app/combobox'
import { cx } from 'components:app/field'
import { HighlightedValue } from 'components:app/highlighted-value'
import { useDebouncedValue } from 'utilities:app/graphql'
import { useSearch, useRecentSearches, openHit, Highlight } from 'utilities:app/search'
import type { SearchHit, SearchSourceId, SearchTargets } from 'utilities:app/search'

export const SOURCE_TINT: Record<string, string> = {
    catalog: 'bg-chart-2/12 text-chart-2 ring-chart-2/20',
    knowledge: 'bg-chart-1/12 text-chart-1 ring-chart-1/20',
    requests: 'bg-chart-3/12 text-chart-3 ring-chart-3/20',
    incidents: 'bg-chart-4/12 text-chart-4 ring-chart-4/20',
    pages: 'bg-muted text-muted-foreground ring-border',
}

/** A hit's picture (catalog) or its icon on a tinted tile. */
export function HitMedia({ hit, size = 'md' }: { hit: SearchHit; size?: 'sm' | 'md' | 'lg' }) {
    const [broken, setBroken] = useState(false)
    const box = size === 'sm' ? 'size-7 rounded-md' : size === 'lg' ? 'size-11 rounded-lg' : 'size-9 rounded-lg'
    const icon = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4'
    if (hit.image && !broken) {
        return (
            <span className={cx('flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-border ring-inset', box)}>
                <img src={hit.image} alt="" loading="lazy" className="size-full object-contain p-0.5" onError={() => setBroken(true)} />
            </span>
        )
    }
    return (
        <span className={cx('flex shrink-0 items-center justify-center ring-1 ring-inset', box, SOURCE_TINT[hit.source] || SOURCE_TINT.pages)}>
            <Icon name={hit.icon || 'search'} className={icon} />
        </span>
    )
}

/** One result row: media, highlighted title, subtitle, number / meta and a state pill. */
export function SearchHitRow({ hit, term, dense = false }: { hit: SearchHit; term: string; dense?: boolean }) {
    const second = [hit.number, hit.subtitle].filter(Boolean).join(' · ')
    return (
        <span className="flex min-w-0 flex-1 items-center gap-3">
            <HitMedia hit={hit} size={dense ? 'sm' : 'md'} />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className={cx('truncate font-medium text-foreground', dense ? 'text-sm' : 'text-sm')}>
                    <Highlight text={hit.title} term={term} />
                </span>
                {second ? <span className="truncate text-xs text-muted-foreground">{second}</span> : null}
            </span>
            {hit.state ? <HighlightedValue label={hit.state} size="sm" className="max-w-40" /> : null}
            {hit.meta && !hit.state ? <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{hit.meta}</span> : null}
        </span>
    )
}

type Option = { id: string; kind: 'hit' | 'recent' | 'suggestion' | 'all'; hit?: SearchHit; term?: string; run: () => void }

export type SearchBoxProps = {
    size?: 'default' | 'lg'
    placeholder?: string
    sources?: SearchSourceId[]
    limit?: number
    targets?: SearchTargets
    resultsPage?: string
    defaultValue?: string
    autoFocus?: boolean
    shortcut?: boolean
    suggestions?: string[]
    showButton?: boolean
    onSubmit?: (term: string) => void
    className?: string
    'aria-label'?: string
}

export function SearchBox(props: SearchBoxProps) {
    const lg = props.size === 'lg'
    const navigate = useNavigate()
    const id = useId().replace(/:/g, '')
    const listId = `rp-sb-${id}-list`
    const inputRef = useRef<HTMLInputElement | null>(null)
    const boxRef = useRef<HTMLDivElement | null>(null)
    const [text, setText] = useState(props.defaultValue || '')
    const [open, setOpen] = useState(false)
    const [focused, setFocused] = useState(false)
    const [active, setActive] = useState(-1)
    const term = useDebouncedValue(text.trim(), 200)
    const recent = useRecentSearches(6)
    const resultsPage = props.resultsPage === undefined ? 'search' : props.resultsPage
    const search = useSearch(term, { sources: props.sources, limit: props.limit || 4, targets: props.targets, enabled: open })
    const groups = search.groups.filter((g) => g.hits.length || g.isLoading)
    const typed = text.trim()

    // Keep the box in step with an outside value (e.g. the results page's term from the URL).
    useEffect(() => {
        if (props.defaultValue !== undefined) setText(props.defaultValue)
    }, [props.defaultValue])

    // "/" focuses the box (not while typing elsewhere).
    const shortcut = props.shortcut !== undefined ? props.shortcut : lg
    useEffect(() => {
        if (!shortcut) return undefined
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
            const path = (e.composedPath && e.composedPath()) || []
            const editing = path.some((n: any) => n && n.nodeType === 1 && (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable))
            if (editing) return
            e.preventDefault()
            if (inputRef.current) inputRef.current.focus()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [shortcut])

    const submit = (value: string) => {
        const t = String(value || '').trim()
        if (!t) return
        recent.add(t)
        setOpen(false)
        setActive(-1)
        if (props.onSubmit) props.onSubmit(t)
        else if (resultsPage) navigate(resultsPage, { q: { term: t } })
    }
    const pick = (hit: SearchHit) => {
        if (typed) recent.add(typed)
        setOpen(false)
        setActive(-1)
        openHit(navigate, hit)
    }

    // The flat option list the keyboard walks (group order, then "search all").
    const options: Option[] = useMemo(() => {
        const out: Option[] = []
        if (!typed) {
            recent.items.forEach((r) => out.push({ id: `${listId}-r-${out.length}`, kind: 'recent', term: r, run: () => submit(r) }))
            ;(props.suggestions || []).forEach((s) => out.push({ id: `${listId}-s-${out.length}`, kind: 'suggestion', term: s, run: () => submit(s) }))
            return out
        }
        groups.forEach((g) => g.hits.forEach((h) => out.push({ id: `${listId}-h-${out.length}`, kind: 'hit', hit: h, run: () => pick(h) })))
        if (resultsPage || props.onSubmit) out.push({ id: `${listId}-all`, kind: 'all', term: typed, run: () => submit(typed) })
        return out
    }, [typed, groups, recent.items, props.suggestions, resultsPage])

    useEffect(() => setActive(-1), [term])

    const show = open && focused !== null && options.length > 0
    const onKeyDown = (e: any) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) {
                setOpen(true)
                return
            }
            if (!options.length) return
            const dir = e.key === 'ArrowDown' ? 1 : -1
            setActive((a) => (a < 0 ? (dir > 0 ? 0 : options.length - 1) : (a + dir + options.length) % options.length))
        } else if (e.key === 'Home' && show && active >= 0) {
            e.preventDefault()
            setActive(0)
        } else if (e.key === 'End' && show && active >= 0) {
            e.preventDefault()
            setActive(options.length - 1)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (show && active >= 0 && options[active]) options[active].run()
            else submit(text)
        } else if (e.key === 'Escape') {
            if (show) {
                e.preventDefault()
                setOpen(false)
                setActive(-1)
            } else if (text) {
                e.preventDefault()
                setText('')
            }
        } else if (e.key === 'Tab') {
            setOpen(false)
        }
    }

    // Scroll the active option into view.
    useEffect(() => {
        if (active < 0 || !options[active]) return
        const root = boxRef.current && (boxRef.current.getRootNode() as any)
        const el = root && root.getElementById ? root.getElementById(options[active].id) : null
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' })
    }, [active])

    const optionProps = (o: Option, index: number) => ({
        id: o.id,
        role: 'option',
        'aria-selected': index === active,
        'data-active': index === active ? '' : undefined,
        onMouseDown: (e: any) => e.preventDefault(),
        onMouseMove: () => index !== active && setActive(index),
        onClick: () => o.run(),
        className: cx(
            'flex w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left outline-none select-none',
            o.kind === 'hit' ? 'py-1.5' : 'py-2',
            index === active ? 'bg-accent text-accent-foreground' : '',
        ),
    })

    const indexOf = (o: Option | undefined) => (o ? options.indexOf(o) : -1)
    const label = props['aria-label'] || 'Search'
    const loadingNothing = typed.length >= 2 && !search.ready && !search.hits.length

    return (
        <div ref={boxRef} className={cx('relative w-full min-w-0', props.className)} data-rp-search-box={lg ? 'lg' : 'default'}>
            <div
                className={cx(
                    'flex w-full items-center border border-input bg-background transition-[box-shadow,border-color] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30 dark:bg-input/30',
                    lg ? 'h-14 gap-3 rounded-xl pr-2 pl-4 shadow-sm max-sm:h-12 max-sm:pl-3' : 'h-9 gap-2 rounded-md px-2.5 shadow-xs',
                )}
                onClick={() => inputRef.current && inputRef.current.focus()}
            >
                <Icon name="search" className={cx('shrink-0 text-muted-foreground', lg ? 'size-5' : 'size-4')} />
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-label={label}
                    aria-expanded={show}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={show && active >= 0 && options[active] ? options[active].id : undefined}
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus={props.autoFocus}
                    enterKeyHint="search"
                    placeholder={props.placeholder || 'Search'}
                    value={text}
                    className={cx('h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground', lg ? 'text-base' : 'text-sm')}
                    onChange={(e: any) => {
                        setText(e.target.value)
                        setOpen(true)
                    }}
                    onFocus={() => {
                        setFocused(true)
                        setOpen(true)
                    }}
                    onBlur={() => setFocused(false)}
                    onKeyDown={onKeyDown}
                />
                {search.isFetching && typed.length >= 2 ? <Icon name="loader-circle" className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Searching" /> : null}
                {text ? (
                    <button
                        type="button"
                        aria-label="Clear search"
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        onClick={(e: any) => {
                            e.stopPropagation()
                            setText('')
                            setOpen(true)
                            if (inputRef.current) inputRef.current.focus()
                        }}
                    >
                        <Icon name="x" className="size-4" />
                    </button>
                ) : shortcut && !focused ? (
                    <Kbd className="max-sm:hidden" aria-hidden>
                        /
                    </Kbd>
                ) : null}
                {lg && props.showButton !== false ? (
                    <Button
                        type="button"
                        size="lg"
                        className="h-10 shrink-0 rounded-lg px-4 max-sm:hidden"
                        onMouseDown={(e: any) => e.preventDefault()}
                        onClick={(e: any) => {
                            e.stopPropagation()
                            if (text.trim()) submit(text)
                            else if (inputRef.current) inputRef.current.focus()
                        }}
                    >
                        Search
                    </Button>
                ) : null}
            </div>

            <Popup anchor={boxRef} open={show} onDismiss={() => setOpen(false)} maxHeight={lg ? 520 : 420} id={listId} role="listbox" aria-label={`${label} suggestions`} className="p-1.5">
                {!typed ? (
                    <>
                        {recent.items.length ? (
                            <div role="group" aria-labelledby={`${listId}-rh`}>
                                <div className="flex items-center justify-between px-2 pt-1 pb-1">
                                    <span id={`${listId}-rh`} className="text-xs font-medium text-muted-foreground">
                                        Recent searches
                                    </span>
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
                                        onMouseDown={(e: any) => e.preventDefault()}
                                        onClick={() => recent.clear()}
                                    >
                                        Clear
                                    </button>
                                </div>
                                {options
                                    .filter((o) => o.kind === 'recent')
                                    .map((o) => (
                                        <div key={o.id} {...optionProps(o, indexOf(o))}>
                                            <Icon name="history" className="size-4 shrink-0 text-muted-foreground" />
                                            <span className="min-w-0 flex-1 truncate text-sm">{o.term}</span>
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                aria-label={`Remove ${o.term} from recent searches`}
                                                className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 hover:bg-background hover:opacity-100"
                                                onMouseDown={(e: any) => e.preventDefault()}
                                                onClick={(e: any) => {
                                                    e.stopPropagation()
                                                    recent.remove(o.term as string)
                                                }}
                                            >
                                                <Icon name="x" className="size-3.5" />
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        ) : null}
                        {props.suggestions && props.suggestions.length ? (
                            <div role="group" aria-labelledby={`${listId}-sh`} className={recent.items.length ? 'mt-1 border-t border-border pt-1' : ''}>
                                <div id={`${listId}-sh`} className="px-2 pt-1 pb-1 text-xs font-medium text-muted-foreground">
                                    Popular searches
                                </div>
                                {options
                                    .filter((o) => o.kind === 'suggestion')
                                    .map((o) => (
                                        <div key={o.id} {...optionProps(o, indexOf(o))}>
                                            <Icon name="trending-up" className="size-4 shrink-0 text-muted-foreground" />
                                            <span className="min-w-0 flex-1 truncate text-sm">{o.term}</span>
                                        </div>
                                    ))}
                            </div>
                        ) : null}
                    </>
                ) : (
                    <>
                        {groups.map((g, gi) => {
                            const opts = options.filter((o) => o.kind === 'hit' && o.hit && o.hit.source === g.id)
                            return (
                                <div key={g.id} role="group" aria-labelledby={`${listId}-g-${g.id}`} className={gi ? 'mt-1 border-t border-border pt-1' : ''}>
                                    <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-0.5">
                                        <span id={`${listId}-g-${g.id}`} className="text-xs font-medium text-muted-foreground">
                                            {g.label}
                                        </span>
                                        {resultsPage && g.total > g.hits.length ? (
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
                                                onMouseDown={(e: any) => e.preventDefault()}
                                                onClick={() => {
                                                    recent.add(typed)
                                                    setOpen(false)
                                                    navigate(resultsPage, { q: { term: typed, source: g.id } })
                                                }}
                                            >
                                                See all {g.total.toLocaleString()}
                                            </button>
                                        ) : null}
                                    </div>
                                    {!g.hits.length && g.isLoading ? (
                                        <div className="flex items-center gap-3 px-2 py-1.5" aria-hidden>
                                            <Skeleton className="size-7 rounded-md" />
                                            <Skeleton className="h-3.5 w-2/5" />
                                        </div>
                                    ) : null}
                                    {opts.map((o) => (
                                        <div key={o.id} {...optionProps(o, indexOf(o))}>
                                            <SearchHitRow hit={o.hit as SearchHit} term={typed} dense />
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                        {!groups.length && !loadingNothing && search.ready ? (
                            <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
                                <Icon name="search-x" className="mb-1 size-5 text-muted-foreground" />
                                <span className="text-sm font-medium">No quick matches for “{typed}”</span>
                                <span className="text-xs text-muted-foreground">Press Enter to search everything, or try different words.</span>
                            </div>
                        ) : null}
                        {loadingNothing && !groups.length ? (
                            <div className="flex flex-col gap-2 p-2" aria-hidden>
                                <Skeleton className="h-3 w-24" />
                                <div className="flex items-center gap-3">
                                    <Skeleton className="size-7 rounded-md" />
                                    <Skeleton className="h-3.5 w-1/2" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Skeleton className="size-7 rounded-md" />
                                    <Skeleton className="h-3.5 w-2/5" />
                                </div>
                            </div>
                        ) : null}
                        {options
                            .filter((o) => o.kind === 'all')
                            .map((o) => (
                                <div key={o.id} className="mt-1 border-t border-border pt-1">
                                    <div {...optionProps(o, indexOf(o))}>
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                            <Icon name="search" className="size-3.5" />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-sm">
                                            Search everything for <span className="font-medium">“{o.term}”</span>
                                        </span>
                                        <Kbd aria-hidden className="max-sm:hidden">
                                            Enter
                                        </Kbd>
                                    </div>
                                </div>
                            ))}
                    </>
                )}
            </Popup>
        </div>
    )
}

/** Preview (Studio). */
export default function SearchBoxPreview() {
    return (
        <div className="flex max-w-2xl flex-col gap-4 p-4">
            <SearchBox size="lg" placeholder="Search for help, services and your requests" />
            <SearchBox placeholder="Search" />
        </div>
    )
}
