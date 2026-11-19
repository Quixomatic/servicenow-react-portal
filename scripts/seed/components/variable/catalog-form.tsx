import { createContext, useContext, useMemo, useState } from 'react'
import { createFormStore, FormProvider } from 'components:app/field'
import type { Form, FormStore } from 'components:app/field'
import type { CatalogItem, CatalogVariable } from 'utilities:app/catalog'
import { variableSpec } from './meta'
import type { VariableSpec } from './meta'

/**
 * Catalog form: the same FormStore that record forms use (so useField, FieldControl and every
 * field primitive work unchanged), plus catalog semantics:
 *
 * - fields are named 'variables.<name>' (the AppCatalog names); every method that takes a field
 *   name also accepts the variable name, 'IO:<question sys_id>' and the question sys_id
 *   (g_form compatibility for catalog client scripts);
 * - specs: each variable's render kind + FieldMeta, from one mapping (meta.ts);
 * - serializeVariables(): { variableName: value } for price and submit (MRVS as row JSON);
 * - the store's override layer (setMandatory, setReadOnly, setDisplay, showFieldMessage, …) is
 *   where catalog UI policies and client scripts plug in later.
 */
export type CatalogForm = Form & {
    item: CatalogItem
    specs: VariableSpec[]
    specByName: Record<string, VariableSpec>
    /** Any alias → store name ('variables.<name>'). */
    resolve: (nameOrAlias: string) => string
    getVariable: (nameOrAlias: string) => CatalogVariable | undefined
    serializeVariables: () => Record<string, string>
    /** Variables whose change affects the price. */
    priceAffecting: string[]
}

const NAME_METHODS = [
    'getValue', 'getDisplayValue', 'setValue', 'stage', 'touch', 'clearValue', 'setMandatory', 'setReadOnly', 'setVisible',
    'setDisplay', 'setDisabled', 'setLabel', 'setPlaceholder', 'setHint', 'clearOverrides', 'showFieldMessage', 'hideFieldMessage',
    'reset', 'isDirty', 'onChange', 'registerField', 'fieldSnapshot',
]

export function createCatalogForm(item: CatalogItem, table = 'sc_cat_item'): CatalogForm {
    const specs = item.variables.map((v) => variableSpec(v, { table }))
    const specByName: Record<string, VariableSpec> = {}
    const alias: Record<string, string> = {}
    for (const s of specs) {
        specByName[s.name] = s
        alias[s.name] = s.name
        if (s.variable.variableName) alias[s.variable.variableName] = s.name
        if (s.variable.id) {
            alias[s.variable.id] = s.name
            alias[`IO:${s.variable.id}`] = s.name
        }
    }
    const resolve = (n: string) => alias[n] || (alias[`variables.${n}`] ? `variables.${n}` : n)

    const store: FormStore = createFormStore({ table, sysId: item.sysId })
    const values: Record<string, { value: string; displayValue: string }> = {}
    for (const s of specs) {
        if (s.kind === 'container' || s.kind === 'variable_set' || s.kind === 'label' || s.kind === 'rich_text_label' || s.kind === 'break') continue
        const v = item.values[s.name]
        if (s.kind === 'mrvs') {
            values[s.name] = mrvsInitial(s.variable)
            continue
        }
        values[s.name] = v ? v : { value: s.variable.defaultValue || '', displayValue: s.variable.defaultValue || '' }
    }
    const meta: Record<string, any> = {}
    for (const s of specs) if (s.meta) meta[s.name] = s.meta
    store.load({ values, meta, table, sysId: item.sysId })
    // Server-evaluated visibility (variables the platform hides up front).
    for (const s of specs) if (s.variable.visible === false) store.setVisible(s.name, false)

    const form = Object.create(store) as CatalogForm
    for (const m of NAME_METHODS) {
        const base = (store as any)[m]
        ;(form as any)[m] = (name: string, ...rest: unknown[]) => base(typeof name === 'string' && name !== '*' ? resolve(name) : name, ...rest)
    }
    form.item = item
    form.specs = specs
    form.specByName = specByName
    form.resolve = resolve
    form.getVariable = (n) => {
        const s = specByName[resolve(n)]
        return s ? s.variable : undefined
    }
    form.priceAffecting = specs.filter((s) => s.variable.hasPriceImplecations).map((s) => s.name)
    form.serializeVariables = () => {
        const out: Record<string, string> = {}
        for (const s of specs) {
            if (!s.submitName || s.kind === 'container' || s.kind === 'variable_set') continue
            out[s.submitName] = store.getValue(s.name)
        }
        return out
    }
    form.status = { isLoading: false, isFetching: false, error: null, loaded: true }
    form.refetch = () => {}
    return form
}

/** MRVS initial value: rows as JSON (value and display value per column). */
function mrvsInitial(v: CatalogVariable): { value: string; displayValue: string } {
    const cols = (v.fields || []).map((f) => f.name)
    const rows = (v.rowData || []).map((r) => {
        const value: Record<string, string> = {}
        const display: Record<string, string> = {}
        r.row.forEach((cell, i) => {
            const col = (v.fields || []).find((f) => f.id === cell.id)
            const key = col ? col.name : cols[i]
            value[key] = cell.value
            display[key] = cell.displayValue
        })
        return { value, display }
    })
    return { value: JSON.stringify(rows.map((r) => r.value)), displayValue: JSON.stringify(rows.map((r) => r.display)) }
}

const CatalogContext = createContext<CatalogForm | null>(null)

/** A catalog form for a loaded item (created once per item draft). */
export function useCatalogForm(item: CatalogItem | undefined, table = 'sc_cat_item'): CatalogForm | null {
    const [cache] = useState(() => new Map<string, CatalogForm>())
    return useMemo(() => {
        if (!item) return null
        const key = `${item.sysId}|${item.targetRecordSysId}`
        if (!cache.has(key)) cache.set(key, createCatalogForm(item, table))
        return cache.get(key) as CatalogForm
    }, [item, table, cache])
}

/** Provides the catalog form to variables and to every field primitive (as their form). */
export function CatalogFormProvider({ form, children }: { form: CatalogForm; children?: any }) {
    return (
        <CatalogContext.Provider value={form}>
            <FormProvider form={form}>{children}</FormProvider>
        </CatalogContext.Provider>
    )
}

export function useCatalogFormContext(): CatalogForm | null {
    return useContext(CatalogContext)
}
