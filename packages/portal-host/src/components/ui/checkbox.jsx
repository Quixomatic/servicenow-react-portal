import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { CheckIcon, MinusIcon } from 'lucide-react';
import { cn } from 'cn';

// components:checkbox: shadcn Checkbox on Base UI, with an indeterminate (mixed) state.
//
//   <Checkbox checked={on} onCheckedChange={setOn} aria-label="Select row" />
//   <Checkbox indeterminate={some && !all} checked={all} onCheckedChange={toggleAll} />
//   <CheckboxLabel label="Notify me" description="Email when this changes"><Checkbox … /></CheckboxLabel>
//
// Base UI renders a role="checkbox" button (aria-checked true / false / "mixed", Space toggles)
// plus a hidden native input, so it submits with forms and works with <label>. Data attributes:
// data-checked, data-unchecked, data-indeterminate, data-disabled, data-invalid.
// useCheckboxGroupState(ids, selected) gives the "select all" state for a list.

function Checkbox({ className, size = 'default', ...props }) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            data-size={size}
            className={cn(
                'peer relative flex shrink-0 items-center justify-center rounded-[4px] border border-input bg-background shadow-xs transition-shadow outline-none dark:bg-input/30',
                size === 'sm'
                    ? 'size-3.5 [&_svg]:size-3'
                    : size === 'lg'
                      ? 'size-5 [&_svg]:size-4'
                      : 'size-4 [&_svg]:size-3.5',
                'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
                'data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary',
                'data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground',
                'data-disabled:cursor-not-allowed data-disabled:opacity-50',
                className
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator
                data-slot="checkbox-indicator"
                className="flex items-center justify-center text-current transition-none"
                render={(indicatorProps, state) => (
                    <span {...indicatorProps}>
                        {state.indeterminate ? <MinusIcon aria-hidden="true" /> : <CheckIcon aria-hidden="true" />}
                    </span>
                )}
            />
        </CheckboxPrimitive.Root>
    );
}

/**
 * A checkbox with a clickable label and an optional description, laid out like platform forms.
 * Children: the <Checkbox>. The description is linked with aria-describedby.
 */
function CheckboxLabel({ className, label, description, children, disabled, ...props }) {
    const id = React.useId();
    const descId = description ? id + '-desc' : undefined;
    const child = React.Children.only(children);
    const control = React.cloneElement(child, {
        'aria-describedby': [child.props['aria-describedby'], descId].filter(Boolean).join(' ') || undefined,
        disabled: child.props.disabled !== undefined ? child.props.disabled : disabled,
    });
    return (
        <label
            data-slot="checkbox-label"
            className={cn(
                'inline-flex w-fit items-start gap-2.5 text-sm',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                className
            )}
            {...props}
        >
            <span className="mt-0.5 inline-flex">{control}</span>
            <span className="flex flex-col gap-0.5">
                <span className="leading-tight font-medium text-foreground">{label}</span>
                {description ? (
                    <span id={descId} className="text-xs text-muted-foreground">
                        {description}
                    </span>
                ) : null}
            </span>
        </label>
    );
}

/**
 * "Select all" state for a list of ids: { all, some, none, checked, indeterminate, toggleAll() }.
 * selected: a Set or array of ids; onChange(nextSelectedArray) is called by toggleAll.
 */
function useCheckboxGroupState(ids, selected, onChange) {
    const set = selected instanceof Set ? selected : new Set(selected || []);
    const list = ids || [];
    let count = 0;
    list.forEach((id) => {
        if (set.has(id)) count += 1;
    });
    const all = list.length > 0 && count === list.length;
    const none = count === 0;
    const some = !all && !none;
    const toggleAll = () => {
        if (!onChange) return;
        if (all) onChange(Array.from(set).filter((id) => list.indexOf(id) < 0));
        else onChange(Array.from(new Set(Array.from(set).concat(list))));
    };
    return { all, some, none, count, checked: all, indeterminate: some, toggleAll };
}

export { Checkbox, CheckboxLabel, useCheckboxGroupState };
