/**
 * components:app/related-lists: all of a record's related lists (its form view's
 * sys_ui_related_list), each an app/related-list.
 *
 *   <RelatedLists table="incident" sysId={id} layout="tabs" />           one tab per list, counts on tabs
 *   <RelatedLists table="sys_user_group" sysId={id} layout="stacked" />  collapsible sections (open state remembered)
 *   <RelatedLists table="incident" sysId={id} layout="single" name="task_sla.task" />
 *
 * - Lazy: no list query until its tab is selected, or its section is open and on screen; the
 *   counts come with the metadata (GlideLayout_Query.formLayout.relatedLists, or the form
 *   bootstrap's copy via `lists`), then follow each list's own count once it loaded.
 * - Omit-if-empty honoured; include / exclude / isShown (g_form.hideRelatedList state) filter.
 * - Stacked open sections per user + table: x_312987_portal.related.<table>.open (never a platform preference).
 *
 * Reusable exports
 *   RelatedLists, useVisibleRelatedLists, useRelatedListTabs (tab descriptors for your own strip,
 *   e.g. app/form-tabs' extraTabs), useOpenRelatedLists, RelatedCount, relatedTabValue
 */
import { useGraphQL } from 'utilities:app/graphql'
import { RelatedLists } from './related-lists'

export { RelatedLists, useVisibleRelatedLists, useRelatedListTabs, useOpenRelatedLists, RelatedCount, relatedTabValue } from './related-lists'
export type { RelatedListsProps, RelatedListsOptions, RelatedListsLayout, VisibleRelatedList, RelatedListTab } from './related-lists'

/** Preview (Studio): the related lists of the most recently updated active incident, as tabs. */
export default function RelatedListsPreview() {
    const pick = useGraphQL(`query rpRelatedListsPreview { GlideRecord_Query { incident(queryConditions: "active=true^ORDERBYDESCsys_updated_on", pagination: { limit: 1 }) { _results { sys_id { value } } } } }`)
    const rows = pick.data && pick.data.GlideRecord_Query && pick.data.GlideRecord_Query.incident && pick.data.GlideRecord_Query.incident._results
    const sysId = rows && rows[0] ? rows[0].sys_id.value : ''
    return <div className="p-4">{sysId ? <RelatedLists table="incident" sysId={sysId} layout="tabs" /> : <p className="text-sm text-muted-foreground">Loading an incident…</p>}</div>
}
