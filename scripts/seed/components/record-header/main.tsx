/**
 * components:app/record-header: a record's header, Next Experience's now-record-common-header
 * plus now-record-common-record-presence.
 *
 *   <RecordTitle form={form} variant="banner" />   table label, title, highlighted values (pills),
 *                                                  Read only / New badges, presence avatars, the
 *                                                  subtitle; variants:
 *                                                  'banner' (tall sub-header), 'bar' (40px bar), 'inline'
 *   useRecordHeaderData(table, sysId)              one request: the platform header (GlideHeaderQuery_Query
 *                                                  .headerItems: sys_aw_form_header fields + highlight
 *                                                  styles) and our record header fields with their values
 *   configuredSlot(data, slot)                     a slot's configured fields, or null (built-in default)
 *   useHighlightedValueConfig(form)                { field: platform style } (form bootstrap + header)
 *   pickHeaderHighlights({ values, meta, header, highlights })   which values the header highlights
 *
 * Which fields: x_312987_portal_record_field rows (title, subtitle, pill, ribbon slots), per table
 * (child tables inherit a parent's rows) and portal; a slot's winning rows replace its built-in
 * default, a slot with no rows keeps it (title number → name → short_description, subtitle the short
 * description under a number, pills STATUS_FIELDS + matched platform highlights). See
 * docs/guide/primitives/record-header.md.
 *   usePresence({ table, sysId, status })          other users on the record (AMB /sn/rp/<table>/<id>)
 *   <RecordPresence users={users} />               their avatars (+N), a button listing them
 *
 * Highlight colours: the platform evaluates its highlighted-value rules (sys_highlighted_value,
 * sys_ux_highlighted_value_config) on the server as the user and returns a style per field; a
 * field with no matching rule falls back to app/highlighted-value's heuristics. Values are the
 * record's saved values (the header describes the record, not unsaved edits).
 *
 * `form` is any app/form RecordForm model (useRecordForm); only bootstrap, isNew, readOnly,
 * subscribe and getState are read.
 */
import { useSyncExternalStore } from 'react';
import { Badge } from 'components:badge';
import { HighlightedValue } from 'components:app/highlighted-value';
import { useFormMeta, cx } from 'components:app/field';
import type { FormBootstrap, HighlightStyle } from 'utilities:app/graphql';
import { useRecordHeaderData, mergeHighlights, pickHeaderHighlights, configuredSlot } from './data';
import type { HeaderHighlight, RecordHeaderData } from './data';
import { usePresence, RecordPresence } from './presence';

export {
    useRecordHeaderData,
    mergeHighlights,
    pickHeaderHighlights,
    parseHeaderItems,
    configuredSlot,
    STATUS_FIELDS,
    LEVEL_FIELDS,
} from './data';
export type {
    RecordHeaderData,
    HeaderItem,
    HeaderHighlight,
    RecordFieldSlot,
    ConfiguredField,
    RecordFieldConfig,
} from './data';
export { usePresence, RecordPresence } from './presence';
export type { PresenceUser, PresenceStatus, UsePresenceOptions, RecordPresenceProps } from './presence';

/** The parts of an app/form RecordForm model the header reads. */
export type HeaderForm = {
    bootstrap?: FormBootstrap;
    isNew: boolean;
    readOnly: boolean;
    subscribe: (listener: () => void) => () => void;
    getState: () => { fields: Record<string, any> };
};

const TITLE_FIELDS = ['number', 'name', 'short_description'];

/** A field's SAVED display value ('' when the form doesn't have it). */
export function useSavedValue(form: HeaderForm, name: string): string {
    return useSyncExternalStore(
        form.subscribe,
        () => {
            const e = name ? form.getState().fields[name] : undefined;
            return e ? String(e.originalDisplayValue || e.originalValue || '') : '';
        },
        () => ''
    );
}

/** { field: platform highlight style }: the form bootstrap's styles plus the header's. */
export function useHighlightedValueConfig(
    form: HeaderForm,
    header?: RecordHeaderData | null
): Record<string, HighlightStyle> {
    const boot = form.bootstrap;
    return mergeHighlights(boot && boot.highlights, header && header.highlights);
}

