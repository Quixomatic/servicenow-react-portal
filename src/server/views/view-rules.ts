import {
    gs,
    GlideRecord,
    GlideRecordSecure,
    GlideFilter,
    GlideScopedEvaluator,
    GlideTableHierarchy,
} from '@servicenow/glide';
import { GR, newGR, str, bool, int, getById, each, exists } from '../lib/gr.ts';
import { T } from '../lib/tables.ts';
import { parseJson } from '../lib/util.ts';
import {
    canAccessPage,
    canAccessPortal,
    criteriaAllow,
    criteriaSubject,
    hasAnyRole,
    hasStudioCapability,
    withViewAsUser,
} from '../security/access.ts';
import { wrapCondition } from '../runtime/menu-service.ts';
import { findPortalBySlug } from '../runtime/portal-service.ts';

/**
 * Portal view rules: which form / list view a portal shows for a table.
 *
 * Resolution (first that applies wins):
 *   1. page rules of the current page (by order);
 *   2. portal rules of the rule portal (the portal itself, or settings.viewRulesFrom), by order;
 *      a matching rule FORCES the view (URL, widget option and remembered view can't override it);
 *   3. only when no rule matched: the URL view, then the widget option (lockView: option first),
 *      then the user's remembered view (x_312987_portal.form.<table>.view), each only if it exists;
 *   4. else '' (source 'auto'): the platform's uiView resolution (Workspace viewRuleConfigId, the
 *      portal's default views, Default), done by the caller in the same uiView call.
 *
 * A rule matches when it is active, applies to the kind (form / list / both), its table is the
 * record's table EXACTLY (Workspace view rules don't apply to child tables either; verified on the
 * instance 2026-11-20), the user has one of its roles (if any), passes its user criteria
 * (Available for / Not available for), its condition matches the record and its advanced script
 * returns true. Conditions are evaluated as the system on a plain GlideRecord, after the user's
 * read access is checked with GlideRecordSecure (an unreadable record never matches a rule).
 * `sys_id=-1` in a condition means "a new record", as in Workspace view rules.
 */

export type ViewKind = 'form' | 'list';
export type ViewSource = 'rule' | 'url' | 'option' | 'remembered' | 'auto';

export interface ViewResolveInput {
    kind?: ViewKind;
    table: string;
    /** '' / '-1' = new record (forms); ignored for lists. */
    sysId?: string;
    /** Encoded query presetting a new record. */
    query?: string;
    /** Portal sys_id or slug. */
    portal: string;
    page?: string;
    urlView?: string;
    optionView?: string;
    lockView?: boolean;
    /** false: ignore the remembered view. */
    remember?: boolean;
    /** The remembered view the client knows ('' = none); undefined = read the user preference. */
    remembered?: string;
}

export interface ViewResolution {
    view: string;
    source: ViewSource;
    ruleId: string;
    ruleName: string;
    /** A URL / option view that doesn't exist for the table (first one). */
    missing: string;
    /** Why (studio users only; '' for everyone else). */
    reason: string;
}

export interface RuleVerdict {
    ruleId: string;
    name: string;
    scope: 'page' | 'portal';
    order: number;
    view: string;
    matched: boolean;
    /** The first failing step: kind | roles | criteria | condition | script | view | record. */
    failedOn: string;
    detail: string;
}

export interface ViewExplanation {
    resolution: ViewResolution;
    rulePortal: { id: string; name: string; shared: boolean };
    rules: RuleVerdict[];
    subject: { userId: string; viewAs: boolean };
    notes: string[];
}

const NAME = /^[a-z0-9_]+$/i;
const VIEW_NAME = /^[A-Za-z0-9_.\- ]+$/;
const SYS_ID = /^[0-9a-f]{32}$/i;

export function isDefaultView(v: string): boolean {
    const s = String(v || '')
        .trim()
        .toLowerCase();
    return s === '' || s === 'default' || s === 'default view';
}

function empty(source: ViewSource = 'auto'): ViewResolution {
    return { view: '', source, ruleId: '', ruleName: '', missing: '', reason: '' };
}

/* ---------------- Portal and rule portal ---------------- */

function portalRecord(idOrSlug: string): GR | null {
    const v = String(idOrSlug || '').trim();
    if (!v) return null;
    if (SYS_ID.test(v)) return getById(T.portal, v.toLowerCase());
    return findPortalBySlug(v);
}

