import * as React from 'react';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';

// components:progress: a progress bar on Base UI Progress (role="progressbar", aria-valuenow /
// min / max / valuetext). `value={null}` is indeterminate (an animated stripe, no valuenow).
//
//   <Progress value={42} />
//   <Progress value={uploaded} max={total} label="Uploading report.pdf" showValue />
//   <Progress value={null} label="Loading" size="sm" />
//
// Props: value (number | null), min, max, label (visible text; also the accessible name),
// showValue (percentage on the right, Intl-formatted), format (Intl.NumberFormat options),
// getAriaValueText, variant (default | success | warning | destructive), size (sm | default | lg).

const indicatorVariants = cva('h-full rounded-full transition-[width] duration-300 ease-out', {
    variants: {
        variant: {
            default: 'bg-primary',
            success: 'bg-emerald-500',
            warning: 'bg-amber-500',
            destructive: 'bg-destructive',
        },
    },
    defaultVariants: { variant: 'default' },
});

const TRACK = { sm: 'h-1', default: 'h-2', lg: 'h-3' };

function Progress({
    className,
    value,
    min = 0,
    max = 100,
    label,
    showValue = false,
    format,
    variant = 'default',
    size = 'default',
    trackClassName,
    children,
    ...props
}) {
    const indeterminate = value === null || value === undefined;
    return (
        <ProgressPrimitive.Root
            data-slot="progress"
            value={indeterminate ? null : value}
            min={min}
            max={max}
            format={format}
            className={cn('flex w-full flex-col gap-1.5', className)}
            {...props}
        >
            {label || showValue ? (
                <div className="flex items-center justify-between gap-3 text-sm">
                    {label ? (
                        <ProgressPrimitive.Label className="min-w-0 truncate font-medium text-foreground">
                            {label}
                        </ProgressPrimitive.Label>
                    ) : (
                        <span />
                    )}
                    {showValue && !indeterminate ? (
                        <ProgressPrimitive.Value className="shrink-0 text-xs text-muted-foreground tabular-nums" />
                    ) : null}
                </div>
            ) : null}
            <ProgressPrimitive.Track
                data-slot="progress-track"
                className={cn(
                    'relative w-full overflow-hidden rounded-full bg-muted',
                    TRACK[size] || TRACK.default,
                    trackClassName
                )}
            >
                <ProgressPrimitive.Indicator
                    data-slot="progress-indicator"
                    className={cn(
                        indicatorVariants({ variant }),
                        indeterminate &&
                            'absolute inset-y-0 w-1/3! animate-[rp-progress-indeterminate_1.4s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:w-full! motion-reduce:opacity-40'
                    )}
                />
            </ProgressPrimitive.Track>
            {children}
        </ProgressPrimitive.Root>
    );
}

/** A small circular progress (e.g. inside a button or a list row). Same value / min / max rules. */
function ProgressCircle({ className, value, min = 0, max = 100, size = 20, strokeWidth = 2.5, label, ...props }) {
    const indeterminate = value === null || value === undefined;
    const r = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * r;
    const pct = indeterminate ? 0.25 : Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
    return (
        <span
            role="progressbar"
            aria-label={label}
            aria-valuemin={indeterminate ? undefined : min}
            aria-valuemax={indeterminate ? undefined : max}
            aria-valuenow={indeterminate ? undefined : value}
            data-slot="progress-circle"
            className={cn('inline-flex shrink-0 text-primary', className)}
            {...props}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className={cn(indeterminate && 'animate-spin motion-reduce:animate-none')}
                aria-hidden="true"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    strokeWidth={strokeWidth}
                    className="stroke-muted"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c * (1 - pct)}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 300ms ease-out' }}
                />
            </svg>
        </span>
    );
}

export { Progress, ProgressCircle, indicatorVariants as progressIndicatorVariants };
