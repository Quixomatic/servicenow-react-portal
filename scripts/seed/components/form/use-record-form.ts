import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast, useUser, useRecordWatch } from '@portal/runtime'
import { useQueryClient } from 'utilities:react-query'
import { useFormBootstrap, executeUiAction, fetchRecordValues, UiActionError } from 'utilities:app/graphql'
import type { FormBootstrap, UiAction, UiActionResult, SessionNotification } from 'utilities:app/graphql'
import { useForm, attachPolicies } from 'components:app/field'
import type { Form, ValidationResult } from 'components:app/field'
import { startScriptEnvironment, scriptUserFrom } from 'utilities:app/gform'
import type { ScriptEnvironment, ScriptError } from 'utilities:app/gform'

/** Names of the form's Save action, Workspace first, then the classic verbs. */
export const SAVE_ACTIONS = ['sysverb_ws_save', 'sysverb_update', 'sysverb_insert', 'sysverb_ws_insert']

/** The record changed on the server since this form loaded it. */
export class ConflictError extends Error {
    serverModCount: number
    loadedModCount: number
    constructor(loaded: number, server: number) {
        super('This record was changed by someone else since you opened it.')
        this.name = 'ConflictError'
        this.loadedModCount = loaded
        this.serverModCount = server
    }
}

/** Live: the record changed on the server while this form had unsaved edits (or was deleted). */
export type RemoteChange = { deleted: boolean; modCount: number | null; by: string | null; changes: string[] }

export type SaveOutcome =
    | { ok: true; result: UiActionResult; isNew: boolean }
    | { ok: false; reason: 'invalid'; validation: ValidationResult }
    | { ok: false; reason: 'blocked' }
    | { ok: false; reason: 'nothing' }
    | { ok: false; reason: 'conflict'; error: ConflictError }
    | { ok: false; reason: 'server'; error: UiActionError | Error }

export type SubmitOptions = { force?: boolean; skipValidation?: boolean }

export type RecordForm = Form & {
    /** The bootstrap (layout, views, policies, actions, scripts); undefined while loading. */
    bootstrap: FormBootstrap | undefined
    isNew: boolean
    /** The Save UI action (absent: the user can't save this record here → read-only). */
    saveAction: UiAction | undefined
    readOnly: boolean
    saving: boolean
    /** Last server failure (cleared by the next submit). */
    saveError: UiActionError | Error | null
    /** The last submit that failed validation (any action, incl. g_form.submit from scripts). */
    validation: ValidationResult | null
    clearValidation: () => void
    /** Set when a save found the record changed on the server (Reload / Overwrite). */
    conflict: ConflictError | null
    /** Client script errors (compile, run, callbacks): reported, never fatal. */
    scriptErrors: ScriptError[]
    /** The legacy g_form environment (client scripts), once started. */
    scripts: ScriptEnvironment | null
    /** Validate, then run the platform's own form save (the Save UI action). */
    save: (options?: SubmitOptions) => Promise<SaveOutcome>
    /** Validate (mandatory + onSubmit scripts), then run a server UI action by name / sys_id. */
    submit: (action?: string | UiAction, options?: SubmitOptions) => Promise<SaveOutcome>
    /** A UI action as the action bar runs it: onclick script (client) or straight to the server. */
    runAction: (action: UiAction) => Promise<unknown>
    /** Discard local edits and load the record again (after a conflict). */
    reload: () => void
    /**
     * Live (AMB record watch): someone else changed (or deleted) the record while this form had
     * unsaved edits. A clean form refreshes silently instead. Cleared by reload() / dismissRemoteChange().
     */
    remoteChange: RemoteChange | null
    /** "Keep editing": hide the notice (the save-time sys_mod_count check still guards the write). */
    dismissRemoteChange: () => void
}

export type UseRecordFormOptions = {
    table: string
    /** sys_id, or '-1' / '' for a new record (the platform reserves a number on load). */
    sysId?: string
    view?: string
    /** Encoded query presetting a new record's values (g_aw.openRecord(table, '-1', { query })). */
    query?: string
    /** Show business-rule messages (session notifications) as toasts. Default true. */
    toastNotifications?: boolean
    /** Run the form's client scripts (onLoad / onChange / onSubmit, policy scripts). Default true. */
    clientScripts?: boolean
    onSaved?: (result: UiActionResult, info: { isNew: boolean; action: UiAction }) => void
    /** g_aw.openRecord and server redirects to a record (default: the classic form in a new tab). */
    onOpenRecord?: (table: string, sysId: string, params?: Record<string, unknown>) => void
    /** Watch the record for changes by others (AMB). Default true; off in Studio's designer. */
    live?: boolean
}

