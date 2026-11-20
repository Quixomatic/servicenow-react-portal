import { useNavigate } from '@portal/runtime'
import { HeaderSlot } from 'utilities:app/header-slots'
import { SearchBox } from 'components:app/search-box'
import { normalizeSources } from 'utilities:app/search'

type Options = {
    /** banner: inside the app sub-header's banner ("below" slot; inline when the layout has none); inline: where it is placed. */
    placement?: 'banner' | 'inline'
    placeholder?: string
    /** Sources, in order: catalog, knowledge, requests, incidents, pages (array or comma list). */
    sources?: string[] | string
    resultsPage?: string
    catalogPage?: string
    kbPage?: string
    /** Knowledge search page: the dropdown's knowledge "See all" opens it. */
    kbSearchPage?: string
    recordPage?: string
    /** Popular searches: chips under the box and in the empty dropdown. */
    suggestions?: string[]
    /** Chips under the box (default on when there are suggestions). */
    showChips?: boolean
}

/**
 * Hero Search: the big portal search box (components:app/search-box, size lg) with typeahead over the
 * catalog, knowledge, the user's requests and incidents and the portal's pages. Enter opens the
 * results page (app/search-results). On the app shell's banner sub-header it sits in the banner
 * under the title, through the sub-header's "below" header slot.
 */
export default function HeroSearch({ options = {} }: { options?: Options }) {
    const navigate = useNavigate()
    const suggestions = Array.isArray(options.suggestions) ? options.suggestions.filter((s) => typeof s === 'string' && s.trim()) : []
    const chips = options.showChips !== false && suggestions.length > 0
    const resultsPage = options.resultsPage === undefined ? 'search' : options.resultsPage
    const body = (
        <div className="rp-hero-search flex w-full max-w-3xl min-w-0 flex-col gap-3" data-rp-hero-search="">
            <SearchBox
                size="lg"
                placeholder={options.placeholder || 'Search for help, services and your requests'}
                sources={normalizeSources(options.sources)}
                resultsPage={resultsPage}
                targets={{ catalogPage: options.catalogPage || 'catalog', kbPage: options.kbPage || 'kb', recordPage: options.recordPage || 'form', kbSearchPage: options.kbSearchPage || '' } as any}
                suggestions={suggestions}
                aria-label="Search the portal"
            />
            {chips ? (
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
                    <span className="text-muted-foreground">Popular:</span>
                    {suggestions.slice(0, 5).map((s) => (
                        <button
                            key={s}
                            type="button"
                            className="h-7 rounded-full border border-border bg-background/70 px-3 text-xs font-medium text-foreground transition-colors outline-none hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            onClick={() => resultsPage && navigate(resultsPage, { q: { term: s } })}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    )
    if (options.placement === 'inline') return body
    return <HeaderSlot name="below">{body}</HeaderSlot>
}