/** The portal whose portal-wide rules apply: settings.viewRulesFrom (a portal sys_id or slug), else itself. */
export function rulePortalOf(portal: GR): GR {
    const settings = parseJson<Record<string, unknown>>(str(portal, 'settings_json'), {});
    const from = typeof settings.viewRulesFrom === 'string' ? settings.viewRulesFrom.trim() : '';
    if (!from || from === portal.getUniqueValue() || from === str(portal, 'slug')) return portal;
    const other = portalRecord(from);
    return other || portal;
}

/* ---------------- Views ---------------- */

function hierarchy(table: string): string[] {
    try {
        const list = new GlideTableHierarchy(table).getTables() as any;
        const out: string[] = [];
        for (let i = 0; i < list.length; i++) out.push(String(list[i]));
        return out.length ? out : [table];
    } catch (e) {
        return [table];
    }
}

const viewExistsCache: Record<string, boolean> = {};

/** A view exists for the table: a sys_ui_view of that name with form sections (form) or a list layout (list) on the table hierarchy. */
export function viewExists(kind: ViewKind, table: string, view: string): boolean {
    if (isDefaultView(view)) return true;
    if (!VIEW_NAME.test(view)) return false;
    const key = `${kind}|${table}|${view}`;
    if (viewExistsCache[key] !== undefined) return viewExistsCache[key];
    const tables = hierarchy(table).join(',');
    const q = kind === 'list' ? `nameIN${tables}^view.name=${view}` : `nameIN${tables}^view.name=${view}`;
    const ok = exists(kind === 'list' ? 'sys_ui_list' : 'sys_ui_section', q);
    viewExistsCache[key] = ok;
    return ok;
}

/** The view name to send to uiView / getListLayout ('default' for any Default spelling). */
function viewName(v: string): string {
    return isDefaultView(v) ? 'default' : String(v).trim();
}

/* ---------------- Rules ---------------- */

interface Rule {
    id: string;
    name: string;
    scope: 'page' | 'portal';
    order: number;
    appliesTo: string;
    condition: string;
    view: string;
    roles: string[];
    advanced: boolean;
    hasScript: boolean;
    can: string[];
    cannot: string[];
}

function refViewName(gr: GR): string {
    if (!str(gr, 'view')) return '';
    try {
        const el = gr.getElement('view.name');
        return el ? String(el.toString() || '') : '';
    } catch (e) {
        return '';
    }
}

function readRules(table: string, rulePortalId: string, pageId: string): Rule[] {
    const rules: Rule[] = [];
    const add = (gr: GR, scope: 'page' | 'portal') => {
        rules.push({
            id: gr.getUniqueValue(),
            name: str(gr, 'name'),
            scope,
            order: int(gr, 'order', 100),
            appliesTo: str(gr, 'applies_to') || 'form',
            condition: str(gr, 'condition'),
            // The reference's current name wins (a renamed view keeps working); else the stored name.
            view: refViewName(gr) || str(gr, 'view_name'),
            roles: str(gr, 'roles')
                .split(',')
                .map((r) => r.trim())
                .filter(Boolean),
            advanced: bool(gr, 'advanced'),
            hasScript: !!str(gr, 'script').trim(),
            can: [],
            cannot: [],
        });
    };
    if (pageId)
        each(T.viewRule, `active=true^table=${table}^page=${pageId}`, (gr) => add(gr, 'page'), ['order', 'name']);
    if (rulePortalId)
        each(T.viewRule, `active=true^table=${table}^portal=${rulePortalId}^pageISEMPTY`, (gr) => add(gr, 'portal'), [
            'order',
            'name',
        ]);
    if (!rules.length) return rules;
    const byId: Record<string, Rule> = {};
    for (const r of rules) byId[r.id] = r;
    const ids = Object.keys(byId).join(',');
    each(T.viewRuleUc, `ruleIN${ids}`, (gr) => {
        const r = byId[str(gr, 'rule')];
        if (r && str(gr, 'user_criteria')) r.can.push(str(gr, 'user_criteria'));
    });
    each(T.viewRuleUcNo, `ruleIN${ids}`, (gr) => {
        const r = byId[str(gr, 'rule')];
        if (r && str(gr, 'user_criteria')) r.cannot.push(str(gr, 'user_criteria'));
    });
    return rules;
}

/** Roles of a (View-as) subject, by name. */
function subjectRoles(userId: string): Record<string, true> {
    const out: Record<string, true> = {};
    each('sys_user_has_role', `user=${userId}^state=active`, (gr) => {
        out[str(gr, 'role.name') || String(gr.getDisplayValue('role'))] = true;
    });
    return out;
}

