import { useCallback, useMemo, useRef, useState } from 'react';
import { usePortal, useNavigate, toast } from '@portal/runtime';
import { RecordList } from 'components:app/data-table';
import type { ListAction, RecordListFeatures, ListState } from 'components:app/data-table';
import type { ListPage, ListRow } from 'utilities:app/list-data';
import { useTableMeta } from 'utilities:app/graphql';
import type { RelatedListInfo } from 'utilities:app/graphql';
import { cx, IconPlus, Spinner } from 'components:app/field';
import { confirmDialog } from 'components:app/confirm-dialog';
import { showFieldsDialog } from 'components:app/field-dialog';
import {
    useRelatedList,
    useRelatedListsRefresh,
    relatedListKind,
    newRecordQuery,
    addM2MLinks,
    removeM2MRows,
    fetchM2MLinks,
} from './data';
import type { M2M, RelatedListKind } from './data';

export type RelatedListActions = { new?: boolean; add?: boolean; edit?: boolean; remove?: boolean };

export type OpenRecord = (table: string, sysId: string, params?: Record<string, unknown>) => void;

export type RelatedListProps = {
    /** The list (from useRelatedLists / a form bootstrap); else parentTable + parentSysId + name look it up. */
    list?: RelatedListInfo;
    parentTable?: string;
    parentSysId?: string;
    /** Related list name: '<table>.<field>' or 'REL:<sys_relationship sys_id>'. */
    name?: string;
    /** The parent's form view (its related-list layouts); '' = default. */
    view?: string;
    /** Heading over the list (default: the list's label); false = none (tabs / sections show it). */
    title?: string | false;
    /** New / Add / Edit… / Remove where the platform allows them (default all on); false = read-only list. */
    actions?: boolean | RelatedListActions;
    /** The parent is read-only (no write access): actions off. */
    readOnly?: boolean;
    /** Portal page that opens records (rows, New) with table / sys-id / query params; default 'form' when the portal has it. */
    recordPage?: string;
    /** Open a record yourself (e.g. a form's own openRecord, which guards unsaved changes). */
    onOpenRecord?: OpenRecord;
    /** The related-record count, whenever the list shows its unfiltered first page. */
    onCount?: (count: number) => void;
    /** After New / Add / Edit / Remove changed the relationship. */
    onChanged?: () => void;
    live?: boolean;
    pageSize?: number;
    density?: 'compact' | 'normal' | 'comfortable';
    variant?: 'page' | 'card' | 'plain';
    height?: number | string;
    /** RecordList features to turn off ({ export: false, … }). */
    features?: Partial<RecordListFeatures>;
    emptyText?: string;
    className?: string;
};

/** How a widget opens records: the caller's onOpenRecord, else the portal's record page, else the classic form. */
export function useRecordOpener(recordPage?: string, onOpenRecord?: OpenRecord): OpenRecord {
    const portal = usePortal() as any;
    const navigate = useNavigate();
    const pages: any[] = (portal && portal.pages) || [];
    const target = recordPage === undefined ? 'form' : recordPage;
    const hasPage =
        !!target && pages.some((p) => [p.route, p.routePattern, p.route_pattern, p.path].indexOf(target) >= 0);
    return useCallback(
        (table: string, sysId: string, params?: Record<string, unknown>) => {
            if (onOpenRecord) return onOpenRecord(table, sysId, params);
            const query = params && params.query ? String(params.query) : '';
            if (hasPage) return navigate(target, { table, sysId, query: query || undefined });
            window.open(
                `/${encodeURIComponent(table)}.do?sys_id=${encodeURIComponent(sysId)}${query ? `&sysparm_query=${encodeURIComponent(query)}` : ''}`,
                '_blank',
                'noopener'
            );
        },
        [onOpenRecord, hasPage, target, navigate]
    );
}

