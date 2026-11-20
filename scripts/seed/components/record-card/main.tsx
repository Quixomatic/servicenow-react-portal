/**
 * components:app/record-card: a record at a glance (Next Experience's now-record-compact) and the
 * reference preview (sn-interactive-decoration's hover card): title, highlighted state, a few key
 * fields, actions.
 *
 *   <RecordCard table="incident" sysId={id} onOpen={openRecord} />    loads and shows the record
 *   <RecordPreview table={refTable} sysId={value} label={display} onOpen={…} />
 *                                         the display value as a button that opens a popover card
 *                                         (users get app/contact-card); "Open record" calls onOpen
 *   useRecordSummary(table, sysId, { fields? })   { title, subtitle, items, isLoading, notFound }
 *   summaryFieldsFor(table, meta, platformFields?)   the default key fields (also the ribbon's)
 *   <SummaryValue item onOpen />          one value in its read mode: references as previews,
 *                                         statuses / levels as highlighted values, booleans, dates
 *   titleFieldFor(meta)                   number → name → short_description → title → user_name
 *
 * Configured: the record header fields (x_312987_portal_record_field, see app/record-header) give
 * the title, subtitle and key fields (the pill rows, then the ribbon rows) when those slots have rows.
 * Built-in defaults otherwise (SUMMARY_DEFAULTS), by table: incident caller, priority, state, assigned to, updated;
 * RITM requested for, item, stage, due date; request, catalog task, problem, change and knowledge
 * have their own; any other table with a number gets assigned to, priority, state, updated, else
 * updated by / updated. Read as the user (GlideRecord_Query, field ACLs): fields the dictionary
 * says the user can't read are skipped, unreadable values come back empty and render as "—".
 */
import { useMemo } from 'react';
import { useGraphQL, useTableMeta, useRecordValues } from 'utilities:app/graphql';
import type { FieldMeta, HighlightStyle } from 'utilities:app/graphql';
import { HighlightedValue } from 'components:app/highlighted-value';
import { useRecordHeaderData, configuredSlot } from 'components:app/record-header';
import type { ConfiguredField } from 'components:app/record-header';
import { ContactCard } from 'components:app/contact-card';
import { Popover, PopoverTrigger, PopoverContent } from 'components:popover';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { cx, Spinner } from 'components:app/field';

/** Default key fields per table (filtered by what the table has and the user may read). */
export const SUMMARY_DEFAULTS: Record<string, string[]> = {
    incident: ['caller_id', 'priority', 'state', 'assigned_to', 'sys_updated_on'],
    sc_req_item: ['requested_for', 'cat_item', 'stage', 'due_date'],
    sc_request: ['requested_for', 'request_state', 'price', 'due_date'],
    sc_task: ['request_item', 'assigned_to', 'state', 'due_date'],
    problem: ['priority', 'state', 'assigned_to', 'sys_updated_on'],
    change_request: ['type', 'risk', 'state', 'start_date', 'assigned_to'],
    change_task: ['change_request', 'state', 'assigned_to', 'planned_end_date'],
    kb_knowledge: ['kb_knowledge_base', 'workflow_state', 'author', 'sys_updated_on'],
    sys_user_group: ['manager', 'email', 'type'],
};
const TASK_FALLBACK = ['assigned_to', 'priority', 'state', 'sys_updated_on'];
const GENERIC_FALLBACK = ['sys_updated_by', 'sys_updated_on'];

/** Status-like and level-like fields render as highlighted values. */
const HIGHLIGHT_FIELDS = [
    'state',
    'stage',
    'request_state',
    'approval',
    'workflow_state',
    'priority',
    'risk',
    'impact',
    'urgency',
    'severity',
];

function readable(meta: Record<string, FieldMeta> | undefined, f: string): boolean {
    return !!meta && !!meta[f] && meta[f].canRead !== false;
}

/**
 * The default key fields for a table. `platformFields` (e.g. the platform header's secondary
 * fields) is used for tables we have no defaults for. Only fields the table has and the user may read.
 */
