/**
 * components:app/related-list: one related list of any record (parent table + sys_id + relationship
 * name), on app/data-table's RecordList in related mode.
 *
 *   <RelatedList parentTable="incident" parentSysId={id} name="task_sla.task" />
 *   <RelatedList list={info} parentSysId={id} title={false} onCount={setCount} onOpenRecord={form.openRecord} />
 *
 * Relationship kinds, all through the platform's own calls:
 * - reference ('task_sla.task', 'incident.parent_incident'): rows whose field points at the parent;
 *   New opens a new child with the parent reference preset (record page + `query`);
 * - many-to-many ('sys_user_grmember.group'): the list call reports m2MData; Add, Edit… and Remove
 *   create / delete rows of the m2m table (Table API, ACLs and business rules apply);
 * - scripted ('REL:<sys_relationship>'): the server runs the relationship and hands back its query.
 *
 * Data: the list's info (count, server-resolved filter) comes from GlideLayout_Query.formLayout
 * .relatedLists (in the form bootstrap, or useRelatedLists); rows from GlideListLayout_Query
 * .getListLayout(relatedListName, parentTable, parentRecordSysId, fixedQuery = filter), which also
 * picks the relationship's own list layout. Personalisation per list name; live refresh via AMB.
 *
 * Reusable exports
 *   RelatedList, useRelatedListActions, useRecordOpener
 *   fetchRelatedLists, useRelatedLists(table, sysId, view?, { initial? }), useRelatedList(table, sysId, name, view?),
 *   useRelatedListsRefresh, relatedKeys, RELATED_LISTS_QUERY, syntheticList
 *   relatedListKind, newRecordQuery, fetchM2MLinks, addM2MLinks, removeM2MRows
 */
import { useGraphQL } from 'utilities:app/graphql';
import { RelatedList } from './related-list';

export { RelatedList, useRelatedListActions, useRecordOpener } from './related-list';
export type { RelatedListProps, RelatedListActions, OpenRecord } from './related-list';
export {
    fetchRelatedLists,
    useRelatedLists,
    useRelatedList,
    useRelatedListsRefresh,
    relatedKeys,
    RELATED_LISTS_QUERY,
    syntheticList,
    relatedListKind,
    newRecordQuery,
    fetchM2MLinks,
    addM2MLinks,
    removeM2MRows,
} from './data';
export type { RelatedListsResult, UseRelatedListsOptions, RelatedListKind, M2M } from './data';
export type { RelatedListInfo } from 'utilities:app/graphql';

/** Preview (Studio): the SLAs of the most recently updated active incident. */
export default function RelatedListPreview() {
    const pick = useGraphQL(
        `query rpRelatedPreview { GlideRecord_Query { incident(queryConditions: "active=true^ORDERBYDESCsys_updated_on", pagination: { limit: 1 }) { _results { sys_id { value } } } } }`
    );
    const rows =
        pick.data &&
        pick.data.GlideRecord_Query &&
        pick.data.GlideRecord_Query.incident &&
        pick.data.GlideRecord_Query.incident._results;
    const sysId = rows && rows[0] ? rows[0].sys_id.value : '';
    return (
        <div className="p-4">
            {sysId ? (
                <RelatedList parentTable="incident" parentSysId={sysId} name="task_sla.task" />
            ) : (
                <p className="text-sm text-muted-foreground">Loading an incident…</p>
            )}
        </div>
    );
}
