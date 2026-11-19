import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Card, CardHeader, CardContent } from 'components:card'
import { Button } from 'components:button'
import { Badge } from 'components:badge'
import { useFormViews } from 'utilities:app/graphql'
import { FormProvider, useFormMeta, cx, Spinner, IconAlert, IconChevronDown } from 'components:app/field'
import type { FieldLayout, ValidationResult } from 'components:app/field'
import { Select } from 'components:app/combobox'
import { sanitizeHtml } from 'components:app/variable'
import { useRecordForm, SAVE_ACTIONS } from './use-record-form'
import type { RecordForm as RecordFormModel, UseRecordFormOptions, SaveOutcome } from './use-record-form'
import type { UiAction } from 'utilities:app/graphql'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from 'components:dropdown-menu'
import { FormLayout } from './layout'

export type RecordFormProps = {
    /** A form from useRecordForm (else table / sysId / view build one). */
    form?: RecordFormModel
    table?: string
    sysId?: string
    view?: string
    onSaved?: UseRecordFormOptions['onSaved']
    onOpenRecord?: UseRecordFormOptions['onOpenRecord']
    /** Show the form-view switcher; onViewChange receives the chosen view name. */
    showViews?: boolean
    onViewChange?: (view: string) => void
    fieldLayout?: FieldLayout
    hideFormatters?: boolean
    /** Extra header content (right side), e.g. a "New" button. */
    headerActions?: any
    renderElement?: (name: string, ctx: any) => any
    /** Hide the UI action bar. */
    hideActions?: boolean
    className?: string
}

/** A record form with header, view switcher, sections, dirty tracking and save. */
export function RecordForm(props: RecordFormProps) {
    if (props.form) return <RecordFormView {...props} form={props.form} />
    return <OwnRecordForm {...props} />
}

function OwnRecordForm(props: RecordFormProps) {
    const form = useRecordForm({ table: props.table || '', sysId: props.sysId, view: props.view, onSaved: props.onSaved, onOpenRecord: props.onOpenRecord })
    return <RecordFormView {...props} form={form} />
}

const HEADER_FIELDS = ['number', 'name', 'short_description']

/** The SAVED display value (the header describes the record, not unsaved edits). */
function useValue(form: RecordFormModel, name: string) {
    return useSyncExternalStore(
        form.subscribe,
        () => {
            const e = name ? form.getState().fields[name] : undefined
            return e ? e.originalDisplayValue || e.originalValue : ''
        },
        () => '',
    )
}

