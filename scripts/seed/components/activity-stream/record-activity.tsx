import { cx } from 'components:app/field'
import { JournalComposer } from 'components:app/journal-composer'
import type { ComposerForm } from 'components:app/journal-composer'
import type { ActivityFilters, ActivityKind } from 'utilities:app/activity'
import { ActivityStream } from './stream'
import type { AttachmentRenderer } from './entry'

const REAL_ID = /^[0-9a-f]{32}$/i

export type RecordActivityProps = {
    table: string
    sysId: string
    /** Bind the composer to this form (RecordForm): journal text is a form value. */
    form?: ComposerForm
    view?: string
    /** Show the journal composer (default true). */
    composer?: boolean
    /** Journal fields the composer offers (default: every writable one). */
    journalFields?: string[]
    defaultJournalField?: string
    title?: string
    headingLevel?: 2 | 3 | 4
    showFilters?: boolean
    initialFilters?: ActivityFilters
    kinds?: ActivityKind[]
    pageSize?: number
    compact?: boolean
    /** Day headings in the stream (default true). */
    groupByDay?: boolean
    /** Composer lines before it grows (default 3). */
    composerRows?: number
    renderAttachment?: AttachmentRenderer
    className?: string
}

/** The composer above the stream, stacked (never side by side). */
export function RecordActivity(props: RecordActivityProps) {
    if (!props.table || !REAL_ID.test(props.sysId || '')) return null
    return (
        <div className={cx('flex min-w-0 flex-col gap-4', props.className)} data-rp-record-activity={`${props.table}:${props.sysId}`}>
            {props.composer !== false ? <JournalComposer table={props.table} sysId={props.sysId} form={props.form} fields={props.journalFields} defaultField={props.defaultJournalField} rows={props.composerRows} /> : null}
            <ActivityStream
                table={props.table}
                sysId={props.sysId}
                view={props.view}
                title={props.title}
                headingLevel={props.headingLevel}
                showFilters={props.showFilters}
                initialFilters={props.initialFilters}
                kinds={props.kinds}
                pageSize={props.pageSize}
                compact={props.compact}
                groupByDay={props.groupByDay}
                renderAttachment={props.renderAttachment}
            />
        </div>
    )
}

/** The formatter element name of the platform's activity formatter. */
export const ACTIVITY_FORMATTER = 'activity.xml'

function isJournalInput(meta: any): boolean {
    const t = meta && (meta.internalType || meta.type)
    return t === 'journal_input'
}

/**
 * How a RecordForm shows the activity (opt-in; James hasn't chosen a presentation yet):
 *   'off'   (default) nothing: journal fields render as app/journal-field, as before
 *   'notes' where the view's activity formatter belongs (activityAnchor: the first journal input,
 *           i.e. the classic Notes section), journal inputs move into the composer; views without
 *           a journal input get it below the sections
 *   'below' below the form's sections, journal inputs move into the composer
 */
export type FormActivityMode = 'off' | 'notes' | 'below'

/** Normalise a prop / option value (true → 'notes', false / unknown → 'off'). */
export function formActivityMode(value: unknown): FormActivityMode {
    if (value === 'notes' || value === true) return 'notes'
    if (value === 'below') return 'below'
    return 'off'
}

/**
 * Where the activity goes in a view in 'notes' mode. The platform's formLayout lists formatters
 * separately (rows don't carry activity.xml), so: the activity.xml element if a row has it, else
 * the view's first journal input (the classic Notes section: comments, work notes, then the
 * activity), else '' (nowhere in the rows: below the sections). null = no activity formatter.
 */
export function activityAnchor(boot: any): string | null {
    if (!boot || (boot.formatters || []).indexOf(ACTIVITY_FORMATTER) < 0) return null
    let firstJournal = ''
    for (const s of boot.sections || [])
        for (const row of s.rows || [])
            for (const col of row)
                for (const n of col) {
                    if (n === ACTIVITY_FORMATTER) return n
                    if (!firstJournal && isJournalInput(boot.meta && boot.meta[n])) firstJournal = n
                }
    return firstJournal
}

function activityProps(boot: any, options: { form?: ComposerForm; props?: Partial<RecordActivityProps> }) {
    return { table: boot.table, sysId: boot.sysId, form: options.form, view: boot.view && boot.view !== 'Default view' ? boot.view : '', headingLevel: 3 as const, ...(options.props || {}) }
}

function realRecord(boot: any): boolean {
    return !!boot && !boot.isNew && REAL_ID.test(boot.sysId || '')
}

/**
 * A RecordForm renderElement for the activity modes: 'notes' puts the composer + stream at the
 * anchor; 'notes' and 'below' move the view's journal inputs into the composer. 'off' renders
 * nothing special. New records keep their journal fields (nothing to stream yet). Chains to
 * `renderElement` first.
 */
export function activityElementRenderer(options: { form?: ComposerForm; mode?: FormActivityMode | boolean; renderElement?: (name: string, ctx: any) => any; props?: Partial<RecordActivityProps> }) {
    const mode = formActivityMode(options.mode)
    return (name: string, ctx: { bootstrap: any; readOnly: boolean }) => {
        if (options.renderElement) {
            const custom = options.renderElement(name, ctx)
            if (custom !== undefined) return custom
        }
        if (mode === 'off') return undefined
        const boot = ctx && ctx.bootstrap
        if (!realRecord(boot)) return undefined
        if (mode === 'notes') {
            const anchor = activityAnchor(boot)
            if (anchor === null) return undefined
            if (name === anchor) return <RecordActivity {...activityProps(boot, options)} className="pt-1" />
        }
        if (isJournalInput(boot.meta && boot.meta[name])) return null
        return undefined
    }
}

/**
 * The activity below a form's sections: always in 'below' mode; in 'notes' mode only for views
 * whose activity formatter has no place in the rows (no journal input). null otherwise.
 */
export function ActivityBelowForm(props: { form?: ComposerForm; bootstrap: any; mode?: FormActivityMode | boolean; className?: string; props?: Partial<RecordActivityProps> }) {
    const boot = props.bootstrap
    const mode = formActivityMode(props.mode)
    if (mode === 'off' || !realRecord(boot)) return null
    if (mode === 'notes' && activityAnchor(boot) !== '') return null
    return (
        <div className={cx('border-t border-border pt-4 pb-4', props.className)} data-rp-form-activity={mode}>
            <RecordActivity {...activityProps(boot, { form: props.form, props: props.props })} />
        </div>
    )
}