export function notify(list: SessionNotification[]) {
    for (const n of list) {
        const t = String(n.type || '').toLowerCase()
        if (t === 'error') toast.error(n.text)
        else if (t === 'warning') toast.warning(n.text)
        else if (t === 'success') toast.success(n.text)
        else toast.info(n.text)
    }
}

function openClassic(table: string, sysId: string) {
    window.open(`/${encodeURIComponent(table)}.do?sys_id=${encodeURIComponent(sysId)}`, '_blank', 'noopener')
}

/**
 * A record form on the platform's own form runtime:
 *
 *   const form = useRecordForm({ table: 'incident', sysId, view })
 *   <FormProvider form={form}> … fields … </FormProvider>   (or <RecordForm form={form} />)
 *
 * - one GraphQL bootstrap per (table, sysId, view): layout, values, states, metadata, UI policies,
 *   client scripts, g_scratchpad and form UI actions (shared with useForm's query);
 * - UI policies on the store's policy layer; client scripts (and policy run-scripts) through the
 *   g_form compatibility layer (utilities:app/gform), errors reported, never fatal;
 * - submit(action) = mandatory validation + onSubmit scripts, a sys_mod_count conflict check, then
 *   the UI action on the server (POST /api/now/ui/ui_action/:id with the changed fields); business
 *   rule messages come back as toasts; failures map to field messages; redirects open records;
 * - new records ('-1') are never refetched (each load reserves a number).
 */
