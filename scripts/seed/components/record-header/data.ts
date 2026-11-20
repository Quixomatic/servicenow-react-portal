import { useQuery } from 'utilities:react-query';
import { graphql, gqlKeys } from 'utilities:app/graphql';
import type { HighlightStyle, FieldMeta, FieldValue } from 'utilities:app/graphql';

/**
 * The platform's own record header (GlideHeaderQuery_Query.headerItems), the data Workspace's
 * record header shows: the table's form header config (sys_aw_form_header: primary field and
 * secondary fields) with the platform's highlighted-value styles for those fields, all evaluated
 * on the server as the current user. No configuration of ours.
 */

export type HeaderItem = {
    field: string;
    label: string;
    displayValue: string;
    /** The platform's highlighted-value style (a rule matched), if any. */
    highlight?: HighlightStyle;
    /** A reference field's target. */
    reference?: { table: string; sysId: string };
};

export type RecordHeaderData = {
    /** The record's display value (number, name, …). */
    displayValue: string;
    tableLabel: string;
    /** The header config's primary item (often short_description). */
    primary: HeaderItem | null;
    subheading: HeaderItem | null;
    /** The header config's secondary items, in order. */
    secondary: HeaderItem[];
    /** Highlight styles by field (from the secondary items). */
    highlights: Record<string, HighlightStyle>;
};

const HEADER_QUERY = `query rpRecordHeader($table: String!, $sysId: String!) { GlideHeaderQuery_Query {
    headerItems(table: $table, sysId: $sysId, workspaceConfigId: "", headerConfigId: "", highlightedValueConfigId: "") {
        recordDisplayValue tableDisplayValue
        primaryItem { fieldName fieldLabel displayValue }
        subheadingItem { fieldName fieldLabel displayValue }
        secondaryItems { fieldName fieldLabel displayValue
            highlightedValueStyle { field value status colorName showIcon iconName variantName }
            referenceItem { table sysId } } } } }`;

function styleOf(field: string, h: any): HighlightStyle | undefined {
    if (!h || !(h.colorName || h.status)) return undefined;
    return {
        field,
        value: h.value == null ? '' : String(h.value),
        status: h.status ? String(h.status) : '',
        colorName: h.colorName ? String(h.colorName) : '',
        showIcon: !!h.showIcon,
        iconName: h.iconName ? String(h.iconName) : '',
        variantName: h.variantName ? String(h.variantName) : '',
    };
}

function itemOf(i: any): HeaderItem | null {
    if (!i || !i.fieldName) return null;
    const field = String(i.fieldName);
    const out: HeaderItem = {
        field,
        label: String(i.fieldLabel || field),
        displayValue: i.displayValue == null ? '' : String(i.displayValue),
    };
    const h = styleOf(field, i.highlightedValueStyle);
    if (h) out.highlight = h;
    if (i.referenceItem && i.referenceItem.table && i.referenceItem.sysId)
        out.reference = { table: String(i.referenceItem.table), sysId: String(i.referenceItem.sysId) };
    return out;
}

export function parseHeaderItems(data: any): RecordHeaderData | null {
    const h = data && data.GlideHeaderQuery_Query && data.GlideHeaderQuery_Query.headerItems;
    if (!h) return null;
    const secondary = ((h.secondaryItems || []) as any[]).map(itemOf).filter(Boolean) as HeaderItem[];
    const highlights: Record<string, HighlightStyle> = {};
    secondary.forEach((s) => {
        if (s.highlight) highlights[s.field] = s.highlight;
    });
    return {
        displayValue: h.recordDisplayValue == null ? '' : String(h.recordDisplayValue),
        tableLabel: h.tableDisplayValue == null ? '' : String(h.tableDisplayValue),
        primary: itemOf(h.primaryItem),
        subheading: itemOf(h.subheadingItem),
        secondary,
        highlights,
    };
}

const NAME = /^[a-z0-9_]+$/i;
const SYS_ID = /^[0-9a-f]{32}$/;

/**
 * useRecordHeaderData(table, sysId) → TanStack result with RecordHeaderData | null. Cached under
 * the record's key, so the record watch (a save, someone else's change) refreshes it. Not for new
 * records ('-1'). A failure (an older release, no access) just means no data: callers fall back.
 */
