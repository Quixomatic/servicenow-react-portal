import { cx, IconCheck } from 'components:app/field'
import { baseType } from 'utilities:app/list-data'
import type { CellValue } from 'utilities:app/list-data'

/** Fields whose 1..5 values read as severity (dot colour by value, as Workspace highlights them). */
const SEVERITY_FIELDS = ['priority', 'impact', 'urgency', 'severity', 'risk']
const SEVERITY_TONE: Record<string, string> = {
    '1': 'bg-destructive',
    '2': 'rpl-tone-high',
    '3': 'rpl-tone-mid',
    '4': 'rpl-tone-low',
    '5': 'bg-muted-foreground/50',
}

export type CellType = string

export function isNumeric(type: string | undefined): boolean {
    return baseType(type) === 'number'
}

/** Default cell content for a glide type (display values come formatted from the server). */
export function DefaultCell({ name, type, isChoice, cell, isDisplay }: { name: string; type?: string; isChoice?: boolean; cell: CellValue | undefined; isDisplay?: boolean }) {
    const value = cell ? cell.value : ''
    const display = cell ? cell.displayValue || '' : ''
    const kind = baseType(type, isChoice)
    if (kind === 'boolean') {
        if (value === 'true')
            return (
                <span className="inline-flex items-center text-foreground">
                    <IconCheck size={15} />
                    <span className="sr-only">true</span>
                </span>
            )
        return value === 'false' ? <span className="text-muted-foreground">false</span> : <Empty />
    }
    if (!display && !value) return <Empty />
    const leaf = name.split('.').pop() || name
    if (kind === 'choice' && SEVERITY_FIELDS.indexOf(leaf) >= 0 && SEVERITY_TONE[value]) {
        return (
            <span className="inline-flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className={cx('size-2 shrink-0 rounded-full', SEVERITY_TONE[value])} />
                <span className="truncate">{display || value}</span>
            </span>
        )
    }
    if (kind === 'reference') return <span className={cx('truncate', isDisplay ? '' : 'rpl-ref')}>{display || value}</span>
    if (kind === 'number' || kind === 'date' || kind === 'datetime') return <span className="truncate tabular-nums">{display || value}</span>
    return <span className="rpl-text">{display || value}</span>
}

export function Empty() {
    return (
        <>
            <span aria-hidden="true" className="text-muted-foreground/60">
                —
            </span>
            <span className="sr-only">empty</span>
        </>
    )
}
