import * as React from 'react';
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from 'cn';

// components:accordion: shadcn Accordion on Base UI. One item open at a time by default;
// `multiple` lets several stay open. Values are arrays (Base UI): value / defaultValue /
// onValueChange(values).
//
//   <Accordion defaultValue={['shipping']} multiple?>
//     <AccordionItem value="shipping">
//       <AccordionTrigger>Shipping</AccordionTrigger>
//       <AccordionContent>…</AccordionContent>
//     </AccordionItem>
//   </Accordion>
//
// Base UI supplies the WAI-ARIA accordion pattern: each trigger is a button inside a heading
// (h3), with aria-expanded / aria-controls and the panel's region role and labelling. Up / Down /
// Home / End between triggers are added here (Base UI leaves them out; this also works in the
// shadow root, where activeElement is the host). `variant="card"` gives bordered, separated items.

const AccordionVariantContext = React.createContext('default');

/** Up / Down / Home / End between the enabled triggers of one accordion (nested ones excluded). */
function onAccordionKeyDown(event) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (keys.indexOf(event.key) < 0) return;
    const target = event.target;
    if (!target || target.getAttribute('data-slot') !== 'accordion-trigger') return;
    const root = event.currentTarget;
    const triggers = Array.prototype.slice
        .call(root.querySelectorAll('[data-slot=accordion-trigger]'))
        .filter((el) => !el.disabled && el.closest('[data-slot=accordion]') === root);
    const i = triggers.indexOf(target);
    if (i < 0) return;
    event.preventDefault();
    let next = i;
    if (event.key === 'ArrowDown') next = (i + 1) % triggers.length;
    if (event.key === 'ArrowUp') next = (i - 1 + triggers.length) % triggers.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = triggers.length - 1;
    triggers[next].focus();
}

function Accordion({ className, variant = 'default', onKeyDown, ...props }) {
    return (
        <AccordionVariantContext.Provider value={variant}>
            <AccordionPrimitive.Root
                data-slot="accordion"
                data-variant={variant}
                onKeyDown={(event) => {
                    if (onKeyDown) onKeyDown(event);
                    if (!event.defaultPrevented) onAccordionKeyDown(event);
                }}
                className={cn('flex w-full flex-col', variant === 'card' && 'gap-2', className)}
                {...props}
            />
        </AccordionVariantContext.Provider>
    );
}

function AccordionItem({ className, ...props }) {
    const variant = React.useContext(AccordionVariantContext);
    return (
        <AccordionPrimitive.Item
            data-slot="accordion-item"
            className={cn(
                variant === 'card' ? 'rounded-lg border bg-card px-4 text-card-foreground' : 'border-b last:border-b-0',
                className
            )}
            {...props}
        />
    );
}

/** The heading button. `headingLevel` (default 3) sets the wrapping h1–h6. */
function AccordionTrigger({ className, children, headingLevel = 3, hideChevron = false, ...props }) {
    const Heading = 'h' + Math.min(6, Math.max(1, headingLevel));
    return (
        <AccordionPrimitive.Header data-slot="accordion-header" render={React.createElement(Heading)} className="flex">
            <AccordionPrimitive.Trigger
                data-slot="accordion-trigger"
                className={cn(
                    'group/accordion-trigger flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
                    className
                )}
                {...props}
            >
                {children}
                {hideChevron ? null : (
                    <ChevronDownIcon
                        aria-hidden="true"
                        className="pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200 group-data-[panel-open]/accordion-trigger:rotate-180"
                    />
                )}
            </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
    );
}

function AccordionContent({ className, children, ...props }) {
    return (
        <AccordionPrimitive.Panel
            data-slot="accordion-content"
            className="h-(--accordion-panel-height) overflow-hidden text-sm transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0"
            {...props}
        >
            <div className={cn('pt-0 pb-4', className)}>{children}</div>
        </AccordionPrimitive.Panel>
    );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent, AccordionContent as AccordionPanel };
