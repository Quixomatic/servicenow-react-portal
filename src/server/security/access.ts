import { gs } from '@servicenow/glide';
import { UserCriteriaLoader } from '@servicenow/glide/sn_uc';
import { GR, newGR, str, bool } from '../lib/gr.ts';
import { ROLES, T } from '../lib/tables.ts';
import { forbidden, rpError } from '../lib/errors.ts';
import { parseJson, splitList } from '../lib/util.ts';

/**
 * RPAccess: role, portal, page and user-criteria checks.
 *
 * Consumers never read React Portal tables directly (table ACLs only admit studio roles);
 * the runtime services read with GlideRecord after these checks pass.
 *
 * Two independent layers, ANDed:
 * - legacy roles: portal `roles`, page `access_config_json.roles`, menu item `roles` (unchanged);
 * - user criteria: the "Available for" / "Not available for" m2m tables of portals, pages and menu
 *   items (see "User criteria" below). They are read live per request and never stored in the
 *   (shared, per-portal) release manifest, so the manifest stays user-independent.
 * Studio users (and admins) bypass both, as they always have for roles.
 */

export type StudioCapability = 'author' | 'design' | 'publish' | 'admin' | 'any';

export function isAdmin(): boolean {
    return gs.hasRole(ROLES.admin);
}

export function hasStudioCapability(cap: StudioCapability): boolean {
    if (gs.hasRole(ROLES.admin)) return true;
    switch (cap) {
        case 'author':
            return gs.hasRole(ROLES.developer);
        case 'design':
            return gs.hasRole(ROLES.designer) || gs.hasRole(ROLES.developer);
        case 'publish':
            return gs.hasRole(ROLES.publisher);
        case 'admin':
            return false;
        case 'any':
            return gs.hasRole(ROLES.developer) || gs.hasRole(ROLES.designer) || gs.hasRole(ROLES.publisher);
    }
    return false;
}

export function requireStudio(cap: StudioCapability): void {
    if (!gs.isLoggedIn()) throw rpError(401, 'unauthenticated', 'Login required');
    if (!hasStudioCapability(cap)) throw forbidden(`Requires React Portal ${cap} access`);
}

/** True when the user holds at least one of the given role names (empty list = everyone). */
export function hasAnyRole(roles: string[]): boolean {
    if (!roles.length) return true;
    for (const r of roles) if (gs.hasRole(r)) return true;
    return false;
}

/* ---------------- User criteria ---------------- */

/**
 * Semantics (catalog / Knowledge / Employee Center): for one record,
 *   allowed = (no "Available for" rows, or the user matches any of them)
 *             AND the user matches none of the "Not available for" rows.
 *
 * Per request: the m2m rows of one portal (its own, its pages', its menu items') are read in six
 * queries, then the criteria they name are evaluated for the user in ONE
 * UserCriteriaLoader.getMatchingCriteria(user, ids) call; every check after that is a lookup.
 * getMatchingCriteria evaluates only the criteria we reference (getAllUserCriteria would run every
 * scripted criterion on the instance, some of which throw in our scope). A portal with no rows
 * costs six empty queries and no loader call.
 *
 * The cache lives in module state: http.handle() and the asset route reset it at the start of
 * every request, and it is also keyed by the session user, so nothing carries over between users.
 */

export type UcKind = 'portal' | 'page' | 'item';

interface UcRules {
    can: Record<string, string[]>;
    cannot: Record<string, string[]>;
}

interface AccessState {
    /** The user whose criteria are evaluated: the session user, or the studio "View as user" subject. */
    subject: string;
    viewAs: boolean;
    /** Studio bypass for a View-as subject (computed once). */
    subjectBypass: boolean | null;
    /** criterion sys_id → does the subject match it. */
    matched: Record<string, boolean>;
    /** portalId → rules per kind. */
    portals: Record<string, Record<UcKind, UcRules>>;
}

let accessState: AccessState | null = null;

function freshState(subject: string, viewAs: boolean): AccessState {
    return { subject, viewAs, subjectBypass: null, matched: {}, portals: {} };
}

function state(): AccessState {
    const uid = gs.getUserID();
    if (!accessState || (!accessState.viewAs && accessState.subject !== uid)) accessState = freshState(uid, false);
    return accessState;
}

/** Drop the per-request user-criteria cache (called at the start of every REST request). */
export function resetAccessCache(): void {
    accessState = null;
}

/**
 * Run fn with user criteria evaluated for another user (Studio "View as user", read-only exec
 * checks). Legacy role checks still use the session; the studio bypass uses the subject's roles.
 */
