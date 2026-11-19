import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useFieldMeta } from 'utilities:app/graphql'
import { useFormContext } from './form'
import type { FieldMessage, FieldMeta, FieldProps, FieldSnapshot, PolicyState, UseFieldResult } from './types'

const NO_SNAPSHOT: FieldSnapshot = { entry: undefined, server: undefined, meta: undefined, submitted: false }
const noopSubscribe = () => () => {}
const NO_MESSAGES: FieldMessage[] = []
const NO_POLICY: PolicyState = {}

function isEmpty(v: string | undefined): boolean {
    return v == null || String(v).trim() === ''
}

function firstDefined<T>(...values: (T | undefined | null)[]): T | undefined {
    for (const v of values) if (v !== undefined && v !== null) return v
    return undefined
}

/**
 * The field contract. Resolves, in order: explicit props → form context (values, script
 * overrides, UI policy layer, server states) → dictionary metadata (cached by the GraphQL utility).
 *
 *   useField('short_description')                  // bound to the nearest FormProvider
 *   useField({ name: 'x', value, onChange, ... })  // standalone, controlled
 *   useField({ name: 'x', table: 'incident' })     // standalone, uncontrolled, dictionary metadata
 *
 * Always controlled through the hook: setValue commits (fires onChange / form listeners),
 * stage records keystrokes. Errors show after the field was touched or the form validated.
 */
