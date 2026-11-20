import type { SessionNotification } from 'utilities:app/graphql';

/** Where an action shows up. */
export type ActionSurface = 'form' | 'list' | 'related_list';

/** How an action runs (a discriminated union over the platform's implementations). */
export type ActionRun =
    /** A classic / Workspace UI action: optional client part (onclick), else the server part via /api/now/ui/ui_action. */
    | { type: 'ui_action'; sysId: string; clientScript?: string; onClick?: string }
    /** A declarative action's server script: POST /api/now/ui/declarative_action/:assignmentId. */
    | { type: 'server_script'; assignmentId: string }
    /** A declarative action's client script (`function onClick(g_form)` / `onClick()` with g_list). */
    | { type: 'client_script'; assignmentId: string; script: string }
    /** A UXF client action (an event dispatched to the page), mapped onto the portal when we know it. */
    | { type: 'uxf'; assignmentId: string; dispatch: string; payload: Record<string, any> }
    /** Seismic-only (interaction, action component, an unknown UXF event). */
    | { type: 'unsupported'; reason: string };

/** One action, whatever the platform source (UI action or declarative action). */
export type RpAction = {
    /** UI action sys_id or declarative action assignment id. */
    id: string;
    source: 'ui_action' | 'declarative';
    /** action_name (UI action) or the assignment's name. */
    name: string;
    /** Label with `{{…}}` already interpolated against the model. */
    label: string;
    hint?: string;
    /** Icon name as the platform sends it (Seismic icon ids, e.g. 'paperclip-outline'). */
    icon?: string;
    order: number;
    /** Toolbar button, or the overflow ("More") menu. */
    placement: 'button' | 'menu';
    variant: 'default' | 'primary' | 'destructive';
    /** Group label (declarative action groups, UX form action layout groups). */
    group?: string;
    /** Lists: the action needs checked rows. */
    selection: 'none' | 'required';
    /** Lists, classic list actions: also offered on a row's context menu. */
    rowMenu?: boolean;
    /** Ask before running (declarative confirmationRequired). */
    confirm?: { message: string };
    run: ActionRun;
    /** False for Seismic-only actions: hidden unless `showUnsupported`. */
    supported: boolean;
    raw: unknown;
};

/** The model declarative actions interpolate (`{{field}}`) and evaluate client conditions against. */
export type ActionModel = Record<string, any>;

/** Widget options shared by every surface (`actions: false`, an allow / deny list by name). */
export type ActionFilterOptions = {
    /** False hides every platform action. */
    actions?: boolean;
    /** Only these action names (comma-separated or an array). */
    include?: string | string[];
    /** Never these action names. */
    exclude?: string | string[];
    /** Show actions we can't run here (disabled, with the reason as hint). Default false: hidden. */
    showUnsupported?: boolean;
};

/** What useActions fetches for. */
export type ActionsContext =
    | {
          kind: 'form';
          table: string;
          sysId: string;
          view?: string;
          query?: string;
          /** sys_ux_action_config sys_id; default: the portal's settings.actionConfigId. */
          actionConfigId?: string;
          /** Extra model keys (record values) for client conditions. */
          model?: ActionModel;
          enabled?: boolean;
      }
    | {
          kind: 'list' | 'related_list';
          table: string;
          view?: string;
          /** The effective encoded query. */
          query?: string;
          fixedQuery?: string;
          parentTable?: string;
          parentRecordSysId?: string;
          relatedListName?: string;
          listTitle?: string;
          /** Checked rows. */
          selectedIds?: string[];
          count?: number;
          actionConfigId?: string;
          /** Classic list UI actions (server-side context menu / list choice). Default true. */
          classic?: boolean;
          model?: ActionModel;
          enabled?: boolean;
      };

/** Result of running an action. */
export type ActionOutcome =
    | { ok: true; notifications: SessionNotification[]; redirect?: ActionRedirect; perRecord?: RecordOutcome[] }
    | { ok: false; reason: 'cancelled' | 'unsupported' | 'blocked' | 'error'; message?: string };

export type RecordOutcome = { sysId: string; ok: boolean; message?: string };

export type ActionRedirect = { table?: string; sysId?: string; query?: string; url?: string };

/**
 * What a run needs from its surface. Forms pass their g_form environment and form helpers, lists
 * their controller (selection, refresh) and a g_list.
 */
export type ActionRunContext = {
    surface: ActionSurface;
    table: string;
    /** Form: the record. */
    sysId?: string;
    /** Lists: the records the action applies to (checked rows, or the right-clicked row). */
    sysIds?: string[];
    view?: string;
    query?: string;
    parentTable?: string;
    parentRecordSysId?: string;
    encodedRecord?: string;
    /** Form: changed fields sent with server scripts. */
    fields?: { name: string; value: string; displayValue?: string }[];
    /** The model client conditions saw (interpolation of payloads at run time). */
    model?: ActionModel;
    /** Form: run a UI action through the form (validation, onSubmit, save semantics). */
    runFormUiAction?: (sysId: string) => Promise<unknown>;
    /** Run a client script (`onClick`) in the surface's environment (g_form or g_list). */
    runClientScript?: (name: string, script: string, fnName?: string) => Promise<unknown>;
    openRecord?: (table: string, sysId: string, params?: Record<string, unknown>) => void;
    refresh?: () => void;
    /** Lists: open the bulk editor for the selection (DA#EDIT_SELECTED). */
    editSelected?: () => void;
    /** Lists: export the list (DA#EXPORT_MODAL). */
    exportList?: () => void;
    /** Toast session notifications (default true). */
    toast?: boolean;
};
