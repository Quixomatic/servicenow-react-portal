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
 *   fetchFormBootstrap(table, sysId, view?)    GlideViewQuery_Query.uiView → formLayout + UI policies + UI actions
 *     (…, signal?, query?, { views?, viewRuleConfigId? })  view resolution when no view is forced:
 *     Workspace view rules (sys_ux_view_rules_configuration) beat the candidate list ('sp,ess')
 *     (…, { rules: { portal, page?, urlView?, optionView?, lockView?, remember?, remembered? } })  portal view
 *     rules in ONE request: the answer row (x_312987_portal_view_answer) feeds uiView's forcedViewName
 *     through _query / $$parent.view$$; bootstrap.resolution says how (source 'rule' = forced by a rule)
 *   resolveViewRules(kind, table, sysId, query, rules)  x312987Portal.viewRules.resolve (two-call fallback, lists)
 *   explainViewRules({ table, portal, … user? })   Studio: every rule's verdict
 *   checkFormViews(table, names)               which view names exist for the table (no layout)
 *   fetchFormViews(table)                      the table's form views
 *   executeUiAction({ actionSysId, table, sysId, encodedRecord, fields })  POST /api/now/ui/ui_action/{id} (form Save)
 *   fetchChoices({ table, field, changes })    GlideLayout_Query.choiceDataRetriever
 *   searchReference({ table, field, term, changes, encodedRecord })  GlideLayout_Query.referenceDataRetriever
 *   fetchRecordValues(table, { sysId }, fields)  GlideRecord_Query.<table>
 *   fetchDisplayValue(table, sysId, displayField)
 *
 * Hooks (TanStack Query, the host's page cache)
 *   useGraphQL, useTableMeta, useFieldMeta, useFormBootstrap, useFormViews, useFormViewCheck, useChoices, useReferenceSearch,
 *   useRecordValues, useReferenceDisplay, useDebouncedValue, useGraphQLClient, gqlKeys,
 *   useViewRuleResolution(kind, table, rules), useViewRuleExplain(args)
 */
export { graphql, gql, restGet, authHeaders, safeName, GraphQLError, GRAPHQL_ENDPOINT } from './client';
export type { GraphQLOptions, GraphQLErrorEntry } from './client';
export {
    fetchTableMeta,
    fetchFormBootstrap,
    fetchFormViews,
    checkFormViews,
    isDefaultViewName,
    executeUiAction,
    normalizePolicy,
    normalizeClientScripts,
    CLIENT_SCRIPT_FIELDS,
    UiActionError,
    fetchChoices,
    searchReference,
    fetchRecordValues,
    fetchDisplayValue,
    parseAttributes,
    stableChanges,
    FORM_LAYOUT_QUERY,
    // related lists (app/related-list wave)
    RELATED_LISTS_FIELDS,
    normalizeRelatedLists,
    FORM_QUERY,
    FORM_VIEWS_QUERY,
    UI_POLICY_FIELDS,
    CHOICES_QUERY,
    REFERENCE_QUERY,
    // portal view rules
    UI_VIEW_SELECTION,
    FORM_RULES_QUERY,
    VIEW_RESOLVE_QUERY,
    VIEW_EXPLAIN_QUERY,
    viewAnswerConditions,
    resolveViewRules,
    explainViewRules,
    bootstrapFromUiView,
    // record header (app/record-header): formLayout.highlightedValueStyle → { field: style }
    highlightsOf,
} from './documents';
export type { ViewExplanation, ViewRuleVerdict } from './documents';
export {
    useGraphQL,
    useTableMeta,
    useFieldMeta,
    useFormBootstrap,
    useFormViews,
    useFormViewCheck,
    useChoices,
    useReferenceSearch,
    useRecordValues,
    useReferenceDisplay,
    useDebouncedValue,
    useGraphQLClient,
    gqlKeys,
    useViewRuleResolution,
    useViewRuleExplain,
    useViewRulesContext,
} from './hooks';
export type {
    GlideType,
    Choice,
    ReferenceMeta,
    FieldMeta,
    FieldValue,
    ServerFieldState,
    FormBootstrap,
    FormSection,
    FormView,
    FormViewResolution,
    ViewRuleInputs,
    ViewResolutionInfo,
    FormAnnotation,
    RelatedListInfo,
    PolicyFlag,
    UiPolicy,
    ClientScript,
    ClientScripts,
    UiPolicyAction,
    UiPolicyCondition,
    UiAction,
    UiActionResult,
    SessionNotification,
    ReferenceItem,
    ReferenceSearchResult,
    FormChanges,
    HighlightStyle,
} from './types';
