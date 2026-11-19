import { cx, IconAlert, IconInfo, IconCheck, Spinner } from './ui'
import type { FieldLayout, FieldMessage, FieldSize, UseFieldResult } from './types'

/**
 * FieldShell: the visual and accessibility contract every field primitive renders inside.
 *
 * - label wired to the control (htmlFor = ids.input, id = ids.label);
 * - mandatory marker (visible asterisk + "required" for screen readers), optional marker;
 * - hint (ids.hint) and messages (ids.messages, a polite live region) referenced by the
 *   control's aria-describedby (field.describedBy);
 * - a "modified" marker for unsaved changes;
 * - read-only rendering: a focusable, selectable value (never a disabled-looking input);
 * - hidden fields (state.visible = false) render nothing.
 */
export type FieldShellProps = {
    field: UseFieldResult
    children?: any
    layout?: FieldLayout
    size?: FieldSize
    /** Show "(optional)" next to non-mandatory labels. */
    showOptional?: boolean
    /** Let long labels wrap (default) or truncate them with a tooltip. */
    labelWrap?: boolean
    hideLabel?: boolean
    /** Render no label row at all: the control renders its own label (checkbox, switch). */
    noLabel?: boolean
    /** Custom read-only rendering (e.g. a link for references). */
    readOnlyValue?: any
    /** Render the control even when read-only (controls that have their own read-only look). */
    keepControlWhenReadOnly?: boolean
    /** The label points at a group (radios, checkbox lists): rendered as a legend instead. */
    group?: boolean
    className?: string
    /** Extra content in the label row, right-aligned (counters, actions). */
    labelAside?: any
}

export function FieldShell(props: FieldShellProps) {
    const { field, children, layout = 'vertical', size = 'md', showOptional, labelWrap = true, hideLabel, group, className, labelAside } = props
    const noLabel = !!props.noLabel && !(field.state.readOnly && !props.keepControlWhenReadOnly)
    if (!field.state.visible) return null
    const readOnlyView = field.state.readOnly && !props.keepControlWhenReadOnly
    const horizontal = layout === 'horizontal'
    const Root: any = group ? 'fieldset' : 'div'
    const LabelTag: any = group ? 'span' : 'label'

    // A fieldset's legend must be its first child to name the group, so in group mode the row
    // itself is the legend and the label text is a span.
    const RowTag: any = group ? 'legend' : 'div'
    const labelNode = (
        <RowTag className={cx('flex min-w-0 items-baseline gap-2', group ? 'float-left w-full p-0' : '', hideLabel ? 'sr-only' : '', horizontal ? 'pt-2' : '')}>
            <LabelTag
                id={field.ids.label}
                htmlFor={group || readOnlyView ? undefined : field.ids.input}
                className={cx('rpf-label text-sm leading-tight font-medium text-foreground', labelWrap ? 'break-words' : 'truncate', size === 'sm' ? 'text-xs' : '')}
                title={labelWrap ? undefined : field.label}
            >
                {field.label}
                {field.state.mandatory ? (
                    <>
                        <span aria-hidden="true" className="ml-0.5 text-destructive">
                            *
                        </span>
                        <span className="sr-only"> (required)</span>
                    </>
                ) : showOptional && !field.state.readOnly ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
                ) : null}
            </LabelTag>
            {field.dirty ? (
                <span className="rpf-dirty inline-flex items-center gap-1 text-xs text-primary" title="Modified, not saved">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                    <span className="sr-only">modified</span>
                </span>
            ) : null}
            {field.loading ? <Spinner className="text-muted-foreground" label="Loading field" /> : null}
            {labelAside ? <span className="ml-auto text-xs text-muted-foreground">{labelAside}</span> : null}
        </RowTag>
    )

    const body = (
        <div className="flex min-w-0 flex-col gap-1.5">
            {readOnlyView ? <ReadOnlyValue field={field}>{props.readOnlyValue}</ReadOnlyValue> : children}
            {field.hint ? (
                <p id={field.ids.hint} className="rpf-hint text-xs text-muted-foreground">
                    {field.hint}
                </p>
            ) : null}
            <FieldMessages id={field.ids.messages} messages={field.messages} />
        </div>
    )

    return (
        <Root
            className={cx(
                'rpf-root min-w-0',
                group ? 'm-0 border-0 p-0' : '',
                horizontal ? 'grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)]' : 'flex flex-col gap-1.5',
                className,
            )}
            data-rpf-field={field.name}
            data-rpf-type={field.meta.type}
            data-dirty={field.dirty ? '' : undefined}
            data-invalid={field.invalid ? '' : undefined}
            data-readonly={field.state.readOnly ? '' : undefined}
            data-mandatory={field.state.mandatory ? '' : undefined}
            aria-describedby={group ? field.describedBy : undefined}
        >
            {noLabel ? null : labelNode}
            {noLabel && horizontal ? <span aria-hidden="true" /> : null}
            {body}
        </Root>
    )
}

const kindStyles: Record<string, string> = {
    error: 'text-destructive',
    warning: 'rpf-warning',
    info: 'text-muted-foreground',
    success: 'text-primary',
}

/** Message list for a field. Errors are announced (polite live region). */
export function FieldMessages({ id, messages }: { id: string; messages: FieldMessage[] }) {
    return (
        <div id={id} aria-live="polite" className={messages.length ? 'flex flex-col gap-1' : 'sr-only'}>
            {messages.map((m, i) => (
                <p key={m.id || `${m.kind}-${i}`} className={cx('rpf-message flex items-start gap-1.5 text-xs', kindStyles[m.kind] || '')} data-kind={m.kind}>
                    {m.kind === 'success' ? <IconCheck size={14} className="mt-px" /> : m.kind === 'info' ? <IconInfo size={14} className="mt-px" /> : <IconAlert size={14} className="mt-px" />}
                    <span>
                        <span className="sr-only">{m.kind === 'error' ? 'Error: ' : m.kind === 'warning' ? 'Warning: ' : ''}</span>
                        {m.text}
                    </span>
                </p>
            ))}
        </div>
    )
}

/**
 * Read-only value: focusable and selectable, announced as a read-only text box with the field's
 * label. Empty values read "Empty" to screen readers and show an em dash.
 */
export function ReadOnlyValue({ field, children }: { field: UseFieldResult; children?: any }) {
    const text = field.displayValue || field.value
    return (
        <div
            id={field.ids.input}
            role="textbox"
            aria-readonly="true"
            aria-labelledby={field.ids.label}
            aria-describedby={field.describedBy}
            tabIndex={0}
            className="rpf-readonly min-h-9 rounded-md px-0 py-2 text-sm break-words whitespace-pre-wrap text-foreground outline-none select-text focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
            {children !== undefined && children !== null ? (
                children
            ) : text ? (
                text
            ) : (
                <>
                    <span aria-hidden="true" className="text-muted-foreground">
                        —
                    </span>
                    <span className="sr-only">Empty</span>
                </>
            )}
        </div>
    )
}

/** Props a control spreads onto its focusable element for the shell's a11y wiring. */
export function controlA11y(field: UseFieldResult) {
    return {
        id: field.ids.input,
        name: field.name,
        'aria-describedby': field.describedBy,
        'aria-invalid': field.invalid || undefined,
        'aria-required': field.state.mandatory || undefined,
        disabled: field.state.disabled,
        autoFocus: field.autoFocus,
    }
}