export function withViewAsUser<R>(userId: string, fn: () => R): R {
    const prev = accessState;
    accessState = freshState(userId, true);
    try {
        return fn();
    } finally {
        accessState = prev;
    }
}

const STUDIO_ROLE_NAMES = ['admin', ROLES.admin, ROLES.developer, ROLES.designer, ROLES.publisher];

/** Whether a (non-session) user holds admin or a React Portal studio role. */
function userIsStudio(userId: string): boolean {
    const gr = newGR('sys_user_has_role');
    gr.addQuery('user', userId);
    gr.addQuery('role.name', 'IN', STUDIO_ROLE_NAMES.join(','));
    gr.setLimit(1);
    gr.query();
    return gr.hasNext();
}

/** Studio users and admins pass every audience check (the existing role behaviour). */
function accessBypass(): boolean {
    const s = state();
    if (!s.viewAs) return hasStudioCapability('any');
    if (s.subjectBypass === null) s.subjectBypass = userIsStudio(s.subject);
    return s.subjectBypass;
}

const UC_SOURCES: { kind: UcKind; can: string; cannot: string; field: string; scope: (portalId: string) => string }[] =
    [
        { kind: 'portal', can: T.portalUc, cannot: T.portalUcNo, field: 'portal', scope: (id) => `portal=${id}` },
        { kind: 'page', can: T.pageUc, cannot: T.pageUcNo, field: 'page', scope: (id) => `page.portal=${id}` },
        {
            kind: 'item',
            can: T.itemUc,
            cannot: T.itemUcNo,
            field: 'menu_item',
            scope: (id) => `menu_item.menu.portal=${id}`,
        },
    ];

function readRows(table: string, field: string, scope: string, ids: Record<string, true>): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    const gr = newGR(table);
    gr.addEncodedQuery(scope);
    gr.query();
    while (gr.next()) {
        const owner = str(gr, field);
        const uc = str(gr, 'user_criteria');
        if (!owner || !uc) continue;
        (out[owner] = out[owner] || []).push(uc);
        ids[uc] = true;
    }
    return out;
}

/** Load a portal's m2m rows (all three kinds) and evaluate the criteria they name, once. */
function portalRules(portalId: string): Record<UcKind, UcRules> {
    const s = state();
    const cached = s.portals[portalId];
    if (cached) return cached;
    const ids: Record<string, true> = {};
    const rules = {} as Record<UcKind, UcRules>;
    for (const src of UC_SOURCES) {
        rules[src.kind] = {
            can: readRows(src.can, src.field, src.scope(portalId), ids),
            cannot: readRows(src.cannot, src.field, src.scope(portalId), ids),
        };
    }
    s.portals[portalId] = rules;
    const pending = Object.keys(ids).filter((id) => s.matched[id] === undefined);
    if (pending.length) {
        for (const id of pending) s.matched[id] = false;
        try {
            const hits = UserCriteriaLoader.getMatchingCriteria(s.subject, pending) || [];
            for (let i = 0; i < hits.length; i++) s.matched[String(hits[i])] = true;
        } catch (e) {
            // Leave every pending criterion unmatched: "Available for" denies, "Not available for" doesn't.
            gs.error(`[React Portal] user criteria evaluation failed: ${e}`);
        }
    }
    return rules;
}

function verdict(rules: UcRules, ownerId: string, matched: Record<string, boolean>): boolean {
    const cannot = rules.cannot[ownerId] || [];
    for (const id of cannot) if (matched[id]) return false;
    const can = rules.can[ownerId] || [];
    if (!can.length) return true;
    for (const id of can) if (matched[id]) return true;
    return false;
}

/**
 * User criteria verdict for one portal, page or menu item of portalId (studio users bypass).
 * kind 'portal': ownerId is the portal id itself.
 */
export function ucAllowed(kind: UcKind, portalId: string, ownerId: string): boolean {
    if (!portalId || !ownerId) return true;
    if (accessBypass()) return true;
    return verdict(portalRules(portalId)[kind], ownerId, state().matched);
}

/**
 * Evaluate user criteria for the current subject (the session user, or the View-as subject), in one
 * getMatchingCriteria call for the ids not cached yet this request. → { criterionId: matched }.
 * No studio bypass: callers such as view rules want the subject's real audience.
 */
