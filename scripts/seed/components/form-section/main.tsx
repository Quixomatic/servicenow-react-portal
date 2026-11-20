/**
 * components:app/form-section: a form section's frame, on the host kit's components:collapsible.
 *
 *   <FormSectionFrame name="notes" label="Notes" collapsible collapsed={c} onCollapsedChange={set} badge={2}>
 *     …rows…
 *   </FormSectionFrame>
 *
 * - The heading is an h3 whose button is the Collapsible trigger (aria-expanded / aria-controls
 *   from Base UI); a chevron shows the state.
 * - Collapsed content stays mounted (keepMounted): fields keep their state and validation still
 *   sees them; it's hidden, not removed.
 * - `badge` (fields to fix after a failed save) shows on the heading, with a screen-reader label.
 * - `heading={false}` (the first, untitled section) renders the content only, never collapsible.
 *
 * Form-specific; the generic disclosure lives in components:collapsible. app/form uses this for
 * stacked sections; app/form-tabs for tabbed ones.
 */
import { useState } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from 'components:collapsible';
import { cx, IconChevronDown } from 'components:app/field';

export type FormSectionFrameProps = {
    /** Section name (g_form name: the caption in lower case; '' for the first section). */
    name: string;
    label: string;
    /** Render the heading (default true). */
    heading?: boolean;
    /** Collapsible heading (default true when there's a heading). */
    collapsible?: boolean;
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
    /** Count shown on the heading (fields to fix). */
    badge?: number;
    /** A divider above the section (every displayed section after the first). */
    divider?: boolean;
    /** Unique id for aria wiring (default from name). */
    id?: string;
    className?: string;
    children?: any;
};

/** A form section as the bootstrap ships it (utilities:app/graphql FormSection). */
type SectionLike = { caption: string; rows: string[][][] };

/** A section's name as g_form uses it: the caption in lower case ('' for the first, untitled one). */
export function sectionName(section: SectionLike): string {
    return String(section.caption || '').toLowerCase();
}

/** Every element name of a section (rows → columns flattened). */
export function sectionElements(section: SectionLike): string[] {
    const out: string[] = [];
    section.rows.forEach((row) => row.forEach((col) => col.forEach((n) => out.push(n))));
    return out;
}

/** "N fields to fix" pill. */
export function SectionBadge({ count, className }: { count: number; className?: string }) {
    if (!count) return null;
    return (
        <span
            className={cx(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-white',
                className
            )}
            data-rp-section-badge=""
        >
            {count}
            <span className="sr-only"> field{count === 1 ? '' : 's'} to fix</span>
        </span>
    );
}

export function FormSectionFrame(props: FormSectionFrameProps) {
    const { name, label, badge = 0 } = props;
    const heading = props.heading !== false;
    const collapsible = heading && props.collapsible !== false;
    const collapsed = collapsible && !!props.collapsed;
    const uid = (props.id || name || 'main').replace(/[^A-Za-z0-9_-]/g, '_');
    const headingId = `rp-form-section-${uid}`;
    const rootProps = {
        'aria-labelledby': heading ? headingId : undefined,
        className: cx('flex flex-col gap-4', props.divider ? 'border-t border-border pt-6' : '', props.className),
        'data-rp-form-section': name || 'main',
        'data-collapsed': collapsed ? '' : undefined,
    };
    const body = <div className="flex flex-col gap-4">{props.children}</div>;
    if (!heading)
        return (
            <section {...rootProps} aria-labelledby={undefined} aria-label={label || undefined}>
                {body}
            </section>
        );
    if (!collapsible)
        return (
            <section {...rootProps}>
                <h3
                    id={headingId}
                    className="m-0 flex items-center gap-2 text-base leading-6 font-semibold tracking-tight text-foreground"
                >
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <SectionBadge count={badge} />
                </h3>
                {body}
            </section>
        );
    return (
        <Collapsible
            open={!collapsed}
            onOpenChange={(open: boolean) => props.onCollapsedChange && props.onCollapsedChange(!open)}
            render={<section {...rootProps} />}
        >
            <h3 id={headingId} className="m-0 text-base leading-6 font-semibold tracking-tight text-foreground">
                {/* Full-width trigger: the whole heading row is the hit area, with a hover / focus fill. */}
                <CollapsibleTrigger
                    className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    data-rp-section-toggle={name}
                >
                    <IconChevronDown
                        size={18}
                        aria-hidden="true"
                        className={cx(
                            'shrink-0 text-muted-foreground transition-transform',
                            collapsed ? '-rotate-90' : ''
                        )}
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <SectionBadge count={badge} />
                </CollapsibleTrigger>
            </h3>
            {/* keepMounted: hidden, not removed (field state, validation). The padding keeps focus rings unclipped. */}
            <CollapsibleContent keepMounted className="-mx-1 -mb-1 px-1 pb-1">
                {body}
            </CollapsibleContent>
        </Collapsible>
    );
}

/** Preview (Studio). */
export default function FormSectionPreview() {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <div className="max-w-xl p-4">
            <FormSectionFrame
                name="notes"
                label="Notes"
                collapsed={collapsed}
                onCollapsedChange={setCollapsed}
                badge={2}
            >
                <p className="text-sm text-muted-foreground">Section content (fields render here).</p>
            </FormSectionFrame>
        </div>
    );
}
