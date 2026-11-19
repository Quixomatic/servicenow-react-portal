/**
 * components:app/variable-container: renders a catalog form's variable layout.
 *
 * The platform resolves containers (start / split / end), single-row variable sets, checkbox
 * groups and MRVS into a layout tree (variablesLayout); this walks it: fields → <Variable>,
 * containers and sets → titled sections with responsive columns, MRVS → <Mrvs>. Sections are
 * labelled regions for screen readers when they have a title.
 */
import { useCatalogFormContext, catalogItemIdOf, Variable } from 'components:app/variable'
import type { VariableSpec } from 'components:app/variable'
import type { CatalogLayoutNode } from 'utilities:app/catalog'
import { Mrvs } from 'components:app/mrvs'
import { cx } from 'components:app/field'
import type { FieldLayout } from 'components:app/field'

export type VariableLayoutProps = {
    /** Field layout for every variable (vertical labels by default). */
    fieldLayout?: FieldLayout
    renderCustom?: (spec: VariableSpec) => any
    className?: string
}

export function VariableLayout(props: VariableLayoutProps) {
    const form = useCatalogFormContext()
    if (!form) return null
    const nodes = form.item.layout
    const byName: Record<string, CatalogLayoutNode> = {}
    for (const n of nodes) byName[n.name] = n
    const top = nodes.filter((n) => !n.parent)
    // Items without a layout (rare): render every variable in order.
    const list = top.length ? top : form.specs.map((s) => ({ name: s.name, type: 'field', parent: '' }) as CatalogLayoutNode)
    return (
        <div className={cx('rpv-layout flex flex-col gap-5', props.className)}>
            {list.map((n) => (
                <LayoutNode key={n.name} node={n} byName={byName} {...props} depth={0} />
            ))}
        </div>
    )
}

function LayoutNode(props: VariableLayoutProps & { node: CatalogLayoutNode; byName: Record<string, CatalogLayoutNode>; depth: number }) {
    const form = useCatalogFormContext()!
    const { node, byName } = props
    const spec = form.specByName[node.name]
    if (spec && spec.variable.visible === false && spec.kind !== 'field') return null

    if (node.type === 'multi_row_container' || (spec && spec.kind === 'mrvs')) {
        return spec ? <Mrvs name={spec.name} variable={spec.variable} itemId={catalogItemIdOf(form)} layout={props.fieldLayout} /> : null
    }
    if (node.type === 'field' || !node.columns) {
        return spec ? <Variable spec={spec} layout={props.fieldLayout} renderCustom={props.renderCustom} /> : null
    }

    // Container / variable set / checkbox group.
    // Sets show a title only when the layout carries one (display_title); containers when displayTitle is set.
    const title = (spec && spec.kind !== 'variable_set' && spec.variable.displayTitle ? spec.variable.label : '') || node.captionDisplay || ''
    const cols = node.columns.filter((c) => c.fields.length)
    const checkboxGroup = node.type === 'checkbox_container'
    const titleId = `rpv-c-${(spec && spec.variable.id) || node.name.replace(/[^a-zA-Z0-9_-]/g, '')}`
    const Tag: any = checkboxGroup ? 'fieldset' : 'section'
    return (
        <Tag
            className={cx('rpv-container m-0 flex min-w-0 flex-col gap-3 border-0 p-0', props.depth > 0 ? 'rounded-md border border-border p-3' : '')}
            aria-labelledby={title && !checkboxGroup ? titleId : undefined}
            data-rpv-container={node.type}
        >
            {title ? (
                checkboxGroup ? (
                    <legend className="float-left mb-1 w-full p-0 text-sm font-medium text-foreground">{title}</legend>
                ) : (
                    <h3 id={titleId} className="border-b border-border pb-1 text-sm font-semibold text-foreground">
                        {title}
                    </h3>
                )
            ) : null}
            <div
                className={cx('grid grid-cols-1 gap-x-6', checkboxGroup ? 'gap-y-2' : 'gap-y-5', cols.length > 1 ? 'md:grid-cols-2' : '', cols.length > 2 ? 'lg:grid-cols-3' : '')}
            >
                {cols.map((c, i) => (
                    <div key={i} className={cx('flex min-w-0 flex-col', checkboxGroup ? 'gap-2' : 'gap-5')}>
                        {c.fields.map((f) => {
                            const child = byName[f.name] || ({ name: f.name, type: f.type, parent: node.name } as CatalogLayoutNode)
                            return <LayoutNode key={f.name} {...props} node={child} depth={props.depth + 1} />
                        })}
                    </div>
                ))}
            </div>
        </Tag>
    )
}

export default function VariableContainerPreview() {
    return <div className="p-4 text-sm text-muted-foreground">The variable layout renders inside a catalog form (app/catalog-item).</div>
}
