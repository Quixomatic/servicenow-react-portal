import * as React from 'react';
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { cn } from 'cn';
import { usePortalContainer } from '#/runtime/overlay';
import { Button } from './button';

function Sheet({ ...props }) {
    return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }) {
    return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }) {
    return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({ className, ...props }) {
    return (
        <SheetPrimitive.Backdrop
            data-slot="sheet-overlay"
            className={cn(
                'fixed inset-0 z-50 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0',
                className
            )}
            {...props}
        />
    );
}

/** Overlay panel from one edge; renders into the overlay layer (usePortalContainer). */
function SheetContent({ className, children, side = 'right', showCloseButton = true, ...props }) {
    return (
        <SheetPrimitive.Portal container={usePortalContainer()} data-slot="sheet-portal">
            <SheetOverlay />
            <SheetPrimitive.Popup
                data-slot="sheet-content"
                data-side={side}
                className={cn(
                    'fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out outline-none data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm',
                    className
                )}
                {...props}
            >
                {children}
                {showCloseButton ? (
                    <SheetPrimitive.Close
                        data-slot="sheet-close"
                        render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
                    >
                        <XIcon />
                        <span className="sr-only">Close</span>
                    </SheetPrimitive.Close>
                ) : null}
            </SheetPrimitive.Popup>
        </SheetPrimitive.Portal>
    );
}

function SheetHeader({ className, ...props }) {
    return <div data-slot="sheet-header" className={cn('flex flex-col gap-0.5 p-4', className)} {...props} />;
}

function SheetFooter({ className, ...props }) {
    return <div data-slot="sheet-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />;
}

function SheetTitle({ className, ...props }) {
    return (
        <SheetPrimitive.Title
            data-slot="sheet-title"
            className={cn('text-base font-medium text-foreground', className)}
            {...props}
        />
    );
}

function SheetDescription({ className, ...props }) {
    return (
        <SheetPrimitive.Description
            data-slot="sheet-description"
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