/**
 * Everything the header shows, in one hook: title, subtitle, highlighted values, labels.
 * Saved values come from the form store; the platform header fills what the view lacks (a
 * short description that isn't on the view, a highlighted field outside it).
 */
export function useRecordHeaderModel(form: HeaderForm) {
    const boot = form.bootstrap;
    const table = boot ? boot.table : '';
    const sysId = boot && !form.isNew ? boot.sysId : '';
    const header = useRecordHeaderData(table, sysId, { enabled: !!boot && !form.isNew });
    const data = header.data || null;
    const values = boot ? boot.values : {};
    // Title / subtitle: the record header field rows (title, subtitle slots), else the built-in
    // default (number → name → short_description; the short description under a number).
    const titleCfg = configuredSlot(data, 'title');
    const subCfg = configuredSlot(data, 'subtitle');
    const fallbackTitle = TITLE_FIELDS.find((f) => !!boot && f in boot.values) || '';
    const titleField = titleCfg ? (titleCfg[0] ? titleCfg[0].field : '') : fallbackTitle;
    const subField = subCfg ? (subCfg[0] ? subCfg[0].field : '') : titleField === 'number' ? 'short_description' : '';
    const savedTitle = useSavedValue(form, titleField);
    const savedSub = useSavedValue(form, subField);
    // The form's saved value when the view has the field, else the server's (record header fields).
    const title = savedTitle || (titleCfg && titleCfg[0] ? titleCfg[0].displayValue || titleCfg[0].value : '');
    const shortDesc = savedSub || (subCfg && subCfg[0] ? subCfg[0].displayValue || subCfg[0].value : '');
    // Saved values for the highlight candidates: re-read the store when it changes.
    const savedKey = useSyncExternalStore(
        form.subscribe,
        () => {
            const fields = form.getState().fields;
            return Object.keys(values)
                .map((k) => {
                    const e = fields[k];
                    return e ? `${k}=${e.originalValue}|${e.originalDisplayValue}` : '';
                })
                .join('\u0001');
        },
        () => ''
    );
    const highlights = useHighlightedValueConfig(form, data);
    const saved: Record<string, { value: string; displayValue: string }> = {};
    if (boot) {
        const fields = form.getState().fields;
        Object.keys(values).forEach((k) => {
            const e = fields[k];
            saved[k] = e
                ? { value: String(e.originalValue || ''), displayValue: String(e.originalDisplayValue || '') }
                : values[k];
        });
    }
    const picked: HeaderHighlight[] = boot
        ? pickHeaderHighlights({ values: saved, meta: boot.meta, header: data, highlights })
        : [];
    void savedKey;
    // Subtitle: the configured / short description, else (not configured) the platform header's
    // primary item when it isn't the title.
    let subtitle = shortDesc;
    if (!subtitle && !subCfg && data && data.primary && data.primary.field !== titleField) {
        const p = data.primary.displayValue;
        if (p && p !== title) subtitle = p;
    }
    return {
        boot,
        header: data,
        title: title || (data && data.displayValue) || (form.isNew ? 'New record' : boot ? boot.sysId : ''),
        subtitle,
        tableLabel: boot ? (form.isNew ? `New ${boot.tableLabel}` : boot.tableLabel) : '',
        highlights: picked,
    };
}

export type RecordTitleProps = {
    form: HeaderForm;
    /** banner: large title (app-subheader banner); bar: compact one line; inline: the card's own header. */
    variant?: 'banner' | 'bar' | 'inline';
    /** Presence avatars of other users on the record (default true). */
    presence?: boolean;
    /** Highlighted values (default true). */
    highlights?: boolean;
    className?: string;
};

function Pills({ items, size }: { items: HeaderHighlight[]; size: 'sm' | 'default' }) {
    return (
        <>
            {items.map((h) => (
                <HighlightedValue
                    key={h.field}
                    label={h.text}
                    field={h.field}
                    value={h.value}
                    color={h.highlight ? h.highlight.colorName : undefined}
                    status={h.highlight ? h.highlight.status : undefined}
                    size={size}
                    title={`${h.label}: ${h.text}`}
                    className="shrink-0"
                />
            ))}
        </>
    );
}

