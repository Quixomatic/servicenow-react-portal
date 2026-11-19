/**
 * components:app/variable-editor: a record's catalog variables (a submitted RITM, a record
 * producer's target record…), read-only or editable: the variable editor of a platform form.
 *
 *   <VariableEditor table="sc_req_item" sysId={ritm} />            editable when the user may write
 *   <VariableEditor table="sc_req_item" sysId={ritm} readOnly />   always read-only
 *   useVariableEditorForm(data, { readOnly })   the catalog form for loaded data (own UI)
 *   variableChanges(form)                       changed 'variables.<name>' fields, for a save
 *
 * Data comes from the platform the way Workspace's form gets it (utilities:app/catalog
 * fetchVariableEditor): GlideLayout_Query.formLayout's `variables` element
 * (GlideLayout_VariablesElementType._elements: the same question types as the catalog form),
 * variablesLayout and recordValues, plus the record's catalog UI policies and client scripts
 * (CatalogClientScriptingEnvironment_* on the record) and its Save UI action. Rendering reuses
 * app/variable (createCatalogForm, every variable type, custom variables) and
 * app/variable-container (containers, sets, MRVS). Editable: UI policies and client scripts run
 * (onSubmit can veto), and Save sends only the changed variables through the record's Save UI
 * action (business rules, ACLs, data policies run). Mount <DialogOutlet /> once on the page for
 * g_modal and "Remove all".
 */
import { useMemo, useRef, useState } from 'react'
import { useQueryClient } from 'utilities:react-query'
import { Button } from 'components:button'
import { useVariableEditor, saveRecordVariables } from 'utilities:app/catalog'
import type { VariableEditorData } from 'utilities:app/catalog'
import { createCatalogForm, CatalogFormProvider, sanitizeHtml } from 'components:app/variable'
import type { CatalogForm, VariableSpec } from 'components:app/variable'
import { VariableLayout } from 'components:app/variable-container'
import { useClientScripts } from 'utilities:app/gform'
import { cx, Spinner, IconAlert, IconCheck, useFormMeta } from 'components:app/field'
import type { FieldLayout } from 'components:app/field'

export type VariableEditorProps = {
    table: string
    sysId: string
    /** Always read-only (default: editable when the user can write the record's variables). */
    readOnly?: boolean
    fieldLayout?: FieldLayout
    renderCustom?: (spec: VariableSpec) => any
    /** Hide the Save / Discard bar (e.g. when a host form saves). */
    hideActions?: boolean
    onSaved?: () => void
    className?: string
}

/** Changed variables as Save UI action fields. */
export function variableChanges(form: CatalogForm): { name: string; value: string; displayValue: string; originalValue: string }[] {
    const s = form.getState()
    return form.getDirtyFields()
        .filter((n) => n.indexOf('variables.') === 0 && !!form.specByName[n])
        .map((n) => ({ name: n, value: s.fields[n].value, displayValue: s.fields[n].displayValue, originalValue: s.fields[n].originalValue }))
}

/** A catalog form over variable editor data; read-only puts every variable in read-only. */
export function useVariableEditorForm(data: VariableEditorData | undefined, options: { readOnly?: boolean } = {}): CatalogForm | null {
    const readOnly = !!options.readOnly
    return useMemo(() => {
        if (!data) return null
        const form = createCatalogForm(data, data.table)
        if (readOnly) for (const s of form.specs) if (s.submitName || s.kind === 'mrvs') form.setReadOnly(s.name, true)
        return form
    }, [data, readOnly])
}

export function VariableEditor(props: VariableEditorProps) {
    const q = useVariableEditor(props.table, props.sysId)
    if (q.isLoading)
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-busy="true">
                <Spinner label="Loading variables" /> Loading variables…
            </div>
        )
    if (q.error || !q.data)
        return (
            <p role="alert" className="text-sm text-destructive">
                {(q.error as Error | null)?.message || 'No variables for this record.'}
            </p>
        )
    return <Loaded {...props} data={q.data} />
}

