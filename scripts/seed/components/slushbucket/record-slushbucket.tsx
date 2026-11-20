import { useMemo, useState } from 'react';
import { useReferenceSearch } from 'utilities:app/graphql';
import { Slushbucket } from './slushbucket';
import type { TransferItem } from './slushbucket';

export type RecordSlushbucketProps = {
    /** Table and glide_list / reference field whose reference rules (qualifier included) drive the search. */
    table: string;
    field: string;
    /** The record (its values feed dependent qualifiers); '-1' for a new one. */
    sysId?: string;
    /** Comma-separated sys_ids and display values (the platform's glide_list format). */
    value: string;
    displayValue?: string;
    onChange: (value: string, displayValue: string) => void;
    label?: string;
    /** Results per search (default 50). */
    limit?: number;
    height?: number;
    reorderable?: boolean;
    disabled?: boolean;
    className?: string;
};

function parse(value: string, display: string): TransferItem[] {
    const ids = String(value || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const labels = String(display || '')
        .split(',')
        .map((s) => s.trim());
    return ids.map((id, i) => ({ id, label: labels.length === ids.length ? labels[i] || id : id }));
}

/**
 * Record slushbucket: the "list collector" for a glide_list (or any reference) field. Available
 * records come from the field's own reference search (`referenceDataRetriever`: qualifiers, as the
 * user), Selected keeps the field's order. Value in and out in the platform's comma format.
 */
export function RecordSlushbucket(props: RecordSlushbucketProps) {
    const [text, setText] = useState('');
    const search = useReferenceSearch({
        table: props.table,
        field: props.field,
        term: text.trim() || '*',
        sysId: props.sysId || '-1',
        limit: props.limit || 50,
    });
    const available: TransferItem[] = useMemo(
        () =>
            search.recent
                .concat(search.matches)
                .filter((r, i, all) => all.findIndex((x) => x.value === r.value) === i)
                .map((r) => ({
                    id: r.value,
                    label: r.displayValue,
                    description: r.columns
                        .slice(1)
                        .map((c) => c.value)
                        .filter(Boolean)
                        .join(' · '),
                })),
        [search.recent, search.matches]
    );
    const selected = useMemo(() => parse(props.value, props.displayValue || ''), [props.value, props.displayValue]);
    return (
        <Slushbucket
            label={props.label}
            available={available}
            selected={selected}
            search={text}
            onSearchChange={setText}
            loading={search.isFetching}
            emptyAvailable={search.error ? `Search failed: ${search.error.message}` : 'No matches'}
            height={props.height}
            reorderable={props.reorderable}
            disabled={props.disabled}
            className={props.className}
            onChange={(ids, items) => props.onChange(ids.join(','), items.map((i) => i.label).join(', '))}
        />
    );
}
