import { toast } from '@portal/runtime';
import { executeUiAction, UiActionError } from 'utilities:app/graphql';
import type { SessionNotification } from 'utilities:app/graphql';
import { confirmDialog } from 'components:app/confirm-dialog';
import { runDeclarativeServerScript, checkActionSecurity } from './documents';
import type { ActionOutcome, ActionRedirect, ActionRunContext, RecordOutcome, RpAction } from './types';

/** Session notifications → toasts. */
export function toastNotifications(list: SessionNotification[]) {
    for (const n of list) {
        const t = String(n.type || '').toLowerCase();
        if (t === 'error') toast.error(n.text);
        else if (t === 'warning') toast.warning(n.text);
        else if (t === 'success') toast.success(n.text);
        else toast.info(n.text);
    }
}

const fail = (reason: 'cancelled' | 'unsupported' | 'blocked' | 'error', message?: string): ActionOutcome => ({
    ok: false,
    reason,
    message,
});

/**
 * Run an action the way Workspace does, with the portal in charge of navigation:
 * - confirmation first (declarative confirmationRequired) through app/confirm-dialog;
 * - UI action on a form → the form's own runner (client part, validation, onSubmit, save);
 * - UI action on a list (classic list actions) → the client script through g_list when there is
 *   one, else the server part once per checked record (POST /api/now/ui/ui_action/:id), after the
 *   platform's own per-record check (AJAXActionSecurity);
 * - declarative server script → /api/now/ui/declarative_action/:id, then refresh;
 * - declarative client script → the surface's environment (g_form or g_list);
 * - UXF client actions we know (new record, edit selected, export, record routes) → portal behaviour;
 * - redirects open through ctx.openRecord (the portal's record page), notifications become toasts.
 */
export async function runAction(action: RpAction, ctx: ActionRunContext): Promise<ActionOutcome> {
    const wantToast = ctx.toast !== false;
    if (!action.supported || action.run.type === 'unsupported')
        return fail('unsupported', action.run.type === 'unsupported' ? action.run.reason : 'Not available here.');
    if (action.selection === 'required' && ctx.surface !== 'form' && !(ctx.sysIds && ctx.sysIds.length))
        return fail('blocked', 'Select one or more records first.');
    if (action.confirm) {
        const ok = await confirmDialog({
            title: action.label,
            description: action.confirm.message,
            confirmLabel: action.label,
            destructive: action.variant === 'destructive',
        });
        if (!ok) return fail('cancelled');
    }
    const run = action.run;
    try {
        if (run.type === 'ui_action') {
            if (ctx.surface === 'form') {
                if (!ctx.runFormUiAction) return fail('unsupported', 'No form to run this action on.');
                const r: any = await ctx.runFormUiAction(run.sysId);
                if (r && r.ok === false)
                    return fail(r.reason === 'invalid' ? 'blocked' : 'error', r.error && r.error.message);
                return { ok: true, notifications: [] };
            }
            if (run.clientScript && ctx.runClientScript) {
                await ctx.runClientScript(action.label, run.clientScript, run.onClick);
                return { ok: true, notifications: [] };
            }
            return runClassicListAction(action, ctx);
        }
        if (run.type === 'server_script') {
            const r = await runDeclarativeServerScript({
                assignmentId: run.assignmentId,
                table: ctx.table,
                sysId: ctx.sysId,
                sysIds: ctx.sysIds,
                fields: ctx.fields,
                encodedRecord: ctx.encodedRecord,
                query: ctx.query,
                parentTable: ctx.parentTable,
                parentRecordSysId: ctx.parentRecordSysId,
            });
            if (wantToast) toastNotifications(r.notifications);
            if (!r.ok) {
                if (wantToast && r.message && !r.notifications.some((n) => n.text === r.message))
                    toast.error(r.message);
                return fail('error', r.message);
            }
            if (ctx.refresh) ctx.refresh();
            if (r.redirect && r.redirect.table && r.redirect.sysId && ctx.openRecord)
                ctx.openRecord(
                    r.redirect.table,
                    r.redirect.sysId,
                    r.redirect.query ? { query: r.redirect.query } : undefined
                );
            return { ok: true, notifications: r.notifications, redirect: r.redirect };
        }
        if (run.type === 'client_script') {
            if (!ctx.runClientScript) return fail('unsupported', 'Client scripts need a form or list environment.');
            await ctx.runClientScript(action.label, run.script, 'onClick');
            return { ok: true, notifications: [] };
        }
        if (run.type === 'uxf') return runUxf(action, run, ctx);
    } catch (e) {
        const message = (e as Error).message || String(e);
        if (wantToast) toast.error(message);
        return fail('error', message);
    }
    return fail('unsupported');
}