function rolesPass(rule: Rule, viewAsRoles: Record<string, true> | null): boolean {
    if (!rule.roles.length) return true;
    if (!viewAsRoles) return hasAnyRole(rule.roles);
    if (viewAsRoles.admin) return true;
    for (const r of rule.roles) if (viewAsRoles[r]) return true;
    return false;
}

/** Rewrite `sys_id=-1` ("is a new record") terms for evaluation against a real GlideRecord. */
export function rewriteNewRecordTerms(condition: string, isNew: boolean): string {
    const yes = 'sys_idISNOTEMPTY';
    const no = 'sys_idISEMPTY';
    return String(condition || '')
        .replace(/\^EQ$/, '')
        .split('^')
        .map((term) => {
            const m = /^(OR|NQ)?sys_id(=|!=)-1$/.exec(term);
            if (!m) return term;
            const positive = m[2] === '=';
            return (m[1] || '') + ((positive ? isNew : !isNew) ? yes : no);
        })
        .join('^');
}

interface Target {
    kind: ViewKind;
    table: string;
    isNew: boolean;
    /** Plain GlideRecord of the record (forms), null for lists or unreadable records. */
    record: GR | null;
    readable: boolean;
}

function loadTarget(kind: ViewKind, table: string, sysId: string, query: string): Target {
    if (kind === 'list') return { kind, table, isNew: false, record: null, readable: true };
    const isNew = !sysId || sysId === '-1';
    if (isNew) {
        const gr = new GlideRecord(table) as GR;
        gr.newRecord();
        if (query) gr.applyEncodedQuery(query);
        return { kind, table, isNew, record: gr, readable: true };
    }
    // The user's access first (GlideRecordSecure), then a plain record for the conditions.
    const secure: GR = new GlideRecordSecure(table as any);
    if (!secure.get(sysId)) return { kind, table, isNew, record: null, readable: false };
    const gr = new GlideRecord(table) as GR;
    if (!gr.get(sysId)) return { kind, table, isNew, record: null, readable: false };
    return { kind, table, isNew, record: gr, readable: true };
}

function conditionPasses(rule: Rule, target: Target): { ok: boolean; detail: string } {
    if (!rule.condition.trim()) return { ok: true, detail: '' };
    if (target.kind === 'list' || !target.record)
        return { ok: false, detail: 'a condition needs a record (list rules use no condition)' };
    try {
        const cond = rewriteNewRecordTerms(rule.condition, target.isNew);
        return { ok: !!GlideFilter.checkRecord(target.record, cond), detail: '' };
    } catch (e) {
        return { ok: false, detail: `condition error: ${e}` };
    }
}

function scriptPasses(
    rule: Rule,
    target: Target,
    ctx: { portal: GR; page: GR | null }
): { ok: boolean; detail: string } {
    if (!rule.advanced || !rule.hasScript) return { ok: true, detail: '' };
    try {
        const gr = getById(T.viewRule, rule.id);
        if (!gr) return { ok: false, detail: 'rule not found' };
        gr.setValue('script', wrapCondition(str(gr, 'script')));
        const evaluator: any = new GlideScopedEvaluator();
        evaluator.putVariable('__rpResult', null);
        evaluator.putVariable('__rpError', null);
        evaluator.putVariable('record', target.record);
        evaluator.putVariable('table', target.table);
        evaluator.putVariable('kind', target.kind);
        evaluator.putVariable('isNew', target.isNew);
        evaluator.putVariable('portal', {
            id: ctx.portal.getUniqueValue(),
            slug: str(ctx.portal, 'slug'),
            name: str(ctx.portal, 'name'),
        });
        evaluator.putVariable(
            'page',
            ctx.page
                ? { id: ctx.page.getUniqueValue(), route: str(ctx.page, 'route'), title: str(ctx.page, 'title') }
                : null
        );
        evaluator.putVariable('user', { id: gs.getUserID(), name: gs.getUserName() });
        evaluator.evaluateScript(gr, 'script', null);
        const err = evaluator.getVariable('__rpError');
        if (err) {
            const e = JSON.parse(JSON.stringify(err)) as { message?: string };
            gs.warn(`[React Portal] view rule ${rule.id} script failed: ${e.message || 'error'}`);
            return { ok: false, detail: `script error: ${e.message || 'error'}` };
        }
        const result = evaluator.getVariable('__rpResult');
        if (result === null || result === undefined)
            return { ok: false, detail: 'script returned nothing (syntax error?)' };
        const s = String(result);
        return { ok: !(s === 'false' || s === '' || s === '0' || s === 'null' || s === 'undefined'), detail: '' };
    } catch (e) {
        return { ok: false, detail: `script error: ${e}` };
    }
}

