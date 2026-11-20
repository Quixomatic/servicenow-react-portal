/**
 * components:app/table-name-field: the `table_name` dictionary type (and catalog "Table Name"
 * variables): pick a table by label or name.
 *
 *   <TableNameField name="table" />                         bound
 *   <TableNameField name="t" label="Table" baseTable="task" onChange />   standalone, task and its children
 *
 * An editable combobox (app/combobox) searching sys_db_object by label and name as you type
 * (names starting with the text first). The value is the table name; the display value its label.
 * The dictionary attribute `base_table` (or `baseTable`) limits the list to that table and the
 * tables extending it. Typing an exact table name and leaving the field also commits it.
 */
import { useMemo, useState } from 'react';
import { useQuery } from 'utilities:react-query';
import { restGet, useDebouncedValue } from 'utilities:app/graphql';
import { useField, FieldShell, adornmentButtonClass, IconX } from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';
import { Combobox } from 'components:app/combobox';
import type { ComboItem } from 'components:app/combobox';

export type TableNameFieldProps = FieldProps & {
    /** Only this table and the tables extending it. */
    baseTable?: string;
    /** Results per search (default 50). */
    limit?: number;
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    className?: string;
};

export type TableInfo = { name: string; label: string; superClass?: string };

const SAFE = /^[a-z0-9_]+$/i;

/** Encoded query: the table and up to 6 levels of tables extending it. */
export function extendsQuery(base: string): string {
    if (!SAFE.test(base)) return '';
    const parts = [`name=${base}`];
    let path = 'super_class';
    for (let i = 0; i < 6; i++) {
        parts.push(`${path}.name=${base}`);
        path += '.super_class';
    }
    return parts.join('^OR');
}

/** Search sys_db_object by label or name (Table API; names starting with the text sort first). */
export async function searchTables(
    text: string,
    opts: { baseTable?: string; limit?: number } = {},
    signal?: AbortSignal
): Promise<TableInfo[]> {
    const q = String(text || '')
        .replace(/[^a-z0-9_ ]/gi, '')
        .trim();
    const where: string[] = [];
    if (q) where.push(`nameLIKE${q}^ORlabelLIKE${q}`);
    if (opts.baseTable) {
        const ext = extendsQuery(opts.baseTable);
        if (ext) where.push(ext);
    }
    const query = where.concat(['ORDERBYlabel']).join('^');
    const rows = await restGet<any[]>(
        `/api/now/table/sys_db_object?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=name,label,super_class.name&sysparm_limit=${opts.limit || 50}&sysparm_exclude_reference_link=true`,
        signal
    );
    const out: TableInfo[] = (rows || [])
        .filter((r) => r && r.name)
        .map((r) => ({
            name: String(r.name),
            label: String(r.label || r.name),
            superClass: r['super_class.name'] || undefined,
        }));
    const lq = q.toLowerCase();
    const rank = (t: TableInfo) =>
        t.name === lq ? 0 : t.name.startsWith(lq) ? 1 : t.label.toLowerCase().startsWith(lq) ? 2 : 3;
    return lq ? out.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label)) : out;
}

/** One table's label (cached). */
export function useTableInfo(name: string | undefined) {
    return useQuery({
        queryKey: ['rp-fields', 'table-info', name || ''],
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
            const rows = await restGet<any[]>(
                `/api/now/table/sys_db_object?sysparm_query=${encodeURIComponent('name=' + name)}&sysparm_fields=name,label,super_class.name&sysparm_limit=1`,
                signal
            );
            const r = rows && rows[0];
            return r
                ? ({
                      name: String(r.name),
                      label: String(r.label || r.name),
                      superClass: r['super_class.name'] || undefined,
                  } as TableInfo)
                : null;
        },
        enabled: !!name && SAFE.test(name),
        staleTime: 30 * 60_000,
    });
}

