/**
 * components:app/view-rules-editor: Studio's editor for portal view rules (x_312987_portal_view_rule).
 *
 *   <ViewRulesEditor portal="<portal sys_id or slug>" />
 *
 * - Settings: whose rules apply (this portal, or another portal's: settings.viewRulesFrom), the
 *   Workspace view-rule configuration fallback (settings.viewRuleConfigId) and the default views.
 * - Rules: page rules (evaluated first) and portal rules, by order; reorder, activate, edit, delete.
 *   A rule whose view was renamed shows "Repair" (the name follows the view reference).
 * - Editor: name, table, forms / lists, page, view (the table's views), condition (the condition
 *   builder, "new records only" = sys_id=-1), roles, Available for / Not available for (user
 *   criteria), advanced script.
 * - Test: a record (or a new one with a preset query), a page, a URL / option view and a View-as user
 *   → x312987Portal.viewRules.explain: the winning rule and every rule's verdict.
 *
 * Reusable exports: ViewRulesEditor, RuleTestPanel, useViewRuleData (rules + portal + pages).
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'utilities:react-query';
import { Button } from 'components:button';
import { Badge } from 'components:badge';
import { Card, CardHeader, CardContent } from 'components:card';
import { Icon } from 'components:icon';
import { Select, Combobox } from 'components:app/combobox';
import type { ComboItem } from 'components:app/combobox';
import { ConditionBuilder } from 'components:app/condition-builder';
import { DialogOutlet, confirmDialog } from 'components:app/confirm-dialog';
import { useDebouncedValue, useViewRuleExplain } from 'utilities:app/graphql';
import type { ViewExplanation } from 'utilities:app/graphql';
import {
    RULE_TABLE,
    UC_TABLE,
    UC_NO_TABLE,
    fetchRules,
    fetchPortals,
    fetchPages,
    fetchTableViews,
    searchTable,
    savePortalSettings,
    ruleBody,
    saveAudience,
    tableInsert,
    tableUpdate,
    tableDelete,
} from './api';
import type { ViewRule, Ref, PortalRow, PageRow } from './api';

export type { ViewRule } from './api';

const SYS_ID = /^[0-9a-f]{32}$/i;
// Width is separate: per-widget utilities share one layer, so `w-full` would beat a later `w-40`.
const inputBase =
    'h-8 min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
const input =
    'h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
const label = 'text-xs font-medium text-muted-foreground';

/** Portal row, rule portal, pages and rules for one portal. */
export function useViewRuleData(portalKey: string) {
    const portals = useQuery({
        queryKey: ['rp-vre', 'portals'],
        queryFn: ({ signal }) => fetchPortals(signal),
        staleTime: 60_000,
    });
    const list = portals.data || [];
    const portal = list.find((p) => p.id === portalKey || p.slug === portalKey) || null;
    const fromKey =
        portal && typeof portal.settings.viewRulesFrom === 'string' ? String(portal.settings.viewRulesFrom) : '';
    const rulePortal = (fromKey && list.find((p) => p.id === fromKey || p.slug === fromKey)) || portal;
    const pages = useQuery({
        queryKey: ['rp-vre', 'pages', portal ? portal.id : ''],
        queryFn: ({ signal }) => fetchPages(portal!.id, signal),
        enabled: !!portal,
    });
    const rules = useQuery({
        queryKey: ['rp-vre', 'rules', portal ? portal.id : '', rulePortal ? rulePortal.id : ''],
        queryFn: ({ signal }) => fetchRules(portal!.id, rulePortal!.id, signal),
        enabled: !!portal && !!rulePortal,
    });
    return {
        portals,
        list,
        portal,
        rulePortal,
        shared: !!portal && !!rulePortal && portal.id !== rulePortal.id,
        pages,
        rules,
    };
}

export default function ViewRulesEditorWidget({
    options = {},
}: {
    options?: { portal?: string; rule?: string; onSelectRule?: (id: string) => void };
}) {
    return <ViewRulesEditor portal={options.portal || 'sp'} rule={options.rule} onSelectRule={options.onSelectRule} />;
}