function RecordHeader({ form, actions, viewSwitcher, actionBar }: { form: RecordFormModel; actions?: any; viewSwitcher?: any; actionBar?: any }) {
    const boot = form.bootstrap!
    const titleField = HEADER_FIELDS.find((f) => f in boot.values) || ''
    const title = useValue(form, titleField)
    const subtitle = useValue(form, titleField === 'number' ? 'short_description' : '')
    const state = useValue(form, 'state')
    return (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {form.isNew ? `New ${boot.tableLabel}` : boot.tableLabel}
                </p>
                <h2 className="flex flex-wrap items-center gap-2 text-lg leading-tight font-semibold" data-rp-record-title="">
                    <span className="truncate">{title || (form.isNew ? 'New record' : boot.sysId)}</span>
                    {state ? (
                        <Badge variant="secondary" data-rp-record-state="">
                            {state}
                        </Badge>
                    ) : null}
                    {form.readOnly ? <Badge variant="outline">Read only</Badge> : null}
                </h2>
                {subtitle ? <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {actionBar}
                {viewSwitcher}
                {actions}
            </div>
        </div>
    )
}

function ViewSwitcher({ table, sysId, view, onChange }: { table: string; sysId: string; view: string; onChange?: (v: string) => void }) {
    const views = useFormViews(table, sysId)
    const list = (views.data && views.data.views) || []
    const items = list.length ? list.map((v) => ({ value: v.name, label: v.label })) : [{ value: view, label: view || 'Default view' }]
    if (items.every((i) => i.value !== view)) items.unshift({ value: view, label: view })
    return (
        <div className="w-56" data-rp-view-switcher="">
            <Select aria-label="Form view" size="sm" value={view} items={items} loading={views.isFetching} onChange={(i) => onChange && onChange(i.value === 'Default view' ? '' : i.value)} />
        </div>
    )
}

function RecordFormView(props: RecordFormProps & { form: RecordFormModel }) {
    const { form } = props
    const boot = form.bootstrap
    const meta = useFormMeta(form)
    const errors: ValidationResult['errors'] = form.validation ? form.validation.errors : []
    const root = useRef<HTMLDivElement | null>(null)
    const summary = useRef<HTMLDivElement | null>(null)
    const failure = form.saveError

    // Warn before leaving with unsaved changes.
    useEffect(() => {
        if (!meta.isDirty) return
        const onBeforeUnload = (e: any) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [meta.isDirty])

    const focusField = (name: string) => {
        const scope = root.current
        if (!scope) return
        const el = scope.querySelector(
            `[data-rpf-field="${name}"] input, [data-rpf-field="${name}"] textarea, [data-rpf-field="${name}"] [role=combobox], [data-rpf-field="${name}"] button, [data-rpf-field="${name}"] [tabindex]`,
        ) as HTMLElement | null
        if (el) el.focus()
    }

    // Focus the error summary whenever a submit (button, Ctrl+S, UI action, script) fails validation.
    useEffect(() => {
        if (form.validation) setTimeout(() => summary.current && summary.current.focus(), 0)
    }, [form.validation])
    const handle = (_outcome: SaveOutcome | unknown) => {}
    const save = async (opts?: { force?: boolean }) => handle(await form.save(opts))
    const run = async (action: UiAction) => handle(await form.runAction(action))

    if (!boot) {
        if (form.status.error)
            return (
                <Card className={props.className}>
                    <CardContent role="alert" className="text-sm text-destructive">
                        {form.status.error.message}
                    </CardContent>
                </Card>
            )
        return (
            <Card className={props.className} aria-busy="true">
                <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner label="Loading the form" /> Loading the form…
                </CardContent>
            </Card>
        )
    }

    const dirtyCount = meta.dirtyFields.length
    const canSave = !form.readOnly && (form.isNew || dirtyCount > 0) && !form.saving
    return (
        <Card ref={root} className={props.className} data-rp-record-form={`${boot.table}:${form.isNew ? 'new' : boot.sysId}`}>
            <CardHeader>
                <RecordHeader
                    form={form}
                    actions={props.headerActions}
                    actionBar={props.hideActions ? null : <UiActionBar form={form} onRun={run} />}
                    viewSwitcher={props.showViews ? <ViewSwitcher table={boot.table} sysId={form.isNew ? '-1' : boot.sysId} view={boot.view} onChange={props.onViewChange} /> : null}
                />
            </CardHeader>
            <CardContent>
                <FormProvider form={form}>
                    <form
                        noValidate
                        aria-label={`${boot.tableLabel} form`}
                        onSubmit={(e: any) => {
                            e.preventDefault()
                            if (canSave) save()
                        }}
                        onKeyDown={(e: any) => {
                            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                                e.preventDefault()
                                if (canSave) save()
                            }
                        }}
                        className="flex flex-col gap-6"
                    >
                        {errors.length ? (
                            <div
                                ref={summary}
                                tabIndex={-1}
                                role="alert"
                                className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/30"
                                data-rp-error-summary=""
                            >
                                <p className="flex items-center gap-2 font-medium text-destructive">
                                    <IconAlert size={16} /> Fix {errors.length} field{errors.length === 1 ? '' : 's'} to save
                                </p>
                                <ul className="mt-2 ml-6 list-disc">
                                    {errors.map((e) => (
                                        <li key={e.name + e.message}>
                                            <button type="button" className="text-left text-destructive underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none" onClick={() => focusField(e.name)}>
                                                {e.message}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                        {form.remoteChange && !form.conflict ? (
                            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm" data-rp-remote-change="">
                                <IconAlert size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                                <span className="mr-auto">
                                    <span className="font-medium">{form.remoteChange.deleted ? 'Deleted by someone else.' : 'Changed by someone else.'}</span>{' '}
                                    {form.remoteChange.deleted ? 'This record no longer exists.' : 'This record was updated while you were editing it.'}
                                </span>
                                {form.remoteChange.deleted ? null : (
                                    <Button type="button" size="sm" variant="outline" onClick={() => form.reload()} data-rp-remote-reload="">
                                        Reload
                                    </Button>
                                )}
                                <Button type="button" size="sm" variant="ghost" onClick={() => form.dismissRemoteChange()} data-rp-remote-keep="">
                                    Keep editing
                                </Button>
                            </div>
                        ) : null}
                        {form.conflict ? (
                            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm" data-rp-conflict="">
                                <IconAlert size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                                <span className="mr-auto">
                                    <span className="font-medium">Changed by someone else.</span> This record was updated after you opened it.
                                </span>
                                <Button type="button" size="sm" variant="outline" onClick={() => form.reload()} data-rp-conflict-reload="">
                                    Reload
                                </Button>
                                <Button type="button" size="sm" variant="destructive" onClick={() => save({ force: true })} data-rp-conflict-overwrite="">
                                    Overwrite
                                </Button>
                            </div>
                        ) : null}
                        {meta.messages.length ? (
                            <div className="flex flex-col gap-2" data-rp-form-messages="">
                                {meta.messages.map((m: any) => (
                                    <div
                                        key={m.id}
                                        role={m.kind === 'error' ? 'alert' : 'status'}
                                        className={cx('rpv-rich rounded-md border p-3 text-sm [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline', m.kind === 'error' ? 'border-destructive/50 bg-destructive/5 text-destructive' : 'border-border bg-muted/50 text-foreground')}
                                        // g_form.addInfoMessage often carries links: sanitized HTML, as on the platform.
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.text) }}
                                    />
                                ))}
                            </div>
                        ) : null}
                        {failure ? (
                            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive" data-rp-save-error="">
                                <IconAlert size={16} className="mt-0.5 shrink-0" />
                                <span>{failure.message}</span>
                            </div>
                        ) : null}
                        <FormLayout bootstrap={boot} readOnly={form.readOnly} fieldLayout={props.fieldLayout} hideFormatters={props.hideFormatters} renderElement={props.renderElement} />
                        {form.scriptErrors.length ? (
                            <details className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground" data-rp-script-errors="">
                                <summary className="cursor-pointer">
                                    {form.scriptErrors.length} client script{form.scriptErrors.length === 1 ? '' : 's'} failed (the form still works)
                                </summary>
                                <ul className="mt-2 flex flex-col gap-1">
                                    {form.scriptErrors.map((e, i) => (
                                        <li key={i}>
                                            <span className="font-medium text-foreground">{e.script}</span> ({e.kind}): {e.message}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}
                        {form.readOnly ? null : (
                            <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-3 rounded-b-xl border-t border-border bg-card/95 px-6 py-3 backdrop-blur" data-rp-save-bar="">
                                <p className={cx('mr-auto text-sm', dirtyCount ? 'text-foreground' : 'text-muted-foreground')} aria-live="polite">
                                    {form.isNew ? 'New record, not saved yet' : dirtyCount ? `${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'}` : 'No changes'}
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!dirtyCount || form.saving}
                                    onClick={() => {
                                        form.reset()
                                        form.clearValidation()
                                    }}
                                >
                                    Discard
                                </Button>
                                <Button type="submit" disabled={!canSave} data-rp-save="" aria-keyshortcuts="Control+S Meta+S">
                                    {form.saving ? <Spinner label="Saving" /> : null}
                                    {form.isNew ? 'Create' : 'Save'}
                                </Button>
                            </div>
                        )}
                    </form>
                </FormProvider>
            </CardContent>
        </Card>
    )
}

/**
 * UI action bar: the form's UI actions as the server evaluated them (conditions already applied).
 * Form buttons render as buttons; context-menu actions go into a "More" menu. Save lives in the
 * save bar. Client actions run their onclick script through the g_form layer; others go
 * straight to the server (POST /api/now/ui/ui_action/:id).
 */
export function UiActionBar({ form, onRun }: { form: RecordFormModel; onRun: (a: UiAction) => Promise<unknown> }) {
    const [running, setRunning] = useState('')
    const all = ((form.bootstrap && form.bootstrap.actions) || []).filter((a) => a.label && SAVE_ACTIONS.indexOf(a.name) < 0)
    if (!all.length) return null
    const buttons = all.filter((a) => a.type === 'button')
    const menu = all.filter((a) => a.type !== 'button')
    const go = (a: UiAction) => {
        if (running) return
        setRunning(a.sysId)
        onRun(a).finally(() => setRunning(''))
    }
    const busy = !!running || form.saving
    return (
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Record actions" data-rp-action-bar="">
            {buttons.map((a) => (
                <Button
                    key={a.sysId}
                    type="button"
                    size="sm"
                    variant={a.style === 'destructive' ? 'destructive' : a.style === 'primary' ? 'default' : 'outline'}
                    disabled={busy}
                    title={a.hint || undefined}
                    onClick={() => go(a)}
                    data-rp-action={a.name || a.sysId}
                >
                    {running === a.sysId ? <Spinner label="Running" /> : null}
                    {a.label}
                </Button>
            ))}
            {menu.length ? (
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button type="button" size="sm" variant="outline" disabled={busy} data-rp-action-menu="" />}>
                        More <IconChevronDown size={14} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-56">
                        {menu.map((a) => (
                            <DropdownMenuItem key={a.sysId} onClick={() => go(a)} className={a.style === 'destructive' ? 'text-destructive' : undefined} data-rp-action={a.name || a.sysId}>
                                {a.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}
        </div>
    )
}
