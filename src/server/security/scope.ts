import { gs, GlideRecord } from '@servicenow/glide';
import { SCOPE } from '../lib/tables.ts';
import { rpError } from '../lib/errors.ts';

/**
 * The session's current application (the platform's application picker) versus React Portal.
 *
 * New sys_metadata records take the session's current application, so a studio write made while
 * the picker is on another app (Global, say) lands in the wrong scope and update set. The picker
 * persists its choice in the user preference `apps.current_app` (and the update set per app in
 * `updateSetForScope<app sys_id>`); inside our scoped scripts gs.getCurrentApplicationId() reports
 * the script's own scope, so the preference is the reliable source.
 */

export interface AppRef {
    id: string;
    scope: string;
    name: string;
}

export interface StudioContext {
    app: AppRef;
    currentApp: AppRef | null;
    inScope: boolean;
    updateSet: { id: string; name: string } | null;
}

function readGR(table: string): any {
    return new GlideRecord(table) as any;
}

function preference(name: string): string {
    const p = readGR('sys_user_preference');
    p.addQuery('user', gs.getUserID());
    p.addQuery('name', name);
    p.setLimit(1);
    p.query();
    return p.next() ? String(p.getValue('value') || '') : '';
}

function appRef(idOrScope: string, byScope: boolean): AppRef | null {
    if (!idOrScope) return null;
    if (!byScope && idOrScope === 'global') return { id: 'global', scope: 'global', name: 'Global' };
    const a = readGR('sys_scope');
    if (byScope) a.addQuery('scope', idOrScope);
    else a.addQuery('sys_id', idOrScope);
    a.setLimit(1);
    a.query();
    if (!a.next()) return null;
    return {
        id: String(a.getUniqueValue()),
        scope: String(a.getValue('scope') || ''),
        name: String(a.getValue('name') || ''),
    };
}

let ownApp: AppRef | null = null;

/** React Portal's own application record. */
export function reactPortalApp(): AppRef {
    if (!ownApp) ownApp = appRef(SCOPE, true) || { id: '', scope: SCOPE, name: 'React Portal' };
    return ownApp;
}

/** The application selected in the user's application picker, or null when unknown. */
export function currentApplication(): AppRef | null {
    const id = preference('apps.current_app');
    return id ? appRef(id, false) || { id, scope: '', name: id } : null;
}

function updateSetFor(appId: string): { id: string; name: string } | null {
    const id = (appId ? preference(`updateSetForScope${appId}`) : '') || preference('sys_update_set');
    if (!id) return null;
    let name = '';
    try {
        const u = readGR('sys_update_set');
        if (u.get(id)) name = String(u.getValue('name') || '');
    } catch (e) {
        // Cross-scope read refused: return the id alone.
    }
    return { id, name };
}

/** GET /rp_studio/context. */
export function studioContext(): StudioContext {
    const app = reactPortalApp();
    const currentApp = currentApplication();
    const inScope = !currentApp || currentApp.id === app.id;
    return { app, currentApp, inScope, updateSet: updateSetFor(currentApp ? currentApp.id : app.id) };
}

/**
 * Studio write guard: 409 wrong_scope unless the user's current application is React Portal
 * (an unknown picker state is allowed). Reads never call this.
 */
export function requireReactPortalScope(): void {
    const app = reactPortalApp();
    const current = currentApplication();
    if (!current || current.id === app.id) return;
    throw rpError(
        409,
        'wrong_scope',
        `Your current application is ${current.name || current.scope || current.id}; switch to ${app.name || 'React Portal'} to edit.`,
        { currentApp: current, app }
    );
}
