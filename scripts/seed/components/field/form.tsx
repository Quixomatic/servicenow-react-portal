import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useFormBootstrap, useTableMeta, useRecordValues } from 'utilities:app/graphql'
import { createFormStore } from './store'
import type { FormStore, ValueInput } from './store'

/**
 * Minimal form context: a FormStore shared by every field under <FormProvider>. Fields bind by
 * name. With a table + sysId the form bootstraps from the platform in one GraphQL request
 * (values, display values, server field states, metadata, encodedRecord) and fills metadata for
 * fields outside the form view from the cached table metadata.
 *
 *   const form = useForm({ table: 'incident', sysId })
 *   <FormProvider form={form}> <StringField name="short_description" /> </FormProvider>
 *   // or simply: <FormProvider table="incident" sysId={id}> … </FormProvider>
 */

export type Form = FormStore & {
    status: { isLoading: boolean; error: Error | null; isFetching: boolean; loaded: boolean }
    /** Re-read the record from the server (keeps unsaved edits). */
    refetch: () => void
}

export type UseFormOptions = {
    table?: string
    sysId?: string
    view?: string
    /** Initial values when not bootstrapping (or for a new, local-only form). */
    values?: Record<string, ValueInput>
    /** Load the record from the platform (default: when table and sysId are given). */
    bootstrap?: boolean
}

const FormContext = createContext<Form | null>(null)

function useRegisteredKey(store: FormStore): string {
    return useSyncExternalStore(
        store.subscribe,
        () => store.registeredFields().sort().join(','),
        () => '',
    )
}

export function useForm(options: UseFormOptions = {}): Form {
    const { table, sysId, view, values } = options
    const [store] = useState(() => createFormStore({ table, sysId, values }))
    const doBootstrap = options.bootstrap ?? !!(table && sysId)
    const boot = useFormBootstrap(table, sysId, { view, enabled: doBootstrap })
    const tableMeta = useTableMeta(table)

    useEffect(() => {
        if (boot.data) store.load({ values: boot.data.values, server: boot.data.states, meta: boot.data.meta, table: boot.data.table, sysId: boot.data.sysId, encodedRecord: boot.data.encodedRecord })
    }, [boot.data, store])
    useEffect(() => {
        if (tableMeta.data) store.mergeMeta(tableMeta.data)
    }, [tableMeta.data, store])

    // Fields bound by name but outside the form view: fetch their values in one GlideRecord_Query.
    const registered = useRegisteredKey(store)
    const missing = useMemo(() => {
        if (!boot.data) return []
        return registered.split(',').filter((n) => n && !(n in boot.data!.values))
    }, [registered, boot.data])
    const extra = useRecordValues(table, sysId, missing, { enabled: doBootstrap && !!boot.data && missing.length > 0 && !!sysId && sysId !== '-1' })
    useEffect(() => {
        if (extra.data) store.load({ values: extra.data })
    }, [extra.data, store])

    const error = (boot.error as Error | null) || (extra.error as Error | null) || null
    const status = useMemo(
        () => ({ isLoading: doBootstrap ? boot.isLoading : false, isFetching: boot.isFetching, error, loaded: !doBootstrap || !!boot.data }),
        [doBootstrap, boot.isLoading, boot.isFetching, error, boot.data],
    )
    const refetchRef = useRef(boot.refetch)
    refetchRef.current = boot.refetch
    return useMemo(() => {
        const form = Object.create(store) as Form
        form.status = status
        form.refetch = () => {
            refetchRef.current()
        }
        return form
    }, [store, status])
}

export type FormProviderProps = UseFormOptions & { form?: Form; children?: any }

export function FormProvider(props: FormProviderProps) {
    const { form, children, ...options } = props
    return form ? <FormContext.Provider value={form}>{children}</FormContext.Provider> : <OwnForm {...options}>{children}</OwnForm>
}

function OwnForm({ children, ...options }: UseFormOptions & { children?: any }) {
    const form = useForm(options)
    return <FormContext.Provider value={form}>{children}</FormContext.Provider>
}

/** The nearest form, or null outside a <FormProvider>. */
export function useFormContext(): Form | null {
    return useContext(FormContext)
}

const noopSubscribe = () => () => {}

/** Subscribe to one field's committed value (re-renders only when it changes). */
export function useFormValue(name: string | undefined, form?: Form | null): string | undefined {
    const ctx = useContext(FormContext)
    const f = form === undefined ? ctx : form
    return useSyncExternalStore(
        f ? f.subscribe : noopSubscribe,
        () => (f && name ? f.getValue(name) : undefined),
        () => undefined,
    )
}

/** Subscribe to the form's dirty state and messages (for save bars, banners). */
export function useFormMeta(form?: Form | null) {
    const ctx = useContext(FormContext)
    const f = form === undefined ? ctx : form
    const dirtyKey = useSyncExternalStore(
        f ? f.subscribe : noopSubscribe,
        () => (f ? f.getDirtyFields().join(',') : ''),
        () => '',
    )
    const messages = useSyncExternalStore(
        f ? f.subscribe : noopSubscribe,
        () => (f ? f.getState().formMessages : EMPTY_MESSAGES),
        () => EMPTY_MESSAGES,
    )
    return { dirtyFields: dirtyKey ? dirtyKey.split(',') : [], isDirty: !!dirtyKey, messages }
}

const EMPTY_MESSAGES: never[] = []
