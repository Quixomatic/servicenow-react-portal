import { useCrumbs, parseQuery, removeTerm, serializeQuery } from 'utilities:app/list-data'
import type { Crumb } from 'utilities:app/list-data'
import { cx, IconX, Spinner } from 'components:app/field'

export type FilterBreadcrumbsProps = {
    table: string
    /** The encoded filter (no ORDERBY needed; it is kept on removal). */
    query: string
    onChange: (encoded: string) => void
    /** Keyword search shown as its own crumb. */
    keywords?: string
    onClearKeywords?: () => void
    /** Clicking a crumb's text (e.g. open the builder). */
    onEdit?: (crumb: Crumb) => void
    /** Label of the root crumb that clears everything. */
    rootLabel?: string
    className?: string
}

/**
 * Filter breadcrumbs: "All › Active is true › and Priority is 1 - Critical". Each condition is a
 * chip with a remove button; the root crumb clears the filter. Labels and display values come from
 * the platform's own query parser, so references read as names and dates as their range label.
 */
export function FilterBreadcrumbs(props: FilterBreadcrumbsProps) {
    const { table, query } = props
    const crumbsQ = useCrumbs(table, query)
    const crumbs: Crumb[] = (query && crumbsQ.data) || []
    const removeAt = (c: Crumb) => {
        const model = parseQuery(query)
        props.onChange(serializeQuery(removeTerm(model, c.gi, c.ci, c.ti)))
    }
    const empty = !query && !props.keywords
    return (
        <nav aria-label="Filter" className={cx('rpl-crumbs flex min-w-0 flex-wrap items-center gap-1 text-sm', props.className)}>
            <button
                type="button"
                className={cx('rounded-md px-1.5 py-0.5 font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', empty ? 'text-foreground' : 'text-primary hover:underline')}
                onClick={() => {
                    props.onChange('')
                    if (props.onClearKeywords) props.onClearKeywords()
                }}
                aria-current={empty ? 'true' : undefined}
                aria-label={empty ? `${props.rootLabel || 'All'} (no filter)` : `${props.rootLabel || 'All'}: remove every condition`}
            >
                {props.rootLabel || 'All'}
            </button>
            {props.keywords ? (
                <>
                    <Sep />
                    <Chip text={`Keywords: ${props.keywords}`} onRemove={props.onClearKeywords} />
                </>
            ) : null}
            {crumbs.map((c, i) => {
                const text = [c.fieldLabel, c.opLabel, c.valueLabel].filter(Boolean).join(' ')
                return (
                    <span key={`${c.gi}-${c.ci}-${c.ti}`} className="inline-flex items-center gap-1">
                        {i > 0 || props.keywords ? <Sep join={c.join === 'NQ' && i > 0 ? 'or' : c.join === 'OR' ? 'or' : 'and'} strong={c.join === 'NQ'} /> : <Sep />}
                        <Chip text={text} onRemove={() => removeAt(c)} onEdit={props.onEdit ? () => props.onEdit!(c) : undefined} />
                    </span>
                )
            })}
            {query && crumbsQ.isLoading ? <Spinner className="text-muted-foreground" label="Loading filter" /> : null}
        </nav>
    )
}

function Sep({ join, strong }: { join?: string; strong?: boolean }) {
    return (
        <span aria-hidden={join ? undefined : 'true'} className={cx('px-0.5 text-xs text-muted-foreground', strong ? 'font-semibold uppercase' : '')}>
            {join ? join : '›'}
        </span>
    )
}

function Chip({ text, onRemove, onEdit }: { text: string; onRemove?: () => void; onEdit?: () => void }) {
    return (
        <span className="inline-flex max-w-[28rem] items-center rounded-md border border-border bg-muted/60 text-foreground">
            {onEdit ? (
                <button type="button" onClick={onEdit} className="truncate rounded-l-md px-2 py-0.5 text-left outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50" title={text}>
                    {text}
                </button>
            ) : (
                <span className="truncate px-2 py-0.5" title={text}>
                    {text}
                </span>
            )}
            {onRemove ? (
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Remove condition: ${text}`}
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    <IconX size={12} />
                </button>
            ) : null}
        </span>
    )
}