export function summaryFieldsFor(
    table: string,
    meta: Record<string, FieldMeta> | undefined,
    platformFields?: string[]
): string[] {
    if (!meta) return [];
    const pick = (list: string[]) => list.filter((f) => readable(meta, f));
    if (SUMMARY_DEFAULTS[table]) return pick(SUMMARY_DEFAULTS[table]);
    if (platformFields && pick(platformFields).length) return pick(platformFields);
    return pick(meta.number ? TASK_FALLBACK : GENERIC_FALLBACK);
}

/** The field that names a record. */
export function titleFieldFor(meta: Record<string, FieldMeta> | undefined): string {
    if (!meta) return '';
    return ['number', 'name', 'short_description', 'title', 'user_name'].find((f) => readable(meta, f)) || '';
}

export type SummaryItem = {
    field: string;
    label: string;
    type: string;
    value: string;
    displayValue: string;
    /** Reference target table (reference fields). */
    refTable?: string;
    /** A platform highlight style for this field, if one applies. */
    highlight?: HighlightStyle;
};

/**
 * One record's title, subtitle and key fields, read as the user.
 *
 * Which fields: `options.fields`, else the record header field rows (app/record-header: title and
 * subtitle slots; key fields = the pill rows then the ribbon rows, when the ribbon slot is
 * configured), else the built-in defaults (titleFieldFor, the short description under a number,
 * summaryFieldsFor). Configured fields arrive with their values in the header's one request; only
 * the unconfigured parts read table metadata and values.
 */
export function useRecordSummary(
    table: string | undefined,
    sysId: string | undefined,
    options: { fields?: string[]; enabled?: boolean; highlights?: Record<string, HighlightStyle> } = {}
) {
    const enabled = options.enabled !== false;
    const header = useRecordHeaderData(table, sysId, { enabled });
    const ready = header.isFetched || header.isError || !enabled;
    const data = header.data || null;
    const cTitle = configuredSlot(data, 'title');
    const cSub = configuredSlot(data, 'subtitle');
    const cRibbon = options.fields ? null : configuredSlot(data, 'ribbon');
    const cItems: ConfiguredField[] | null = cRibbon
        ? (configuredSlot(data, 'pill') || [])
              .concat(cRibbon)
              .filter((c, i, all) => all.findIndex((o) => o.field === c.field) === i)
        : null;
    const needMeta = enabled && ready && (!cTitle || !cSub || !cItems);
    const meta = useTableMeta(table, { enabled: needMeta });
    const m = meta.data || undefined;
    const fields = useMemo(
        () =>
            cItems
                ? []
                : options.fields
                  ? options.fields.filter((f) => readable(m, f))
                  : summaryFieldsFor(table || '', m),
        [m, table, !!cItems, (options.fields || []).join(',')]
    );
    const titleField = cTitle ? '' : titleFieldFor(m);
    const effectiveTitle = cTitle ? (cTitle[0] ? cTitle[0].field : '') : titleField;
    const subField = cSub
        ? ''
        : effectiveTitle === 'number' && readable(m, 'short_description')
          ? 'short_description'
          : '';
    const all = Array.from(new Set([titleField, subField].concat(fields).filter(Boolean)));
    const values = useRecordValues(table, sysId, all, { enabled: !!m && needMeta && all.length > 0 });
    const v = values.data || null;
    // Platform highlight colours for the header's fields (headerItems), then the caller's styles.
    const hl = Object.assign({}, data ? data.highlights : {}, options.highlights || {});
    const items: SummaryItem[] = cItems
        ? cItems.map((c) => ({
              field: c.field,
              label: c.label,
              type: c.type,
              value: c.value,
              displayValue: c.displayValue,
              refTable: c.refTable || undefined,
              highlight: hl[c.field],
          }))
        : v
          ? fields.map((f) => ({
                field: f,
                label: (m && m[f] && m[f].label) || f,
                type: (m && m[f] && (m[f].type || m[f].internalType)) || 'string',
                value: v[f] ? v[f].value : '',
                displayValue: v[f] ? v[f].displayValue : '',
                refTable: m && m[f] && m[f].reference ? m[f].reference!.table : undefined,
                highlight: hl[f],
            }))
          : [];
    const dv = (f: string) => (v && f && v[f] ? v[f].displayValue || v[f].value : '');
    const cv = (c: ConfiguredField[] | null) => (c && c[0] ? c[0].displayValue || c[0].value : '');
    const usesValues = needMeta && all.length > 0;
    return {
        title: cTitle ? cv(cTitle) : dv(titleField),
        subtitle: cSub ? cv(cSub) : dv(subField),
        tableLabel: '',
        items,
        isLoading: !ready || (needMeta && (meta.isLoading || (usesValues && values.isLoading))),
        error: (meta.error as Error | null) || (values.error as Error | null) || null,
        notFound: usesValues
            ? !!m && !values.isLoading && !values.error && values.isFetched && !v
            : ready && !!data && !!data.config && !cv(cTitle) && !data.displayValue && !items.some((i) => i.value),
    };
}

