/**
 * components:app/action-bar: platform actions on screen (utilities:app/actions' model) for forms,
 * lists and related lists, on the kit's Button and DropdownMenu.
 *
 *   <ActionBar actions onRun running? maxButtons? size? label? moreLabel? />
 *       buttons + a "More" menu (groups labelled, destructive styling, a spinner on the running one);
 *       role="toolbar"; the menu is the kit's WAI-ARIA menu (arrows, Home/End, typeahead, Escape)
 *   <ActionMenuEntries actions onRun />   dropdown entries (grouped) for your own menu
 *   actionMenuItems(actions, run)         components:app/data-table MenuItem[] (context menus)
 *   splitActions(actions, max) / groupActions(actions)
 *
 *   useListActionSlots({ table, view, kind?, parent…, classic?, openRecord, include?, exclude?, actions? })
 *       → { props: { toolbarActions, selectionActions, contextMenuItems }, actions, running, env }
 *       spread props onto <RecordList>: toolbar actions, bulk actions in the selection bar and the
 *       row context menu; client scripts run with g_list, server parts as the user
 *   gListTarget(() => controller)          a g_list target over a data-table ListController
 *
 *   mergeFormActions(uiActions, layout, replaces, skip)   the form's UI actions + declarative actions
 *   fromUiAction(a) / toUiAction(a)                       bootstrap UiAction ⇄ RpAction
 */
import { ActionBar } from './bar';
import type { RpAction } from 'utilities:app/actions';

export { ActionBar, ActionMenuEntries, actionMenuItems, splitActions, groupActions } from './bar';
export type { ActionBarProps } from './bar';
export { useListActionSlots, gListTarget } from './list';
export type { ListActionSlotOptions, ListControllerLike } from './list';
export { mergeFormActions, fromUiAction, toUiAction } from './form';

const demo = (id: string, label: string, extra: Partial<RpAction> = {}): RpAction => ({
    id,
    source: 'declarative',
    name: id,
    label,
    order: 0,
    placement: 'button',
    variant: 'default',
    selection: 'none',
    run: { type: 'unsupported', reason: 'Preview' },
    supported: true,
    raw: {},
    ...extra,
});

/** Preview (Studio): a bar with buttons, a destructive action and a grouped overflow menu. */
export default function ActionBarPreview() {
    const actions = [
        demo('resolve', 'Resolve', { variant: 'primary' }),
        demo('assign', 'Assign to me'),
        demo('copy', 'Copy URL', { placement: 'menu' }),
        demo('task', 'Create incident task', { placement: 'menu', group: 'Create' }),
        demo('problem', 'Create problem', { placement: 'menu', group: 'Create' }),
        demo('delete', 'Delete', { placement: 'menu', variant: 'destructive' }),
    ];
    return (
        <div className="p-4">
            <ActionBar actions={actions} onRun={() => undefined} />
        </div>
    );
}