export function useField(input: string | FieldProps): UseFieldResult {
    const props: FieldProps = typeof input === 'string' ? { name: input } : input
    const { name } = props
    const ctx = useFormContext()
    const form = props.standalone ? null : ctx
    const bound = !!form && props.value === undefined

    // This field's slice of the form (one memoised snapshot per field).
    const snap = useSyncExternalStore(
        bound ? form!.subscribe : noopSubscribe,
        () => (bound ? form!.fieldSnapshot(name) : NO_SNAPSHOT),
        () => NO_SNAPSHOT,
    )
    useEffect(() => (bound ? form!.registerField(name) : undefined), [bound, form, name])

    const table = props.table || (form ? form.table : undefined) || undefined
    // Dictionary metadata: from the form when it has it, else from the table's cached metadata.
    const needMeta = !snap.meta && !!table && !(props.meta && props.meta.type && props.meta.label)
    const dict = useFieldMeta(table, name, { enabled: needMeta })
    const baseMeta = snap.meta || dict.meta

    // Dependent value: explicit, or the form value of the dictionary dependent field.
    const dependsOn = props.dependsOn || (baseMeta && baseMeta.dependsOn) || undefined
    const formDependent = useSyncExternalStore(
        bound && dependsOn ? form!.subscribe : noopSubscribe,
        () => (bound && dependsOn ? form!.getValue(dependsOn) : undefined),
        () => undefined,
    )

    // Standalone, uncontrolled value lives here.
    const [local, setLocal] = useState(() => ({
        value: props.defaultValue ?? '',
        displayValue: props.defaultDisplayValue ?? props.defaultValue ?? '',
        staged: undefined as string | undefined,
        touched: false,
    }))
    const initial = useRef<string | null>(null)
    if (initial.current === null) initial.current = props.value ?? props.defaultValue ?? ''

    const entry = snap.entry
    const ov = (entry && entry.overrides) || {}
    const server = snap.server

    const ovChoices = entry && entry.overrides ? entry.overrides.choices : undefined
    const meta: FieldMeta = useMemo(
        () => ({
            table: table || '',
            name,
            label: name,
            type: 'string',
            mandatory: false,
            readOnly: false,
            attributes: {},
            source: 'props',
            ...(baseMeta || {}),
            ...(props.meta || {}),
            ...(props.type ? { type: props.type } : {}),
            // Script option overlay: explicit choices (source 'props' makes choice fields use them as given).
            ...(ovChoices ? { choices: ovChoices, source: 'props' as const } : {}),
        }),
        [baseMeta, props.meta, props.type, table, name, ovChoices],
    )

    const value = props.value ?? (bound ? (entry ? entry.value : '') : local.value)
    const displayValue = props.value !== undefined ? props.displayValue ?? props.value : bound ? (entry ? entry.displayValue || entry.value : '') : local.displayValue || local.value
    const originalValue = bound ? (entry ? entry.originalValue : '') : (initial.current as string)
    const staged = bound ? entry && entry.staged : local.staged
    const touched = bound ? !!(entry && entry.touched) : local.touched

    const pol = (entry && entry.policy) || NO_POLICY
    const readOnly = !!firstDefined(props.readOnly, ov.readOnly, pol.readOnly, server && server.readonly, meta.readOnly || meta.canWrite === false)
    const mandatoryRaw = !!firstDefined(props.mandatory, ov.mandatory, pol.mandatory, server && server.mandatory, meta.mandatory)
    const visible = meta.canRead === false ? false : (firstDefined(props.visible, ov.visible, pol.visible, server ? !server.hidden : undefined) ?? true)
    const disabled = !!firstDefined(props.disabled, ov.disabled)
    // The platform's rule: a read-only field is never required.
    const mandatory = mandatoryRaw && !readOnly
    const label = firstDefined(props.label, ov.label, meta.label) || name
    const placeholder = firstDefined(props.placeholder, ov.placeholder, meta.attributes && meta.attributes.placeholder)
    const hint = firstDefined(props.hint, ov.hint, meta.hint)
    const maxLength = firstDefined(props.maxLength, meta.maxLength)

    const current = staged !== undefined ? staged : value
    const missing = mandatory && !disabled && isEmpty(current)
    const showErrors = touched || snap.submitted

    const messages = useMemo(() => {
        const list: FieldMessage[] = []
        if (props.error) list.push({ kind: 'error', text: props.error, id: 'prop-error' })
        for (const m of props.messages || NO_MESSAGES) list.push(m)
        for (const m of (entry && entry.messages) || NO_MESSAGES) list.push(m)
        if (entry && entry.policy && entry.policy.message) list.push(entry.policy.message)
        // "Required" appears after a submit/validate, or once the user changed the value and left it
        // empty: never just for tabbing through an empty field (no error flash, no layout shift).
        if (missing && (snap.submitted || (touched && value !== originalValue))) list.push({ kind: 'error', text: `${label} is required`, id: 'required' })
        if (maxLength && maxLength > 0 && String(current || '').length > maxLength)
            list.push({ kind: 'error', text: `Use ${maxLength} characters or fewer (${String(current).length} now)`, id: 'max-length' })
        if (props.validate && showErrors && !isEmpty(current)) {
            const msg = props.validate(String(current))
            if (msg) list.push({ kind: 'error', text: msg, id: 'validate' })
        }
        return list
    }, [props.error, props.messages, entry, showErrors, missing, label, maxLength, current, props.validate, snap.submitted, touched, value, originalValue])
    const error = messages.find((m) => m.kind === 'error')

    const onChangeRef = useRef(props.onChange)
    onChangeRef.current = props.onChange
    const onStageRef = useRef(props.onStage)
    onStageRef.current = props.onStage
    const controlled = props.value !== undefined

    const setValue = useCallback(
        (v: string, dv?: string) => {
            const nextValue = v == null ? '' : String(v)
            const nextDisplay = dv == null ? nextValue : String(dv)
            if (bound) form!.setValue(name, nextValue, nextDisplay)
            else setLocal((s) => ({ ...s, value: controlled ? s.value : nextValue, displayValue: controlled ? s.displayValue : nextDisplay, staged: undefined }))
            if (onChangeRef.current) onChangeRef.current(nextValue, nextDisplay)
        },
        [bound, form, name, controlled],
    )
    const stage = useCallback(
        (v: string) => {
            if (bound) form!.stage(name, v)
            else setLocal((s) => (s.staged === v ? s : { ...s, staged: v }))
            if (onStageRef.current) onStageRef.current(v)
        },
        [bound, form, name],
    )
    const blur = useCallback(() => {
        if (bound) form!.touch(name)
        else setLocal((s) => (s.touched ? s : { ...s, touched: true }))
    }, [bound, form, name])

    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
    const base = props.id || `rpf-${name}-${uid}`
    const ids = useMemo(() => ({ input: base, label: `${base}-label`, hint: `${base}-hint`, messages: `${base}-messages` }), [base])
    const describedBy = [hint ? ids.hint : '', messages.length ? ids.messages : ''].filter(Boolean).join(' ') || undefined

    const lookup = useMemo(
        () => ({
            sysId: form ? form.sysId || '-1' : '-1',
            encodedRecord: form ? form.encodedRecord : '',
            getChanges: () => (form ? form.serialize() : {}),
        }),
        [form, snap],
    )

    return {
        name,
        table,
        meta,
        label,
        placeholder,
        hint,
        maxLength,
        value,
        displayValue,
        originalValue,
        staged,
        dirty: value !== originalValue,
        touched,
        state: { mandatory, readOnly, visible, disabled },
        missing,
        messages,
        error,
        invalid: !!error,
        loading: needMeta && dict.isLoading,
        bound,
        dependentValue: firstDefined(props.dependentValue, formDependent),
        setValue,
        stage,
        blur,
        ids,
        describedBy,
        lookup,
        autoFocus: props.autoFocus,
    }
}
