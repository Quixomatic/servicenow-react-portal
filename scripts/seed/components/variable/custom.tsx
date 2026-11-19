import { useSyncExternalStore } from 'react'
import { useField, FieldShell } from 'components:app/field'
import type { FieldLayout, UseFieldResult } from 'components:app/field'
import type { CatalogVariable } from 'utilities:app/catalog'
import { CUSTOM_VARIABLES } from 'utilities:app/custom-variables'
import { useCatalogFormContext } from './catalog-form'
import type { CatalogForm } from './catalog-form'
import type { VariableSpec } from './meta'

/**
 * Custom (macro / UI page) variables rendered by OUR components: the variable's attributes say
 * which one, `rp_component=app/<key>`, with optional props `rp_options={…json…}`.
 *
 * The component is a real input. It receives CustomVariableProps: the value and onChange, the
 * bound field (useField result: label, states, messages, a11y ids — wrap your control in
 * <FieldShell field={field}> for the standard label / hint / errors), the parsed options, the
 * variable's metadata and the catalog form store (other variables, g_form-style methods).
 * Values are glide strings and submit like any variable; mandatory and UI policies apply.
 *
 * Which component renders (first hit):
 *   1. registerCustomVariable('app/<key>', Component): code registration from any widget;
 *   2. utilities:app/custom-variables: the CUSTOM_VARIABLES map (a record admins edit in Studio to
 *      import their components; app/variable imports it, so they load wherever variables render);
 *   3. a component record already loaded on the page as 'components:app/<key>' (default export, or
 *      a named `CustomVariable` export).
 * Components never load just because instance data names them: only components the page's import
 * graph already allows can render (the same rule as embeds). Otherwise a notice shows.
 */
export type CustomVariableProps = {
    /** Store name, 'variables.<name>'. */
    name: string
    value: string
    displayValue: string
    /** Commit a value (glide string), with an optional display value. */
    onChange: (value: string, displayValue?: string) => void
    /** Parsed rp_options (an object; {} when none). */
    options: Record<string, any>
    /** The bound field: label, hint, states (mandatory / readOnly / visible), messages, ids, setValue / blur. */
    field: UseFieldResult
    /** True for "custom with label" (type 17) and UI page variables. */
    showLabel: boolean
    readOnly: boolean
    layout?: FieldLayout
    variable: CatalogVariable
    spec: VariableSpec
    /** The catalog form (item, other variables, resolve, g_form-style methods), null outside one. */
    form: CatalogForm | null
}

type Registry = Map<string, any>
const registered: Registry = new Map()
const listeners = new Set<() => void>()
let version = 0
const bump = () => {
    version++
    listeners.forEach((l) => l())
}

/** Register a component for `rp_component=<key>` ('app/<key>'). Returns the unregister. */
export function registerCustomVariable(key: string, component: any): () => void {
    const k = normaliseKey(key)
    registered.set(k, component)
    bump()
    return () => {
        if (registered.get(k) === component) {
            registered.delete(k)
            bump()
        }
    }
}

function normaliseKey(key: string): string {
    return String(key || '').trim().replace(/^components:/, '')
}

function fromModule(mod: any): any {
    if (!mod) return null
    if (typeof mod === 'function') return mod
    return mod.CustomVariable || mod.default || null
}

/** The component for a key, or null (see the resolution order above). */
export function resolveCustomVariable(key: string): any {
    const k = normaliseKey(key)
    if (!k) return null
    if (registered.has(k)) return registered.get(k)
    const map = (CUSTOM_VARIABLES || {}) as Record<string, any>
    if (map[k]) return fromModule(map[k])
    const loaded = (globalThis as any).__REACT_PORTAL__ && (globalThis as any).__REACT_PORTAL__.modules
    return fromModule(loaded && loaded['components:' + k])
}

/** Keys that resolve right now (registered + the custom-variables map), for diagnostics. */
export function customVariableKeys(): string[] {
    return Array.from(new Set(Array.from(registered.keys()).concat(Object.keys(CUSTOM_VARIABLES || {})))).sort()
}

function subscribe(l: () => void) {
    listeners.add(l)
    return () => {
        listeners.delete(l)
    }
}

/** A custom variable: its rp_component, or the "not available here" notice. */
export function CustomVariableHost({ spec, layout, renderCustom }: { spec: VariableSpec; layout?: FieldLayout; renderCustom?: (spec: VariableSpec) => any }) {
    useSyncExternalStore(subscribe, () => version, () => version)
    const form = useCatalogFormContext()
    const config = spec.custom
    const Component = config && config.component ? resolveCustomVariable(config.component) : null
    if (renderCustom) {
        const node = renderCustom(spec)
        if (node !== undefined) return node
    }
    if (Component) return <BoundCustom spec={spec} layout={layout} form={form} Component={Component} />
    return <CustomVariableNotice spec={spec} />
}

function BoundCustom({ spec, layout, form, Component }: { spec: VariableSpec; layout?: FieldLayout; form: CatalogForm | null; Component: any }) {
    const field = useField({ name: spec.name, label: spec.variable.label || spec.variable.variableName || '' })
    const config = spec.custom!
    if (!field.state.visible) return null
    const props: CustomVariableProps = {
        name: spec.name,
        value: field.value,
        displayValue: field.displayValue,
        onChange: (value: string, displayValue?: string) => {
            field.setValue(value, displayValue === undefined ? value : displayValue)
            field.blur()
        },
        options: config.options,
        field,
        showLabel: config.showLabel,
        readOnly: field.state.readOnly || field.state.disabled,
        layout,
        variable: spec.variable,
        spec,
        form,
    }
    return (
        <div data-rpv-kind="custom" data-rpv-component={config.component} className="min-w-0">
            <Component {...props} />
        </div>
    )
}

/**
 * Custom variables without a usable rp_component render a platform macroponent, Jelly macro or UI
 * page, which a portal can't run: a read-only notice instead (it names what's missing).
 */
export function CustomVariableNotice({ spec }: { spec: VariableSpec }) {
    const config = spec.custom
    const field = useField({ name: spec.name, standalone: true, label: spec.variable.label || spec.variable.variableName || 'Custom variable', readOnly: true })
    if (!spec.variable.label && !(config && config.component)) return null
    const text = config && config.component
        ? `Custom variable: component ${config.component} isn't available on this page.`
        : config && config.error
          ? `Custom variable: ${config.error}.`
          : 'Custom variable: shown in the platform catalog only.'
    return <FieldShell field={field} readOnlyValue={<span className="text-muted-foreground">{text}</span>} />
}