export type SummaryValueProps = {
    item: SummaryItem;
    /** Open a referenced record (the preview's "Open record"). */
    onOpen?: (table: string, sysId: string) => void;
    /** Reference values open a preview card (default true). */
    preview?: boolean;
    className?: string;
};

/** A value in its read mode: preview link, highlighted value, Yes / No, or text; "—" when empty. */
export function SummaryValue({ item, onOpen, preview = true, className }: SummaryValueProps) {
    const text = item.displayValue || item.value;
    if (!text) {
        return (
            <span className={cx('text-muted-foreground', className)}>
                <span aria-hidden="true">—</span>
                <span className="sr-only">Empty</span>
            </span>
        );
    }
    if (item.type === 'reference' && item.refTable && item.value && preview)
        return (
            <RecordPreview
                table={item.refTable}
                sysId={item.value}
                label={text}
                onOpen={onOpen}
                className={className}
            />
        );
    if (item.highlight || HIGHLIGHT_FIELDS.indexOf(item.field) >= 0)
        return (
            <HighlightedValue
                label={(item.highlight && item.highlight.value) || text}
                field={item.field}
                value={item.value}
                color={item.highlight ? item.highlight.colorName : undefined}
                status={item.highlight ? item.highlight.status : undefined}
                size="sm"
                className={className}
            />
        );
    if (item.type === 'boolean')
        return (
            <span className={className}>{item.value === 'true' ? 'Yes' : item.value === 'false' ? 'No' : text}</span>
        );
    return (
        <span className={cx('block min-w-0 truncate', className)} title={text}>
            {text}
        </span>
    );
}

/** Default "Open record": the classic form in a new tab (pass onOpen to stay in the portal). */
function openClassic(table: string, sysId: string) {
    window.open(`/${encodeURIComponent(table)}.do?sys_id=${encodeURIComponent(sysId)}`, '_blank', 'noopener');
}

export type RecordCardProps = {
    table: string;
    sysId: string;
    /** Key fields (default summaryFieldsFor). */
    fields?: string[];
    /** Platform highlight styles by field (e.g. from a form bootstrap). */
    highlights?: Record<string, HighlightStyle>;
    /** "Open record"; undefined = the classic form in a new tab, null = no button. */
    onOpen?: ((table: string, sysId: string) => void) | null;
    /** Extra actions next to Open record. */
    actions?: any;
    /** Bordered card (default) or plain (inside a popover). */
    variant?: 'card' | 'plain';
    className?: string;
};

