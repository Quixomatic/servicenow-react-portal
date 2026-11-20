import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';

// components:heading: a heading whose look is independent of its level (Next Experience's
// now-heading). The document outline wants the right h1–h6; the design wants a size.
//
//   <Heading level={2} size="lg">Recent requests</Heading>
//   <Heading level={3} size="sm" variant="muted" description="Updated hourly">Activity</Heading>
//
// size: display, xl, lg, md (default for h3+), sm, xs (an eyebrow: uppercase, tracked).
// Defaults follow the level (h1 xl, h2 lg, h3 md, h4–h6 sm). `description` renders a muted line
// under it; `action` sits on the right (buttons, links), both inside one header block.

const headingVariants = cva('min-w-0 text-balance text-foreground', {
    variants: {
        size: {
            display: 'text-4xl leading-tight font-semibold tracking-tight',
            xl: 'text-2xl leading-tight font-semibold tracking-tight',
            lg: 'text-xl leading-snug font-semibold tracking-tight',
            md: 'text-base leading-snug font-semibold',
            sm: 'text-sm leading-snug font-semibold',
            xs: 'text-xs leading-normal font-medium tracking-wider uppercase',
        },
        variant: {
            default: '',
            muted: 'text-muted-foreground',
            primary: 'text-primary',
        },
    },
    defaultVariants: { size: 'md', variant: 'default' },
});

const SIZE_FOR_LEVEL = { 1: 'xl', 2: 'lg', 3: 'md', 4: 'sm', 5: 'sm', 6: 'sm' };

function Heading({ className, level = 2, size, variant, description, action, children, ...props }) {
    const lvl = Math.min(6, Math.max(1, Number(level) || 2));
    const Tag = 'h' + lvl;
    const resolved = size || SIZE_FOR_LEVEL[lvl];
    const el = (
        <Tag
            data-slot="heading"
            className={cn(headingVariants({ size: resolved, variant }), !description && !action && className)}
            {...props}
        >
            {children}
        </Tag>
    );
    if (!description && !action) return el;
    return (
        <div data-slot="heading-group" className={cn('flex min-w-0 items-start justify-between gap-3', className)}>
            <div className="flex min-w-0 flex-col gap-1">
                {el}
                {description ? <p className="m-0 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
    );
}

export { Heading, headingVariants };