/** Presence for the header: 'typing' while the form has unsaved changes. */
function HeaderPresence({ form, size }: { form: HeaderForm; size: 'xs' | 'sm' }) {
    const meta = useFormMeta(form as any);
    const boot = form.bootstrap;
    const { users } = usePresence({
        table: boot ? boot.table : '',
        sysId: boot && !form.isNew ? boot.sysId : '',
        status: meta.isDirty ? 'typing' : 'viewing',
    });
    return <RecordPresence users={users} size={size} />;
}

/** The record's title block for every header placement (see the module comment). */
export function RecordTitle({
    form,
    variant = 'banner',
    presence = true,
    highlights = true,
    className,
}: RecordTitleProps) {
    const m = useRecordHeaderModel(form);
    if (!m.boot) return null;
    // New records: no highlighted values (the defaults aren't saved yet; the New badge says it).
    const items = highlights && !form.isNew ? m.highlights : [];
    const badges = (
        <>
            {form.isNew ? (
                <Badge variant="outline" className="shrink-0" data-rp-record-new="">
                    New
                </Badge>
            ) : null}
            {form.readOnly ? (
                <Badge variant="outline" className="shrink-0" data-rp-record-readonly="">
                    Read only
                </Badge>
            ) : null}
        </>
    );
    const firstState = items.length ? items[0].text : '';
    if (variant === 'bar') {
        return (
            <div className={cx('flex min-w-0 items-center gap-2', className)} data-rp-record-title="">
                <span className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase max-sm:hidden">
                    {m.tableLabel}
                </span>
                <h1 className="m-0 min-w-0 truncate text-sm font-semibold">{m.title}</h1>
                <span className="flex shrink-0 items-center gap-1.5" data-rp-record-state={firstState}>
                    <Pills items={items.slice(0, 2)} size="sm" />
                </span>
                {badges}
                {presence ? <HeaderPresence form={form} size="xs" /> : null}
                {m.subtitle ? (
                    <span className="min-w-0 truncate text-sm text-muted-foreground max-lg:hidden">{m.subtitle}</span>
                ) : null}
            </div>
        );
    }
    const banner = variant === 'banner';
    const Heading: any = banner ? 'h1' : 'h2';
    return (
        <div
            className={cx('min-w-0', className)}
            data-rp-record-title=""
            data-rp-banner-title={banner ? '' : undefined}
        >
            <p className="m-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">{m.tableLabel}</p>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                <Heading
                    className={cx(
                        'm-0 min-w-0 truncate leading-tight font-semibold',
                        banner ? 'text-2xl tracking-tight max-sm:text-xl' : 'text-lg'
                    )}
                >
                    {m.title}
                </Heading>
                <span className="flex min-w-0 flex-wrap items-center gap-1.5" data-rp-record-state={firstState}>
                    <Pills items={items} size={banner ? 'default' : 'sm'} />
                    {badges}
                </span>
                {presence ? <HeaderPresence form={form} size="sm" /> : null}
            </div>
            {m.subtitle ? <p className="m-0 mt-1 truncate text-sm text-muted-foreground">{m.subtitle}</p> : null}
        </div>
    );
}

/** Preview (Studio): the presence avatars with sample users (the title needs a form). */
export default function RecordHeaderPreview() {
    const now = Date.now();
    const users = [
        {
            id: '1',
            userName: 'beth.anglin',
            name: 'Beth Anglin',
            initials: 'BA',
            avatar: '',
            status: 'viewing' as const,
            seen: now,
        },
        {
            id: '2',
            userName: 'abel.tuter',
            name: 'Abel Tuter',
            initials: 'AT',
            avatar: '',
            status: 'typing' as const,
            seen: now,
        },
        {
            id: '3',
            userName: 'fred.luddy',
            name: 'Fred Luddy',
            initials: 'FL',
            avatar: '',
            status: 'viewing' as const,
            seen: now,
        },
        {
            id: '4',
            userName: 'don.goodliffe',
            name: 'Don Goodliffe',
            initials: 'DG',
            avatar: '',
            status: 'viewing' as const,
            seen: now,
        },
    ];
    return (
        <div className="flex flex-col gap-3 p-4">
            <p className="m-0 text-sm text-muted-foreground">Presence (sample users):</p>
            <RecordPresence users={users} />
            <RecordPresence users={users.slice(0, 1)} />
        </div>
    );
}