/** A compact record card: title, subtitle, key fields as label / value rows, actions. */
export function RecordCard(props: RecordCardProps) {
    const s = useRecordSummary(props.table, props.sysId, { fields: props.fields, highlights: props.highlights });
    const open = props.onOpen === null ? null : props.onOpen || openClassic;
    const plain = props.variant === 'plain';
    const shell = cx(
        'flex min-w-0 flex-col gap-3',
        plain ? '' : 'rounded-xl border border-border bg-card p-4 text-card-foreground',
        props.className
    );
    if (s.isLoading)
        return (
            <div className={shell} aria-busy="true">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner label="Loading the record" /> Loading…
                </span>
            </div>
        );
    if (s.error || s.notFound)
        return (
            <div className={shell}>
                <p className="m-0 text-sm text-muted-foreground" role={s.error ? 'alert' : undefined}>
                    {s.error ? s.error.message : "This record doesn't exist or you can't see it."}
                </p>
            </div>
        );
    return (
        <div className={shell} data-rp-record-card={`${props.table}:${props.sysId}`}>
            <div className="min-w-0">
                <p className="m-0 truncate text-sm font-semibold">{s.title || props.sysId}</p>
                {s.subtitle ? (
                    <p className="m-0 mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.subtitle}</p>
                ) : null}
            </div>
            {s.items.length ? (
                <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-xs">
                    {s.items.map((it) => (
                        <div key={it.field} className="contents">
                            <dt className="text-muted-foreground">{it.label}</dt>
                            <dd className="m-0 min-w-0 text-foreground">
                                <SummaryValue item={it} onOpen={open || undefined} preview={false} />
                            </dd>
                        </div>
                    ))}
                </dl>
            ) : null}
            {open || props.actions ? (
                <div className="flex flex-wrap items-center gap-1.5">
                    {open ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => open(props.table, props.sysId)}
                            data-rp-open-record=""
                        >
                            <Icon name="external-link" aria-hidden="true" /> Open record
                        </Button>
                    ) : null}
                    {props.actions}
                </div>
            ) : null}
        </div>
    );
}

export type RecordPreviewProps = {
    table: string;
    sysId: string;
    /** The trigger's text (the reference's display value). */
    label?: string;
    /** "Open record" in the card; undefined = the classic form in a new tab, null = none. */
    onOpen?: ((table: string, sysId: string) => void) | null;
    /** Trigger look: 'link' (the label as a dotted-underline button, default) or 'icon' (an info button). */
    trigger?: 'link' | 'icon';
    className?: string;
};

/**
 * A reference value that opens a preview card: the referenced record's key fields (a person
 * gets a contact card) and "Open record". A click / Enter opens it (works on touch); Escape closes.
 */
export function RecordPreview(props: RecordPreviewProps) {
    const label = props.label || 'record';
    const open = props.onOpen === null ? null : props.onOpen || openClassic;
    return (
        <Popover>
            <PopoverTrigger
                className={cx(
                    props.trigger === 'icon'
                        ? 'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'
                        : 'inline max-w-full min-w-0 cursor-pointer truncate rounded-sm text-left text-foreground underline decoration-muted-foreground/50 decoration-dotted underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    props.className
                )}
                aria-label={props.trigger === 'icon' ? `Preview ${label}` : undefined}
                title={props.trigger === 'icon' ? `Preview ${label}` : undefined}
                data-rp-record-preview={`${props.table}:${props.sysId}`}
            >
                {props.trigger === 'icon' ? <Icon name="info" className="size-3.5" aria-hidden="true" /> : label}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3">
                {props.table === 'sys_user' ? (
                    <ContactCard userId={props.sysId} onOpen={open || undefined} />
                ) : (
                    <RecordCard table={props.table} sysId={props.sysId} onOpen={open} variant="plain" />
                )}
            </PopoverContent>
        </Popover>
    );
}

/** Preview (Studio): the most recently updated active incident as a card, and its caller as a preview. */
export default function RecordCardPreview() {
    const q = useGraphQL(
        `query rpRecordCardPreview { GlideRecord_Query { incident(queryConditions: "active=true^ORDERBYDESCsys_updated_on", pagination: { limit: 1 }) { _results { sys_id { value } caller_id { value displayValue } } } } }`
    );
    const rows = q.data && q.data.GlideRecord_Query ? q.data.GlideRecord_Query.incident._results : [];
    const r = rows && rows[0];
    if (!r) return <p className="p-4 text-sm text-muted-foreground">Loading an incident…</p>;
    return (
        <div className="flex max-w-sm flex-col gap-3 p-4">
            <RecordCard table="incident" sysId={r.sys_id.value} onOpen={() => {}} />
            {r.caller_id && r.caller_id.value ? (
                <p className="m-0 text-sm">
                    Caller:{' '}
                    <RecordPreview
                        table="sys_user"
                        sysId={r.caller_id.value}
                        label={r.caller_id.displayValue}
                        onOpen={() => {}}
                    />
                </p>
            ) : null}
        </div>
    );
}
