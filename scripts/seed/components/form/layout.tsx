import { useSyncExternalStore } from 'react';
import { FieldControl } from 'components:app/field-control';
import { cx, useFormContext, isFieldVisible } from 'components:app/field';
import { FormSectionFrame, sectionName, sectionElements } from 'components:app/form-section';
import { FormAnnotation } from 'components:app/form-annotation';
import type { FieldLayout } from 'components:app/field';
import type { FormBootstrap, FormSection as FormSectionData } from 'utilities:app/graphql';

/**
 * Form layout: the view's sections → rows → columns → elements, as the platform lays them out
 * (sys_ui_section / sys_ui_element, already resolved per view by the server).
 *
 * Elements: dictionary fields render through app/field-control; formatters (activity.xml,
 * attached_knowledge, …) render a labelled placeholder until they get their own primitives;
 * split markers are already resolved into columns.
 *
 * Sections:
 * - each titled section has a collapsible heading (a button with aria-expanded / aria-controls);
 *   collapsed content stays mounted (field state, validation) but isn't displayed;
 * - a section disappears when a script hid it (g_form.setSectionDisplay) or every field in it is
 *   hidden (and it shows no formatter);
 * - names: the section caption in lower case ('' for the first, untitled section).
 */

export type FormLayoutProps = {
    bootstrap: FormBootstrap;
    /** Render every field read-only (no write access / no Save action). */
    readOnly?: boolean;
    fieldLayout?: FieldLayout;
    /** Hide formatter placeholders. */
    hideFormatters?: boolean;
    /** Custom element renderer: return undefined to fall back to the default. */
    renderElement?: (name: string, ctx: { bootstrap: FormBootstrap; readOnly: boolean }) => any;
    /** Collapsible section headings (default true). */
    collapsible?: boolean;
    /** Collapsed sections (by section name). */
    isCollapsed?: (name: string) => boolean;
    onToggleSection?: (name: string, collapsed: boolean) => void;
    /** Per-section counts shown on the heading (fields needing attention after a failed save). */
    sectionBadges?: Record<string, number>;
    className?: string;
};

const FORMATTER_LABELS: Record<string, string> = {
    'activity.xml': 'Activity',
    attached_knowledge: 'Attached knowledge',
    'cxs_table_search.xml': 'Related search',
    'process_flow.xml': 'Process flow',
    'variable_editor.xml': 'Variables',
};

export function isSplitMarker(name: string) {
    return name === '.split' || name === '.begin_split' || name === '.end_split';
}

export function isFormatter(name: string, bootstrap: FormBootstrap) {
    if (bootstrap.meta[name]) return false;
    return bootstrap.formatters.indexOf(name) >= 0 || /\.xml$/.test(name) || !!FORMATTER_LABELS[name];
}

export { sectionName, sectionElements };

/** Section name → the field names in it (for error badges and "reveal the field"). */
export function sectionOfField(bootstrap: FormBootstrap): Record<string, string> {
    const map: Record<string, string> = {};
    bootstrap.sections.forEach((s) => sectionElements(s).forEach((n) => (map[n] = sectionName(s))));
    return map;
}

const noopSubscribe = () => () => {};

/**
 * Which sections are displayed now: not hidden by script, and not "every field hidden". Subscribes
 * to the form store; returns a stable string key so re-renders happen only when it changes.
 */
export function useVisibleSections(bootstrap: FormBootstrap, hideFormatters?: boolean): Set<string> {
    const form = useFormContext();
    const key = useSyncExternalStore(
        form ? form.subscribe : noopSubscribe,
        () => {
            if (!form) return bootstrap.sections.map(sectionName).join('|');
            const state = form.getState();
            return bootstrap.sections
                .filter((s) => {
                    const name = sectionName(s);
                    if (form.getSectionDisplay(name) === false) return false;
                    const elements = sectionElements(s).filter((n) => !isSplitMarker(n));
                    const fields = elements.filter((n) => !!bootstrap.meta[n]);
                    const shownFormatter =
                        (!hideFormatters && elements.some((n) => isFormatter(n, bootstrap))) ||
                        elements.some((n) => !!(bootstrap.annotations && bootstrap.annotations[n]));
                    if (!fields.length) return shownFormatter || !elements.length;
                    return shownFormatter || fields.some((n) => isFieldVisible(state, n));
                })
                .map(sectionName)
                .join('|');
        },
        () => ''
    );
    return new Set(key.split('|'));
}

