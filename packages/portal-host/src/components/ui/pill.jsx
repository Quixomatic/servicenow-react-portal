import * as React from 'react';
import { XIcon } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { splitOverflow } from './avatar';

// components:pill: a compact token (a selected value, a filter, a tag), optionally removable,
// and PillList: a row of pills that collapses past `max` into a "+N" control.
//
//   <Pill>Hardware</Pill>
//   <Pill variant="outline" icon={<Icon name="user" />} onRemove={() => remove(id)}>Beth Anglin</Pill>
//   <PillList max={3} overflow="expand" aria-label="Watch list">{watchers.map(… <Pill key …/>)}</PillList>
//
// Keyboard: the remove button is a real button (Enter / Space, and Backspace / Delete while it
// has focus); after a removal focus moves to the next pill's button (else the previous one).
// Inside a PillList, Left / Right / Home / End move between the pills' buttons.
// Generic: no record logic (app/list-field renders reference chips on it).

const pillVariants = cva(
    "group/pill inline-flex max-w-full min-w-0 shrink-0 items-center gap-1 rounded-full border font-medium whitespace-nowrap transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
    {
        variants: {
            variant: {
                default: 'border-border bg-muted text-foreground',
                secondary: 'border-transparent bg-secondary text-secondary-foreground',
                outline: 'border-border bg-background text-foreground',
                primary: 'border-primary/20 bg-primary/10 text-primary',
                destructive: 'border-destructive/25 bg-destructive/10 text-destructive',
            },
            size: {
                sm: 'h-5 px-2 text-[11px] has-data-[slot=pill-remove]:pr-0.5',
                default: 'h-6 px-2.5 text-xs has-data-[slot=pill-remove]:pr-1',
                lg: 'h-7 px-3 text-sm has-data-[slot=pill-remove]:pr-1',
            },
        },
        defaultVariants: { variant: 'default', size: 'default' },
    }
);

const FOCUSABLE = '[data-slot=pill-remove],[data-slot=pill-action],[data-slot=pill-overflow]';

function pillButtons(list) {
    return list ? Array.prototype.slice.call(list.querySelectorAll(FOCUSABLE)) : [];
}

/**
 * Pill props: variant, size, icon (leading element), onRemove(event), removeLabel
 * (default "Remove <text>"), disabled, title. Children are the text (truncated, full text in
 * the title when it's a string).
 */
function Pill({ className, variant, size, icon, onRemove, removeLabel, disabled = false, children, title, ...props }) {
    const text = typeof children === 'string' || typeof children === 'number' ? String(children) : '';
    const remove = (event) => {
        if (disabled || !onRemove) return;
        const button = event.currentTarget;
        const list = button.closest('[data-slot=pill-list]');
        const before = pillButtons(list);
        const index = before.indexOf(button);
        onRemove(event);
        if (!list || index < 0) return;
        // After React removes the pill, land on whatever now sits at the same place.
        setTimeout(() => {
            const after = pillButtons(list).filter((el) => el !== button && el.isConnected);
            const target = after[Math.min(index, after.length - 1)];
            if (target) target.focus();
        });
    };
    return (
        <span
            data-slot="pill"
            data-disabled={disabled || undefined}
            title={title === undefined ? text || undefined : title}
            className={cn(pillVariants({ variant, size }), disabled && 'opacity-60', className)}
            {...props}
        >
            {icon ? (
                <span data-slot="pill-icon" className="inline-flex shrink-0 items-center" aria-hidden="true">
                    {icon}
                </span>
            ) : null}
            <span className="min-w-0 truncate">{children}</span>
            {onRemove ? (
                <button
                    type="button"
                    data-slot="pill-remove"
                    disabled={disabled}
                    aria-label={removeLabel || (text ? `Remove ${text}` : 'Remove')}
                    onClick={remove}
                    onKeyDown={(event) => {
                        if (event.key === 'Backspace' || event.key === 'Delete') {
                            event.preventDefault();
                            remove(event);
                        }
                    }}
                    className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-current opacity-60 outline-none hover:bg-foreground/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none"
                >
                    <XIcon className="size-3" aria-hidden="true" />
                </button>
            ) : null}
        </span>
    );
}

