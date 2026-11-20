import * as React from 'react';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';

// components:toggle-group: a segmented control / grouped buttons (Next Experience's
// now-grouped-button) on Base UI ToggleGroup + Toggle, and a standalone Toggle.
//
//   <ToggleGroup value={[view]} onValueChange={(v) => v.length && setView(v[0])} aria-label="View">
//       <ToggleGroupItem value="list"><Icon name="list" /> List</ToggleGroupItem>
//       <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
//   </ToggleGroup>
//   <ToggleGroup multiple variant="outline" …>  several pressed at once
//   <Toggle pressed={bold} onPressedChange={setBold} aria-label="Bold"><BoldIcon /></Toggle>
//
// Base UI: a role="group" with roving focus (arrow keys, Home / End; `loopFocus`), and each item
// a button with aria-pressed. Values are arrays. useSingleToggle(value, onChange, { required })
// adapts a single string value (and keeps one item always selected when `required`).

const toggleVariants = cva(
    "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-pressed:bg-accent data-pressed:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default: 'bg-transparent text-muted-foreground',
                outline:
                    'border border-input bg-transparent text-muted-foreground shadow-xs hover:bg-muted data-pressed:border-input',
                segmented:
                    'text-muted-foreground hover:bg-transparent data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-sm dark:data-pressed:bg-input/40',
            },
            size: {
                sm: 'h-7 min-w-7 px-2 text-xs',
                default: 'h-8 min-w-8 px-2.5',
                lg: 'h-9 min-w-9 px-3',
            },
        },
        defaultVariants: { variant: 'default', size: 'default' },
    }
);

function Toggle({ className, variant, size, ...props }) {
    return (
        <TogglePrimitive data-slot="toggle" className={cn(toggleVariants({ variant, size }), className)} {...props} />
    );
}

const ToggleGroupContext = React.createContext({ variant: 'segmented', size: 'default' });

/**
 * ToggleGroup props: value / defaultValue / onValueChange (arrays), multiple, disabled,
 * orientation, loopFocus, variant (segmented: default, a muted track with a raised selected
 * segment; outline: joined bordered buttons; default: plain ghost buttons), size, fullWidth.
 */
function ToggleGroup({ className, variant = 'segmented', size = 'default', fullWidth = false, children, ...props }) {
    return (
        <ToggleGroupPrimitive
            data-slot="toggle-group"
            data-variant={variant}
            className={cn(
                'group/toggle-group flex w-fit items-center data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
                variant === 'segmented' && 'gap-0.5 rounded-lg bg-muted p-[3px]',
                variant === 'outline' && 'rounded-md shadow-xs',
                variant === 'default' && 'gap-1',
                fullWidth && 'w-full *:flex-1',
                className
            )}
            {...props}
        >
            <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
        </ToggleGroupPrimitive>
    );
}

function ToggleGroupItem({ className, variant: variantProp, size: sizeProp, ...props }) {
    const ctx = React.useContext(ToggleGroupContext);
    const variant = variantProp || ctx.variant;
    const size = sizeProp || ctx.size;
    return (
        <TogglePrimitive
            data-slot="toggle-group-item"
            className={cn(
                toggleVariants({ variant, size }),
                variant === 'outline' &&
                    'rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus-visible:z-10 [&:not(:first-child)]:-ml-px',
                variant === 'segmented' && 'h-[calc(100%)] rounded-md',
                className
            )}
            {...props}
        />
    );
}

/**
 * Single-select adapter: ToggleGroup's array value <-> one string. With `required` (default
 * true), clicking the pressed item keeps it selected, as a segmented control should.
 * Returns props to spread on <ToggleGroup>: { value, onValueChange }.
 */
function useSingleToggle(value, onChange, options) {
    const required = !options || options.required !== false;
    return {
        value: value === undefined || value === null || value === '' ? [] : [value],
        onValueChange: (next) => {
            const list = Array.isArray(next) ? next : [];
            if (!list.length) {
                if (!required && onChange) onChange('');
                return;
            }
            if (onChange) onChange(list[list.length - 1]);
        },
    };
}

export { Toggle, ToggleGroup, ToggleGroupItem, toggleVariants, useSingleToggle };
