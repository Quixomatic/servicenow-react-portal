import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from 'cn';
import { Button } from './button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './dropdown-menu';

// components:split-button: a primary action joined to a menu of related actions (Next
// Experience's now-split-button), plus ButtonGroup (shadcn's joined buttons) it's built on.
//
//   <SplitButton onClick={save} items={[
//       { label: 'Save and close', onSelect: saveClose },
//       { type: 'separator' },
//       { label: 'Discard', onSelect: discard, variant: 'destructive', icon: <TrashIcon /> },
//   ]}>Save</SplitButton>
//
//   <ButtonGroup aria-label="Text alignment"><Button …/><Button …/></ButtonGroup>
//
// Two real buttons: the action, and a menu button (aria-haspopup="menu", aria-expanded, label
// `menuLabel`, default "More options") whose menu is Base UI's (arrow keys, typeahead, Escape
// returns focus). Items: { label, onSelect, icon, disabled, variant: 'destructive', shortcut }
// | { type: 'separator' } | { type: 'label', label }. `menu` replaces `items` with your own
// DropdownMenu content.

/** Buttons joined into one control (shared borders, outer corners only). */
function ButtonGroup({ className, orientation = 'horizontal', ...props }) {
    return (
        <div
            role="group"
            data-slot="button-group"
            data-orientation={orientation}
            className={cn(
                'flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10',
                orientation === 'vertical'
                    ? 'flex-col *:not-first:rounded-t-none *:not-first:border-t-0 *:not-last:rounded-b-none'
                    : '*:not-first:rounded-l-none *:not-first:border-l-0 *:not-last:rounded-r-none',
                className
            )}
            {...props}
        />
    );
}

/** A thin divider between filled (non-outline) buttons of a group. */
function ButtonGroupSeparator({ className, ...props }) {
    return (
        <div
            role="separator"
            aria-orientation="vertical"
            data-slot="button-group-separator"
            className={cn('w-px self-stretch bg-primary-foreground/25', className)}
            {...props}
        />
    );
}

function renderItems(items) {
    return (items || []).map((item, i) => {
        if (!item) return null;
        if (item.type === 'separator') return <DropdownMenuSeparator key={'sep-' + i} />;
        if (item.type === 'label') return <DropdownMenuLabel key={'label-' + i}>{item.label}</DropdownMenuLabel>;
        return (
            <DropdownMenuItem
                key={item.id || item.label || i}
                disabled={item.disabled}
                variant={item.variant === 'destructive' ? 'destructive' : 'default'}
                onClick={item.onSelect}
            >
                {item.icon || null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.shortcut ? (
                    <span className="ml-auto pl-4 text-xs tracking-widest text-muted-foreground">{item.shortcut}</span>
                ) : null}
            </DropdownMenuItem>
        );
    });
}

/**
 * SplitButton props: children (the action's content), onClick, variant / size (Button's),
 * disabled (both halves), menuDisabled, items | menu, menuLabel, align ('end'), type, className,
 * buttonProps (extra props for the action button).
 */
function SplitButton({
    className,
    children,
    onClick,
    variant = 'default',
    size = 'default',
    disabled = false,
    menuDisabled = false,
    items,
    menu,
    menuLabel = 'More options',
    align = 'end',
    type = 'button',
    buttonProps,
    ...props
}) {
    const filled = variant === 'default' || variant === 'destructive' || variant === 'secondary';
    const iconSize = size === 'sm' ? 'icon-sm' : size === 'xs' ? 'icon-xs' : size === 'lg' ? 'icon-lg' : 'icon';
    return (
        <ButtonGroup data-slot="split-button" className={className} {...props}>
            <Button type={type} variant={variant} size={size} disabled={disabled} onClick={onClick} {...buttonProps}>
                {children}
            </Button>
            {filled ? <ButtonGroupSeparator className={variant === 'default' ? '' : 'bg-foreground/15'} /> : null}
            <DropdownMenu>
                <DropdownMenuTrigger
                    disabled={disabled || menuDisabled}
                    aria-label={menuLabel}
                    render={<Button variant={variant} size={iconSize} className={cn(filled && 'border-l-0')} />}
                >
                    <ChevronDownIcon aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align={align} className="w-auto min-w-44">
                    {menu || renderItems(items)}
                </DropdownMenuContent>
            </DropdownMenu>
        </ButtonGroup>
    );
}

export { SplitButton, ButtonGroup, ButtonGroupSeparator };
