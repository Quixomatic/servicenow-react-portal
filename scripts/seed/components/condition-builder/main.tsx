/**
 * components:app/condition-builder: list filters.
 *
 *   <ConditionBuilder table value onChange? onApply? onCancel? dotWalk? allowOr? allowNewQuery? fields? />
 *       AND/OR conditions and "new criteria" groups (^NQ); a dot-walking field picker; operators per
 *       field type (minus a column's excluded operators); values through the field primitives
 *       (reference search, choices, dates). Encoded query in, encoded query out.
 *   <FilterBreadcrumbs table query onChange keywords? onClearKeywords? onEdit? />
 *       "All › Active is true › and Priority is 1 - Critical", removable chips; labels from the
 *       platform's query parser.
 *   <FieldPicker table value onChange dotWalk? />   the field picker on its own
 *   <ValueEditor editor table field … />            one condition value editor
 */
import { useState } from 'react'
import { ConditionBuilder } from './builder'
import { FilterBreadcrumbs } from './breadcrumbs'

export { ConditionBuilder, btn } from './builder'
export type { ConditionBuilderProps } from './builder'
export { FilterBreadcrumbs } from './breadcrumbs'
export type { FilterBreadcrumbsProps } from './breadcrumbs'
export { FieldPicker } from './field-picker'
export type { FieldPickerProps, PickedField } from './field-picker'
export { ValueEditor } from './value-editor'
export type { ValueEditorProps } from './value-editor'

/** Preview (Studio): builder + breadcrumbs on incident. */
export default function ConditionBuilderPreview() {
    const [query, setQuery] = useState('active=true^priority<=2')
    return (
        <div className="flex flex-col gap-4 p-4">
            <FilterBreadcrumbs table="incident" query={query} onChange={setQuery} />
            <ConditionBuilder table="incident" value={query} onApply={setQuery} />
            <code className="text-xs break-all text-muted-foreground">{query}</code>
        </div>
    )
}