export function matchCriteria(ids: string[]): Record<string, boolean> {
    const s = state();
    const pending = ids.filter((id) => !!id && s.matched[id] === undefined);
    if (pending.length) {
        for (const id of pending) s.matched[id] = false;
        try {
            const hits = UserCriteriaLoader.getMatchingCriteria(s.subject, pending) || [];
            for (let i = 0; i < hits.length; i++) s.matched[String(hits[i])] = true;
        } catch (e) {
            gs.error(`[React Portal] user criteria evaluation failed: ${e}`);
        }
    }
    const out: Record<string, boolean> = {};
    for (const id of ids) if (id) out[id] = !!s.matched[id];
    return out;
}

/** Available-for / Not-available-for verdict over criterion ids (same rule as portals, pages and items). */
export function criteriaAllow(can: string[], cannot: string[]): boolean {
    if (!can.length && !cannot.length) return true;
    const matched = matchCriteria(can.concat(cannot));
    for (const id of cannot) if (matched[id]) return false;
    if (!can.length) return true;
    for (const id of can) if (matched[id]) return true;
    return false;
}

/** The user criteria are evaluated for: the session user, or the View-as subject. */
export function criteriaSubject(): { userId: string; viewAs: boolean } {
    const s = state();
    return { userId: s.subject, viewAs: s.viewAs };
}

/** What a View-as subject is denied in one portal: user criteria only (Studio preview). */
export interface UcAudience {
    bypass: boolean;
    portal: boolean;
    /** Ids of the portal's pages / menu items the subject's criteria hide (only restricted ids are listed). */
    hiddenPages: string[];
    hiddenItems: string[];
    /** Ids that carry any criteria at all (so the UI can mark restricted records). */
    restrictedPages: string[];
    restrictedItems: string[];
}

/** The user-criteria verdicts of a portal for the current subject (use inside withViewAsUser). */
export function ucAudience(portalId: string): UcAudience {
    const rules = portalRules(portalId);
    const matched = state().matched;
    const bypass = accessBypass();
    const owners = (r: UcRules) => {
        const seen: Record<string, true> = {};
        for (const k of Object.keys(r.can)) seen[k] = true;
        for (const k of Object.keys(r.cannot)) seen[k] = true;
        return Object.keys(seen);
    };
    const restrictedPages = owners(rules.page);
    const restrictedItems = owners(rules.item);
    return {
        bypass,
        portal: bypass || verdict(rules.portal, portalId, matched),
        hiddenPages: bypass ? [] : restrictedPages.filter((id) => !verdict(rules.page, id, matched)),
        hiddenItems: bypass ? [] : restrictedItems.filter((id) => !verdict(rules.item, id, matched)),
        restrictedPages,
        restrictedItems,
    };
}

/* ---------------- Portal and page audience ---------------- */

/** Portal audience: active, logged in, in `roles` (empty = all authenticated users) and its user criteria. */
export function canAccessPortal(portal: GR): boolean {
    if (!portal || !portal.isValidRecord()) return false;
    if (!gs.isLoggedIn()) return false;
    if (accessBypass()) return true;
    if (!bool(portal, 'active')) return false;
    if (!hasAnyRole(splitList(str(portal, 'roles')))) return false;
    return ucAllowed('portal', portal.getUniqueValue(), portal.getUniqueValue());
}

export interface PageAccessConfig {
    roles?: string[];
}

export function pageAccessConfig(page: GR): PageAccessConfig {
    return parseJson<PageAccessConfig>(str(page, 'access_config_json'), {});
}

/** Legacy page roles only (access_config_json.roles). Prefer canAccessManifestPage. */
export function canAccessPageConfig(cfg: PageAccessConfig): boolean {
    if (accessBypass()) return true;
    return hasAnyRole(Array.isArray(cfg.roles) ? cfg.roles : []);
}

/** A manifest page of portalId: its legacy roles AND its user criteria. */
export function canAccessManifestPage(portalId: string, page: { id: string; access: PageAccessConfig }): boolean {
    if (!page) return false;
    if (accessBypass()) return true;
    return canAccessPageConfig(page.access) && ucAllowed('page', portalId, page.id);
}

export function canAccessPage(page: GR): boolean {
    if (!page || !page.isValidRecord()) return false;
    if (accessBypass()) return true;
    if (!bool(page, 'active')) return false;
    return canAccessManifestPage(str(page, 'portal'), { id: page.getUniqueValue(), access: pageAccessConfig(page) });
}

export function requirePortalAccess(portal: GR | null): GR {
    if (!gs.isLoggedIn()) throw rpError(401, 'unauthenticated', 'Login required');
    if (!portal || !canAccessPortal(portal)) throw rpError(404, 'portal_not_found', 'Portal not found');
    return portal;
}

export function userKey(): string {
    return gs.getUserID();
}
