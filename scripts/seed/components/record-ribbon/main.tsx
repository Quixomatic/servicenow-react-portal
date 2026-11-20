/**
 * components:app/record-ribbon: a light strip of a record's key values above its form
 * (Next Experience's sn-record-ribbon, without its configuration model).
 *
 *   <RecordRibbon table="incident" sysId={id} onOpen={openRecord} />
 *   <RecordRibbon table sysId fields={['caller_id', 'state']} highlights={boot.highlights} />
 *   const { items, isLoading } = useRecordRibbon({ table, sysId, fields?, highlights? })
 *
 * Fields: `fields`, else the record header field rows of the `ribbon` slot
 * (x_312987_portal_record_field: per table, child tables inherit a parent's rows, per portal; they
 * arrive with their values in the record header's one request), else the built-in defaults
 * (app/record-card summaryFieldsFor) for tables with no ribbon rows, else the platform header's
 * secondary fields (sys_aw_form_header), else assigned to / priority / state / updated for tables
 * with a number, else updated by / updated. Values render in their read modes (app/record-card
 * SummaryValue): references open a preview card, statuses and levels are highlighted values
 * coloured by the platform's highlighted-value rules when one matches. Read as the user; nothing
 * for new records. Two columns on a phone, one wrapping row from sm up.
 */
import { useRecordValues, useTableMeta } from 'utilities:app/graphql';
import type { HighlightStyle } from 'utilities:app/graphql';
import { SummaryValue, summaryFieldsFor } from 'components:app/record-card';
import type { SummaryItem } from 'components:app/record-card';
import { useRecordHeaderData, mergeHighlights, configuredSlot } from 'components:app/record-header';
import { cx } from 'components:app/field';

export type UseRecordRibbonOptions = {
    table: string | undefined;
    sysId: string | undefined;
    /** Fields to show (default: the ribbon's record header fields, else the built-in defaults). */
    fields?: string[];
    /** Platform highlight styles by field (e.g. a form bootstrap's `highlights`). */
    highlights?: Record<string, HighlightStyle>;
    enabled?: boolean;
};

/** The ribbon's items: { field, label, type, value, displayValue, refTable?, highlight? }[]. */
export function useRecordRibbon(options: UseRecordRibbonOptions) {
    const { table, sysId } = options;
    const on = options.enabled !== false && !!table && !!sysId && sysId !== '-1';
    const header = useRecordHeaderData(table, sysId, { enabled: on });
    // The header request answers first: it carries the configured ribbon (with values) or says there is none.
    const ready = header.isFetched || header.isError || !on;
    const configured = options.fields ? null : configuredSlot(header.data, 'ribbon');
    // Table metadata and values only for the unconfigured path (explicit fields or built-in defaults).
    const meta = useTableMeta(table, { enabled: on && (!!options.fields || (ready && !configured)) });
    const m = meta.data || undefined;
    const platformFields = header.data ? header.data.secondary.map((s) => s.field) : undefined;
    const fields =
        configured || !m || !ready
            ? []
            : options.fields
              ? options.fields.filter((f) => !!m[f] && m[f].canRead !== false)
              : summaryFieldsFor(table || '', m, platformFields);
    const values = useRecordValues(table, sysId, fields, { enabled: on && ready && fields.length > 0 });
    const highlights = mergeHighlights(header.data && header.data.highlights, options.highlights);
    const v = values.data || null;
    const items: SummaryItem[] = configured
        ? configured.map((c) => ({
              field: c.field,
              label: c.label,
              type: c.type,
              value: c.value,
              displayValue: c.displayValue,
              refTable: c.refTable || undefined,
              highlight: highlights[c.field],
          }))
        : v && m
          ? fields.map((f) => ({
                field: f,
                label: m[f].label || f,
                type: m[f].type || m[f].internalType || 'string',
                value: v[f] ? v[f].value : '',
                displayValue: v[f] ? v[f].displayValue : '',
                refTable: m[f].reference ? m[f].reference!.table : undefined,
                highlight: highlights[f],
            }))
          : [];
    return {
        items,
        isLoading: on && (!ready || (!configured && (meta.isLoading || (fields.length > 0 && values.isLoading)))),
        error: configured ? null : (values.error as Error | null) || null,
    };
}

export type RecordRibbonProps = UseRecordRibbonOptions & {
    /** Open a referenced record from its preview card. */
    onOpen?: (table: string, sysId: string) => void;
    className?: string;
};

/** The strip. Renders nothing for new records, on errors, or when no field applies. */
export function RecordRibbon(props: RecordRibbonProps) {
    const r = useRecordRibbon(props);
    if (r.isLoading)
        return (
            <div
                aria-hidden="true"
                className={cx('h-14 animate-pulse rounded-lg border border-border bg-muted/40', props.className)}
                data-rp-record-ribbon="loading"
            />
        );
    if (r.error || !r.items.length) return null;
    return (
        <dl
            className={cx(
                'm-0 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border bg-muted/30 px-4 py-3 sm:flex sm:flex-wrap sm:gap-x-8',
                props.className
            )}
            aria-label="Key values"
            data-rp-record-ribbon={props.table}
        >
            {r.items.map((it) => (
                <div key={it.field} className="min-w-0 sm:max-w-64" data-rp-ribbon-item={it.field}>
                    <dt className="truncate text-xs text-muted-foreground">{it.label}</dt>
                    <dd className="m-0 mt-0.5 flex min-w-0 items-center text-sm font-medium">
                        <SummaryValue item={it} onOpen={props.onOpen} />
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/** Preview (Studio): needs a record; see the Record form page. */
export default function RecordRibbonPreview() {
    return (
        <p className="p-4 text-sm text-muted-foreground">
            &lt;RecordRibbon table sysId /&gt;: a record&apos;s key values. It shows above app/record-form&apos;s form
            (option ribbon).
        </p>
    );
}
