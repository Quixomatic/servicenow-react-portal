/**
 * utilities:app/graphql: the shared data surface for primitives and widgets.
 *
 * Transport
 *   graphql(query, variables?, { operationName?, signal?, allowPartial? })  POST /api/now/graphql
 *   restGet(url)                                                            GET same-origin JSON (Table / UI APIs)
 *   gql`…`                                                                  identity tag for documents
 *
 * Fetchers (plain async, usable outside React)
 *   fetchTableMeta(table)                      GET  /api/now/ui/meta/{table}     every column's FieldMeta
 *   fetchFormBootstrap(table, sysId, view?)    GlideLayout_Query.formLayout      values, states, meta, encodedRecord
 *   fetchChoices({ table, field, changes })    GlideLayout_Query.choiceDataRetriever
 *   searchReference({ table, field, term, changes, encodedRecord })  GlideLayout_Query.referenceDataRetriever
 *   fetchRecordValues(table, { sysId }, fields)  GlideRecord_Query.<table>
 *   fetchDisplayValue(table, sysId, displayField)
 *
 * Hooks (TanStack Query, the host's page cache)
 *   useGraphQL, useTableMeta, useFieldMeta, useFormBootstrap, useChoices, useReferenceSearch,
 *   useRecordValues, useReferenceDisplay, useDebouncedValue, useGraphQLClient, gqlKeys
 */
export { graphql, gql, restGet, authHeaders, safeName, GraphQLError, GRAPHQL_ENDPOINT } from './client'
export type { GraphQLOptions, GraphQLErrorEntry } from './client'
export {
    fetchTableMeta,
    fetchFormBootstrap,
    fetchChoices,
    searchReference,
    fetchRecordValues,
    fetchDisplayValue,
    parseAttributes,
    stableChanges,
    FORM_LAYOUT_QUERY,
    CHOICES_QUERY,
    REFERENCE_QUERY,
} from './documents'
export {
    useGraphQL,
    useTableMeta,
    useFieldMeta,
    useFormBootstrap,
    useChoices,
    useReferenceSearch,
    useRecordValues,
    useReferenceDisplay,
    useDebouncedValue,
    useGraphQLClient,
    gqlKeys,
} from './hooks'
export type { GlideType, Choice, ReferenceMeta, FieldMeta, FieldValue, ServerFieldState, FormBootstrap, ReferenceItem, ReferenceSearchResult, FormChanges } from './types'
