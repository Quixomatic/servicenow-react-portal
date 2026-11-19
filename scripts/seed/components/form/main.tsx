/**
 * components:app/form: record forms on the platform's own form runtime.
 *
 *   useRecordForm({ table, sysId, view, onSaved })   FormStore + bootstrap + UI policies + save()
 *   <RecordForm table sysId view showViews onViewChange onSaved headerActions />
 *                                                    header (label, number, state), view switcher,
 *                                                    sections, dirty tracking, Save / Discard
 *   <FormLayout bootstrap readOnly />, <FormSection>, <FormElement>   the view's layout only
 *                                                    (collapsible section headings; sections hidden
 *                                                    by g_form.setSectionDisplay or with every field
 *                                                    hidden disappear)
 *   useCollapsedSections(table) / usePresentationPreference()   per-user state in x_312987_portal.form.*
 *   SAVE_ACTIONS, notify(notifications)
 *
 * Platform calls: GraphQL GlideViewQuery_Query.uiView (layout, values, states, UI policies, form
 * UI actions in one request); Save = the form's Save UI action (POST /api/now/ui/ui_action/:id,
 * as Workspace does), so business rules, data policies and ACLs run as on any platform save.
 */
import { useGraphQL } from 'utilities:app/graphql'
import { RecordForm } from './record-form'

export { useRecordForm, SAVE_ACTIONS, notify } from './use-record-form'
export type { RecordForm as RecordFormModel, UseRecordFormOptions, SaveOutcome } from './use-record-form'
export { RecordForm } from './record-form'
export type { RecordFormProps } from './record-form'
export { FormLayout, FormSection, FormElement, SectionRows, isFormatter, isSplitMarker, sectionName, sectionElements, sectionOfField, useVisibleSections } from './layout'
export { useOwnPreference, useCollapsedSections, usePresentationPreference, formPreferenceName } from './preferences'
export type { FormPresentation } from './preferences'
export type { FormLayoutProps } from './layout'

/** Preview (Studio): the most recently updated active incident (a new record would reserve a number). */
export default function FormPreview() {
    const pick = useGraphQL(`query rpFormPreview { GlideRecord_Query { incident(queryConditions: "active=true^ORDERBYDESCsys_updated_on", pagination: { limit: 1 }) { _results { sys_id { value } } } } }`)
    const rows = pick.data && pick.data.GlideRecord_Query && pick.data.GlideRecord_Query.incident && pick.data.GlideRecord_Query.incident._results
    const sysId = rows && rows[0] ? rows[0].sys_id.value : ''
    return <div className="p-4">{sysId ? <RecordForm table="incident" sysId={sysId} showViews /> : <p className="text-sm text-muted-foreground">Loading an incident…</p>}</div>
}