function verdictOf(
    rule: Rule,
    target: Target,
    ctx: { portal: GR; page: GR | null },
    viewAsRoles: Record<string, true> | null
): RuleVerdict {
    const v: RuleVerdict = {
        ruleId: rule.id,
        name: rule.name,
        scope: rule.scope,
        order: rule.order,
        view: rule.view,
        matched: false,
        failedOn: '',
        detail: '',
    };
    const fail = (step: string, detail = '') => {
        v.failedOn = step;
        v.detail = detail;
        return v;
    };
    if (rule.appliesTo !== 'both' && rule.appliesTo !== target.kind)
        return fail('kind', `applies to ${rule.appliesTo} views`);
    if (!rolesPass(rule, viewAsRoles)) return fail('roles', rule.roles.join(', '));
    if (!criteriaAllow(rule.can, rule.cannot)) return fail('criteria');
    const c = conditionPasses(rule, target);
    if (!c.ok) return fail('condition', c.detail);
    const s = scriptPasses(rule, target, ctx);
    if (!s.ok) return fail('script', s.detail);
    if (!rule.view || !viewExists(target.kind, target.table, rule.view))
        return fail('view', `view "${rule.view}" doesn't exist for ${target.table}`);
    v.matched = true;
    return v;
}

/* ---------------- Remembered view ---------------- */

export function rememberedPreferenceName(kind: ViewKind, table: string): string {
    const t = String(table).replace(/[^A-Za-z0-9_]/g, '_');
    return kind === 'list' ? `x_312987_portal.list.${t}.view` : `x_312987_portal.form.${t}.view`;
}

function readRemembered(kind: ViewKind, table: string): string {
    const gr = newGR('sys_user_preference');
    gr.addQuery('user', gs.getUserID());
    gr.addQuery('name', rememberedPreferenceName(kind, table));
    gr.setLimit(1);
    gr.query();
    return gr.next() ? str(gr, 'value').trim() : '';
}

/* ---------------- Resolve ---------------- */

interface Evaluated {
    resolution: ViewResolution;
    verdicts: RuleVerdict[];
    rulePortal: GR | null;
    portal: GR | null;
    notes: string[];
}