function Loaded(props: VariableEditorProps & { data: VariableEditorData }) {
    const { data } = props
    const qc = useQueryClient()
    const readOnly = !!props.readOnly || !data.canWrite
    const form = useVariableEditorForm(data, { readOnly })
    const meta = useFormMeta(form)
    const [busy, setBusy] = useState(false)
    const [status, setStatus] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
    const root = useRef<HTMLDivElement | null>(null)
    const scripts = useClientScripts({
        host: {
            store: form as any,
            resolve: form ? form.resolve : undefined,
            table: () => data.table,
            sysId: () => data.recordSysId,
            isNew: () => false,
            view: () => '',
            encodedRecord: () => data.encodedRecord,
            submit: () => false,
        },
        scripts: data.scripts,
        policies: form ? form.policies : undefined,
        catalog: true,
        enabled: !!form && !readOnly,
        runKey: form,
    })
    if (!form) return null
    if (!form.specs.length) return <p className="text-sm text-muted-foreground">This record has no variables.</p>

    const save = async () => {
        setStatus(null)
        const v = form.validate()
        if (!v.valid) {
            setStatus({ kind: 'error', text: v.errors.map((e) => e.message).join(' · ') })
            return
        }
        if (scripts.env && !scripts.env.runOnSubmit('sysverb_ws_save')) return
        const changes = variableChanges(form)
        if (!changes.length) return
        setBusy(true)
        try {
            await saveRecordVariables({ data, changes })
            form.commit()
            setStatus({ kind: 'success', text: `Saved ${changes.length} variable${changes.length === 1 ? '' : 's'}.` })
            qc.invalidateQueries({ queryKey: ['rp-catalog', 'variable-editor', data.table, data.recordSysId] })
            if (props.onSaved) props.onSaved()
        } catch (e) {
            setStatus({ kind: 'error', text: (e as Error).message })
        } finally {
            setBusy(false)
        }
    }

    return (
        <CatalogFormProvider form={form}>
            <div ref={root} className={cx('flex flex-col gap-4', props.className)} data-rp-variable-editor={data.recordSysId} data-readonly={readOnly ? '' : undefined}>
                {meta.messages.length ? (
                    <div className="flex flex-col gap-2">
                        {meta.messages.map((m: any) => (
                            <div key={m.id} role={m.kind === 'error' ? 'alert' : 'status'} className={cx('rpv-rich rounded-md border p-3 text-sm', m.kind === 'error' ? 'border-destructive/50 bg-destructive/5 text-destructive' : 'border-border bg-muted/50')} dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.text) }} />
                        ))}
                    </div>
                ) : null}
                <VariableLayout fieldLayout={props.fieldLayout} renderCustom={props.renderCustom} />
                {!readOnly && !props.hideActions ? (
                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
                        {status ? (
                            <p role={status.kind === 'error' ? 'alert' : 'status'} className={cx('mr-auto flex items-center gap-1.5 text-sm', status.kind === 'error' ? 'text-destructive' : 'text-primary')}>
                                {status.kind === 'error' ? <IconAlert size={14} /> : <IconCheck size={14} />}
                                {status.text}
                            </p>
                        ) : null}
                        <Button type="button" variant="outline" disabled={!meta.isDirty || busy} onClick={() => { form.reset(); setStatus(null) }}>
                            Discard
                        </Button>
                        <Button type="button" disabled={!meta.isDirty || busy} onClick={save} data-rp-variable-editor-save="">
                            {busy ? <Spinner label="Saving" /> : null}
                            Save variables
                        </Button>
                    </div>
                ) : null}
            </div>
        </CatalogFormProvider>
    )
}

/** Preview (Studio): the variables of RITM0010002 (bulk mobile devices, one MRVS row), read-only. */
export default function VariableEditorPreview() {
    return (
        <div className="max-w-2xl p-4">
            <VariableEditor table="sc_req_item" sysId="a51c0d5b83681310e8fbc9a6feaad39d" readOnly />
        </div>
    )
}