/** rule / onSelectRule: the selected rule from outside (Studio's URL) and back out. */
export function ViewRulesEditor({
    portal: portalKey,
    rule,
    onSelectRule,
}: {
    portal: string;
    rule?: string;
    onSelectRule?: (id: string) => void;
}) {
    const data = useViewRuleData(portalKey);
    const qc = useQueryClient();
    const [selected, setSelectedState] = useState<string>(rule || '');
    useEffect(() => {
        if (rule !== undefined) setSelectedState(rule || '');
    }, [rule]);
    const setSelected = (id: string) => {
        setSelectedState(id);
        if (onSelectRule) onSelectRule(id);
    };
    const [creating, setCreating] = useState<null | 'page' | 'portal'>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const refresh = () => qc.invalidateQueries({ queryKey: ['rp-vre'] });
    const rules = data.rules.data || [];
    const pageRules = rules.filter((r) => !!r.page.value);
    const portalRules = rules.filter((r) => !r.page.value);
    const current = rules.find((r) => r.id === selected) || null;

    if (data.portals.isLoading) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
    if (!data.portal) return <p className="p-4 text-sm text-destructive">Portal "{portalKey}" not found.</p>;

    const run = async (fn: () => Promise<unknown>) => {
        setBusy(true);
        setError('');
        try {
            await fn();
            await refresh();
        } catch (e: any) {
            setError(String((e && e.message) || e));
        } finally {
            setBusy(false);
        }
    };

    // Reorder within a group: sequential orders (10, 20, …), then swap two neighbours.
    const move = (group: ViewRule[], index: number, delta: number) =>
        run(async () => {
            const next = group.slice();
            const j = index + delta;
            if (j < 0 || j >= next.length) return;
            [next[index], next[j]] = [next[j], next[index]];
            await Promise.all(
                next.map((r, i) =>
                    (i + 1) * 10 !== r.order ? tableUpdate(RULE_TABLE, r.id, { order: (i + 1) * 10 }) : null
                )
            );
        });

    return (
        <div className="flex min-w-0 flex-col gap-4 p-3 sm:p-4" data-rp-view-rules-editor={data.portal.id}>
            <DialogOutlet />
            <RuleSettings portal={data.portal} portals={data.list} rulePortal={data.rulePortal} onSaved={refresh} />
            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            ) : null}
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)]">
                <div className="flex min-w-0 flex-col gap-4">
                    <RuleGroup
                        title="Page rules"
                        hint="Evaluated first, for their page only."
                        rules={pageRules}
                        pages={data.pages.data || []}
                        selected={selected}
                        busy={busy}
                        onSelect={(id) => (setCreating(null), setSelected(id))}
                        onMove={(i, d) => move(pageRules, i, d)}
                        onToggle={(r) => run(() => tableUpdate(RULE_TABLE, r.id, { active: !r.active }))}
                        onRepair={(r) => run(() => tableUpdate(RULE_TABLE, r.id, { view_name: r.viewRefName }))}
                        onNew={() => (setSelected(''), setCreating('page'))}
                    />
                    <RuleGroup
                        title={data.shared ? `Portal rules (from ${data.rulePortal!.name})` : 'Portal rules'}
                        hint={
                            data.shared
                                ? `This portal uses ${data.rulePortal!.name}'s portal rules; editing them changes that portal too.`
                                : 'Evaluated after the page rules, for every page.'
                        }
                        rules={portalRules}
                        pages={data.pages.data || []}
                        selected={selected}
                        busy={busy}
                        onSelect={(id) => (setCreating(null), setSelected(id))}
                        onMove={(i, d) => move(portalRules, i, d)}
                        onToggle={(r) => run(() => tableUpdate(RULE_TABLE, r.id, { active: !r.active }))}
                        onRepair={(r) => run(() => tableUpdate(RULE_TABLE, r.id, { view_name: r.viewRefName }))}
                        onNew={() => (setSelected(''), setCreating('portal'))}
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                    {current || creating ? (
                        <RuleEditor
                            key={current ? current.id : `new-${creating}`}
                            rule={current}
                            scope={current ? (current.page.value ? 'page' : 'portal') : (creating as 'page' | 'portal')}
                            portal={data.portal}
                            rulePortal={data.rulePortal!}
                            pages={data.pages.data || []}
                            nextOrder={
                                ((current
                                    ? 0
                                    : (creating === 'page' ? pageRules : portalRules).reduce(
                                          (m, r) => Math.max(m, r.order),
                                          0
                                      )) || 0) + 10
                            }
                            busy={busy}
                            onCancel={() => (setSelected(''), setCreating(null))}
                            onSaved={(id) => run(async () => (setCreating(null), setSelected(id)))}
                            onDelete={(r) =>
                                confirmDialog({
                                    title: `Delete the rule "${r.name}"?`,
                                    description: 'Its audience rows are deleted with it.',
                                    confirmLabel: 'Delete',
                                    destructive: true,
                                }).then(
                                    (ok) =>
                                        ok && run(async () => (await tableDelete(RULE_TABLE, r.id), setSelected('')))
                                )
                            }
                        />
                    ) : (
                        <Card>
                            <CardContent className="text-sm text-muted-foreground">
                                Pick a rule to edit it, or add one. The first matching rule forces the view: the URL
                                view, the widget option and the user's remembered view can't override it.
                            </CardContent>
                        </Card>
                    )}
                    <RuleTestPanel
                        portal={data.portal}
                        pages={data.pages.data || []}
                        defaultTable={current ? current.table : rules[0] ? rules[0].table : 'incident'}
                    />
                </div>
            </div>
        </div>
    );
}

/* ---------------- Settings ---------------- */

