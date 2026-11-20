import { gs } from '@servicenow/glide';
import { resetAccessCache, hasStudioCapability } from '../security/access.ts';
import { resolveView, explainView, ViewResolveInput, ViewResolution, isDefaultView } from './view-rules.ts';
import { GR, getById, findOne, str } from '../lib/gr.ts';
import { T } from '../lib/tables.ts';
import { parseJson } from '../lib/util.ts';

/**
 * Entry points of the view-rule resolver:
 *
 * - GraphQL (x312987Portal.viewRules): resolve(...) for any authenticated user, explain(...) for
 *   studio users. The fallback path and Studio's test panel.
 * - The remote table x_312987_portal_view_answer: one computed row per query, so the platform's own
 *   GraphQL can chain it into uiView in ONE request:
 *     GlideRecord_Query { x_312987_portal_view_answer(queryConditions: "kind=form^target_table=incident^…")
 *       { _results { view { value } … _query { GlideViewQuery_Query { uiView(forcedViewName: "$$parent.view$$" …) } } } } }
 *   Inputs are the query's `field=value` terms (values URL-encoded by the client); the row echoes
 *   them and adds the outputs (view, source, rule_id, rule_name, missing, reason).
 */

function bool(v: unknown, fallback: boolean): boolean {
    if (v === true || v === 'true' || v === '1') return true;
    if (v === false || v === 'false' || v === '0') return false;
    return fallback;
}

function s(v: unknown): string {
    return v === undefined || v === null ? '' : String(v);
}

function inputFromArgs(a: Record<string, unknown>): ViewResolveInput {
    return {
        kind: s(a.kind) === 'list' ? 'list' : 'form',
        table: s(a.table),
        sysId: s(a.sysId),
        query: s(a.query),
        portal: s(a.portal),
        page: s(a.page),
        urlView: s(a.urlView),
        optionView: s(a.optionView),
        lockView: bool(a.lockView, false),
        remember: bool(a.remember, true),
        remembered: a.remembered === undefined || a.remembered === null ? undefined : s(a.remembered),
    };
}

function args(env: any): Record<string, unknown> {
    const raw = env && env.getArguments ? env.getArguments() : {};
    // Java maps arrive as host objects: copy the keys we know.
    const out: Record<string, unknown> = {};
    for (const k of [
        'kind',
        'table',
        'sysId',
        'query',
        'portal',
        'page',
        'urlView',
        'optionView',
        'lockView',
        'remember',
        'remembered',
        'user',
    ]) {
        const v = raw ? raw[k] : undefined;
        if (v !== undefined && v !== null) out[k] = typeof v === 'object' ? String(v) : v;
    }
    return out;
}

/** GraphQL Query:resolve */
export function resolveViewResolver(env: any): ViewResolution {
    resetAccessCache();
    return resolveView(inputFromArgs(args(env)));
}

/** GraphQL Query:explain (studio users; null for everyone else). */
export function explainViewResolver(env: any): unknown {
    resetAccessCache();
    if (!hasStudioCapability('any')) return null;
    const a = args(env);
    const ex = explainView(inputFromArgs(a), s(a.user));
    return {
        resolution: ex.resolution,
        rulePortalId: ex.rulePortal.id,
        rulePortalName: ex.rulePortal.name,
        rulePortalShared: ex.rulePortal.shared,
        subjectUserId: ex.subject.userId,
        subjectViewAs: ex.subject.viewAs,
        notes: ex.notes,
        rules: ex.rules,
    };
}

/* ---------------- Remote table ---------------- */

export const ANSWER_INPUTS = [
    'kind',
    'target_table',
    'record',
    'preset',
    'portal',
    'page',
    'url_view',
    'option_view',
    'lock_view',
    'remember',
    'remembered',
    'default_views',
    'config_in',
] as const;

function decode(v: string): string {
    try {
        return decodeURIComponent(v);
    } catch (e) {
        return v;
    }
}

/**
 * The value of a `field=value` term: v_query.getParameter(field) (equality only).
 * getCondition(field) returns the whole term ("field=value"), so it's only a fallback.
 */
function conditionValue(vQuery: any, name: string): string | undefined {
    const clean = (v: unknown) => {
        if (v === null || v === undefined) return undefined;
        const text = String(v);
        return text === '' || text === 'null' || text === 'undefined' ? undefined : text;
    };
    try {
        const p = clean(vQuery.getParameter(name));
        if (p !== undefined) return p;
    } catch (e) {
        // older APIs: fall through
    }
    try {
        const c = clean(vQuery.getCondition(name));
        if (c === undefined) return undefined;
        const prefix = name + '=';
        return c.indexOf(prefix) === 0 ? c.substring(prefix.length) : undefined;
    } catch (e) {
        return undefined;
    }
}

