import type { UiAction } from 'utilities:app/graphql';
import type { RpAction } from 'utilities:app/actions';

/** A bootstrap form UI action (GlideUIAction_Query.uiActions) as an RpAction. */
export function fromUiAction(a: UiAction): RpAction {
    return {
        id: a.sysId,
        source: 'ui_action',
        name: a.name,
        label: a.label,
        hint: a.hint,
        order: a.order,
        placement: a.type === 'button' ? 'button' : 'menu',
        variant: a.style === 'destructive' ? 'destructive' : a.style === 'primary' ? 'primary' : 'default',
        selection: 'none',
        run: { type: 'ui_action', sysId: a.sysId, clientScript: a.hasClientScript ? a.clientScript : undefined },
        supported: true,
        raw: a,
    };
}

/** An RpAction UI action back as the form's UiAction (for RecordForm.runAction). */
export function toUiAction(a: RpAction, known: UiAction[] = []): UiAction {
    const hit = known.find((k) => k.sysId === a.id);
    if (hit) return hit;
    const raw: any = a.raw || {};
    const script = a.run.type === 'ui_action' ? a.run.clientScript : undefined;
    return {
        sysId: a.id,
        name: a.name,
        label: a.label,
        order: a.order,
        type: a.placement === 'button' ? 'button' : 'menuItem',
        style: a.variant === 'destructive' ? 'destructive' : undefined,
        hint: a.hint,
        hasClientScript: !!(script || raw.hasClientScript),
        clientScript: script || raw.clientScript || undefined,
    };
}

/**
 * The form's actions, Workspace's way:
 * - no action config: the bootstrap's UI actions (as today), then the declarative form actions;
 * - with an action config: the UX form action layout alone (UI actions and declarative actions in
 *   the configured order), as Workspace's record page does.
 * Duplicates (same UI action sys_id) are dropped; `skip` names are removed (e.g. Save, in the save bar).
 */
export function mergeFormActions(
    uiActions: UiAction[],
    layout: RpAction[],
    replaces: boolean,
    skip: string[] = []
): RpAction[] {
    const base = replaces ? [] : uiActions.filter((a) => a.label).map(fromUiAction);
    const seen = new Set(base.map((a) => a.id));
    const out = base.concat(layout.filter((a) => !seen.has(a.id)));
    return out.filter((a) => skip.indexOf(a.name) < 0);
}