export function useRecordHeaderData(
    table: string | undefined,
    sysId: string | undefined,
    options: { enabled?: boolean } = {}
) {
    const ok = !!table && NAME.test(table) && !!sysId && SYS_ID.test(sysId) && options.enabled !== false;
    return useQuery<RecordHeaderData | null>({
        queryKey: gqlKeys.record(table || '', sysId || '', '~header'),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
            graphql(HEADER_QUERY, { table, sysId }, { signal }).then(parseHeaderItems),
        enabled: ok,
        staleTime: 30_000,
        retry: false,
    });
}

/**
 * The highlight style for each field: the form bootstrap's platform styles (formLayout
 * highlightedValueStyle: every configured field of the table) merged with the header's (its
 * secondary items). Platform rules only; callers fall back to app/highlighted-value's heuristics.
 */
export function mergeHighlights(
    ...sources: (Record<string, HighlightStyle> | undefined | null)[]
): Record<string, HighlightStyle> {
    const out: Record<string, HighlightStyle> = {};
    sources.forEach((s) => {
        if (s) Object.keys(s).forEach((k) => (out[k] = s[k]));
    });
    return out;
}

/** Fields that read as a status: the header shows them as highlighted values. */
export const STATUS_FIELDS = ['state', 'stage', 'request_state', 'approval', 'workflow_state'];
/** Fields the platform's default rules colour by level (priority-like). */
export const LEVEL_FIELDS = ['priority', 'risk', 'impact', 'urgency', 'severity'];

/** 'waiting_for_approval' → 'Waiting for approval' (a raw choice value with no label anywhere). */
export function humanize(value: string): string {
    const t = String(value || '')
        .replace(/[_-]+/g, ' ')
        .trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

/**
 * A value's label: its display value, else the dictionary choice label, else the platform header's
 * display value, else the humanized raw value (workflow fields such as RITM stage ship no display value).
 */
function displayFor(
    v: { value: string; displayValue: string } | undefined,
    meta: FieldMeta | undefined,
    h: HeaderItem | undefined
): string {
    const raw = v ? v.value : '';
    if (v && v.displayValue && v.displayValue !== raw) return v.displayValue;
    const choice = meta && meta.choices ? meta.choices.find((c) => c.value === raw) : undefined;
    if (choice && choice.label) return choice.label;
    if (h && h.displayValue) return h.displayValue;
    if (v && v.displayValue) return v.displayValue;
    return /^[a-z0-9_]+$/.test(raw) && raw.indexOf('_') >= 0 ? humanize(raw) : raw;
}

export type HeaderHighlight = {
    field: string;
    label: string;
    /** What to show (the style's label, else the display value). */
    text: string;
    value: string;
    highlight?: HighlightStyle;
};

/**
 * Which highlighted values the header shows, with no configuration (max 3, in this order):
 * 1. the record's status fields that have a value (state, stage, request_state, approval, …);
 * 2. the platform header's secondary items whose highlight rule matched (e.g. Priority);
 * 3. priority-like fields with a matched platform style from the form bootstrap.
 * Values: the record's SAVED values when the form has the field, else the header's display value.
 * Fields the user can't read (dictionary canRead false) never show.
 */
export function pickHeaderHighlights(args: {
    values: Record<string, { value: string; displayValue: string } | FieldValue | undefined>;
    meta?: Record<string, FieldMeta>;
    header?: RecordHeaderData | null;
    highlights: Record<string, HighlightStyle>;
    max?: number;
}): HeaderHighlight[] {
    const { values, meta, header, highlights } = args;
    const max = args.max || 3;
    const out: HeaderHighlight[] = [];
    const seen = new Set<string>();
    const fromHeader: Record<string, HeaderItem> = {};
    (header ? header.secondary : []).forEach((s) => (fromHeader[s.field] = s));
    const add = (field: string) => {
        if (seen.has(field) || out.length >= max) return;
        if (meta && meta[field] && meta[field].canRead === false) return;
        const v = values[field];
        const h = fromHeader[field];
        const display = displayFor(v, meta && meta[field], h);
        if (!display) return;
        const style = highlights[field] || (h && h.highlight);
        seen.add(field);
        out.push({
            field,
            label: (meta && meta[field] && meta[field].label) || (h && h.label) || field,
            text: (style && style.value) || display,
            value: v ? v.value : '',
            highlight: style,
        });
    };
    STATUS_FIELDS.forEach((f) => {
        if (values[f] || fromHeader[f]) add(f);
    });
    (header ? header.secondary : []).forEach((s) => {
        if (s.highlight) add(s.field);
    });
    LEVEL_FIELDS.forEach((f) => {
        if (highlights[f]) add(f);
    });
    return out;
}
