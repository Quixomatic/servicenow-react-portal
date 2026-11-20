import * as React from 'react';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon, XIcon, LightbulbIcon } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';

// components:alert: an inline status message (shadcn Alert, plus status variants, a default
// icon per status, an action slot and a dismiss button).
//
//   <Alert variant="warning" title="Unsaved changes" onDismiss={…}
//          action={<Button size="sm" variant="outline">Reload</Button>}>
//       Someone else updated this record.
//   </Alert>
//   Composable too: <Alert variant="info"><InfoIcon /><AlertTitle>…</AlertTitle>
//       <AlertDescription>…</AlertDescription><AlertAction>…</AlertAction></Alert>
//
// Variants: default (neutral), info, success, warning, destructive (alias error / danger),
// tip. Tones use theme tokens for default / info (primary) / destructive, and emerald /
// amber with dark variants for success / warning (as app/highlighted-value does).
// Accessibility: role="alert" (assertive) for warning / destructive, role="status" (polite)
// otherwise; override with `role`. Pass `live={false}` for a static notice that isn't announced.

const alertVariants = cva(
    "group/alert relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 has-data-[slot=alert-dismiss]:pr-10 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current [&>svg:not([class*='text-'])]:text-current",
    {
        variants: {
            variant: {
                default: 'bg-card text-card-foreground',
                info: 'border-primary/20 bg-primary/5 text-foreground [&>svg]:text-primary',
                success:
                    'border-emerald-500/30 bg-emerald-500/8 text-foreground [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400',
                warning:
                    'border-amber-500/35 bg-amber-500/10 text-foreground [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400',
                destructive: 'border-destructive/30 bg-destructive/5 text-foreground [&>svg]:text-destructive',
                tip: 'border-sky-500/30 bg-sky-500/8 text-foreground [&>svg]:text-sky-600 dark:[&>svg]:text-sky-400',
            },
        },
        defaultVariants: { variant: 'default' },
    }
);

const ALIASES = { error: 'destructive', danger: 'destructive', critical: 'destructive', neutral: 'default' };

const ICONS = {
    default: InfoIcon,
    info: InfoIcon,
    success: CircleCheckIcon,
    warning: TriangleAlertIcon,
    destructive: CircleAlertIcon,
    tip: LightbulbIcon,
};

/** 'error' -> 'destructive', unknown -> 'default'. */
function alertVariantOf(variant) {
    const v = ALIASES[variant] || variant || 'default';
    return ICONS[v] ? v : 'default';
}

/**
 * Alert props: variant, title, description (or children), icon (element; `false` hides the
 * default status icon; default: shown only when `title` / `description` props are used),
 * action (buttons on the right, below on narrow containers), onDismiss + dismissLabel
 * ("Dismiss"), live (announce, default true), role.
 */
function Alert({
    className,
    variant: variantProp,
    title,
    description,
    icon,
    action,
    onDismiss,
    dismissLabel = 'Dismiss',
    live = true,
    role,
    children,
    ...props
}) {
    const variant = alertVariantOf(variantProp);
    const assertive = variant === 'warning' || variant === 'destructive';
    const resolvedRole = role !== undefined ? role : live ? (assertive ? 'alert' : 'status') : undefined;
    const shorthand = title !== undefined || description !== undefined;
    const Default = ICONS[variant];
    const iconEl = icon === false ? null : icon || (shorthand ? <Default aria-hidden="true" /> : null);
    return (
        <div
            data-slot="alert"
            data-variant={variant}
            role={resolvedRole}
            className={cn(alertVariants({ variant }), className)}
            {...props}
        >
            {iconEl}
            {title !== undefined ? <AlertTitle>{title}</AlertTitle> : null}
            {description !== undefined ? <AlertDescription>{description}</AlertDescription> : null}
            {shorthand && children ? <AlertDescription>{children}</AlertDescription> : null}
            {!shorthand ? children : null}
            {action ? <AlertAction>{action}</AlertAction> : null}
            {onDismiss ? (
                <button
                    type="button"
                    data-slot="alert-dismiss"
                    aria-label={dismissLabel}
                    onClick={onDismiss}
                    className="absolute top-2.5 right-2.5 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    <XIcon className="size-4" aria-hidden="true" />
                </button>
            ) : null}
        </div>
    );
}

function AlertTitle({ className, ...props }) {
    return (
        <div
            data-slot="alert-title"
            className={cn('col-start-2 line-clamp-2 min-h-4 font-medium tracking-tight', className)}
            {...props}
        />
    );
}

function AlertDescription({ className, ...props }) {
    return (
        <div
            data-slot="alert-description"
            className={cn(
                'col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
                className
            )}
            {...props}
        />
    );
}

/** Buttons for the alert (below the text; use <Alert action> for the same). */
function AlertAction({ className, ...props }) {
    return (
        <div data-slot="alert-action" className={cn('col-start-2 mt-2 flex flex-wrap gap-2', className)} {...props} />
    );
}

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants, alertVariantOf };
