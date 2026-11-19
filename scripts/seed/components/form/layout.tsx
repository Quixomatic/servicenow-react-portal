import { FieldControl } from 'components:app/field-control'
import { cx } from 'components:app/field'
import type { FieldLayout } from 'components:app/field'
import type { FormBootstrap, FormSection as FormSectionData } from 'utilities:app/graphql'

/**
 * Form layout: the view's sections → rows → columns → elements, as the platform lays them out
 * (sys_ui_section / sys_ui_element, already resolved per view by the server).
 *
 * Elements: dictionary fields render through app/field-control; formatters (activity.xml,
 * attached_knowledge, …) render a labelled placeholder until they get their own primitives;
 * split markers are already resolved into columns.
 */

export type FormLayoutProps = {
    bootstrap: FormBootstrap
    /** Render every field read-only (no write access / no Save action). */
    readOnly?: boolean
    fieldLayout?: FieldLayout
    /** Hide formatter placeholders. */
    hideFormatters?: boolean
    /** Custom element renderer: return undefined to fall back to the default. */
    renderElement?: (name: string, ctx: { bootstrap: FormBootstrap; readOnly: boolean }) => any
    className?: string
}

const FORMATTER_LABELS: Record<string, string> = {
    'activity.xml': 'Activity',
    attached_knowledge: 'Attached knowledge',
    'cxs_table_search.xml': 'Related search',
    'process_flow.xml': 'Process flow',
    'variable_editor.xml': 'Variables',
}

export function isSplitMarker(name: string) {
    return name === '.split' || name === '.begin_split' || name === '.end_split'
}

export function isFormatter(name: string, bootstrap: FormBootstrap) {
    if (bootstrap.meta[name]) return false
    return bootstrap.formatters.indexOf(name) >= 0 || /\.xml$/.test(name) || !!FORMATTER_LABELS[name]
}

function FormatterPlaceholder({ name }: { name: string }) {
    const label = FORMATTER_LABELS[name] || name.replace(/\.xml$/, '').replace(/[_.]/g, ' ')
    return (
        <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground" data-rp-formatter={name}>
            <span className="font-medium capitalize text-foreground">{label}</span> · formatter not supported yet
        </div>
    )
}

export function FormElement(props: { name: string } & Omit<FormLayoutProps, 'className'>) {
    const { name, bootstrap, readOnly = false } = props
    if (isSplitMarker(name)) return null
    if (props.renderElement) {
        const custom = props.renderElement(name, { bootstrap, readOnly })
        if (custom !== undefined) return custom
    }
    if (bootstrap.meta[name]) return <FieldControl name={name} layout={props.fieldLayout} readOnly={readOnly ? true : undefined} />
    if (isFormatter(name, bootstrap)) return props.hideFormatters ? null : <FormatterPlaceholder name={name} />
    return null
}

/** One section: an optional heading, then its rows (1 column, or 2 side by side from md up). */
export function FormSection(props: { section: FormSectionData; index: number; showHeading?: boolean } & Omit<FormLayoutProps, 'className'>) {
    const { section, index } = props
    const headingId = `rp-form-section-${section.id || index}`
    const heading = props.showHeading !== false && (index > 0 || section.caption)
    return (
        <section aria-labelledby={heading ? headingId : undefined} className="flex flex-col gap-4" data-rp-form-section={section.caption || 'main'}>
            {heading ? (
                <h3 id={headingId} className="border-b border-border pb-2 text-sm font-semibold tracking-tight text-foreground">
                    {section.label || section.caption}
                </h3>
            ) : null}
            {section.rows.map((row, ri) => (
                <div key={ri} className={cx('grid gap-x-6 gap-y-4', row.length > 1 ? 'md:grid-cols-2' : '')}>
                    {row.map((col, ci) => (
                        <div key={ci} className="flex min-w-0 flex-col gap-4">
                            {col.map((name) => (
                                <FormElement key={name} name={name} {...props} />
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </section>
    )
}

/** Every section of the view, stacked. */
export function FormLayout(props: FormLayoutProps) {
    const { bootstrap, className, ...rest } = props
    return (
        <div className={cx('flex flex-col gap-8', className)}>
            {bootstrap.sections.map((s, i) => (
                <FormSection key={s.id || i} section={s} index={i} bootstrap={bootstrap} {...rest} />
            ))}
        </div>
    )
}