function RuleSettings({
    portal,
    portals,
    rulePortal,
    onSaved,
}: {
    portal: PortalRow;
    portals: PortalRow[];
    rulePortal: PortalRow | null;
    onSaved: () => void;
}) {
    const configs = useQuery({
        queryKey: ['rp-vre', 'ws-configs'],
        queryFn: ({ signal }) =>
            searchTable('sys_ux_view_rules_configuration', 'active=true^ORDERBYname', 'sys_id,name', 200, signal),
        staleTime: 5 * 60_000,
    });
    const [views, setViews] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const save = async (patch: Record<string, unknown>) => {
        setSaving(true);
        setMsg('');
        try {
            await savePortalSettings(portal, patch);
            setMsg('Saved');
            onSaved();
        } catch (e: any) {
            setMsg(String((e && e.message) || e));
        } finally {
            setSaving(false);
        }
    };
    const fromValue = rulePortal && rulePortal.id !== portal.id ? rulePortal.id : '';
    const fromItems: ComboItem[] = [
        { value: '', label: 'This portal' },
        ...portals
            .filter((p) => p.id !== portal.id)
            .map((p) => ({ value: p.id, label: `Use ${p.name}'s rules`, description: `/${p.slug}` })),
    ];
    const cfg = typeof portal.settings.viewRuleConfigId === 'string' ? String(portal.settings.viewRuleConfigId) : '';
    const cfgItems: ComboItem[] = [
        { value: '', label: 'None' },
        ...(configs.data || []).map((c: any) => ({ value: String(c.sys_id), label: String(c.name) })),
    ];
    const viewsValue =
        views === null
            ? typeof portal.settings.formViews === 'string'
                ? String(portal.settings.formViews)
                : ''
            : views;
    return (
        <Card data-rp-vre-settings="">
            <CardHeader className="pb-0">
                <h2 className="m-0 text-base font-semibold">View rules for {portal.name}</h2>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="flex min-w-0 flex-col gap-1">
                    <span className={label}>View rules</span>
                    <Select
                        aria-label="Whose view rules apply"
                        value={fromValue}
                        items={fromItems}
                        onChange={(i) => save({ viewRulesFrom: i.value })}
                        disabled={saving}
                    />
                    <span className="text-xs text-muted-foreground">Page rules are always this portal's own.</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <span className={label}>Workspace rules fallback</span>
                    <Select
                        aria-label="Workspace view rule configuration"
                        value={cfg}
                        items={cfgItems}
                        onChange={(i) => save({ viewRuleConfigId: i.value })}
                        disabled={saving || configs.isLoading}
                        fallbackLabel={cfg ? `Unknown (${cfg.slice(0, 8)}…)` : undefined}
                    />
                    <span className="text-xs text-muted-foreground">
                        Only when no portal rule, URL, option or remembered view applies.
                    </span>
                </div>
                <label className="flex min-w-0 flex-col gap-1">
                    <span className={label}>Default views</span>
                    <input
                        className={input}
                        value={viewsValue}
                        placeholder="e.g. sp,ess"
                        onChange={(e) => setViews(e.target.value)}
                        onBlur={() => {
                            const clean = viewsValue
                                .split(',')
                                .map((v) => v.trim())
                                .filter(Boolean)
                                .join(',');
                            if (clean !== (portal.settings.formViews || '')) save({ formViews: clean });
                            setViews(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        disabled={saving}
                        data-rp-vre-default-views=""
                    />
                    <span className="text-xs text-muted-foreground">
                        After the Workspace rules: the first that exists, else Default.{msg ? ` · ${msg}` : ''}
                    </span>
                </label>
            </CardContent>
        </Card>
    );
}

/* ---------------- Rule list ---------------- */

function RuleGroup(props: {
    title: string;
    hint: string;
    rules: ViewRule[];
    pages: PageRow[];
    selected: string;
    busy: boolean;
    onSelect: (id: string) => void;
    onMove: (index: number, delta: number) => void;
    onToggle: (r: ViewRule) => void;
    onRepair: (r: ViewRule) => void;
    onNew: () => void;
}) {
    return (
        <Card data-rp-vre-group={props.title}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
                <div className="min-w-0">
                    <h3 className="m-0 text-sm font-semibold">{props.title}</h3>
                    <p className="m-0 text-xs text-muted-foreground">{props.hint}</p>
                </div>
                <Button size="sm" variant="outline" onClick={props.onNew} disabled={props.busy} data-rp-vre-new="">
                    <Icon name="plus" aria-hidden="true" /> Add
                </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 pt-3">
                {!props.rules.length ? <p className="m-0 text-sm text-muted-foreground">No rules yet.</p> : null}
                {props.rules.map((r, i) => {
                    const renamed = !!r.view.value && !!r.viewRefName && r.viewRefName !== r.viewName;
                    const page = r.page.value ? props.pages.find((p) => p.id === r.page.value) : null;
                    return (
                        <div
                            key={r.id}
                            className={
                                'flex min-w-0 items-center gap-2 rounded-md border p-2 ' +
                                (props.selected === r.id ? 'border-primary bg-accent/50' : 'border-border')
                            }
                            data-rp-vre-rule={r.id}
                        >
                            <button
                                type="button"
                                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                                onClick={() => props.onSelect(r.id)}
                            >
                                <span
                                    className={
                                        'max-w-full truncate text-sm font-medium ' +
                                        (r.active ? '' : 'text-muted-foreground line-through')
                                    }
                                >
                                    {r.name || '(unnamed)'}
                                </span>
                                <span className="flex max-w-full min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                    <span>{r.table}</span>·
                                    <span>
                                        {r.appliesTo === 'both'
                                            ? 'forms + lists'
                                            : r.appliesTo === 'list'
                                              ? 'lists'
                                              : 'forms'}
                                    </span>
                                    ·<span>view {r.viewName}</span>
                                    {page ? (
                                        <>
                                            · <span>{page.title}</span>
                                        </>
                                    ) : null}
                                    {r.can.length || r.cannot.length || r.roles ? (
                                        <Badge variant="secondary">audience</Badge>
                                    ) : null}
                                    {r.condition ? <Badge variant="secondary">condition</Badge> : null}
                                    {r.advanced ? <Badge variant="secondary">script</Badge> : null}
                                </span>
                            </button>
                            {renamed ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    title={`The view was renamed to "${r.viewRefName}"`}
                                    onClick={() => props.onRepair(r)}
                                    disabled={props.busy}
                                    data-rp-vre-repair=""
                                >
                                    Repair
                                </Button>
                            ) : null}
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={r.active ? 'Deactivate' : 'Activate'}
                                title={r.active ? 'Active: click to deactivate' : 'Inactive: click to activate'}
                                onClick={() => props.onToggle(r)}
                                disabled={props.busy}
                            >
                                <Icon name={r.active ? 'toggle-right' : 'toggle-left'} aria-hidden="true" />
                            </Button>
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Move up"
                                onClick={() => props.onMove(i, -1)}
                                disabled={props.busy || i === 0}
                            >
                                <Icon name="arrow-up" aria-hidden="true" />
                            </Button>
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Move down"
                                onClick={() => props.onMove(i, 1)}
                                disabled={props.busy || i === props.rules.length - 1}
                            >
                                <Icon name="arrow-down" aria-hidden="true" />
                            </Button>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

/* ---------------- Rule editor ---------------- */

const NEW_TERM = /(^|\^)sys_id=-1(?=\^|$)/;

function SearchPicker(props: {
    table: string;
    query: (term: string) => string;
    fields: string;
    toItem: (row: any) => ComboItem;
    onPick: (item: ComboItem) => void;
    placeholder: string;
    label: string;
}) {
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const term = useDebouncedValue(text.trim(), 250).replace(/\^/g, '');
    const q = useQuery({
        queryKey: ['rp-vre', 'search', props.table, props.query(term)],
        queryFn: ({ signal }) => searchTable(props.table, props.query(term), props.fields, 15, signal),
        enabled: open,
        staleTime: 30_000,
    });
    return (
        <Combobox
            aria-label={props.label}
            placeholder={props.placeholder}
            inputValue={text}
            onInputChange={setText}
            open={open}
            onOpenChange={setOpen}
            items={(q.data || []).map(props.toItem)}
            loading={q.isFetching}
            size="sm"
            onSelect={(item) => {
                setText('');
                setOpen(false);
                props.onPick(item);
            }}
        />
    );
}

function Chips({ items, onRemove }: { items: Ref[]; onRemove: (r: Ref) => void }) {
    if (!items.length) return <span className="text-xs text-muted-foreground">Nobody listed</span>;
    return (
        <span className="flex flex-wrap gap-1">
            {items.map((r) => (
                <Badge key={r.value} variant="secondary" className="gap-1">
                    {r.label || r.value}
                    <button
                        type="button"
                        aria-label={`Remove ${r.label}`}
                        onClick={() => onRemove(r)}
                        className="inline-flex"
                    >
                        <Icon name="x" size={12} aria-hidden="true" />
                    </button>
                </Badge>
            ))}
        </span>
    );
}

function RuleEditor(props: {
    rule: ViewRule | null;
    scope: 'page' | 'portal';
    portal: PortalRow;
    rulePortal: PortalRow;
    pages: PageRow[];
    nextOrder: number;
    busy: boolean;
    onCancel: () => void;
    onSaved: (id: string) => void;
    onDelete: (r: ViewRule) => void;
}) {
    const base: ViewRule = props.rule || {
        id: '',
        name: '',
        portal: { value: props.scope === 'page' ? props.portal.id : props.rulePortal.id, label: '' },
        page: { value: props.scope === 'page' && props.pages[0] ? props.pages[0].id : '', label: '' },
        table: 'incident',
        appliesTo: 'form',
        active: true,
        order: props.nextOrder,
        condition: '',
        conditionLabel: '',
        view: { value: '', label: '' },
        viewRefName: '',
        viewName: 'default',
        roles: '',
        advanced: false,
        script: '',
        description: '',
        can: [],
        cannot: [],
    };
    const [r, setR] = useState<ViewRule>(base);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (patch: Partial<ViewRule>) => setR((prev) => ({ ...prev, ...patch }));
    const views = useQuery({
        queryKey: ['rp-vre', 'views', r.table, r.appliesTo],
        queryFn: ({ signal }) => fetchTableViews(r.table, r.appliesTo, signal),
        enabled: /^[a-z0-9_]+$/i.test(r.table),
        staleTime: 60_000,
    });
    const viewItems: ComboItem[] = (views.data || []).map((v) => ({
        value: v.name,
        label: v.title,
        description: v.name === 'default' ? undefined : v.name,
    }));
    const viewKnown = !views.data || viewItems.some((i) => i.value === r.viewName);
    const isNewOnly = NEW_TERM.test(r.condition);
    const toggleNewOnly = (on: boolean) => {
        const rest = r.condition.replace(NEW_TERM, '').replace(/^\^/, '');
        set({ condition: on ? (rest ? `sys_id=-1^${rest}` : 'sys_id=-1') : rest });
    };
    const pageItems: ComboItem[] = props.pages.map((p) => ({
        value: p.id,
        label: p.title,
        description: p.route ? `/${p.route}` : '/',
    }));
    const listOnly = r.appliesTo === 'list';

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            if (!r.name.trim()) throw new Error('Name the rule.');
            if (!/^[a-z0-9_]+$/i.test(r.table)) throw new Error('Pick a table.');
            if (props.scope === 'page' && !r.page.value) throw new Error('Pick a page.');
            if (views.data && !viewKnown) throw new Error(`The view "${r.viewName}" doesn't exist for ${r.table}.`);
            const picked = (views.data || []).find((v) => v.name === r.viewName);
            const body = ruleBody({
                ...r,
                view: { value: picked ? picked.id : '', label: '' },
                condition: listOnly ? '' : r.condition,
            });
            let id = r.id;
            if (id) await tableUpdate(RULE_TABLE, id, body);
            else {
                const created = await tableInsert(RULE_TABLE, body);
                id = String(created && created.sys_id);
            }
            const orig = props.rule;
            await saveAudience(id, UC_TABLE, orig ? orig.can : [], r.can);
            await saveAudience(id, UC_NO_TABLE, orig ? orig.cannot : [], r.cannot);
            props.onSaved(id);
        } catch (e: any) {
            setError(String((e && e.message) || e));
        } finally {
            setSaving(false);
        }
    };

    const disabled = saving || props.busy;
    return (
        <Card data-rp-vre-editor={r.id || 'new'}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
                <h3 className="m-0 min-w-0 truncate text-sm font-semibold">
                    {r.id ? `Edit "${base.name}"` : props.scope === 'page' ? 'New page rule' : 'New portal rule'}
                </h3>
                <div className="flex shrink-0 items-center gap-1.5">
                    {r.id ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => props.onDelete(r)}
                            disabled={disabled}
                            data-rp-vre-delete=""
                        >
                            <Icon name="trash-2" aria-hidden="true" /> Delete
                        </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={props.onCancel} disabled={disabled}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={save} disabled={disabled} data-rp-vre-save="">
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-3 sm:grid-cols-2">
                {error ? (
                    <p role="alert" className="m-0 text-sm text-destructive sm:col-span-2">
                        {error}
                    </p>
                ) : null}
                <label className="flex min-w-0 flex-col gap-1">
                    <span className={label}>Name</span>
                    <input
                        className={input}
                        value={r.name}
                        onChange={(e) => set({ name: e.target.value })}
                        data-rp-vre-name=""
                    />
                </label>
                <div className="flex min-w-0 flex-col gap-1">
                    <span className={label}>Table</span>
                    <div className="flex min-w-0 items-center gap-2">
                        <input
                            className={inputBase + ' w-40 shrink-0'}
                            value={r.table}
                            onChange={(e) => set({ table: e.target.value.trim(), viewName: 'default' })}
                            aria-label="Table name"
                            data-rp-vre-table=""
                        />
                        <div className="min-w-0 flex-1">
                            <SearchPicker
                                table="sys_db_object"
                                label="Find a table"
                                placeholder="Find a table…"
                                fields="name,label"
                                query={(t) => (t ? `nameLIKE${t}^ORlabelLIKE${t}^ORDERBYlabel` : 'ORDERBYlabel')}
                                toItem={(row) => ({
                                    value: String(row.name),
                                    label: String(row.label || row.name),
                                    description: String(row.name),
                                })}
                                onPick={(i) => set({ table: i.value, viewName: 'default' })}
                            />
                        </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        The exact table (child tables have their own rules, as in Workspace).
                    </span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <span className={label}>Applies to</span>
                    <Select
                        aria-label="Applies to"
                        value={r.appliesTo}
                        items={[
                            { value: 'form', label: 'Forms' },
                            { value: 'list', label: 'Lists' },
                            { value: 'both', label: 'Forms and lists' },
                        ]}
                        onChange={(i) => set({ appliesTo: i.value as ViewRule['appliesTo'] })}
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <span className={label}>View</span>
                    <Select
                        aria-label="View"
                        value={r.viewName}
                        items={viewItems}
                        loading={views.isLoading}
                        onChange={(i) => set({ viewName: i.value })}
                        invalid={!viewKnown}
                        fallbackLabel={r.viewName}
                    />
                    {!viewKnown ? (
                        <span className="text-xs text-destructive">
                            Not a {r.appliesTo === 'list' ? 'list' : 'form'} view of {r.table}.
                        </span>
                    ) : null}
                </div>
                {props.scope === 'page' ? (
                    <div className="flex min-w-0 flex-col gap-1">
                        <span className={label}>Page</span>
                        <Select
                            aria-label="Page"
                            value={r.page.value}
                            items={pageItems}
                            onChange={(i) => set({ page: { value: i.value, label: i.label } })}
                        />
                    </div>
                ) : null}
                <label className="flex min-w-0 flex-col gap-1">
                    <span className={label}>Order</span>
                    <input
                        className={input}
                        type="number"
                        value={r.order}
                        onChange={(e) => set({ order: parseInt(e.target.value, 10) || 0 })}
                    />
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={r.active} onChange={(e) => set({ active: e.target.checked })} />{' '}
                    Active
                </label>
                <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                    <span className={label}>Condition</span>
                    {listOnly ? (
                        <span className="text-xs text-muted-foreground">
                            List rules have no condition (a list has no record).
                        </span>
                    ) : (
                        <>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={isNewOnly}
                                    onChange={(e) => toggleNewOnly(e.target.checked)}
                                    data-rp-vre-new-only=""
                                />{' '}
                                New records only (Sys ID is -1)
                            </label>
                            <div className="min-w-0 rounded-md border border-border p-2">
                                <ConditionBuilder
                                    key={r.table}
                                    table={r.table}
                                    value={r.condition}
                                    onChange={(q) => set({ condition: q })}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground">
                                Empty = always. Evaluated against the record (a new record: its defaults plus the preset
                                query).
                            </span>
                        </>
                    )}
                </div>
                <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                    <span className={label}>Audience</span>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-xs">Roles (any of)</span>
                            <Chips
                                items={
                                    r.roles
                                        ? r.roles
                                              .split(',')
                                              .filter(Boolean)
                                              .map((x) => ({ value: x, label: x }))
                                        : []
                                }
                                onRemove={(x) =>
                                    set({
                                        roles: r.roles
                                            .split(',')
                                            .filter((y) => y && y !== x.value)
                                            .join(','),
                                    })
                                }
                            />
                            <SearchPicker
                                table="sys_user_role"
                                label="Add a role"
                                placeholder="Add a role…"
                                fields="name"
                                query={(t) => (t ? `nameLIKE${t}^ORDERBYname` : 'ORDERBYname')}
                                toItem={(row) => ({ value: String(row.name), label: String(row.name) })}
                                onPick={(i) =>
                                    set({
                                        roles: Array.from(
                                            new Set(r.roles.split(',').filter(Boolean).concat(i.value))
                                        ).join(','),
                                    })
                                }
                            />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-xs">Available for</span>
                            <Chips
                                items={r.can}
                                onRemove={(x) => set({ can: r.can.filter((y) => y.value !== x.value) })}
                            />
                            <SearchPicker
                                table="user_criteria"
                                label="Add user criteria (available for)"
                                placeholder="Add user criteria…"
                                fields="sys_id,name"
                                query={(t) => (t ? `active=true^nameLIKE${t}^ORDERBYname` : 'active=true^ORDERBYname')}
                                toItem={(row) => ({ value: String(row.sys_id), label: String(row.name) })}
                                onPick={(i) =>
                                    !r.can.some((y) => y.value === i.value) &&
                                    set({ can: r.can.concat({ value: i.value, label: i.label }) })
                                }
                            />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-xs">Not available for</span>
                            <Chips
                                items={r.cannot}
                                onRemove={(x) => set({ cannot: r.cannot.filter((y) => y.value !== x.value) })}
                            />
                            <SearchPicker
                                table="user_criteria"
                                label="Add user criteria (not available for)"
                                placeholder="Add user criteria…"
                                fields="sys_id,name"
                                query={(t) => (t ? `active=true^nameLIKE${t}^ORDERBYname` : 'active=true^ORDERBYname')}
                                toItem={(row) => ({ value: String(row.sys_id), label: String(row.name) })}
                                onPick={(i) =>
                                    !r.cannot.some((y) => y.value === i.value) &&
                                    set({ cannot: r.cannot.concat({ value: i.value, label: i.label }) })
                                }
                            />
                        </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        Everyone when all three are empty. Available for: any match; Not available for: no match.
                    </span>
                </div>
                <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={r.advanced}
                            onChange={(e) => set({ advanced: e.target.checked })}
                        />{' '}
                        Advanced script
                    </label>
                    {r.advanced ? (
                        <>
                            <textarea
                                className={input + ' h-28 py-1 font-mono text-xs'}
                                value={r.script}
                                onChange={(e) => set({ script: e.target.value })}
                                spellCheck={false}
                                aria-label="Script"
                            />
                            <span className="text-xs text-muted-foreground">
                                Return true to apply. Variables: record (GlideRecord or null), table, kind, isNew,
                                portal, page, user.
                            </span>
                        </>
                    ) : null}
                </div>
                <label className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                    <span className={label}>Description</span>
                    <input
                        className={input}
                        value={r.description}
                        onChange={(e) => set({ description: e.target.value })}
                    />
                </label>
            </CardContent>
        </Card>
    );
}

/* ---------------- Test panel ---------------- */

export function RuleTestPanel({
    portal,
    pages,
    defaultTable,
}: {
    portal: PortalRow;
    pages: PageRow[];
    defaultTable: string;
}) {
    const [table, setTable] = useState(defaultTable);
    useEffect(() => setTable(defaultTable), [defaultTable]);
    const [record, setRecord] = useState<Ref>({ value: '', label: '' });
    const [isNew, setIsNew] = useState(false);
    const [preset, setPreset] = useState('');
    const [page, setPage] = useState('');
    const [kind, setKind] = useState<'form' | 'list'>('form');
    const [urlView, setUrlView] = useState('');
    const [user, setUser] = useState<Ref>({ value: '', label: '' });
    const [ran, setRan] = useState<null | Record<string, unknown>>(null);
    const args = ran as any;
    const explain = useViewRuleExplain(args);
    const ex = explain.data as ViewExplanation | null | undefined;
    const pageItems: ComboItem[] = [
        { value: '', label: 'No page (portal rules only)' },
        ...pages.map((p) => ({ value: p.id, label: p.title, description: p.route ? `/${p.route}` : '/' })),
    ];
    const run = () =>
        setRan({
            kind,
            table,
            sysId: kind === 'form' ? (isNew ? '-1' : record.value) : '',
            query: kind === 'form' && isNew ? preset : '',
            portal: portal.id,
            page,
            urlView,
            user: user.value,
            nonce: Date.now(),
        });
    return (
        <Card data-rp-vre-test="">
            <CardHeader className="pb-0">
                <h3 className="m-0 text-sm font-semibold">Test</h3>
                <p className="m-0 text-xs text-muted-foreground">Which view would this user get, and why?</p>
            </CardHeader>
            <CardContent className="grid gap-3 pt-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-1">
                    <span className={label}>Kind</span>
                    <Select
                        aria-label="Kind"
                        value={kind}
                        items={[
                            { value: 'form', label: 'Form' },
                            { value: 'list', label: 'List' },
                        ]}
                        onChange={(i) => setKind(i.value as 'form' | 'list')}
                    />
                </div>
                <label className="flex min-w-0 flex-col gap-1">
                    <span className={label}>Table</span>
                    <input
                        className={input}
                        value={table}
                        onChange={(e) => (setTable(e.target.value.trim()), setRecord({ value: '', label: '' }))}
                        data-rp-vre-test-table=""
                    />
                </label>
                {kind === 'form' ? (
                    <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                        <span className={label}>Record</span>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} /> A new
                            record
                        </label>
                        {isNew ? (
                            <input
                                className={input}
                                value={preset}
                                placeholder="Preset query, e.g. category=network"
                                onChange={(e) => setPreset(e.target.value)}
                                aria-label="Preset query"
                            />
                        ) : (
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="min-w-0 truncate text-sm">
                                    {record.value ? (
                                        record.label || record.value
                                    ) : (
                                        <span className="text-muted-foreground">None picked</span>
                                    )}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <SearchPicker
                                        table={/^[a-z0-9_]+$/i.test(table) ? table : 'incident'}
                                        label="Find a record"
                                        placeholder="Find a record by number…"
                                        fields="sys_id,number,short_description,name"
                                        query={(t) =>
                                            t
                                                ? `numberLIKE${t}^ORshort_descriptionLIKE${t}^ORDERBYDESCsys_updated_on`
                                                : 'ORDERBYDESCsys_updated_on'
                                        }
                                        toItem={(row) => ({
                                            value: String(row.sys_id),
                                            label: String(row.number || row.name || row.sys_id),
                                            description: row.short_description
                                                ? String(row.short_description)
                                                : undefined,
                                        })}
                                        onPick={(i) => setRecord({ value: i.value, label: i.label })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
                <div className="flex min-w-0 flex-col gap-1">
                    <span className={label}>Page</span>
                    <Select aria-label="Page" value={page} items={pageItems} onChange={(i) => setPage(i.value)} />
                </div>
                <label className="flex min-w-0 flex-col gap-1">
                    <span className={label}>URL view (optional)</span>
                    <input
                        className={input}
                        value={urlView}
                        onChange={(e) => setUrlView(e.target.value.trim())}
                        placeholder="e.g. ess"
                    />
                </label>
                <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
                    <span className={label}>View as user</span>
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate text-sm">
                            {user.value ? user.label : <span className="text-muted-foreground">You</span>}
                        </span>
                        {user.value ? (
                            <Button size="sm" variant="ghost" onClick={() => setUser({ value: '', label: '' })}>
                                Clear
                            </Button>
                        ) : null}
                        <div className="min-w-0 flex-1">
                            <SearchPicker
                                table="sys_user"
                                label="View as user"
                                placeholder="Find a user…"
                                fields="sys_id,name,user_name"
                                query={(t) =>
                                    t
                                        ? `active=true^nameLIKE${t}^ORuser_nameLIKE${t}^ORDERBYname`
                                        : 'active=true^ORDERBYname'
                                }
                                toItem={(row) => ({
                                    value: String(row.sys_id),
                                    label: String(row.name || row.user_name),
                                    description: String(row.user_name || ''),
                                })}
                                onPick={(i) => setUser({ value: i.value, label: i.label })}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                    <Button
                        size="sm"
                        onClick={run}
                        disabled={
                            !/^[a-z0-9_]+$/i.test(table) || (kind === 'form' && !isNew && !SYS_ID.test(record.value))
                        }
                        data-rp-vre-run=""
                    >
                        <Icon name="play" aria-hidden="true" /> Run
                    </Button>
                    {explain.isFetching ? <span className="text-xs text-muted-foreground">Evaluating…</span> : null}
                    {explain.error ? (
                        <span className="text-xs text-destructive">
                            {String((explain.error as any).message || explain.error)}
                        </span>
                    ) : null}
                </div>
                {ex ? (
                    <ExplainResult ex={ex} />
                ) : ran && !explain.isFetching && ex === null ? (
                    <p className="m-0 text-sm text-destructive sm:col-span-2">
                        Only studio users can explain view rules.
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

const STEP_LABEL: Record<string, string> = {
    kind: 'not for this kind',
    roles: 'roles',
    criteria: 'user criteria',
    condition: 'condition',
    script: 'script',
    view: 'view missing',
    record: 'record',
};

function ExplainResult({ ex }: { ex: ViewExplanation }) {
    const r = ex.resolution;
    const sourceLabel: Record<string, string> = {
        rule: 'a view rule',
        url: 'the URL view',
        option: 'the widget option',
        remembered: 'the remembered view',
        auto: 'the platform (Workspace rules, default views, Default)',
    };
    return (
        <div className="flex min-w-0 flex-col gap-2 sm:col-span-2" data-rp-vre-result={r.source}>
            <p className="m-0 text-sm" role="status">
                {r.view ? (
                    <>
                        View <strong>{r.view}</strong>, from {sourceLabel[r.source] || r.source}
                        {r.ruleName ? <> "{r.ruleName}"</> : null}.
                    </>
                ) : (
                    <>No rule matched: {sourceLabel.auto} decides.</>
                )}
                {r.missing ? (
                    <span className="text-muted-foreground"> The view "{r.missing}" doesn't exist for the table.</span>
                ) : null}
            </p>
            <p className="m-0 text-xs text-muted-foreground">
                Rules of {ex.rulePortal.name}
                {ex.rulePortal.shared ? ' (shared)' : ''}
                {ex.subject.viewAs ? ' · evaluated as the selected user' : ''}
                {ex.notes.length ? ` · ${ex.notes.join(' ')}` : ''}
            </p>
            {ex.rules.length ? (
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {ex.rules.map((v) => (
                        <li
                            key={v.ruleId}
                            className="flex min-w-0 flex-wrap items-center gap-2 text-sm"
                            data-rp-vre-verdict={v.matched ? 'match' : v.failedOn}
                        >
                            <Icon
                                name={v.matched ? 'circle-check' : 'circle-x'}
                                className={
                                    v.matched ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                                }
                                aria-hidden="true"
                            />
                            <span className="font-medium">{v.name}</span>
                            <Badge variant="secondary">{v.scope}</Badge>
                            <span className="text-xs text-muted-foreground">
                                order {v.order} · view {v.view}
                                {v.matched
                                    ? ' · matched'
                                    : ` · failed on ${STEP_LABEL[v.failedOn] || v.failedOn}${v.detail ? ` (${v.detail})` : ''}`}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="m-0 text-xs text-muted-foreground">No active rules for this table here.</p>
            )}
        </div>
    );
}