function FormatterPlaceholder({ name }: { name: string }) {
    const label = FORMATTER_LABELS[name] || name.replace(/\.xml$/, '').replace(/[_.]/g, ' ');
    return (
        <div
            className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground"
            data-rp-formatter={name}
        >
            <span className="font-medium capitalize text-foreground">{label}</span> · formatter not supported yet
        </div>
    );
}

export function FormElement(props: { name: string } & Omit<FormLayoutProps, 'className'>) {
    const { name, bootstrap, readOnly = false } = props;
    if (isSplitMarker(name)) return null;
    if (props.renderElement) {
        const custom = props.renderElement(name, { bootstrap, readOnly });
        if (custom !== undefined) return custom;
    }
    if (bootstrap.meta[name])
        return <FieldControl name={name} layout={props.fieldLayout} readOnly={readOnly ? true : undefined} />;
    const annotation = bootstrap.annotations && bootstrap.annotations[name];
    if (annotation)
        return <FormAnnotation type={annotation.type} text={annotation.text} isPlainText={annotation.isPlainText} />;
    if (isFormatter(name, bootstrap)) return props.hideFormatters ? null : <FormatterPlaceholder name={name} />;
    return null;
}

const SPLIT_COLUMNS: Record<number, string> = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 xl:grid-cols-4',
};

/** A section's rows: full-width rows, and split rows with 2, 3 (or more) columns. */
export function SectionRows(props: { section: FormSectionData } & Omit<FormLayoutProps, 'className'>) {
    return (
        <>
            {props.section.rows.map((row, ri) => (
                // Splits (.begin_split / .split / .end_split) arrive resolved as columns: 1 column = a
                // full-width row, 2 or 3 side by side from md, 4+ wrap 2-up then all from xl.
                <div
                    key={ri}
                    className={cx('grid gap-x-6 gap-y-4', SPLIT_COLUMNS[Math.min(row.length, 4)] || '')}
                    data-rp-form-row={row.length}
                >
                    {row.map((col, ci) => (
                        <div key={ci} className="flex min-w-0 flex-col gap-4">
                            {col.map((name) => (
                                <FormElement key={name} name={name} {...props} />
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </>
    );
}

/** One section: a (collapsible) heading (components:app/form-section), then its rows. */
export function FormSection(
    props: { section: FormSectionData; index: number; showHeading?: boolean; divider?: boolean } & Omit<
        FormLayoutProps,
        'className'
    >
) {
    const { section, index } = props;
    const name = sectionName(section);
    const heading = props.showHeading !== false && (index > 0 || !!section.caption);
    return (
        <FormSectionFrame
            id={section.id || String(index)}
            name={name}
            label={section.label || section.caption}
            heading={heading}
            divider={props.divider}
            collapsible={props.collapsible !== false}
            collapsed={!!(props.isCollapsed && props.isCollapsed(name))}
            onCollapsedChange={(c) => props.onToggleSection && props.onToggleSection(name, c)}
            badge={props.sectionBadges ? props.sectionBadges[name] || 0 : 0}
        >
            <SectionRows {...props} />
        </FormSectionFrame>
    );
}

/** Every displayed section of the view, stacked. */
export function FormLayout(props: FormLayoutProps) {
    const { bootstrap, className, ...rest } = props;
    const visible = useVisibleSections(bootstrap, props.hideFormatters);
    const first = bootstrap.sections.find((s) => visible.has(sectionName(s)));
    const firstShown = first ? sectionName(first) : '';
    return (
        <div className={cx('flex flex-col gap-6', className)}>
            {bootstrap.sections.map((s, i) =>
                visible.has(sectionName(s)) ? (
                    // A divider between displayed sections (not above the first one shown).
                    <FormSection
                        key={s.id || i}
                        section={s}
                        index={i}
                        bootstrap={bootstrap}
                        divider={sectionName(s) !== firstShown}
                        {...rest}
                    />
                ) : null
            )}
        </div>
    );
}