function runUxf(
    action: RpAction,
    run: Extract<RpAction['run'], { type: 'uxf' }>,
    ctx: ActionRunContext
): ActionOutcome {
    const p = run.payload || {};
    if (run.dispatch === 'DA#EDIT_SELECTED') {
        if (!ctx.editSelected) return fail('unsupported', 'Bulk edit isn’t available on this list.');
        ctx.editSelected();
        return { ok: true, notifications: [] };
    }
    if (run.dispatch === 'DA#EXPORT_MODAL') {
        if (!ctx.exportList) return fail('unsupported', 'Export isn’t available on this list.');
        ctx.exportList();
        return { ok: true, notifications: [] };
    }
    if (run.dispatch === 'CREATE_NEW_RECORD' || p.route === 'record') {
        const fields = p.fields || {};
        const params = p.params || {};
        const table = String(fields.table || ctx.table);
        const sysId = String(fields.sysId || '-1');
        if (!ctx.openRecord) return fail('unsupported', 'No record page to open.');
        const query = String(params.query || (p.additional_data && p.additional_data.query) || '');
        // A list's own filter isn't a set of new-record values; only a related list's (parent link) is.
        const presets = ctx.surface === 'related_list' && query && query.indexOf('javascript:') < 0 ? query : '';
        ctx.openRecord(table, sysId, presets ? { query: presets } : undefined);
        return { ok: true, notifications: [], redirect: { table, sysId } };
    }
    return fail('unsupported', `“${action.label}” only runs in Workspace.`);
}

/**
 * A classic list UI action's server part on the checked records: the platform checks each record
 * (AJAXActionSecurity), then runs the action once per allowed record (current = that record).
 */
async function runClassicListAction(action: RpAction, ctx: ActionRunContext): Promise<ActionOutcome> {
    const run = action.run as Extract<RpAction['run'], { type: 'ui_action' }>;
    const ids = ctx.sysIds || [];
    const allowed = (await checkActionSecurity(ctx.table, [run.sysId], ids))[run.sysId] || [];
    const perRecord: RecordOutcome[] = [];
    const notifications: SessionNotification[] = [];
    let redirect: ActionRedirect | undefined;
    for (const sysId of ids) {
        if (allowed.indexOf(sysId) < 0) {
            perRecord.push({ sysId, ok: false, message: 'Not allowed on this record' });
            continue;
        }
        try {
            const r = await executeUiAction({ actionSysId: run.sysId, table: ctx.table, sysId, fields: [] });
            r.notifications.forEach((n) => notifications.push(n));
            const failed = r.notifications.some((n) => String(n.type).toLowerCase() === 'error');
            perRecord.push({ sysId, ok: !failed });
            if (r.redirect && r.redirect.table && r.redirect.sysId && ids.length === 1) redirect = r.redirect;
        } catch (e) {
            const message = e instanceof UiActionError || e instanceof Error ? e.message : String(e);
            perRecord.push({ sysId, ok: false, message });
            if (e instanceof UiActionError) e.notifications.forEach((n) => notifications.push(n));
            else notifications.push({ type: 'error', text: message });
        }
    }
    if (ctx.toast !== false) {
        // Same message for many records: once, with a count.
        const seen = new Map<string, { n: SessionNotification; count: number }>();
        notifications.forEach((n) => {
            const k = n.type + '|' + n.text;
            const hit = seen.get(k);
            if (hit) hit.count++;
            else seen.set(k, { n, count: 1 });
        });
        toastNotifications(
            Array.from(seen.values()).map(({ n, count }) =>
                count > 1 ? { type: n.type, text: `${n.text} (×${count})` } : n
            )
        );
        const done = perRecord.filter((r) => r.ok).length;
        // Classic list actions often answer nothing (UI16 just reloads the list): confirm what ran.
        if (done && !notifications.length)
            toast.success(`“${action.label}” ran on ${done} record${done > 1 ? 's' : ''}.`);
        const skipped = perRecord.filter((r) => r.message === 'Not allowed on this record').length;
        if (skipped)
            toast.warning(
                skipped === ids.length
                    ? `“${action.label}” can’t run on the selected record${ids.length > 1 ? 's' : ''}.`
                    : `“${action.label}” skipped ${skipped} of ${ids.length} records it can’t run on.`
            );
    }
    if (ctx.refresh) ctx.refresh();
    if (
        redirect &&
        redirect.table &&
        redirect.sysId &&
        ctx.openRecord &&
        !(redirect.table === ctx.table && ids.indexOf(redirect.sysId) >= 0)
    )
        ctx.openRecord(redirect.table, redirect.sysId, redirect.query ? { query: redirect.query } : undefined);
    const okCount = perRecord.filter((r) => r.ok).length;
    if (!okCount) return fail('error', 'The action didn’t run on any record.');
    return { ok: true, notifications, redirect, perRecord };
}
