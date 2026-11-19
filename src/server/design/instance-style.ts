import { GR, getById, str } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { parseJson, isPlainObject } from '../lib/util.ts'
import { compileTailwind, SHADCN_COLORS } from '../compiler/compiler.ts'
import { UNSAFE_CSS as UNSAFE, classTokens } from '../lib/css-safe.ts'

export { classTokens }

/**
 * Instance CSS: everything a single placement contributes to the page's stylesheet, compiled
 * into placement.instance_css and shipped in the release manifest.
 *
 * - classes:      the instance's Tailwind classes → their utilities (compiled server-side)
 * - style tokens: padding, background, radius, … → declarations on the instance root
 * - layout:       span/start/order/self-alignment in the parent block's grid
 * - options:      a block's options whose schema property has "x-css-var" → custom properties
 *                 (so block CSS like `grid-template-columns: var(--rp-cols)` is responsive)
 *
 * Every group accepts `tablet` / `mobile` sub-objects, emitted as container queries against
 * the page frame (container `rp-page`), so the designer's device widths render exactly.
 */

export const PAGE_CONTAINER = 'rp-page'
const BREAKPOINTS: Array<['tablet' | 'mobile', string]> = [
    ['tablet', '(max-width: 1023px)'],
    ['mobile', '(max-width: 639px)'],
]

/** Style token → CSS property (an allowlist: anything else is ignored). */
const TOKEN_PROPS: Record<string, string> = {
    padding: 'padding',
    paddingX: 'padding-inline',
    paddingY: 'padding-block',
    margin: 'margin',
    marginX: 'margin-inline',
    marginY: 'margin-block',
    background: 'background',
    color: 'color',
    border: 'border',
    borderColor: 'border-color',
    radius: 'border-radius',
    shadow: 'box-shadow',
    minHeight: 'min-height',
    maxWidth: 'max-width',
    width: 'width',
    gap: 'gap',
    opacity: 'opacity',
    textAlign: 'text-align',
    overflow: 'overflow',
}
const COLOR_TOKENS = ['background', 'color', 'borderColor']


function cssValue(raw: unknown, colorish: boolean): string | null {
    if (raw === null || raw === undefined || raw === '') return null
    if (typeof raw !== 'string' && typeof raw !== 'number') return null
    const v = String(raw).trim()
    if (!v || v.length > 300 || UNSAFE.test(v)) return null
    // Bare theme color names ("muted", "primary") resolve to the theme's variables.
    if (colorish && SHADCN_COLORS.indexOf(v) >= 0) return `var(--${v})`
    return v
}

type Decls = string[]

function tokenDecls(tokens: Record<string, unknown>): Decls {
    const out: Decls = []
    for (const key of Object.keys(TOKEN_PROPS)) {
        const v = cssValue(tokens[key], COLOR_TOKENS.indexOf(key) >= 0)
        if (v !== null) out.push(`${TOKEN_PROPS[key]}: ${v}`)
    }
    return out
}

function int(v: unknown): number | null {
    const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? parseInt(v, 10) : NaN
    return isFinite(n) && n > 0 && n <= 48 ? Math.floor(n) : null
}

function layoutDecls(layout: Record<string, unknown>): Decls {
    const out: Decls = []
    const colStart = int(layout.colStart)
    const colSpan = layout.colSpan === 'full' ? 'full' : int(layout.colSpan)
    if (colSpan === 'full') out.push('grid-column: 1 / -1')
    else if (colSpan || colStart) out.push(`grid-column: ${colStart ? colStart + ' / ' : ''}span ${colSpan || 1}`)
    const rowStart = int(layout.rowStart)
    const rowSpan = int(layout.rowSpan)
    if (rowSpan || rowStart) out.push(`grid-row: ${rowStart ? rowStart + ' / ' : ''}span ${rowSpan || 1}`)
    if (typeof layout.order === 'number' && isFinite(layout.order)) out.push(`order: ${Math.round(layout.order)}`)
    for (const [key, prop] of [
        ['alignSelf', 'align-self'],
        ['justifySelf', 'justify-self'],
    ]) {
        const v = cssValue(layout[key], false)
        if (v !== null && /^[a-z-]+$/.test(v)) out.push(`${prop}: ${v}`)
    }
    return out
}