function onListKeyDown(event) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (keys.indexOf(event.key) < 0) return;
    const buttons = pillButtons(event.currentTarget).filter((el) => !el.disabled);
    const index = buttons.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
    if (event.key === 'ArrowRight') next = Math.min(buttons.length - 1, index + 1);
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    buttons[next].focus();
}

/**
 * PillList props:
 *   max           show at most this many entries (the "+N" control counts as one)
 *   overflow      'expand' (default: "+N" shows everything, then "Show less"), 'popover' (the rest
 *                 in a popover), 'count' (a static "+N")
 *   expanded / defaultExpanded / onExpandedChange   control the expand state
 *   moreLabel(n)  accessible label of the "+N" control (default "Show n more")
 *   lessLabel     the collapse control's text (default "Show less")
 *   wrap          wrap onto several lines (default true); false keeps one line
 * Renders role="list"; each child becomes a role="listitem".
 */
function PillList({
    className,
    children,
    max,
    overflow = 'expand',
    expanded: expandedProp,
    defaultExpanded = false,
    onExpandedChange,
    moreLabel,
    lessLabel = 'Show less',
    wrap = true,
    size,
    ...props
}) {
    const [expandedState, setExpandedState] = React.useState(defaultExpanded);
    const expanded = expandedProp === undefined ? expandedState : expandedProp;
    const setExpanded = (next) => {
        if (expandedProp === undefined) setExpandedState(next);
        if (onExpandedChange) onExpandedChange(next);
    };
    const items = React.Children.toArray(children).filter(Boolean);
    const split = splitOverflow(items, expanded && overflow === 'expand' ? 0 : max);
    const label = moreLabel ? moreLabel(split.overflow) : `Show ${split.overflow} more`;
    const chip = cn(pillVariants({ variant: 'outline', size }), 'text-muted-foreground');
    const control =
        'cursor-pointer outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50';
    let more = null;
    if (split.overflow > 0 && overflow === 'count') {
        more = (
            <span className={chip}>
                <span aria-hidden="true">+{split.overflow}</span>
                <span className="sr-only">and {split.overflow} more</span>
            </span>
        );
    } else if (split.overflow > 0 && overflow === 'popover') {
        more = (
            <Popover>
                <PopoverTrigger
                    data-slot="pill-overflow"
                    aria-label={label}
                    render={<button type="button" className={cn(chip, control)} />}
                >
                    +{split.overflow}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto max-w-80 p-2">
                    <div role="list" className="flex flex-wrap gap-1" onKeyDown={onListKeyDown} data-slot="pill-list">
                        {split.hidden.map((child, i) => (
                            <span role="listitem" key={i} className="inline-flex min-w-0">
                                {child}
                            </span>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        );
    } else if (split.overflow > 0) {
        more = (
            <button
                type="button"
                data-slot="pill-overflow"
                aria-label={label}
                aria-expanded={false}
                onClick={() => setExpanded(true)}
                className={cn(chip, control)}
            >
                +{split.overflow}
            </button>
        );
    } else if (expanded && overflow === 'expand' && max && items.length > max) {
        more = (
            <button
                type="button"
                data-slot="pill-overflow"
                aria-expanded={true}
                onClick={() => setExpanded(false)}
                className={cn(chip, control)}
            >
                {lessLabel}
            </button>
        );
    }
    return (
        <div
            role="list"
            data-slot="pill-list"
            className={cn(
                'flex min-w-0 items-center gap-1',
                wrap ? 'flex-wrap' : 'flex-nowrap overflow-hidden',
                className
            )}
            onKeyDown={onListKeyDown}
            {...props}
        >
            {split.visible.map((child, i) => (
                <span role="listitem" key={child && child.key != null ? child.key : i} className="inline-flex min-w-0">
                    {child}
                </span>
            ))}
            {more ? (
                <span role="listitem" className="inline-flex">
                    {more}
                </span>
            ) : null}
        </div>
    );
}

export { Pill, PillList, pillVariants };
