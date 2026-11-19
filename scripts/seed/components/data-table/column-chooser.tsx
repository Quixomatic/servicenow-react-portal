import { useState } from 'react'
import { FieldPicker } from 'components:app/condition-builder'
import { cx, IconX, IconChevronDown, IconCheck } from 'components:app/field'
import type { Density } from './table'

export type ColumnOption = { id: string; label: string }

export type ColumnChooserProps = {
    table: string
    /** Visible columns, in order. */
    visible: ColumnOption[]
    /** Known but hidden columns (e.g. the view's defaults the user turned off). */
    hidden: ColumnOption[]
    onChange: (ids: string[]) => void
    /** Add any field (dot-walk) as a column. */
    allowAdd?: boolean
    density?: Density
    onDensityChange?: (d: Density) => void
    wrap?: boolean
    onWrapChange?: (w: boolean) => void
    onReset?: () => void
}

/**
 * Column personalization: show/hide, reorder (Alt+↑/↓ or the arrow buttons), add any field
 * through the dot-walking picker, density and text wrap, reset to the list's default.
 */
export function ColumnChooser(props: ColumnChooserProps) {
    const ids = props.visible.map((c) => c.id)
    const [adding, setAdding] = useState(false)
    const [announce, setAnnounce] = useState('')
    const move = (i: number, dir: number) => {
        const j = i + dir
        if (j < 0 || j >= ids.length) return
        const next = ids.slice()
        const [x] = next.splice(i, 1)
        next.splice(j, 0, x)
        props.onChange(next)
        setAnnounce(`${props.visible[i].label} moved to position ${j + 1} of ${ids.length}`)
    }
    const hide = (id: string) => ids.length > 1 && props.onChange(ids.filter((x) => x !== id))
    const show = (id: string) => props.onChange(ids.concat(id))
    const small = 'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-30 disabled:pointer-events-none'
    return (
        <div className="flex w-80 max-w-[90vw] flex-col gap-3 p-1">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Columns</span>
                {props.onReset ? (
                    <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={props.onReset}>
                        Reset to default
                    </button>
                ) : null}
            </div>
            <ul className="flex max-h-72 flex-col gap-0.5 overflow-auto" aria-label="Visible columns, in order">
                {props.visible.map((c, i) => (
                    <li
                        key={c.id}
                        className="group flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-accent/60"
                        onKeyDown={(e: any) => {
                            if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                                e.preventDefault()
                                move(i, e.key === 'ArrowUp' ? -1 : 1)
                            }
                        }}
                    >
                        <button type="button" role="checkbox" aria-checked="true" disabled={ids.length <= 1} aria-label={`Show ${c.label}`} className={cx(small, 'text-foreground')} onClick={() => hide(c.id)}>
                            <span className="flex size-4 items-center justify-center rounded-[4px] border border-primary bg-primary text-primary-foreground">
                                <IconCheck size={12} />
                            </span>
                        </button>
                        <span className="min-w-0 flex-1 truncate text-sm" title={c.id}>
                            {c.label}
                        </span>
                        <button type="button" className={small} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${c.label} up`}>
                            <IconChevronDown size={14} className="rotate-180" />
                        </button>
                        <button type="button" className={small} onClick={() => move(i, 1)} disabled={i === ids.length - 1} aria-label={`Move ${c.label} down`}>
                            <IconChevronDown size={14} />
                        </button>
                    </li>
                ))}
                {props.hidden.map((c) => (
                    <li key={c.id} className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-accent/60">
                        <button type="button" role="checkbox" aria-checked="false" aria-label={`Show ${c.label}`} className={small} onClick={() => show(c.id)}>
                            <span className="size-4 rounded-[4px] border border-input bg-background" />
                        </button>
                        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{c.label}</span>
                    </li>
                ))}
            </ul>
            <span className="sr-only" aria-live="polite">
                {announce}
            </span>
            {props.allowAdd !== false ? (
                adding ? (
                    <div className="flex items-center gap-1">
                        <div className="min-w-0 flex-1">
                            <FieldPicker
                                table={props.table}
                                value=""
                                autoFocus
                                aria-label="Add a column"
                                onChange={(f) => {
                                    if (ids.indexOf(f.path) < 0) show(f.path)
                                    setAdding(false)
                                }}
                            />
                        </div>
                        <button type="button" className={small} onClick={() => setAdding(false)} aria-label="Cancel adding a column">
                            <IconX size={14} />
                        </button>
                    </div>
                ) : (
                    <button type="button" className="self-start text-sm text-primary underline-offset-2 hover:underline" onClick={() => setAdding(true)}>
                        + Add a column (any field, dot-walk with ›)
                    </button>
                )
            ) : null}
            {props.onDensityChange ? (
                <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                    <span className="text-xs font-medium text-muted-foreground" id="rpl-density-label">
                        Density
                    </span>
                    <div role="radiogroup" aria-labelledby="rpl-density-label" className="inline-flex rounded-md border border-input p-0.5">
                        {(['compact', 'normal', 'comfortable'] as Density[]).map((d) => (
                            <button
                                key={d}
                                type="button"
                                role="radio"
                                aria-checked={props.density === d}
                                className={cx('flex-1 rounded-[5px] px-2 py-1 text-xs capitalize outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', props.density === d ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
                                onClick={() => props.onDensityChange!(d)}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                    {props.onWrapChange ? (
                        <label className="mt-1 flex items-center gap-2 text-sm">
                            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={!!props.wrap} onChange={(e: any) => props.onWrapChange!(e.target.checked)} />
                            Wrap long text
                        </label>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}