function evaluate(
    input: ViewResolveInput,
    opts: { explain: boolean; viewAsRoles: Record<string, true> | null }
): Evaluated {
    const kind: ViewKind = input.kind === 'list' ? 'list' : 'form';
    const table = String(input.table || '').trim();
    const notes: string[] = [];
    const out: Evaluated = { resolution: empty(), verdicts: [], rulePortal: null, portal: null, notes };
    if (!NAME.test(table)) {
        notes.push('invalid table');
        return out;
    }
    const portal = portalRecord(input.portal);
    if (!portal || !canAccessPortal(portal)) {
        notes.push('portal not found or not accessible');
        return out;
    }
    out.portal = portal;
    let page: GR | null = null;
    if (input.page && SYS_ID.test(String(input.page))) {
        const p = getById(T.page, String(input.page));
        if (p && str(p, 'portal') === portal.getUniqueValue() && canAccessPage(p)) page = p;
        else notes.push('page ignored (not this portal, or not accessible)');
    }
    const rulePortal = rulePortalOf(portal);
    out.rulePortal = rulePortal;
    const sysId = String(input.sysId || '').trim();
    if (kind === 'form' && sysId && sysId !== '-1' && !SYS_ID.test(sysId)) {
        notes.push('invalid sys_id');
        return out;
    }
    const target = loadTarget(kind, table, sysId, String(input.query || ''));
    const studio = hasStudioCapability('any');

    // 1–2. Page rules, then portal rules (each by order); the first match forces the view.
    const rules = readRules(table, rulePortal.getUniqueValue(), page ? page.getUniqueValue() : '');
    if (rules.length && !target.readable) notes.push('the record is not readable: no rule applies');
    else {
        const ctx = { portal, page };
        for (const rule of rules) {
            const v = verdictOf(rule, target, ctx, opts.viewAsRoles);
            out.verdicts.push(v);
            if (v.matched) {
                out.resolution = {
                    view: viewName(rule.view),
                    source: 'rule',
                    ruleId: rule.id,
                    ruleName: rule.name,
                    missing: '',
                    reason: studio
                        ? `${rule.scope === 'page' ? 'Page' : 'Portal'} rule "${rule.name}" (order ${rule.order})`
                        : '',
                };
                if (!opts.explain) return out;
                break;
            }
        }
        if (out.resolution.source === 'rule') return out;
    }

    // 3. No rule: URL → option (lockView: option → URL) → remembered, each only if it exists.
    const urlView = String(input.urlView || '').trim();
    const optionView = String(input.optionView || '').trim();
    const named: [ViewSource, string][] = input.lockView
        ? [
              ['option', optionView],
              ['url', urlView],
          ]
        : [
              ['url', urlView],
              ['option', optionView],
          ];
    let missing = '';
    for (const [source, name] of named) {
        if (!name) continue;
        if (viewExists(kind, table, name)) {
            out.resolution = {
                view: viewName(name),
                source,
                ruleId: '',
                ruleName: '',
                missing,
                reason: studio ? `${source === 'url' ? 'URL' : 'Widget option'} view` : '',
            };
            return out;
        }
        if (!missing) missing = name;
    }
    if (input.remember !== false) {
        const remembered =
            input.remembered !== undefined && input.remembered !== null
                ? String(input.remembered).trim()
                : readRemembered(kind, table);
        if (remembered && viewExists(kind, table, remembered)) {
            out.resolution = {
                view: viewName(remembered),
                source: 'remembered',
                ruleId: '',
                ruleName: '',
                missing,
                reason: studio ? 'Remembered view' : '',
            };
            return out;
        }
    }
    // 4. Automatic: the platform's own resolution follows in the same uiView call.
    out.resolution = {
        view: '',
        source: 'auto',
        ruleId: '',
        ruleName: '',
        missing,
        reason: studio ? 'No rule matched: platform resolution (Workspace rules, default views, Default)' : '',
    };
    return out;
}

/** Resolve the view for the current user (never throws: bad input resolves to automatic). */
export function resolveView(input: ViewResolveInput): ViewResolution {
    try {
        return evaluate(input, { explain: false, viewAsRoles: null }).resolution;
    } catch (e) {
        gs.error(`[React Portal] view rule resolution failed: ${e}`);
        return empty();
    }
}

/**
 * Studio: every candidate rule's verdict, optionally for another user (user criteria and roles are
 * evaluated for them; record read access is still checked as the caller).
 */
export function explainView(input: ViewResolveInput, userId?: string): ViewExplanation {
    const run = (viewAsRoles: Record<string, true> | null) => {
        const ev = evaluate(input, { explain: true, viewAsRoles });
        const rp = ev.rulePortal;
        return {
            resolution: ev.resolution,
            rulePortal: rp
                ? {
                      id: rp.getUniqueValue(),
                      name: str(rp, 'name'),
                      shared: !!ev.portal && rp.getUniqueValue() !== ev.portal.getUniqueValue(),
                  }
                : { id: '', name: '', shared: false },
            rules: ev.verdicts,
            subject: criteriaSubject(),
            notes: ev.notes,
        };
    };
    const subject = String(userId || '').trim();
    if (subject && SYS_ID.test(subject) && subject !== gs.getUserID()) {
        const roles = subjectRoles(subject);
        return withViewAsUser(subject, () => {
            const r = run(roles);
            r.notes.push('Record access is checked as you; roles and user criteria as the selected user.');
            return r;
        });
    }
    return run(null);
}

/** Tables with active rules for a portal (its own pages' rules plus the rule portal's), by kind. */
export function ruleTables(portal: GR): { form: string[]; list: string[] } {
    const rulePortal = rulePortalOf(portal);
    const form: Record<string, true> = {};
    const list: Record<string, true> = {};
    const add = (gr: GR) => {
        const t = str(gr, 'table');
        const a = str(gr, 'applies_to') || 'form';
        if (a === 'form' || a === 'both') form[t] = true;
        if (a === 'list' || a === 'both') list[t] = true;
    };
    each(T.viewRule, `active=true^portal=${rulePortal.getUniqueValue()}^pageISEMPTY`, add);
    each(T.viewRule, `active=true^page.portal=${portal.getUniqueValue()}`, add);
    return { form: Object.keys(form), list: Object.keys(list) };
}
