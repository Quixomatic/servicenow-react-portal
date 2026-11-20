/**
 * utilities:app/actions: one action model for forms, lists and related lists, on the platform's
 * own evaluation (conditions, roles and ACLs are applied by the platform for the session user;
 * Workspace's client conditions are applied here against the current model).
 *
 * Sources
 *   lists / related lists   GlideListLayout_Query.getListDeclarativeActionsLayout   declarative list actions
 *                           sys_ui_action + AJAXActionSecurity                       classic server-side list actions (opt-in)
 *   forms                   GlideUxActionLayout_Query.getActionLayout                UX form action layout (UI + declarative)
 *                           (the bootstrap's GlideUIAction_Query.uiActions stays the form's UI action source
 *                           unless an action config is set)
 *   related items           GlideDeclarativeActions_Query…formDeclarativeActions     Seismic components (listed only)
 *
 * Model
 *   RpAction { id, source: 'ui_action' | 'declarative', name, label, hint, icon, order,
 *              placement: 'button' | 'menu', variant, group?, selection: 'none' | 'required',
 *              rowMenu?, confirm?, run: ActionRun, supported, raw }
 *   ActionRun  ui_action | server_script | client_script | uxf | unsupported
 *
 * Hooks
 *   useActions(context, { actions?, include?, exclude?, showUnsupported? })  → { actions, all, model, replacesUiActions, … }
 *   useRunAction(ctx | () => ctx)                                            → { run(action), running, busy }
 *   useActionSecurity(table, actions, sysIds)                                → { [actionSysId]: allowed sys_ids }
 *   useRelatedItems({ table, sysId, view })                                  → RelatedItem[]
 *   usePortalActionConfig()                                                  the portal's settings.actionConfigId
 *
 * Plain functions
 *   runAction(action, ctx)               confirm → run (g_form / g_list client script, server script,
 *                                        UI action per record, mapped UXF) → toasts, refresh, redirect in the portal
 *   fetchListDeclarativeActions, fetchFormActionLayout, fetchRelatedItems, fetchClassicListActions,
 *   checkActionSecurity, runDeclarativeServerScript, transformActions, filterActions,
 *   interpolate, interpolateDeep, evaluateConditions, evaluateScriptedCondition, applyPayloadMap, toastNotifications
 *
 * Portal setting: settings_json.actionConfigId (a sys_ux_action_config sys_id; e.g. SOW's "SOW Actions")
 * selects the action configuration, like viewRuleConfigId for views. A widget's actionConfigId overrides it.
 */
export {
    fetchListDeclarativeActions,
    fetchFormActionLayout,
    fetchRelatedItems,
    fetchClassicListActions,
    checkActionSecurity,
    runDeclarativeServerScript,
    transformActions,
    filterActions,
    normalizeDeclarative,
    normalizeUxUiAction,
    tableHierarchy,
    MAPPED_UXF,
    LIST_ACTIONS_QUERY,
    FORM_ACTION_LAYOUT_QUERY,
    RELATED_ITEMS_QUERY,
} from './documents';
export type { RelatedItem, ListActionsArgs, FormActionArgs, DeclarativeResult } from './documents';
export {
    interpolate,
    interpolateDeep,
    parseJson,
    applyPayloadMap,
    evaluateConditions,
    evaluateScriptedCondition,
} from './conditions';
export type { ModelCondition } from './conditions';
export { runAction, toastNotifications } from './run';
export {
    useActions,
    useRunAction,
    useActionSecurity,
    useRelatedItems,
    usePortalActionConfig,
    actionKeys,
} from './hooks';
export type { UseActionsResult } from './hooks';
export type {
    RpAction,
    ActionRun,
    ActionSurface,
    ActionModel,
    ActionsContext,
    ActionFilterOptions,
    ActionOutcome,
    ActionRedirect,
    ActionRunContext,
    RecordOutcome,
} from './types';
