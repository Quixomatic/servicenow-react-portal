import { Fragment } from 'react';
import { Button } from 'components:button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from 'components:dropdown-menu';
import { cx, Spinner, IconChevronDown } from 'components:app/field';
import type { RpAction } from 'utilities:app/actions';

export type ActionBarProps = {
    actions: RpAction[];
    onRun: (action: RpAction) => unknown;
    /** id of the action running now (a spinner on it; the bar is disabled meanwhile). */
    running?: string;
    disabled?: boolean;
    /**
     * Button budget: the first N button-placed actions stay buttons, the rest join "More". Undefined:
     * every button-placed action is a button (the bar wraps).
     */
    maxButtons?: number;
    /** Accessible name of the toolbar. */
    label?: string;
    moreLabel?: string;
    size?: 'xs' | 'sm' | 'default';
    className?: string;
    /** Extra content after the buttons (before More). */
    children?: any;
};

const variantOf = (a: RpAction) =>
    a.variant === 'destructive' ? 'destructive' : a.variant === 'primary' ? 'default' : 'outline';

/** Split actions into toolbar buttons and the overflow menu (by placement and the button budget). */
export function splitActions(actions: RpAction[], maxButtons?: number): { buttons: RpAction[]; menu: RpAction[] } {
    const placed = actions.filter((a) => a.placement === 'button' && !a.group);
    const capped = maxButtons !== undefined;
    const buttons = capped ? placed.slice(0, Math.max(0, maxButtons as number)) : placed;
    const menu = actions.filter((a) => buttons.indexOf(a) < 0);
    return { buttons, menu };
}

/** Menu entries grouped: ungrouped first, then one labelled group per `group`. */
export function groupActions(actions: RpAction[]): { group: string; actions: RpAction[] }[] {
    const out: { group: string; actions: RpAction[] }[] = [];
    actions.forEach((a) => {
        const g = a.group && a.group !== 'classic' ? a.group : '';
        let hit = out.find((x) => x.group === g);
        if (!hit) {
            hit = { group: g, actions: [] };
            if (g) out.push(hit);
            else out.unshift(hit);
        }
        hit.actions.push(a);
    });
    return out;
}

/**
 * The action bar: platform actions as buttons plus a "More" menu (WAI-ARIA toolbar + menu from the
 * kit's DropdownMenu: arrows, Home/End, typeahead, Escape). Unsupported actions (shown only with
 * showUnsupported) are disabled with their reason as the hint.
 */
export function ActionBar(props: ActionBarProps) {
    const { buttons, menu } = splitActions(props.actions, props.maxButtons);
    if (!buttons.length && !menu.length && !props.children) return null;
    const busy = !!props.running || !!props.disabled;
    const size = props.size || 'sm';
    const capped = props.maxButtons !== undefined;
    const hintOf = (a: RpAction) => (!a.supported && a.run.type === 'unsupported' ? a.run.reason : a.hint) || undefined;
    return (
        <div
            className={cx('flex items-center gap-2', capped ? 'flex-nowrap' : 'flex-wrap', props.className)}
            role="toolbar"
            aria-label={props.label || 'Actions'}
            data-rp-action-bar=""
        >
            {buttons.map((a) => (
                <Button
                    key={a.id}
                    type="button"
                    size={size}
                    variant={variantOf(a)}
                    disabled={busy || !a.supported}
                    title={hintOf(a)}
                    onClick={() => props.onRun(a)}
                    data-rp-action={a.name || a.id}
                    data-rp-action-source={a.source}
                >
                    {props.running === a.id ? <Spinner label="Running" /> : null}
                    {a.label}
                </Button>
            ))}
            {props.children}
            {menu.length ? (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                type="button"
                                size={size}
                                variant="outline"
                                disabled={busy}
                                aria-label={props.moreLabel ? undefined : 'More actions'}
                                data-rp-action-menu=""
                            />
                        }
                    >
                        {menu.some((a) => a.id === props.running) ? <Spinner label="Running" /> : null}
                        {props.moreLabel || 'More'} <IconChevronDown size={14} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-auto min-w-56 max-w-[min(22rem,90vw)]">
                        <ActionMenuEntries actions={menu} onRun={props.onRun} />
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}
        </div>
    );
}

/** Dropdown menu entries for actions (grouped, separators between groups). */
export function ActionMenuEntries({ actions, onRun }: { actions: RpAction[]; onRun: (a: RpAction) => unknown }) {
    const groups = groupActions(actions);
    return (
        <>
            {groups.map((g, i) => (
                <Fragment key={g.group || '_'}>
                    {i > 0 ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuGroup>
                        {g.group ? <DropdownMenuLabel>{g.group}</DropdownMenuLabel> : null}
                        {g.actions.map((a) => (
                            <DropdownMenuItem
                                key={a.id}
                                disabled={!a.supported}
                                variant={a.variant === 'destructive' ? 'destructive' : 'default'}
                                title={a.hint || undefined}
                                onClick={() => onRun(a)}
                                data-rp-action={a.name || a.id}
                                data-rp-action-source={a.source}
                            >
                                {a.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                </Fragment>
            ))}
        </>
    );
}

/** Context-menu items (components:app/data-table MenuItem) for actions. */
export function actionMenuItems(
    actions: RpAction[],
    onRun: (a: RpAction) => unknown,
    options: { prefix?: string; label?: (a: RpAction) => string } = {}
): any[] {
    const prefix = options.prefix || 'rp-action:';
    return actions.map((a) => {
        const label = options.label ? options.label(a) : a.label;
        return {
            id: prefix + a.id,
            label,
            // A tooltip that only repeats the label (Workspace defaults it to the label) isn't a hint.
            hint:
                a.hint &&
                a.hint.trim().toLowerCase() !== label.trim().toLowerCase() &&
                a.hint.trim().toLowerCase() !== a.label.trim().toLowerCase()
                    ? a.hint
                    : undefined,
            disabled: !a.supported,
            destructive: a.variant === 'destructive',
            onSelect: () => onRun(a),
        };
    });
}