export function useRecordForm(options: UseRecordFormOptions): RecordForm {
    const { table, view } = options
    const sysId = options.sysId && options.sysId !== '-1' ? options.sysId : '-1'
    const isNew = sysId === '-1'
    const query = isNew ? options.query || '' : ''
    const boot = useFormBootstrap(table, sysId, { view, query })
    const base = useForm({ table, sysId, view, query })
    const qc = useQueryClient()
    const user = useUser() as any
    const baseRef = useRef(base)
    baseRef.current = base
    const bootRef = useRef<FormBootstrap | undefined>(boot.data)
    bootRef.current = boot.data
    const optsRef = useRef(options)
    optsRef.current = options
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<UiActionError | Error | null>(null)
    const [conflict, setConflict] = useState<ConflictError | null>(null)
    const [validation, setValidation] = useState<ValidationResult | null>(null)
    const clearValidation = useCallback(() => setValidation(null), [])
    const [scriptErrors, setScriptErrors] = useState<ScriptError[]>([])
    const envRef = useRef<ScriptEnvironment | null>(null)
    const [envState, setEnvState] = useState<ScriptEnvironment | null>(null)
    const submitRef = useRef<(a?: string | UiAction, o?: SubmitOptions) => Promise<SaveOutcome> | false>(() => false)
    const savingRef = useRef(false)

    const openRecord = useCallback((t: string, id: string, params?: Record<string, unknown>) => {
        if (optsRef.current.onOpenRecord) optsRef.current.onOpenRecord(t, id, params)
        else openClassic(t, id)
    }, [])

    const userReady = !!user && !!(user.sysId || user.userName)
    // UI policies + client scripts: started once the store holds the bootstrap's values (useForm's
    // load effect runs first), restarted when a fresh bootstrap arrives (after a save).
    useEffect(() => {
        const data = boot.data
        if (!data) return
        const store = baseRef.current
        const policies = attachPolicies(store, data.policies)
        let stop = () => {}
        if (optsRef.current.clientScripts !== false && userReady) {
            const started = startScriptEnvironment({
                host: {
                    store,
                    table: () => data.table,
                    sysId: () => (isNew ? data.sysId || '-1' : sysId),
                    isNew: () => isNew,
                    view: () => data.view,
                    encodedRecord: () => data.encodedRecord,
                    displayValue: () => store.getDisplayValue('number') || store.getDisplayValue('name') || '',
                    // The view's elements (+ values the record shipped): not every column of the table.
                    hasField: (name: string) => name in data.meta || name in data.values,
                    submit: (name?: string) => submitRef.current(name),
                    openRecord: (t, id, params) => openRecord(t, id, params),
                },
                scripts: data.scripts,
                scratchpad: data.scratchpad,
                user: scriptUserFrom(user),
                policies,
                onError: (e) => setScriptErrors((list) => list.concat(e)),
            })
            envRef.current = started.env
            setEnvState(started.env)
            stop = started.stop
        }
        return () => {
            stop()
            policies.detach()
            envRef.current = null
            // A restart re-runs onLoad from scratch: drop what the previous run set.
            const s = store.getState()
            for (const n of Object.keys(s.fields)) if (Object.keys(s.fields[n].overrides).length) store.clearOverrides(n)
            store.clearMessages()
        }
    }, [boot.data, userReady])

    const actions = (boot.data && boot.data.actions) || []
    const saveAction = useMemo(() => {
        for (const name of SAVE_ACTIONS) {
            const hit = actions.find((a) => a.name === name)
            if (hit) return hit
        }
        return undefined
    }, [boot.data])

    const findAction = (ref?: string | UiAction): UiAction | undefined => {
        if (ref && typeof ref === 'object') return ref
        const list = (bootRef.current && bootRef.current.actions) || []
        if (!ref) return saveAction
        return list.find((a) => a.name === ref || a.sysId === ref) || (SAVE_ACTIONS.indexOf(String(ref)) >= 0 ? saveAction : undefined)
    }

    /** Server part of a submit (after validation): conflict check, UI action, refresh / redirect. */
    const serverSubmit = async (action: UiAction, opts: SubmitOptions): Promise<SaveOutcome> => {
        const form = baseRef.current
        const data = bootRef.current!
        const fields = Object.keys(form.getState().fields)
            .map((name) => ({ name, entry: form.getState().fields[name] }))
            // New records: every value (defaults included); existing: only what changed.
            .filter(({ entry }) => (isNew ? String(entry.value || '') !== '' : entry.value !== entry.originalValue))
            .map(({ name, entry }) => ({ name, value: entry.value, displayValue: entry.displayValue, originalValue: entry.originalValue }))
        const isSave = SAVE_ACTIONS.indexOf(action.name) >= 0
        if (isSave && !isNew && !fields.length) return { ok: false, reason: 'nothing' }
        savingRef.current = true
        setSaving(true)
        setSaveError(null)
        try {
            // Optimistic concurrency: re-read sys_mod_count before writing.
            if (!isNew && !opts.force && data.modCount != null) {
                const now = await fetchRecordValues(data.table, { sysId }, ['sys_mod_count']).catch(() => null)
                const server = now && now.sys_mod_count ? Number(now.sys_mod_count.value) : NaN
                if (!isNaN(server) && server !== data.modCount) {
                    const error = new ConflictError(data.modCount, server)
                    setConflict(error)
                    return { ok: false, reason: 'conflict', error }
                }
            }
            setConflict(null)
            // An insert posts sysparm_sys_id=-1: the server assigns the reserved sys_id and number.
            const result = await executeUiAction({ actionSysId: action.sysId, table: data.table, sysId, encodedRecord: data.encodedRecord, fields })
            if (optsRef.current.toastNotifications !== false) notify(result.notifications)
            if (result.operation) form.commit()
            // A new record's bootstrap is never refetched while mounted (that would reserve another
            // number); it has gcTime 0, so the next "new" loads a fresh one.
            if (!isNew) qc.invalidateQueries({ queryKey: ['rp-gql', 'form', table, sysId] })
            if (optsRef.current.onSaved && (result.operation || isSave)) optsRef.current.onSaved(result, { isNew, action })
            const r = result.redirect
            if (r && r.table && r.sysId && !(r.table === data.table && r.sysId === (isNew ? result.sysId : sysId))) openRecord(r.table, r.sysId, r.query ? { query: r.query } : undefined)
            else if (r && r.url && !r.table) window.open(r.url, '_blank', 'noopener')
            return { ok: true, result, isNew }
        } catch (e) {
            const error = e as UiActionError | Error
            setSaveError(error)
            if (error instanceof UiActionError) {
                for (const m of error.fieldMessages) if (m.field) form.showFieldMessage(m.field.replace(/^[^.]+\./, ''), m.message, m.type === 'warning' ? 'warning' : 'error')
                if (optsRef.current.toastNotifications !== false) notify(error.notifications.filter((n) => n.text !== error.message))
            }
            return { ok: false, reason: 'server', error }
        } finally {
            savingRef.current = false
            setSaving(false)
        }
    }

    /**
     * Like g_form.submit: synchronous validation (staged typing committed, mandatory fields,
     * onSubmit scripts) → false when blocked, else the server part's promise.
     */
    const submitSync = (ref?: string | UiAction, opts: SubmitOptions = {}): Promise<SaveOutcome> | false => {
        const form = baseRef.current
        if (savingRef.current || !bootRef.current) return false
        const action = findAction(ref)
        if (!action) {
            const error = new Error(ref ? `There is no "${typeof ref === 'string' ? ref : ref.name}" action on this form.` : 'You can’t save this record here.')
            setSaveError(error)
            return false
        }
        if (!opts.skipValidation) {
            const state = form.getState()
            for (const name of Object.keys(state.fields)) {
                const staged = state.fields[name].staged
                if (staged !== undefined) form.setValue(name, staged)
            }
            const validation = form.validate()
            if (!validation.valid) {
                lastInvalid.current = validation
                setValidation(validation)
                return false
            }
            setValidation(null)
            if (envRef.current && !envRef.current.runOnSubmit(action.name)) {
                // onSubmit scripts often make fields mandatory and return false: surface them.
                const again = form.validate()
                if (!again.valid) {
                    lastInvalid.current = again
                    setValidation(again)
                }
                return false
            }
        }
        return serverSubmit(action, opts)
    }
    const lastInvalid = useRef<ValidationResult | null>(null)
    submitRef.current = submitSync

    const submit = useCallback(async (ref?: string | UiAction, opts: SubmitOptions = {}): Promise<SaveOutcome> => {
        lastInvalid.current = null
        const r = submitRef.current(ref, opts)
        if (r === false) return lastInvalid.current ? { ok: false, reason: 'invalid', validation: lastInvalid.current } : { ok: false, reason: 'blocked' }
        return r
    }, [])

    const save = useCallback((opts?: SubmitOptions) => submit(undefined, opts), [submit])

    const runAction = useCallback(
        async (action: UiAction) => {
            baseRef.current.clearMessages()
            if (action.hasClientScript && action.clientScript && envRef.current) return envRef.current.runClientAction(action)
            return submit(action)
        },
        [submit],
    )

    // ---- live: someone else changed this record (AMB record watch; sys_mod_count ordering) ----
    const [remoteChange, setRemoteChange] = useState<RemoteChange | null>(null)
    const seenMod = useRef(-1)
    useRecordWatch(
        table,
        isNew ? null : `sys_id=${sysId}`,
        (e: { operation: string; modCount: number | null; fromUser: string | null; changes: string[] }) => {
            if (e.operation === 'delete') {
                setRemoteChange({ deleted: true, modCount: e.modCount, by: e.fromUser, changes: [] })
                return
            }
            const loaded = bootRef.current ? bootRef.current.modCount : null
            // Not newer than what we loaded (our own save's echo, or old news), or already handled.
            if (e.modCount != null && loaded != null && e.modCount <= loaded) return
            if (e.modCount != null && e.modCount <= seenMod.current) return
            if (e.modCount != null) seenMod.current = e.modCount
            if (savingRef.current) return
            if (!baseRef.current.isDirty()) {
                // Clean form: refresh silently (useForm's load keeps nothing to lose).
                qc.invalidateQueries({ queryKey: ['rp-gql', 'form', table, sysId] })
                return
            }
            setRemoteChange({ deleted: false, modCount: e.modCount, by: e.fromUser, changes: e.changes || [] })
        },
        { enabled: !isNew && !!table && options.live !== false, invalidate: false },
    )
    const dismissRemoteChange = useCallback(() => setRemoteChange(null), [])

    const reload = useCallback(() => {
        setRemoteChange(null)
        setConflict(null)
        setSaveError(null)
        baseRef.current.reset()
        qc.invalidateQueries({ queryKey: ['rp-gql', 'form', table, sysId] })
    }, [qc, table, sysId])

    return useMemo(() => {
        const form = Object.create(base) as RecordForm
        form.bootstrap = boot.data
        form.isNew = isNew
        form.saveAction = saveAction
        form.readOnly = !!boot.data && !saveAction
        form.saving = saving
        form.saveError = saveError
        form.conflict = conflict
        form.validation = validation
        form.clearValidation = clearValidation
        form.scriptErrors = scriptErrors
        form.scripts = envState
        form.save = save
        form.submit = submit
        form.runAction = runAction
        form.reload = reload
        form.remoteChange = remoteChange
        form.dismissRemoteChange = dismissRemoteChange
        return form
    }, [base, boot.data, isNew, saveAction, saving, saveError, conflict, validation, scriptErrors, envState, save, submit, runAction, reload, remoteChange, dismissRemoteChange])
}