/** "x-css-var" annotated options → custom properties. Arrays join with spaces (track lists). */
function optionVarDecls(options: Record<string, unknown>, schema: unknown): Decls {
    const props = isPlainObject(schema) && isPlainObject(schema.properties) ? (schema.properties as Record<string, unknown>) : {}
    const out: Decls = []
    for (const key of Object.keys(props)) {
        const def = props[key]
        if (!isPlainObject(def) || typeof def['x-css-var'] !== 'string') continue
        const name = String(def['x-css-var'])
        if (!/^--[a-z][a-z0-9-]*$/.test(name)) continue
        const raw = options[key]
        const v = Array.isArray(raw) ? cssValue(raw.map((x) => (isPlainObject(x) ? x.size : x)).join(' '), false) : cssValue(raw, false)
        if (v !== null) out.push(`${name}: ${v}`)
    }
    return out
}

function sub(obj: Record<string, unknown>, device: string): Record<string, unknown> {
    return isPlainObject(obj[device]) ? (obj[device] as Record<string, unknown>) : {}
}

export interface InstanceStyleInput {
    id: string
    tokens: Record<string, unknown>
    layout: Record<string, unknown>
    options: Record<string, unknown>
    optionsSchema: unknown
}

/** The rules for one instance (no utilities). Unlayered, so they beat layered Tailwind utilities. */
export function instanceRules(input: InstanceStyleInput): string {
    // Doubled attribute selector: wins over a block's own class rules of equal specificity.
    const sel = `[data-rp-placement="${input.id}"][data-rp-placement]`
    const group = (t: Record<string, unknown>, l: Record<string, unknown>, o: Record<string, unknown>) =>
        [...optionVarDecls(o, input.optionsSchema), ...tokenDecls(t), ...layoutDecls(l)]
    const blocks: string[] = []
    const base = group(input.tokens, input.layout, input.options)
    if (base.length) blocks.push(`${sel} { ${base.join('; ')} }`)
    for (const [device, query] of BREAKPOINTS) {
        const d = group(sub(input.tokens, device), sub(input.layout, device), sub(input.options, device))
        if (d.length) blocks.push(`@container ${PAGE_CONTAINER} ${query} { ${sel} { ${d.join('; ')} } }`)
    }
    return blocks.join('\n')
}

/** Compile one placement's instance CSS from its record. */
export function buildInstanceCss(pl: GR): Promise<string> {
    const comp = getById(T.component, str(pl, 'component'))
    const defaults = comp ? parseJson<Record<string, unknown>>(str(comp, 'default_options_json'), {}) : {}
    const own = parseJson<Record<string, unknown>>(str(pl, 'options_json'), {})
    const rules = instanceRules({
        id: pl.getUniqueValue(),
        tokens: parseJson<Record<string, unknown>>(str(pl, 'style_tokens_json'), {}) || {},
        layout: parseJson<Record<string, unknown>>(str(pl, 'layout_json'), {}) || {},
        options: { ...(isPlainObject(defaults) ? defaults : {}), ...(isPlainObject(own) ? own : {}) },
        optionsSchema: comp ? parseJson<unknown>(str(comp, 'options_schema_json'), null) : null,
    })
    const tokens = classTokens(str(pl, 'classes'))
    if (!tokens.length) return Promise.resolve(rules)
    return compileTailwind(tokens).then(
        (utilities) => [`/* instance classes */\n${utilities}`, rules].filter((s) => s.trim()).join('\n'),
        () => rules,
    )
}

/**
 * Recompile a placement's instance_css and store it if it changed (no business rules run for
 * that write). Resolves true when it changed; the caller reprocesses the portal.
 */
export function refreshInstanceCss(placementId: string): Promise<boolean> {
    const pl = getById(T.placement, placementId)
    if (!pl) return Promise.resolve(false)
    return buildInstanceCss(pl).then((css) => {
        const fresh = getById(T.placement, placementId)
        if (!fresh || str(fresh, 'instance_css') === css) return false
        fresh.setValue('instance_css', css)
        fresh.setWorkflow(false)
        fresh.update()
        return true
    })
}
