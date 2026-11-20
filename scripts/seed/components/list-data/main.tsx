/**
 * utilities:app/list-data: server-side list data for the list primitives (app/data-table,
 * app/condition-builder) on the platform's own list GraphQL (what Workspace's record list uses).
 *
 * Fetchers (plain async)
 *   fetchList(args)            GlideListLayout_Query.getListLayout: columns, rows (value + display), count
 *   fetchListCount(args)       GlideListCount_Query.getListCount
 *   fetchCrumbs(table, filter) GlideConditionBuilder_Query.parse: breadcrumb labels
 *   fetchFilterFields(table)   GlideConditionBuilder_Query.dotwalkTableData: fields (dot-walk one level at a time)
 *   fetchEditability(args)     GlideListLayoutInline_Query.getPreFetch: canListEdit per record
 *   writeCells(args)           GlideListLayoutInline_Query.writeMultiRow (+ getNotifications)
 *   fetchPreference / savePreference   per-user list personalization
 *
 * Hooks (TanStack Query, the page cache)
 *   useList, useInfiniteList, useCrumbs, useFilterFields, useEditability, useCellWrite,
 *   useListInvalidate, useListPreferences, listKeys
 *
 * Encoded queries as data (query.ts)
 *   parseQuery / serializeQuery / serializeFilter / andTerm / removeTerm / flattenTerms,
 *   operatorsFor(type, isChoice, excluded), baseType, DATE_PRESETS, specificDay, dateGenerate, …
 *
 * ListArgs: { table, columns?, query? (filter), fixedQuery?, orderBy?: [{ field, desc }], keywords?,
 *             limit?, offset?, view?, relatedListName?, parentTable?, parentRecordSysId? }
 */
export {
    fetchList,
    fetchListCount,
    fetchCrumbs,
    fetchFilterFields,
    fetchEditability,
    writeCells,
    fetchPreference,
    savePreference,
    preferenceName,
    fetchUserPreferenceValue,
    saveUserPreferenceValue,
    effectiveQuery,
    columnsParam,
    LIST_QUERY,
} from './documents';
export {
    useList,
    useInfiniteList,
    useCrumbs,
    useFilterFields,
    useFieldPath,
    useEditability,
    useCellWrite,
    useListInvalidate,
    useListPreferences,
    listKeys,
} from './hooks';
export type { ResolvedPath } from './hooks';
export {
    KEYWORD_FIELD,
    emptyQuery,
    parseQuery,
    parseTerm,
    serializeQuery,
    serializeFilter,
    serializeOrder,
    termToString,
    andTerm,
    removeTerm,
    flattenTerms,
    baseType,
    operatorsFor,
    findOperator,
    OPERATORS_BY_TYPE,
    DATE_PRESETS,
    specificDay,
    dateGenerate,
    dateOf,
    parseRelative,
    formatRelative,
    RELATIVE_UNITS,
    describeTerm,
} from './query';
export type { Term, Clause, Group, OrderBy, QueryModel, Editor, Operator, BaseType } from './query';
export type {
    CellValue,
    ListColumn,
    ListRow,
    ListPage,
    ListArgs,
    FilterField,
    Crumb,
    ListPreferences,
    CellEditability,
    WriteResult,
} from './types';