/** Debounced table search as a hook (any widget): { data: TableInfo[], isFetching, … }. */
export function useTableSearch(
    text: string,
    opts: { baseTable?: string; limit?: number; enabled?: boolean; debounceMs?: number } = {}
) {
    const term = useDebouncedValue(text || '', opts.debounceMs ?? 200);
    return useQuery({
        queryKey: ['rp-fields', 'tables', term, opts.baseTable || '', opts.limit || 50],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
            searchTables(term, { baseTable: opts.baseTable, limit: opts.limit }, signal),
        enabled: opts.enabled !== false,
        staleTime: 5 * 60_000,
    });
}

export function TableNameField(props: TableNameFieldProps) {
    const field = useField(props);
    const baseTable = props.baseTable || (field.meta.attributes || {}).base_table || undefined;
    const [open, setOpen] = useState(false);
    const [text, setText] = useState<string | null>(null);
    const info = useTableInfo(field.value || undefined);
    const current = field.value
        ? info.data
            ? info.data.label
            : field.displayValue && field.displayValue !== field.value
              ? field.displayValue
              : field.value
        : '';
    const search = useTableSearch(text || '', { baseTable, limit: props.limit, enabled: open });
    const items = useMemo<ComboItem[]>(
        () =>
            ((search.data as TableInfo[] | undefined) || []).map((t) => ({
                value: t.name,
                label: t.label,
                description: t.name,
                data: t,
            })),
        [search.data]
    );

    const commit = (name: string, label: string) => {
        setText(null);
        setOpen(false);
        if (name !== field.value) field.setValue(name, label);
    };

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            readOnlyValue={
                field.value ? (
                    <span>
                        {current} <span className="font-mono text-xs text-muted-foreground">{field.value}</span>
                    </span>
                ) : undefined
            }
        >
            <Combobox
                id={field.ids.input}
                name={field.name}
                aria-labelledby={field.ids.label}
                aria-describedby={field.describedBy}
                invalid={field.invalid}
                required={field.state.mandatory}
                disabled={field.state.disabled}
                autoFocus={field.autoFocus}
                size={props.size}
                placeholder={field.placeholder || (baseTable ? `Search ${baseTable} tables` : 'Search tables')}
                inputValue={text !== null ? text : current}
                onInputChange={(t) => setText(t)}
                items={items}
                open={open}
                onOpenChange={(o) => {
                    setOpen(o);
                    if (o && text === null) setText('');
                }}
                loading={search.isFetching}
                emptyText={
                    search.isFetching ? 'Searching tables…' : text ? 'No matching tables' : 'Type to search tables'
                }
                activeValue={field.value || undefined}
                selectedValues={field.value ? [field.value] : undefined}
                onSelect={(item) => commit(item.value, item.label)}
                renderItem={(item) => (
                    <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                        <span className="truncate">{item.label}</span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.value}</span>
                    </span>
                )}
                endAdornment={
                    field.value && !field.state.disabled ? (
                        <button
                            type="button"
                            className={adornmentButtonClass}
                            aria-label={`Clear ${field.label}`}
                            onPointerDown={(e: any) => e.preventDefault()}
                            onClick={() => commit('', '')}
                        >
                            <IconX size={14} />
                        </button>
                    ) : null
                }
                onBlur={() => {
                    // An exact name typed (or an exact single match) commits; anything else reverts.
                    const t = (text || '').trim();
                    const exact = t
                        ? items.find((i) => i.value === t.toLowerCase() || i.label.toLowerCase() === t.toLowerCase())
                        : undefined;
                    if (exact) commit(exact.value, exact.label);
                    else setText(null);
                    field.blur();
                }}
            />
        </FieldShell>
    );
}

export default function TableNameFieldPreview() {
    return (
        <div className="flex max-w-sm flex-col gap-4 p-4">
            <TableNameField name="table" label="Table" defaultValue="incident" />
            <TableNameField name="task_table" label="Task table" baseTable="task" />
        </div>
    );
}