/**
 * What the user may do on a related list, and the handlers:
 * - reference relationship + canCreate: New (a new child with the parent reference preset, through
 *   the record page's `query` param, as Workspace's openRecord(table, '-1', { query }) does);
 * - many-to-many (metadata.m2MData) + canCreate: Add (pick records → one m2m row each), Edit… (the
 *   linked records as a list: add and drop in one go); + canDelete: Remove (unlink selected rows);
 * - scripted relationships: none (the relationship's script decides the rows).
 */
export function useRelatedListActions(args: {
    list: RelatedListInfo | undefined;
    parentSysId: string;
    page: ListPage | null;
    open: OpenRecord;
    enabled?: RelatedListActions | boolean;
    readOnly?: boolean;
    onChanged?: () => void;
}) {
    const { list, parentSysId, page, open } = args;
    const allow = (k: keyof RelatedListActions) =>
        args.enabled !== false &&
        !args.readOnly &&
        (args.enabled === true || args.enabled === undefined || (args.enabled as RelatedListActions)[k] !== false);
    const kind: RelatedListKind | null = list ? relatedListKind(list, page) : null;
    const m2m: M2M | null = list && page && page.m2m ? { table: list.table, ...page.m2m } : null;
    const meta = useTableMeta(m2m ? m2m.table : undefined);
    const targetLabel =
        (m2m && meta.data && meta.data[m2m.targetField] && meta.data[m2m.targetField].label) ||
        (m2m ? m2m.targetField : '');
    const refresh = useRelatedListsRefresh();
    const [busy, setBusy] = useState('');
    const changed = () => {
        if (list) refresh(list.parentTable, parentSysId, list.table);
        if (args.onChanged) args.onChanged();
    };
    const query = list ? newRecordQuery(list, parentSysId) : '';
    const canNew = !!list && kind === 'reference' && !!query && !!page && page.canCreate !== false && allow('new');
    const canAdd = !!m2m && page!.canCreate !== false && allow('add');
    const canEdit = !!m2m && page!.canCreate !== false && page!.canDelete !== false && allow('edit');
    const canRemove = !!m2m && page!.canDelete !== false && allow('remove');

    const newRecord = () => list && open(list.table, '-1', { query });

    const pick = async (title: string, value = '', displayValue = '') => {
        const res = await showFieldsDialog({
            title,
            instruction: list ? `${list.label}: records linked to this one.` : undefined,
            confirmTitle: 'Save',
            fields: [
                {
                    type: 'glide_list',
                    name: m2m!.targetField,
                    label: targetLabel,
                    reference: m2m!.targetTable,
                    referringTable: m2m!.table,
                    value,
                    displayValue,
                },
            ],
        });
        const f = res.updatedFields[0];
        return String((f && f.value) || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    };

    const add = async () => {
        if (!m2m || !list) return;
        let ids: string[];
        try {
            ids = await pick(`Add to ${list.label}`);
        } catch (e) {
            return; // cancelled
        }
        if (!ids.length) return;
        setBusy('add');
        try {
            const r = await addM2MLinks(m2m, parentSysId, ids);
            if (r.added.length)
                toast.success(
                    `${r.added.length} added to ${list.label}${r.skipped.length ? ` · ${r.skipped.length} already there` : ''}`
                );
            else if (r.skipped.length) toast.info(`Already in ${list.label}`);
            for (const m of r.errors) toast.error(m);
            changed();
        } finally {
            setBusy('');
        }
    };

    const edit = async () => {
        if (!m2m || !list) return;
        setBusy('edit');
        let links: { rowSysId: string; value: string; displayValue: string }[];
        try {
            links = await fetchM2MLinks(m2m, parentSysId, 501);
        } catch (e) {
            setBusy('');
            toast.error((e as Error).message);
            return;
        }
        setBusy('');
        if (links.length > 500) {
            toast.info(`${list.label} has more than 500 records: use Add and Remove instead`);
            return;
        }
        let ids: string[];
        try {
            ids = await pick(
                `Edit ${list.label}`,
                links.map((l) => l.value).join(','),
                links.map((l) => l.displayValue.replace(/,/g, ' ')).join(',')
            );
        } catch (e) {
            return;
        }
        const keep = new Set(ids);
        const had = new Set(links.map((l) => l.value));
        const toAdd = ids.filter((id) => !had.has(id));
        const toRemove = links.filter((l) => !keep.has(l.value));
        if (!toAdd.length && !toRemove.length) return;
        if (toRemove.length) {
            const ok = await confirmDialog({
                title: `Remove ${toRemove.length} from ${list.label}?`,
                description: `${toRemove
                    .map((l) => l.displayValue)
                    .slice(0, 5)
                    .join(
                        ', '
                    )}${toRemove.length > 5 ? '…' : ''} will no longer be linked to this record. The records themselves stay.`,
                confirmLabel: 'Remove',
                destructive: true,
            });
            if (!ok) return;
        }
        setBusy('edit');
        try {
            const a = toAdd.length
                ? await addM2MLinks(m2m, parentSysId, toAdd)
                : { added: [], skipped: [], errors: [] };
            const r = toRemove.length
                ? await removeM2MRows(
                      m2m.table,
                      toRemove.map((l) => l.rowSysId)
                  )
                : { removed: [], errors: [] };
            const parts = [
                a.added.length ? `${a.added.length} added` : '',
                r.removed.length ? `${r.removed.length} removed` : '',
            ].filter(Boolean);
            if (parts.length) toast.success(`${list.label}: ${parts.join(', ')}`);
            for (const m of a.errors.concat(r.errors)) toast.error(m);
            changed();
        } finally {
            setBusy('');
        }
    };

    const remove = async (rows: ListRow[]) => {
        if (!m2m || !list || !rows.length) return false;
        const names = rows
            .map((r) => (r.cells[m2m.targetField] && r.cells[m2m.targetField].displayValue) || r.display)
            .filter(Boolean);
        const ok = await confirmDialog({
            title: `Remove ${rows.length} from ${list.label}?`,
            description: `${names.slice(0, 5).join(', ')}${names.length > 5 ? '…' : ''} will no longer be linked to this record. The records themselves stay.`,
            confirmLabel: 'Remove',
            destructive: true,
        });
        if (!ok) return false;
        setBusy('remove');
        try {
            const r = await removeM2MRows(
                m2m.table,
                rows.map((x) => x.sysId)
            );
            if (r.removed.length) toast.success(`${r.removed.length} removed from ${list.label}`);
            for (const m of r.errors) toast.error(m);
            changed();
            return true;
        } finally {
            setBusy('');
        }
    };

    return { kind, m2m, canNew, newRecord, canAdd, add, canEdit, edit, canRemove, remove, busy };
}

/**
 * RelatedList: one related list of any record, on app/data-table's RecordList in related mode
 * (the platform's getListLayout with relatedListName + parent + the relationship's fixed query):
 * the relationship's own columns, count, search, sort, paging, column personalisation (per list
 * name, x_312987_portal.list.related:<name>), live refresh (AMB on the relationship's query),
 * an empty state, and New / Add / Edit… / Remove where the platform allows them. Rows open the
 * record page (or onOpenRecord).
 */
export function RelatedList(props: RelatedListProps) {
    const lookup = useRelatedList(
        props.list ? undefined : props.parentTable,
        props.list ? undefined : props.parentSysId,
        props.list ? undefined : props.name,
        props.view || ''
    );
    const list = props.list || lookup.list;
    const parentSysId = props.parentSysId || '';
    const [page, setPage] = useState<ListPage | null>(null);
    const filtered = useRef(false);
    const open = useRecordOpener(props.recordPage, props.onOpenRecord);
    const acts = useRelatedListActions({
        list,
        parentSysId,
        page,
        open,
        enabled: props.actions,
        readOnly: props.readOnly,
        onChanged: props.onChanged,
    });
    const onCount = useRef(props.onCount);
    onCount.current = props.onCount;
    const onData = useCallback((p: ListPage) => {
        setPage((prev) =>
            prev &&
            prev.count === p.count &&
            prev.canCreate === p.canCreate &&
            prev.canDelete === p.canDelete &&
            JSON.stringify(prev.m2m) === JSON.stringify(p.m2m)
                ? prev
                : p
        );
        if (!filtered.current && onCount.current) onCount.current(p.count);
    }, []);
    const onStateChange = useCallback((s: ListState) => {
        filtered.current = !!(s.filter || s.keywords);
    }, []);
    const listActions: ListAction[] = useMemo(
        () =>
            acts.canRemove
                ? [
                      {
                          id: 'rl-remove',
                          label: 'Remove',
                          destructive: true,
                          run: async (ctx) => {
                              if (await acts.remove(ctx.rows)) ctx.clearSelection();
                          },
                      },
                  ]
                : [],
        [acts.canRemove, acts.remove]
    );

    if (!list) {
        if (lookup.error)
            return (
                <div role="alert" className="p-4 text-sm text-destructive">
                    {lookup.error.message}
                </div>
            );
        if (lookup.isLoading)
            return (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground" aria-busy="true">
                    <Spinner label="Loading" /> Loading…
                </div>
            );
        return <div className="p-4 text-sm text-muted-foreground">No related list “{props.name}” on this record.</div>;
    }

    const view = props.view && props.view !== 'Default view' ? props.view : '';
    const btn =
        'inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50';
    const toolbarActions =
        acts.canNew || acts.canAdd || acts.canEdit ? (
            <>
                {acts.canNew ? (
                    <button type="button" className={btn} onClick={acts.newRecord} data-rp-related-new={list.name}>
                        <IconPlus size={14} /> New
                    </button>
                ) : null}
                {acts.canAdd ? (
                    <button
                        type="button"
                        className={btn}
                        onClick={acts.add}
                        disabled={!!acts.busy}
                        data-rp-related-add={list.name}
                    >
                        {acts.busy === 'add' ? <Spinner label="Adding" /> : <IconPlus size={14} />} Add
                    </button>
                ) : null}
                {acts.canEdit ? (
                    <button
                        type="button"
                        className={btn}
                        onClick={acts.edit}
                        disabled={!!acts.busy}
                        data-rp-related-edit={list.name}
                    >
                        {acts.busy === 'edit' ? <Spinner label="Saving" /> : null} Edit…
                    </button>
                ) : null}
            </>
        ) : null;
    const features: Partial<RecordListFeatures> = {
        title: props.title !== false,
        // Selection is for Remove (m2m) and the bulk "Edit field…"; actions follow the props.
        ...(props.actions === false || props.readOnly ? { actions: false, inlineEdit: false } : {}),
        ...(props.features || {}),
    };
    return (
        <div
            className={cx('min-w-0', props.className)}
            data-rp-related-list={list.name}
            data-rp-related-kind={acts.kind || undefined}
            // Inside a record form: Enter in the list's inputs (search, filter values) must not submit the form.
            onKeyDown={(e: any) => {
                const t = e.target as HTMLElement;
                if (e.key === 'Enter' && t && t.tagName === 'INPUT' && (t as HTMLInputElement).form) e.preventDefault();
            }}
        >
            <RecordList
                table={list.table}
                title={typeof props.title === 'string' ? props.title : list.label}
                relatedListName={list.name}
                parentTable={list.parentTable || props.parentTable}
                parentRecordSysId={parentSysId}
                fixedQuery={list.filter || undefined}
                view={view}
                pageSize={props.pageSize || 10}
                pageSizes={[5, 10, 20, 50, 100]}
                density={props.density || 'compact'}
                variant={props.variant || 'plain'}
                height={props.height}
                features={features}
                actions={listActions}
                toolbarActions={toolbarActions}
                prefKey={`related:${list.name}`}
                live={!!props.live}
                emptyText={props.emptyText || `No ${list.label}`}
                onRowOpen={(row: ListRow, t: string) => open(row.className || t, row.sysId)}
                onData={onData}
                onStateChange={onStateChange}
            />
        </div>
    );
}