/**
 * sys_script_vtable executeQuery for x_312987_portal_view_answer: exactly one row (the resolution)
 * for a query that names a target table and a portal, none otherwise.
 */
export function executeViewAnswer(vTable: any, vQuery: any): void {
    resetAccessCache();
    const raw: Record<string, string | undefined> = {};
    for (const k of ANSWER_INPUTS) raw[k] = conditionValue(vQuery, k);
    if (!raw.target_table || !raw.portal) return;
    const remembered =
        raw.remembered !== undefined && raw.remembered.indexOf('v:') === 0
            ? decode(raw.remembered.substring(2))
            : undefined;
    const r = resolveView({
        kind: raw.kind === 'list' ? 'list' : 'form',
        table: decode(raw.target_table),
        sysId: decode(raw.record || ''),
        query: decode(raw.preset || ''),
        portal: decode(raw.portal),
        page: decode(raw.page || ''),
        urlView: decode(raw.url_view || ''),
        optionView: decode(raw.option_view || ''),
        lockView: bool(raw.lock_view, false),
        remember: bool(raw.remember, true),
        remembered,
    });
    // uiView's arguments, never empty (an empty $$parent value becomes the string "null"):
    // a resolved view is sent as the only candidate with no rule config (nothing may override it);
    // automatic sends the portal's default views (or 'default') and its Workspace rule config.
    const fallback = portalFallback(
        decode(raw.portal),
        raw.default_views !== undefined ? decode(raw.default_views) : undefined,
        raw.config_in !== undefined ? decode(raw.config_in) : undefined
    );
    const row: Record<string, string> = {
        sys_id: gs.generateGUID(),
        views: r.view ? r.view : fallback.views || 'default',
        rule_config: r.view ? '' : fallback.config,
        view: r.view,
        source: r.source,
        rule_id: r.ruleId,
        rule_name: r.ruleName,
        missing: r.missing,
        reason: r.reason,
    };
    // Echo the inputs exactly as queried, so the row matches the query's own terms.
    for (const k of ANSWER_INPUTS) if (raw[k] !== undefined) row[k] = raw[k] as string;
    vTable.addRow(row);
}

const VIEW_LIST = /^[A-Za-z0-9_.\- ,]+$/;
const SYS_ID = /^[0-9a-f]{32}$/i;

/** The automatic fallback: the caller's default views / config, else the portal's settings. */
function portalFallback(
    portal: string,
    views: string | undefined,
    config: string | undefined
): { views: string; config: string } {
    let v = views;
    let c = config;
    if (v === undefined || c === undefined) {
        const gr = SYS_ID.test(portal)
            ? getById(T.portal, portal)
            : findOne(T.portal, `slug=${String(portal).toLowerCase()}`);
        const settings = gr ? parseJson<Record<string, unknown>>(str(gr, 'settings_json'), {}) : {};
        if (v === undefined) v = typeof settings.formViews === 'string' ? settings.formViews : '';
        if (c === undefined) c = typeof settings.viewRuleConfigId === 'string' ? settings.viewRuleConfigId : '';
    }
    const cleanViews = String(v || '')
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x && VIEW_LIST.test(x))
        .join(',');
    return { views: cleanViews, config: SYS_ID.test(String(c || '').trim()) ? String(c).trim().toLowerCase() : '' };
}

/* ---------------- Rule records ---------------- */

/**
 * Business rule (before insert / update) on x_312987_portal_view_rule: the view reference and the
 * view name agree. The reference wins when set (it survives a view rename); a name alone looks up
 * the reference. 'default' (the Default view) has no reference.
 */
export function syncRuleView(current: GR): void {
    const ref = str(current, 'view');
    if (ref) {
        const view = getById('sys_ui_view', ref);
        if (view) {
            const name = str(view, 'name');
            if (name && name !== str(current, 'view_name')) current.setValue('view_name', name);
            return;
        }
    }
    const name = str(current, 'view_name').trim();
    if (!name || isDefaultView(name)) {
        current.setValue('view', '');
        if (!name) current.setValue('view_name', 'default');
        return;
    }
    const found = findOne('sys_ui_view', `name=${name}`);
    if (found) current.setValue('view', found.getUniqueValue());
}
