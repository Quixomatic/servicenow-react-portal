import { useEffect, useState } from 'react'
import { Select } from 'components:app/combobox'
import { cx, IconChevronLeft, IconChevronRight } from 'components:app/field'

export type PaginationProps = {
    /** Zero-based page. */
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    pageSizes?: number[]
    onPageSizeChange?: (size: number) => void
    /** Hide the range text ("1–20 of 5,124"). */
    compact?: boolean
    label?: string
    className?: string
}

const nf = typeof Intl !== 'undefined' ? new Intl.NumberFormat() : null
const fmt = (n: number) => (nf ? nf.format(n) : String(n))

/**
 * Pagination: range text, page-size select, first / previous / page number / next / last.
 * A nav landmark; the page input jumps on Enter or blur.
 */
export function Pagination(props: PaginationProps) {
    const { page, pageSize, total } = props
    const pages = Math.max(1, Math.ceil(total / pageSize))
    const from = total ? page * pageSize + 1 : 0
    const to = Math.min(total, (page + 1) * pageSize)
    const [text, setText] = useState(String(page + 1))
    useEffect(() => setText(String(page + 1)), [page])
    const go = (p: number) => props.onPageChange(Math.max(0, Math.min(pages - 1, p)))
    const btn =
        'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40'
    return (
        <nav aria-label={props.label || 'Pagination'} className={cx('rpl-pagination flex flex-wrap items-center gap-x-4 gap-y-2 text-sm', props.className)}>
            {!props.compact ? (
                <span className="text-muted-foreground tabular-nums" aria-live="polite">
                    {total ? `${fmt(from)}–${fmt(to)} of ${fmt(total)}` : 'No records'}
                </span>
            ) : null}
            {props.onPageSizeChange && props.pageSizes && props.pageSizes.length > 1 ? (
                <span className="flex items-center gap-2">
                    <span className="text-muted-foreground" id="rpl-rows-label">
                        Rows
                    </span>
                    <Select
                        aria-label="Rows per page"
                        size="sm"
                        className="w-20"
                        value={String(pageSize)}
                        items={props.pageSizes.map((n) => ({ value: String(n), label: String(n) }))}
                        onChange={(i) => props.onPageSizeChange!(Number(i.value))}
                    />
                </span>
            ) : null}
            <span className="ml-auto flex items-center gap-1">
                <button type="button" className={btn} onClick={() => go(0)} disabled={page <= 0} aria-label="First page">
                    <IconChevronLeft size={14} />
                    <IconChevronLeft size={14} className="-ml-2.5" />
                </button>
                <button type="button" className={btn} onClick={() => go(page - 1)} disabled={page <= 0} aria-label="Previous page">
                    <IconChevronLeft size={16} />
                </button>
                <span className="flex items-center gap-1.5 px-1 text-muted-foreground">
                    <input
                        aria-label={`Page, of ${pages}`}
                        className="h-8 w-14 rounded-md border border-input bg-background px-2 text-center text-sm text-foreground tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        inputMode="numeric"
                        value={text}
                        onChange={(e: any) => setText(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e: any) => {
                            if (e.key === 'Enter') go(Number(text || 1) - 1)
                        }}
                        onBlur={() => (Number(text) - 1 !== page ? go(Number(text || 1) - 1) : null)}
                    />
                    <span className="tabular-nums">of {fmt(pages)}</span>
                </span>
                <button type="button" className={btn} onClick={() => go(page + 1)} disabled={page >= pages - 1} aria-label="Next page">
                    <IconChevronRight size={16} />
                </button>
                <button type="button" className={btn} onClick={() => go(pages - 1)} disabled={page >= pages - 1} aria-label="Last page">
                    <IconChevronRight size={14} />
                    <IconChevronRight size={14} className="-ml-2.5" />
                </button>
            </span>
        </nav>
    )
}
