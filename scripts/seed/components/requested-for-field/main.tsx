/**
 * components:app/requested-for-field: "Requested for", a sys_user reference that respects the
 * platform's delegation rules (who the current user may request an item for).
 *
 *   <RequestedForField name="variables.requested_for" itemId={item} />   bound (variable type 31)
 *   <RequestedForField name="requested_for" table="sc_request" itemId value onChange />   standalone
 *   useRequestedFor({ itemId, user })   item-level state: value, set(), error, checking, valid
 *   useDelegationCheck(itemId)          check(userId) → { ok, message } with stale-answer guarding
 *
 * Every pick the user makes runs the platform's delegation check (GET /api/sn_sc/v1/
 * servicecatalog/items/{item}/delegation/{user}, the call Workspace's requested-for makes). When
 * it fails, the field shows "This person isn't eligible for this request." and, like Workspace's
 * variable, clears the value (`onIneligible="clear"`), or keeps the previous person
 * (`onIneligible="revert"`, for item-level pickers). Built on app/reference-field (search, recent
 * picks, qualifiers), so it looks and behaves like every other reference.
 */
import { useCallback, useRef, useState } from 'react'
import { useUser } from '@portal/runtime'
import { ReferenceField } from 'components:app/reference-field'
import type { ReferenceFieldProps } from 'components:app/reference-field'
import { useFormContext, Spinner } from 'components:app/field'
import { canRequestFor, REQUESTED_FOR_NOT_ELIGIBLE } from 'utilities:app/catalog'
import type { DelegationResult } from 'utilities:app/catalog'

export const DELEGATION_FAILED = 'Error occurred while checking who you can request this for.'

/** check(userId) → { ok, message }; answers for a superseded check resolve with `stale: true`. */
export function useDelegationCheck(itemId: string | undefined) {
    const latest = useRef(0)
    const [checking, setChecking] = useState(false)
    const check = useCallback(
        async (userId: string): Promise<DelegationResult & { stale?: boolean }> => {
            const n = ++latest.current
            if (!userId || !itemId) return { ok: true, message: '' }
            setChecking(true)
            try {
                const r = await canRequestFor(itemId, userId)
                return n === latest.current ? r : { ...r, stale: true }
            } catch (e) {
                return n === latest.current ? { ok: false, message: DELEGATION_FAILED } : { ok: false, message: '', stale: true }
            } finally {
                if (n === latest.current) setChecking(false)
            }
        },
        [itemId],
    )
    return { check, checking }
}

export type RequestedForFieldProps = ReferenceFieldProps & {
    /** The catalog item (delegation is checked per item). */
    itemId: string
    /** On a failed check: clear the value (default, as Workspace's variable) or keep the previous person. */
    onIneligible?: 'clear' | 'revert'
    /** Every check's answer (for submit gating). */
    onEligibility?: (result: DelegationResult & { value: string }) => void
}

export function RequestedForField(props: RequestedForFieldProps) {
    const { itemId, onIneligible = 'clear', onEligibility, ...rest } = props
    const form = useFormContext()
    const bound = !!form && props.value === undefined && !props.standalone
    const { check, checking } = useDelegationCheck(itemId)
    const [error, setError] = useState('')
    const previous = useRef<{ value: string; displayValue: string } | null>(null)
    if (previous.current === null) previous.current = bound ? { value: form!.getValue(props.name), displayValue: form!.getDisplayValue(props.name) } : { value: props.value || props.defaultValue || '', displayValue: props.displayValue || props.defaultDisplayValue || '' }

    const setMessage = (text: string) => {
        if (bound) {
            form!.hideFieldMessage(props.name, 'error')
            if (text) form!.showFieldMessage(props.name, text, 'error')
        } else setError(text)
    }

    const onChange = async (value: string, displayValue: string) => {
        if (props.onChange) props.onChange(value, displayValue)
        setMessage('')
        if (!value) {
            previous.current = { value: '', displayValue: '' }
            return
        }
        const r = await check(value)
        if (r.stale) return
        if (r.ok) {
            previous.current = { value, displayValue }
            if (onEligibility) onEligibility({ ...r, value })
            return
        }
        const back = onIneligible === 'revert' && previous.current ? previous.current : { value: '', displayValue: '' }
        if (bound) form!.setValue(props.name, back.value, back.displayValue)
        else if (props.onChange) props.onChange(back.value, back.displayValue)
        if (onEligibility) onEligibility({ ...r, value })
        setMessage(displayValue && r.message === REQUESTED_FOR_NOT_ELIGIBLE ? `${displayValue}: ${r.message}` : r.message)
    }

    return (
        <div className="relative min-w-0" data-rp-requested-for="" aria-busy={checking || undefined}>
            <ReferenceField
                {...rest}
                reference={props.reference || 'sys_user'}
                onChange={onChange}
                error={bound ? props.error : error || props.error}
            />
            {checking ? (
                <span className="pointer-events-none absolute top-0 right-0 flex items-center gap-1 text-xs text-muted-foreground" role="status">
                    <Spinner label="Checking who you can request for" /> Checking…
                </span>
            ) : null}
        </div>
    )
}

/**
 * Item-level requested-for state (Workspace's "This request would be for …"): defaults to the
 * current user; `set` records a pick, `error` is the last failed check (block submit while set).
 */
export function useRequestedFor(options: { itemId: string; initial?: { value: string; displayValue: string } }) {
    const user = useUser() as any
    const me = { value: String((user && user.sysId) || ''), displayValue: String((user && (user.name || user.userName)) || '') }
    // `confirmed`: the last person the check accepted (the current user and the initial value count).
    const confirmed = useRef((options.initial || me).value)
    const [state, setState] = useState<{ value: string; displayValue: string; error: string; pending: boolean }>(() => ({ ...(options.initial || me), error: '', pending: false }))
    const set = useCallback((value: string, displayValue: string) => setState((s) => ({ ...s, value, displayValue, pending: !!value && value !== confirmed.current })), [])
    const onEligibility = useCallback((r: DelegationResult & { value: string }) => {
        if (r.ok) confirmed.current = r.value
        setState((s) => ({ ...s, error: r.ok ? '' : r.message, pending: !!s.value && s.value !== confirmed.current }))
    }, [])
    return {
        value: state.value,
        displayValue: state.displayValue,
        /** The last failed check's message (the picker kept the previous person). */
        error: state.error,
        /** A pick is still being checked. */
        pending: state.pending,
        /** Someone eligible is set and no check is pending: safe to submit. */
        valid: !!state.value && !state.pending,
        isSelf: state.value === me.value,
        set,
        reset: () => {
            confirmed.current = me.value
            setState({ ...me, error: '', pending: false })
        },
        /** Props for <RequestedForField> (standalone, item-level). */
        fieldProps: {
            value: state.value,
            displayValue: state.displayValue,
            onChange: set,
            onEligibility,
            onIneligible: 'revert' as const,
            itemId: options.itemId,
        },
    }
}

/** Preview (Studio): standalone, on sc_request.requested_for, against a demo item. */
export default function RequestedForPreview() {
    const rf = useRequestedFor({ itemId: '04b7e94b4f7b4200086eeed18110c7fd' })
    return (
        <div className="max-w-md p-4">
            <RequestedForField name="requested_for" table="sc_request" label="Requested for" readOnly={false} {...rf.fieldProps} />
            <p className="mt-2 text-xs text-muted-foreground">Value: {rf.value || '—'}</p>
        </div>
    )
}
