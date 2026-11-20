import * as React from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { cn } from 'cn';

// components:stepper: progress through ordered steps (Next Experience's now-stepper): a wizard
// header, an approval flow, a request's stages.
//
//   const steps = [{ label: 'Details' }, { label: 'Approval', description: 'Manager' }, { label: 'Done' }];
//   <Stepper steps={steps} current={1} onStepClick={(i) => setStep(i)} />
//   <Stepper steps={steps} current={1} orientation="vertical" />
//
// Semantics: an <ol> labelled "Progress" (`aria-label`), the current step marked
// aria-current="step", each step's state in sr-only text ("completed", "current", "error").
// Steps are buttons only when onStepClick is set (and the step isn't disabled / upcoming
// unless `allowSkipAhead`). Horizontal steppers fall back to a compact "Step 2 of 3" line in
// containers narrower than ~28rem. Status per step: derived from `current`, or `status`
// ('complete' | 'current' | 'upcoming' | 'error') on the step.

/** Status of step `index` given `current` (an explicit step.status wins). */
function stepStatus(step, index, current) {
    if (step && step.status) return step.status;
    if (index < current) return 'complete';
    if (index === current) return 'current';
    return 'upcoming';
}

const SR = { complete: 'completed', current: 'current', upcoming: 'not started', error: 'error' };

function StepMarker({ status, index }) {
    return (
        <span
            aria-hidden="true"
            data-status={status}
            className={cn(
                'relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                status === 'complete' && 'border-primary bg-primary text-primary-foreground',
                status === 'current' && 'border-primary bg-background text-primary ring-4 ring-primary/15',
                status === 'upcoming' && 'border-border bg-background text-muted-foreground',
                status === 'error' && 'border-destructive bg-destructive text-white'
            )}
        >
            {status === 'complete' ? (
                <CheckIcon className="size-3.5" />
            ) : status === 'error' ? (
                <XIcon className="size-3.5" />
            ) : (
                index + 1
            )}
        </span>
    );
}

/**
 * Stepper props: steps ([{ label, description?, status?, disabled?, key? }]), current (index),
 * orientation ('horizontal' | 'vertical'), onStepClick(index), allowSkipAhead, aria-label
 * ('Progress'), compact ('auto' (default): the narrow fallback; true: always; false: never).
 */
function Stepper({
    className,
    steps,
    current = 0,
    orientation = 'horizontal',
    onStepClick,
    allowSkipAhead = false,
    compact = 'auto',
    'aria-label': ariaLabel = 'Progress',
    ...props
}) {
    const list = (steps || []).filter(Boolean);
    const vertical = orientation === 'vertical';
    const cur = list[current];
    const showCompact = !vertical && compact !== false;
    const fullHidden = !vertical && compact === true;
    return (
        <div data-slot="stepper" className={cn('@container/stepper min-w-0', className)} {...props}>
            {showCompact ? (
                <div
                    aria-hidden="true"
                    className={cn('flex flex-col gap-1.5', compact === 'auto' && '@md/stepper:hidden')}
                >
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium text-foreground">{cur ? cur.label : ''}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            Step {Math.min(current + 1, list.length)} of {list.length}
                        </span>
                    </div>
                    <div className="flex gap-1" aria-hidden="true">
                        {list.map((step, i) => {
                            const status = stepStatus(step, i, current);
                            return (
                                <span
                                    key={step.key || i}
                                    className={cn(
                                        'h-1 flex-1 rounded-full',
                                        status === 'complete' && 'bg-primary',
                                        status === 'current' && 'bg-primary/50',
                                        status === 'upcoming' && 'bg-muted',
                                        status === 'error' && 'bg-destructive'
                                    )}
                                />
                            );
                        })}
                    </div>
                </div>
            ) : null}
            <ol
                aria-label={ariaLabel}
                className={cn(
                    'm-0 flex list-none p-0',
                    vertical ? 'flex-col' : 'items-start',
                    showCompact && compact === 'auto' && '@max-md/stepper:sr-only',
                    fullHidden && 'sr-only'
                )}
            >
                {list.map((step, i) => {
                    const status = stepStatus(step, i, current);
                    const last = i === list.length - 1;
                    const clickable =
                        !!onStepClick && !step.disabled && (allowSkipAhead || status !== 'upcoming' || i <= current);
                    const body = (
                        <>
                            <StepMarker status={status} index={i} />
                            <span
                                className={cn(
                                    'flex min-w-0 flex-col',
                                    vertical ? 'pt-1 text-left' : 'items-center text-center'
                                )}
                            >
                                <span
                                    className={cn(
                                        'text-sm leading-tight font-medium',
                                        status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                                        status === 'error' && 'text-destructive'
                                    )}
                                >
                                    {step.label}
                                </span>
                                {step.description ? (
                                    <span className="mt-0.5 text-xs text-muted-foreground">{step.description}</span>
                                ) : null}
                                <span className="sr-only">, {SR[status] || status}</span>
                            </span>
                        </>
                    );
                    const inner = cn(
                        'flex min-w-0 gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        vertical ? 'flex-row items-start' : 'flex-col items-center px-1'
                    );
                    return (
                        <li
                            key={step.key || i}
                            aria-current={status === 'current' ? 'step' : undefined}
                            className={cn('relative min-w-0', vertical ? (last ? '' : 'pb-6') : 'flex-1')}
                        >
                            {!last ? (
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'absolute',
                                        vertical
                                            ? 'top-8 bottom-1 left-3.5 w-px -translate-x-1/2'
                                            : 'top-3.5 left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] h-px',
                                        status === 'complete' ? 'bg-primary' : 'bg-border'
                                    )}
                                />
                            ) : null}
                            {clickable ? (
                                <button
                                    type="button"
                                    onClick={() => onStepClick(i)}
                                    className={cn(
                                        inner,
                                        'cursor-pointer hover:[&_span]:text-foreground',
                                        !vertical && 'mx-auto'
                                    )}
                                >
                                    {body}
                                </button>
                            ) : (
                                <div className={cn(inner, !vertical && 'mx-auto')}>{body}</div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

/** Wizard state: { current, next(), prev(), goTo(i), isFirst, isLast, count }. */
function useStepper(count, initial = 0) {
    const [current, setCurrent] = React.useState(initial);
    const clamp = (i) => Math.max(0, Math.min(count - 1, i));
    return {
        current,
        count,
        isFirst: current === 0,
        isLast: current >= count - 1,
        next: () => setCurrent((c) => clamp(c + 1)),
        prev: () => setCurrent((c) => clamp(c - 1)),
        goTo: (i) => setCurrent(clamp(i)),
    };
}

export { Stepper, StepMarker, stepStatus, useStepper };
