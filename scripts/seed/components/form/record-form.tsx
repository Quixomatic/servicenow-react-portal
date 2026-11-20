import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLayout } from '@portal/runtime';
import { DialogOutlet } from 'components:app/confirm-dialog';
import { Card, CardHeader, CardContent } from 'components:card';
import { Button } from 'components:button';
import { Badge } from 'components:badge';
import { useFormViews, useGraphQL, isDefaultViewName } from 'utilities:app/graphql';
import { FormProvider, useFormMeta, cx, Spinner, IconAlert, IconChevronDown } from 'components:app/field';
import type { FieldLayout, ValidationResult } from 'components:app/field';
import { sanitizeHtml } from 'components:app/variable';
import { useRecordForm, SAVE_ACTIONS } from './use-record-form';
import type { RecordForm as RecordFormModel, UseRecordFormOptions, SaveOutcome } from './use-record-form';
import type { UiAction } from 'utilities:app/graphql';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from 'components:dropdown-menu';
import { FormLayout, SectionRows, sectionOfField, sectionName, useVisibleSections } from './layout';
import type { FormLayoutProps } from './layout';
import { useCollapsedSections, usePresentationPreference } from './preferences';
import type { FormPresentation } from './preferences';
import { FormTabs, useFormTabState, tabValue } from 'components:app/form-tabs';
import { Icon } from 'components:icon';
// Attachments (A6): the record's attachments panel, an option (off by default; presentation undecided).
import { AttachmentPanel, AttachmentsToggle } from 'components:app/attachment-panel';
// Related lists (A4): below the form, or extra tabs after the sections in tabs presentation.
import { RelatedLists, useRelatedListTabs } from 'components:app/related-lists';
import { isRelatedListShown } from 'utilities:app/gform';
import type { FormExtraTab } from 'components:app/form-tabs';
// Activity (A5): opt-in journal composer + activity stream (activity="notes" | "below"; default off).
import { activityElementRenderer, ActivityBelowForm } from 'components:app/activity-stream';

export type RecordFormProps = {
    /** A form from useRecordForm (else table / sysId / view build one). */
    form?: RecordFormModel;
    table?: string;
    sysId?: string;
    view?: string;
    onSaved?: UseRecordFormOptions['onSaved'];
    onOpenRecord?: UseRecordFormOptions['onOpenRecord'];
    /** Show the form-view switcher; onViewChange receives the chosen view name. */
    showViews?: boolean;
    onViewChange?: (view: string) => void;
    fieldLayout?: FieldLayout;
    hideFormatters?: boolean;
    /** Extra header content (right side), e.g. a "New" button. */
    headerActions?: any;
    renderElement?: (name: string, ctx: any) => any;
    /** Hide the UI action bar. */
    hideActions?: boolean;
    className?: string;
    /**
     * Render the header into a page header's slots instead of the card header (e.g. app/app-subheader
     * via utilities:app/header-slots): `left` gets the table label, record title and state badges,
     * `right` the UI actions, view switcher and headerActions. Each function wraps its node.
     */
    headerSlots?: { left?: (node: any) => any; right?: (node: any) => any };
    /**
     * Default presentation: 'stacked' sections (collapsible) or 'tabs' (one tab per section). The
     * user's own choice (the toggle on the form, x_312987_portal.form.presentation) wins.
     */
    presentation?: FormPresentation;
    /**
     * Attachments (A6): 'off' (default), 'below' (a panel under the sections), or 'header' (a
     * paperclip + count in the header that shows / hides the panel above the sections). New
     * records attach to the sys_id the form reserved, so files can be added before the first save.
     */
    attachments?: 'off' | 'below' | 'header';
    /**
     * Related lists (A4): 'auto' (default) follows the presentation: extra tabs after the sections in
     * tabs mode, collapsible sections below the form when stacked; 'tabs' / 'stacked' pick the
     * layout below the form ('tabs' still merges into the form's tabs in tabs mode); 'off' hides them.
     * g_form.showRelatedList / hideRelatedList(s) apply.
     */
    relatedLists?: 'auto' | 'tabs' | 'stacked' | 'off';
    /**
     * Activity (A5), opt-in (the presentation isn't decided yet): 'off' (default: journal fields as
     * app/journal-field, as before), 'notes' (composer + stream where the view's activity formatter
     * belongs, i.e. at its first journal input; below the sections when it has none) or 'below'
     * (under the sections). In both, the view's journal inputs move into the composer.
     */
    activity?: 'off' | 'notes' | 'below';
    /**
     * View resolution (backlog B). `viewPinned`: the shown view was chosen explicitly (URL, option or
     * remembered) rather than resolved automatically (view rules → portal candidates → Default). When
     * set (true or false), the switcher offers "Automatic", which calls onViewChange(''), and picking
     * Default calls onViewChange('default'); undefined keeps the old switcher (Default → '').
     */
    viewPinned?: boolean;
    /** A requested view that doesn't exist for the table: a small "View `x` not found" notice. */
    missingView?: string;
    /** Forwarded to useRecordForm when the form builds its own model (no `form`). */
    viewRules?: UseRecordFormOptions['viewRules'];
    forceView?: boolean;
};

/** A record form with header, view switcher, sections, dirty tracking and save. */
export function RecordForm(props: RecordFormProps) {
    if (props.form) return <RecordFormView {...props} form={props.form} />;
    return <OwnRecordForm {...props} />;
}

function OwnRecordForm(props: RecordFormProps) {
    const form = useRecordForm({
        table: props.table || '',
        sysId: props.sysId,
        view: props.view,
        onSaved: props.onSaved,
        onOpenRecord: props.onOpenRecord,
        viewRules: props.viewRules,
        forceView: props.forceView,
    });
    return <RecordFormView {...props} form={form} />;
}

const HEADER_FIELDS = ['number', 'name', 'short_description'];

/** The SAVED display value (the header describes the record, not unsaved edits). */
function useValue(form: RecordFormModel, name: string) {
    return useSyncExternalStore(
        form.subscribe,
        () => {
            const e = name ? form.getState().fields[name] : undefined;
            return e ? e.originalDisplayValue || e.originalValue : '';
        },
        () => ''
    );
}

function RecordHeader({ form, actions, actionBar }: { form: RecordFormModel; actions?: any; actionBar?: any }) {
    const boot = form.bootstrap!;
    const titleField = HEADER_FIELDS.find((f) => f in boot.values) || '';
    const title = useValue(form, titleField);
    const subtitle = useValue(form, titleField === 'number' ? 'short_description' : '');
    const state = useValue(form, 'state');
    return (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1 basis-56">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {form.isNew ? `New ${boot.tableLabel}` : boot.tableLabel}
                </p>
                <h2
                    className="flex flex-wrap items-center gap-2 text-lg leading-tight font-semibold"
                    data-rp-record-title=""
                >
                    <span className="truncate">{title || (form.isNew ? 'New record' : boot.sysId)}</span>
                    {state ? (
                        <Badge variant="secondary" data-rp-record-state="">
                            {state}
                        </Badge>
                    ) : null}
                    {form.readOnly ? <Badge variant="outline">Read only</Badge> : null}
                </h2>
                {subtitle ? <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {actionBar}
                {actions}
            </div>
        </div>
    );
}

/**
 * The record's title block for a tall page header (app-subheader banner): table label, a large
 * title (number / name), state and read-only badges, the short description as a subtitle.
 */
function BannerTitle({ form }: { form: RecordFormModel }) {
    const boot = form.bootstrap!;
    const titleField = HEADER_FIELDS.find((f) => f in boot.values) || '';
    const title = useValue(form, titleField);
    const subtitle = useValue(form, titleField === 'number' ? 'short_description' : '');
    const state = useValue(form, 'state');
    return (
        <div className="min-w-0" data-rp-record-title="" data-rp-banner-title="">
            <p className="m-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {form.isNew ? `New ${boot.tableLabel}` : boot.tableLabel}
            </p>
            <h1 className="m-0 mt-0.5 flex min-w-0 flex-wrap items-center gap-2 text-2xl leading-tight font-semibold tracking-tight max-sm:text-xl">
                <span className="min-w-0 truncate">{title || (form.isNew ? 'New record' : boot.sysId)}</span>
                {state ? (
                    <Badge variant="secondary" className="shrink-0" data-rp-record-state="">
                        {state}
                    </Badge>
                ) : null}
                {form.readOnly ? (
                    <Badge variant="outline" className="shrink-0">
                        Read only
                    </Badge>
                ) : null}
            </h1>
            {subtitle ? <p className="m-0 mt-1 truncate text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
    );
}

/** The compact header for a page header bar: table label, title, state and read-only badges. */
function SlotTitle({ form }: { form: RecordFormModel }) {
    const boot = form.bootstrap!;
    const titleField = HEADER_FIELDS.find((f) => f in boot.values) || '';
    const title = useValue(form, titleField);
    const subtitle = useValue(form, titleField === 'number' ? 'short_description' : '');
    const state = useValue(form, 'state');
    return (
        <div className="flex min-w-0 items-center gap-2" data-rp-record-title="">
            <span className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase max-sm:hidden">
                {form.isNew ? `New ${boot.tableLabel}` : boot.tableLabel}
            </span>
            <h1 className="m-0 min-w-0 truncate text-sm font-semibold">
                {title || (form.isNew ? 'New record' : boot.sysId)}
            </h1>
            {state ? (
                <Badge variant="secondary" className="shrink-0" data-rp-record-state="">
                    {state}
                </Badge>
            ) : null}
            {form.readOnly ? (
                <Badge variant="outline" className="shrink-0">
                    Read only
                </Badge>
            ) : null}
            {subtitle ? (
                <span className="min-w-0 truncate text-sm text-muted-foreground max-lg:hidden">{subtitle}</span>
            ) : null}
        </div>
    );
}

/** Narrow frame (phone): header controls collapse (UI actions into More, Discard to an icon). */
function useNarrow(max = 639) {
    const query = `(max-width: ${max}px)`;
    const get = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;
    const [narrow, setNarrow] = useState(get);
    useEffect(() => {
        if (!window.matchMedia) return;
        const mq = window.matchMedia(query);
        const on = () => setNarrow(mq.matches);
        on();
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, [query]);
    return narrow;
}

/** Can the sections show as tabs? (named sections to put in tabs; the untitled first one stays on top). */
export function canUseTabs(sections: { caption: string }[]): boolean {
    return sections.filter((s) => !!s.caption).length >= 1 && sections.length >= 2;
}

/**
 * Form settings (cog), in the page header or the card's own header: one submenu per setting, each
 * trigger showing its current value — View ▸ (the table's form views) and Layout ▸ (Stacked / Tabs,
 * the user's own choice). Submenus open with → / Enter, close with ←; they open towards the page
 * (the cog sits at the right edge) and flip if there's no room. Per-user choices only, never platform
 * preferences.
 */
function FormSettingsMenu(props: {
    table: string;
    sysId: string;
    view: string;
    showViews?: boolean;
    onViewChange?: (v: string) => void;
    viewPinned?: boolean;
    /** A portal view rule forced the view: the switcher shows it locked (the rule's name in the tooltip). */
    lockedBy?: string;
    presentation: FormPresentation;
    onPresentationChange: (p: FormPresentation) => void;
    canTab: boolean;
}) {
    const locked = props.lockedBy !== undefined;
    const views = useFormViews(props.table, props.showViews ? props.sysId : '-1');
    const list = (views.data && views.data.views) || [];
    // The Default view's name is '' in availableViews but 'Default view' in uiView.view: one value for both.
    const items = list.length
        ? list.map((v) => ({ value: v.name || 'Default view', label: v.label || 'Default view' }))
        : [{ value: props.view || 'Default view', label: props.view || 'Default view' }];
    if (items.every((i) => i.value !== props.view)) items.unshift({ value: props.view, label: props.view });
    const viewLabel = (items.find((i) => i.value === props.view) || { label: props.view || 'Default view' }).label;
    // Automatic resolution (view rules → portal candidates → Default) as its own choice.
    const auto = props.viewPinned !== undefined;
    const AUTO = '__rp_auto__';
    const currentView = auto && !props.viewPinned ? `${viewLabel} (auto)` : viewLabel;
    const radioValue = auto && !props.viewPinned ? AUTO : props.view;
    const choose = (v: string) => {
        if (!props.onViewChange) return;
        if (auto) props.onViewChange(v === AUTO ? '' : v === 'Default view' ? 'default' : String(v));
        else props.onViewChange(v === 'Default view' ? '' : String(v));
    };
    if (!props.canTab && !props.showViews) return null;
    const value = (text: string) => (
        <span className="ml-auto max-w-32 truncate pl-3 text-xs text-muted-foreground">{text}</span>
    );
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Form settings"
                        title="Form settings"
                        className="shrink-0"
                        data-rp-form-settings=""
                    />
                }
            >
                <Icon name="settings" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
                {props.showViews && locked ? (
                    <DropdownMenuItem
                        disabled
                        title={props.lockedBy ? `Set by the view rule "${props.lockedBy}"` : 'Set by a view rule'}
                        aria-label={`View: ${viewLabel}, set by ${props.lockedBy ? `the view rule "${props.lockedBy}"` : 'a view rule'}`}
                        data-rp-view-locked={props.lockedBy || ''}
                    >
                        <Icon name="lock" aria-hidden="true" /> View {value(viewLabel)}
                    </DropdownMenuItem>
                ) : props.showViews ? (
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger data-rp-settings-sub="view">
                            <Icon name="eye" aria-hidden="true" /> View {value(currentView)}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent side="left" className="max-w-[min(18rem,calc(100vw-1rem))] min-w-48">
                            <DropdownMenuRadioGroup value={radioValue} onValueChange={(v: string) => choose(v)}>
                                {auto ? (
                                    <DropdownMenuRadioItem
                                        value={AUTO}
                                        closeOnClick
                                        data-rp-view-option=""
                                        title="View rules and the portal's default views decide"
                                    >
                                        Automatic
                                    </DropdownMenuRadioItem>
                                ) : null}
                                {items.map((i) => (
                                    <DropdownMenuRadioItem
                                        key={i.value}
                                        value={i.value}
                                        closeOnClick
                                        data-rp-view-option={i.value}
                                    >
                                        {i.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                ) : null}
                {props.canTab ? (
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger data-rp-settings-sub="layout">
                            <Icon
                                name={props.presentation === 'tabs' ? 'panels-top-left' : 'rows-3'}
                                aria-hidden="true"
                            />{' '}
                            Layout {value(props.presentation === 'tabs' ? 'Tabs' : 'Stacked')}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent side="left" className="min-w-40">
                            <DropdownMenuRadioGroup
                                value={props.presentation}
                                onValueChange={(v: string) =>
                                    props.onPresentationChange(v === 'tabs' ? 'tabs' : 'stacked')
                                }
                            >
                                <DropdownMenuRadioItem value="stacked" closeOnClick data-rp-presentation="stacked">
                                    <Icon name="rows-3" aria-hidden="true" /> Stacked
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="tabs" closeOnClick data-rp-presentation="tabs">
                                    <Icon name="panels-top-left" aria-hidden="true" /> Tabs
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** A form view's title by name (sys_ui_view.title), e.g. 'sow_new_record' → 'Service Operations Workspace New Record'. '' = none. */
function useViewLabel(name: string): string {
    const ok = !!name && /^[A-Za-z0-9_.-]+$/.test(name);
    const q = useGraphQL(
        `query rpViewLabel($q: String) { GlideRecord_Query { sys_ui_view(queryConditions: $q, pagination: { limit: 1 }) { _results { title { displayValue } } } } }`,
        { q: `name=${name}` },
        { enabled: ok, staleTime: 10 * 60_000 }
    );
    const rows =
        q.data &&
        q.data.GlideRecord_Query &&
        q.data.GlideRecord_Query.sys_ui_view &&
        q.data.GlideRecord_Query.sys_ui_view._results;
    return ok && rows && rows[0] && rows[0].title ? String(rows[0].title.displayValue || '') : '';
}

function RecordFormView(props: RecordFormProps & { form: RecordFormModel }) {
    const { form } = props;
    const boot = form.bootstrap;
    const meta = useFormMeta(form);
    const errors: ValidationResult['errors'] = form.validation ? form.validation.errors : [];
    const root = useRef<HTMLDivElement | null>(null);
    const summary = useRef<HTMLDivElement | null>(null);
    const failure = form.saveError;
    const narrow = useNarrow();
    const layout = useLayout() as any;
    // Activity (A5): chain the caller's renderElement, then the opt-in activity mode.
    const renderElement = useMemo(
        () => activityElementRenderer({ form, mode: props.activity || 'off', renderElement: props.renderElement }),
        [form, props.activity, props.renderElement]
    );
    // Related lists (A4): g_form.show/hideRelatedList flags live on the store ('rl:' keys); re-render when they change.
    const rlKey = useSyncExternalStore(
        form.subscribe,
        () => {
            const lists = (form.bootstrap && form.bootstrap.relatedLists) || [];
            return lists
                .filter((l) => !isRelatedListShown(form, l.name))
                .map((l) => l.name)
                .join('|');
        },
        () => ''
    );
    const isRelatedShown = useMemo(() => {
        const hidden = new Set(rlKey ? rlKey.split('|') : []);
        return (name: string) => !hidden.has(name);
    }, [rlKey]);
    // Attachments (A6): 'header' mode shows / hides the panel from a header toggle.
    const [attachmentsOpen, setAttachmentsOpen] = useState(false);
    // Ctrl/⌘+S anywhere on the page (Save may live in the page header, outside the form).
    const saveShortcut = useRef<() => void>(() => {});
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                saveShortcut.current();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Collapsible sections: remembered per user + table; sections holding fields to fix open up
    // (for this visit only, not saved) so the error summary links can reach them.
    // Collapse state per user + table: x_312987_portal.form.<table>.collapsed (never a platform preference).
    const sectionPrefs = useCollapsedSections(form.table);
    const [userPresentation, setUserPresentation] = usePresentationPreference();
    const presentation: FormPresentation = userPresentation || props.presentation || 'stacked';
    // Tabs mode: FormBody registers how to show a section's tab (error summary links, validation).
    const revealTab = useRef<((section: string) => void) | null>(null);
    const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
    const fieldSection = useMemo(() => (boot ? sectionOfField(boot) : {}), [boot]);
    const sectionBadges = useMemo(() => {
        const out: Record<string, number> = {};
        if (form.validation)
            for (const e of form.validation.errors)
                if (e.name in fieldSection) out[fieldSection[e.name]] = (out[fieldSection[e.name]] || 0) + 1;
        return out;
    }, [form.validation, fieldSection]);
    useEffect(() => {
        const names = Object.keys(sectionBadges);
        if (names.length) setRevealed((r) => new Set(Array.from(r).concat(names)));
    }, [sectionBadges]);
    const isCollapsed = (name: string) => sectionPrefs.isCollapsed(name) && !revealed.has(name);
    const toggleSection = (name: string, collapsed: boolean) => {
        setRevealed((r) => {
            const next = new Set(r);
            next.delete(name);
            return next;
        });
        sectionPrefs.setCollapsed(name, collapsed);
    };

    // Warn before leaving with unsaved changes.
    useEffect(() => {
        if (!meta.isDirty) return;
        const onBeforeUnload = (e: any) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [meta.isDirty]);

    const focusField = (name: string) => {
        // Open the field's section first (collapsed sections keep their fields mounted but hidden).
        const section = fieldSection[name];
        if (section !== undefined && isCollapsed(section)) setRevealed((r) => new Set(Array.from(r).concat(section)));
        if (section !== undefined && presentation === 'tabs' && revealTab.current) revealTab.current(section);
        // The section / tab opens on the next render: retry briefly until the control is displayed.
        let tries = 0;
        const attempt = () => {
            const scope = root.current;
            if (!scope) return;
            const el = scope.querySelector(
                `[data-rpf-field="${name}"] input, [data-rpf-field="${name}"] textarea, [data-rpf-field="${name}"] [role=combobox], [data-rpf-field="${name}"] button, [data-rpf-field="${name}"] [tabindex]`
            ) as HTMLElement | null;
            if (el && el.getClientRects().length) {
                el.focus();
                el.scrollIntoView({ block: 'nearest' });
            } else if (++tries < 20) setTimeout(attempt, 50);
        };
        setTimeout(attempt, 0);
    };

    // Focus the error summary whenever a submit (button, Ctrl+S, UI action, script) fails validation.
    useEffect(() => {
        if (form.validation) setTimeout(() => summary.current && summary.current.focus(), 0);
    }, [form.validation]);
    const handle = (_outcome: SaveOutcome | unknown) => {};
    const save = async (opts?: { force?: boolean }) => handle(await form.save(opts));
    const run = async (action: UiAction) => handle(await form.runAction(action));

    // View resolution: the view asked for but not shown (the caller's check, or a forced view the
    // platform didn't find and replaced with Default), and the shown view's label for the notice.
    const forced = (boot && boot.requested && boot.requested.forcedView) || '';
    const shownView = (boot && boot.view) || '';
    // Portal view rules (form.resolution): pinned unless automatic; a rule locks the switcher.
    const resolution = form.resolution;
    const viewPinned =
        props.viewPinned !== undefined ? props.viewPinned : resolution ? resolution.source !== 'auto' : undefined;
    const lockedBy = resolution && resolution.source === 'rule' ? resolution.ruleName || '' : undefined;
    const missingView =
        props.missingView ||
        (resolution && resolution.missing) ||
        (forced && forced !== 'default' && forced.toLowerCase() !== shownView.toLowerCase() ? forced : '');
    const shownViewLabel =
        useViewLabel(missingView && !isDefaultViewName(shownView) ? shownView : '') ||
        (isDefaultViewName(shownView) ? 'Default view' : shownView);

    if (!boot) {
        if (form.status.error)
            return (
                <Card className={props.className}>
                    <CardContent role="alert" className="text-sm text-destructive">
                        {form.status.error.message}
                    </CardContent>
                </Card>
            );
        return (
            <Card className={props.className} aria-busy="true">
                <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner label="Loading the form" /> Loading the form…
                </CardContent>
            </Card>
        );
    }

    const dirtyCount = meta.dirtyFields.length;
    const canSave = !form.readOnly && (form.isNew || dirtyCount > 0) && !form.saving;
    saveShortcut.current = () => {
        if (canSave) save();
    };
    const slots = props.headerSlots;
    // Tall sub-header (app-subheader `subheader: 'banner'`): the full record header goes into its slots.
    const banner = !!slots && !!layout && !!layout.options && layout.options.subheader === 'banner';
    // Header bar on a phone: every UI action goes into More, so Save always fits.
    const actionBar = props.hideActions ? null : (
        <UiActionBar form={form} onRun={run} maxButtons={narrow ? 0 : slots && !banner ? 2 : 3} />
    );
    const tabsPossible = canUseTabs(boot.sections);
    const discard = () => {
        form.reset();
        form.clearValidation();
    };
    // Discard / Save (+ unsaved count, Ctrl/⌘+S) in the page header when it has slots.
    const headerSave = form.readOnly ? null : (
        <div className="flex shrink-0 items-center gap-1.5" data-rp-header-save="">
            {narrow ? (
                <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Discard changes"
                    title="Discard changes"
                    disabled={!dirtyCount || form.saving}
                    onClick={discard}
                    data-rp-discard=""
                >
                    <Icon name="undo-2" aria-hidden="true" />
                </Button>
            ) : (
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!dirtyCount || form.saving}
                    onClick={discard}
                    data-rp-discard=""
                >
                    Discard
                </Button>
            )}
            <Button
                type="button"
                size="sm"
                disabled={!canSave}
                onClick={() => save()}
                data-rp-save=""
                aria-keyshortcuts="Control+S Meta+S"
                title="Save (Ctrl+S)"
            >
                {form.saving ? <Spinner label="Saving" /> : null}
                {form.isNew ? 'Create' : 'Save'}
            </Button>
        </div>
    );
    // Unsaved-changes indicator: quiet, the leftmost item of the right-hand cluster (nothing when clean).
    const unsavedText = form.isNew
        ? 'New record, not saved yet'
        : dirtyCount
          ? `${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'}`
          : '';
    const unsaved = form.readOnly ? null : (
        <span
            className="mr-1 inline-flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground"
            role="status"
            aria-live="polite"
            data-rp-unsaved=""
        >
            {unsavedText ? (
                <>
                    <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />
                    {narrow ? (
                        <>
                            <span aria-hidden="true" title={unsavedText}>
                                {form.isNew ? 'New' : dirtyCount}
                            </span>
                            <span className="sr-only">{unsavedText}</span>
                        </>
                    ) : (
                        unsavedText
                    )}
                </>
            ) : null}
        </span>
    );
    const settingsMenu = (
        <FormSettingsMenu
            table={boot.table}
            sysId={form.isNew ? '-1' : boot.sysId}
            view={boot.view}
            showViews={props.showViews}
            onViewChange={props.onViewChange}
            viewPinned={viewPinned}
            lockedBy={lockedBy}
            presentation={presentation}
            onPresentationChange={setUserPresentation}
            canTab={tabsPossible}
        />
    );
    // Attachments (A6): boot.sysId is the reserved sys_id on a new record (kept on insert).
    const attachmentsMode = props.attachments || 'off';
    const attachmentsPanelId = `rp-form-attachments-${boot.sysId}`;
    const attachmentsToggle =
        attachmentsMode === 'header' ? (
            <AttachmentsToggle
                table={boot.table}
                sysId={boot.sysId}
                pressed={attachmentsOpen}
                onPressedChange={setAttachmentsOpen}
                controls={attachmentsPanelId}
            />
        ) : null;
    const attachmentsPanel =
        attachmentsMode === 'below' || (attachmentsMode === 'header' && attachmentsOpen) ? (
            <AttachmentPanel
                id={attachmentsPanelId}
                table={boot.table}
                sysId={boot.sysId}
                form={form}
                className={attachmentsMode === 'below' ? 'mb-4' : 'mb-6'}
            />
        ) : null;
    // Related lists (A4): the bootstrap's lists (no extra request); merged into the form's tabs in tabs mode.
    const relatedMode = props.relatedLists || 'auto';
    const relatedConfig =
        relatedMode !== 'off' && !form.isNew && boot.relatedLists && boot.relatedLists.length
            ? {
                  table: boot.table,
                  sysId: boot.sysId,
                  view: boot.view === 'Default view' ? '' : boot.view,
                  lists: boot.relatedLists,
                  isShown: isRelatedShown,
                  onOpenRecord: form.openRecord,
                  live: true,
              }
            : null;
    const relatedMerged = !!relatedConfig && relatedMode !== 'stacked' && presentation === 'tabs' && tabsPossible;
    return (
        <Card
            ref={root}
            className={props.className}
            data-rp-record-form={`${boot.table}:${form.isNew ? 'new' : boot.sysId}`}
            data-rp-form-view={boot.view}
            data-rp-view-pinned={viewPinned === undefined ? undefined : String(viewPinned)}
            data-rp-view-source={resolution ? resolution.source : undefined}
            data-rp-view-rule={resolution && resolution.ruleId ? resolution.ruleId : undefined}
        >
            {/* g_modal (client scripts, UI actions) dialogs; only the page's first outlet renders. */}
            <DialogOutlet />
            {slots ? (
                <>
                    {slots.left ? slots.left(banner ? <BannerTitle form={form} /> : <SlotTitle form={form} />) : null}
                    {slots.right
                        ? slots.right(
                              <>
                                  {unsaved}
                                  {actionBar}
                                  {attachmentsToggle}
                                  {props.headerActions}
                                  {headerSave}
                                  {settingsMenu}
                              </>
                          )
                        : null}
                </>
            ) : (
                // Inline (no page-header slots): the card's own header row, with the same controls.
                <CardHeader className="border-b border-border">
                    <RecordHeader
                        form={form}
                        actions={
                            <>
                                {attachmentsToggle}
                                {props.headerActions}
                                {headerSave}
                                {settingsMenu}
                            </>
                        }
                        actionBar={
                            <>
                                {unsaved}
                                {actionBar}
                            </>
                        }
                    />
                </CardHeader>
            )}
            <CardContent>
                <FormProvider form={form}>
                    {/* Attachments (A6), header mode: above the sections (outside <form>: rename's Enter must not submit). */}
                    {attachmentsMode === 'header' ? attachmentsPanel : null}
                    <form
                        noValidate
                        aria-label={`${boot.tableLabel} form`}
                        onSubmit={(e: any) => {
                            e.preventDefault();
                            if (canSave) save();
                        }}
                        className="flex flex-col gap-6 pb-4"
                    >
                        {missingView ? (
                            <p
                                role="status"
                                className="-mb-2 flex items-center gap-2 text-xs text-muted-foreground"
                                data-rp-view-missing={missingView}
                            >
                                <Icon name="eye-off" aria-hidden="true" className="size-3.5 shrink-0" />
                                <span>
                                    View <code className="rounded bg-muted px-1 py-0.5 font-mono">{missingView}</code>{' '}
                                    not found, showing {shownViewLabel}.
                                </span>
                            </p>
                        ) : null}
                        {errors.length ? (
                            <div
                                ref={summary}
                                tabIndex={-1}
                                role="alert"
                                className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/30"
                                data-rp-error-summary=""
                            >
                                <p className="flex items-center gap-2 font-medium text-destructive">
                                    <IconAlert size={16} /> Fix {errors.length} field{errors.length === 1 ? '' : 's'} to
                                    save
                                </p>
                                <ul className="mt-2 ml-6 list-disc">
                                    {errors.map((e) => (
                                        <li key={e.name + e.message}>
                                            <button
                                                type="button"
                                                className="text-left text-destructive underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                                                onClick={() => focusField(e.name)}
                                            >
                                                {e.message}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                        {form.remoteChange && !form.conflict ? (
                            <div
                                role="alert"
                                className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
                                data-rp-remote-change=""
                            >
                                <IconAlert size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                                <span className="mr-auto">
                                    <span className="font-medium">
                                        {form.remoteChange.deleted
                                            ? 'Deleted by someone else.'
                                            : 'Changed by someone else.'}
                                    </span>{' '}
                                    {form.remoteChange.deleted
                                        ? 'This record no longer exists.'
                                        : 'This record was updated while you were editing it.'}
                                </span>
                                {form.remoteChange.deleted ? null : (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => form.reload()}
                                        data-rp-remote-reload=""
                                    >
                                        Reload
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => form.dismissRemoteChange()}
                                    data-rp-remote-keep=""
                                >
                                    Keep editing
                                </Button>
                            </div>
                        ) : null}
                        {form.conflict ? (
                            <div
                                role="alert"
                                className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
                                data-rp-conflict=""
                            >
                                <IconAlert size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                                <span className="mr-auto">
                                    <span className="font-medium">Changed by someone else.</span> This record was
                                    updated after you opened it.
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => form.reload()}
                                    data-rp-conflict-reload=""
                                >
                                    Reload
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => save({ force: true })}
                                    data-rp-conflict-overwrite=""
                                >
                                    Overwrite
                                </Button>
                            </div>
                        ) : null}
                        {meta.messages.length ? (
                            <div className="flex flex-col gap-2" data-rp-form-messages="">
                                {meta.messages.map((m: any) => (
                                    <div
                                        key={m.id}
                                        role={m.kind === 'error' ? 'alert' : 'status'}
                                        className={cx(
                                            'rpv-rich rounded-md border p-3 text-sm [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline',
                                            m.kind === 'error'
                                                ? 'border-destructive/50 bg-destructive/5 text-destructive'
                                                : 'border-border bg-muted/50 text-foreground'
                                        )}
                                        // g_form.addInfoMessage often carries links: sanitized HTML, as on the platform.
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.text) }}
                                    />
                                ))}
                            </div>
                        ) : null}
                        {failure ? (
                            <div
                                role="alert"
                                className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive"
                                data-rp-save-error=""
                            >
                                <IconAlert size={16} className="mt-0.5 shrink-0" />
                                <span>{failure.message}</span>
                            </div>
                        ) : null}
                        <FormBody
                            presentation={presentation}
                            revealTab={revealTab}
                            firstInvalidSection={
                                errors.length && errors[0].name in fieldSection
                                    ? fieldSection[errors[0].name]
                                    : undefined
                            }
                            validation={form.validation}
                            bootstrap={boot}
                            readOnly={form.readOnly}
                            fieldLayout={props.fieldLayout}
                            hideFormatters={props.hideFormatters}
                            renderElement={renderElement /* Activity (A5): was props.renderElement */}
                            isCollapsed={isCollapsed}
                            onToggleSection={toggleSection}
                            sectionBadges={sectionBadges}
                            relatedTabs={relatedMerged ? relatedConfig : null}
                        />
                        {form.scriptErrors.length ? (
                            <details
                                className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground"
                                data-rp-script-errors=""
                            >
                                <summary className="cursor-pointer">
                                    {form.scriptErrors.length} client script{form.scriptErrors.length === 1 ? '' : 's'}{' '}
                                    failed (the form still works)
                                </summary>
                                <ul className="mt-2 flex flex-col gap-1">
                                    {form.scriptErrors.map((e, i) => (
                                        <li key={i}>
                                            <span className="font-medium text-foreground">{e.script}</span> ({e.kind}):{' '}
                                            {e.message}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}
                    </form>
                    {/* Activity (A5): 'below' mode (or 'notes' on a view without a journal input): under the sections. */}
                    <ActivityBelowForm form={form} bootstrap={boot} mode={props.activity || 'off'} />
                    {/* Attachments (A6), below mode: under the sections. */}
                    {attachmentsMode === 'below' ? attachmentsPanel : null}
                    {/* Related lists (A4) below the form, outside <form> (their inputs must not submit it). */}
                    {relatedConfig && !relatedMerged ? (
                        <div className="border-t border-border pt-4 pb-4" data-rp-form-related="">
                            <RelatedLists
                                {...relatedConfig}
                                layout={
                                    relatedMode === 'tabs' || (relatedMode === 'auto' && presentation === 'tabs')
                                        ? 'tabs'
                                        : 'stacked'
                                }
                                heading={
                                    relatedMode === 'tabs' || (relatedMode === 'auto' && presentation === 'tabs')
                                        ? undefined
                                        : 'Related lists'
                                }
                            />
                        </div>
                    ) : null}
                </FormProvider>
            </CardContent>
        </Card>
    );
}

/**
 * The form's sections, stacked (collapsible headings, components:app/form-section) or as tabs
 * (components:app/form-tabs), with the user's presentation toggle. Rendered inside FormProvider:
 * section visibility follows the store (g_form.setSectionDisplay, hidden fields).
 */
function FormBody(
    props: FormLayoutProps & {
        presentation: FormPresentation;
        revealTab: { current: ((section: string) => void) | null };
        firstInvalidSection?: string;
        validation: unknown;
        /** Related lists (A4) as extra tabs after the sections (tabs presentation only). */
        relatedTabs?: any;
    }
) {
    const { bootstrap, presentation, revealTab, firstInvalidSection, validation, relatedTabs, ...layout } = props;
    // Related lists (A4): tab descriptors (lazy panels); disabled unless merged into the tabs.
    const related = useRelatedListTabs(relatedTabs || { table: '', sysId: '', enabled: false });
    const extraTabs: FormExtraTab[] = relatedTabs
        ? related.tabs.map((t) => ({ value: t.value, label: t.label, count: t.count, render: t.render }))
        : [];
    const visible = useVisibleSections(bootstrap, props.hideFormatters);
    // The first section without a caption (incident's main fields) is never a tab: it stays on top,
    // always open; the tabs hold the named sections.
    const first = bootstrap.sections[0];
    const lead = first && !first.caption ? first : null;
    const named = lead ? bootstrap.sections.slice(1) : bootstrap.sections;
    const tabsPossible = canUseTabs(bootstrap.sections);
    const namedShown = named.filter((s) => visible.has(sectionName(s)));
    const asTabs = presentation === 'tabs' && tabsPossible && (namedShown.length > 0 || extraTabs.length > 0);
    const tabs = useFormTabState({
        sections: named,
        visible,
        syncUrl: asTabs,
        extraValues: extraTabs.map((t) => t.value),
    });
    const byName: Record<string, any> = {};
    named.forEach((s) => (byName[sectionName(s)] = s));
    revealTab.current = (section: string) => {
        const s = byName[section];
        if (s && tabs.value !== tabValue(s)) tabs.select(tabValue(s));
    };
    // A failed save shows the tab holding the first field to fix.
    useEffect(() => {
        if (asTabs && validation && firstInvalidSection !== undefined && revealTab.current)
            revealTab.current(firstInvalidSection);
    }, [validation]);
    return (
        <div className="flex flex-col gap-6">
            {asTabs ? (
                <>
                    {lead && visible.has(sectionName(lead)) ? (
                        <div className="flex flex-col gap-4" data-rp-form-section="main">
                            <SectionRows section={lead} bootstrap={bootstrap} {...layout} />
                        </div>
                    ) : null}
                    <FormTabs
                        sections={named}
                        visible={visible}
                        value={tabs.value}
                        onValueChange={tabs.select}
                        errors={layout.sectionBadges}
                        renderSection={(s: any) => <SectionRows section={s} bootstrap={bootstrap} {...layout} />}
                        extraTabs={extraTabs}
                    />
                </>
            ) : (
                <FormLayout bootstrap={bootstrap} {...layout} />
            )}
        </div>
    );
}

/**
 * UI action bar: the form's UI actions as the server evaluated them (conditions already applied).
 * Form buttons render as buttons; context-menu actions go into a "More" menu. Save lives in the
 * save bar. Client actions run their onclick script through the g_form layer; others go
 * straight to the server (POST /api/now/ui/ui_action/:id).
 */
export function UiActionBar({
    form,
    onRun,
    maxButtons,
}: {
    form: RecordFormModel;
    onRun: (a: UiAction) => Promise<unknown>;
    maxButtons?: number;
}) {
    const [running, setRunning] = useState('');
    const all = ((form.bootstrap && form.bootstrap.actions) || []).filter(
        (a) => a.label && SAVE_ACTIONS.indexOf(a.name) < 0
    );
    if (!all.length) return null;
    // maxButtons (a header bar): the first N form buttons stay buttons, the rest join the More menu.
    const allButtons = all.filter((a) => a.type === 'button');
    const capped = maxButtons !== undefined;
    const buttons = capped ? allButtons.slice(0, maxButtons) : allButtons;
    const menu = (capped ? allButtons.slice(maxButtons) : []).concat(all.filter((a) => a.type !== 'button'));
    const go = (a: UiAction) => {
        if (running) return;
        setRunning(a.sysId);
        onRun(a).finally(() => setRunning(''));
    };
    const busy = !!running || form.saving;
    return (
        <div
            className={cx('flex items-center gap-2', capped ? 'flex-nowrap' : 'flex-wrap')}
            role="toolbar"
            aria-label="Record actions"
            data-rp-action-bar=""
        >
            {buttons.map((a) => (
                <Button
                    key={a.sysId}
                    type="button"
                    size="sm"
                    variant={a.style === 'destructive' ? 'destructive' : a.style === 'primary' ? 'default' : 'outline'}
                    disabled={busy}
                    title={a.hint || undefined}
                    onClick={() => go(a)}
                    data-rp-action={a.name || a.sysId}
                >
                    {running === a.sysId ? <Spinner label="Running" /> : null}
                    {a.label}
                </Button>
            ))}
            {menu.length ? (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button type="button" size="sm" variant="outline" disabled={busy} data-rp-action-menu="" />
                        }
                    >
                        More <IconChevronDown size={14} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-56">
                        {menu.map((a) => (
                            <DropdownMenuItem
                                key={a.sysId}
                                onClick={() => go(a)}
                                className={a.style === 'destructive' ? 'text-destructive' : undefined}
                                data-rp-action={a.name || a.sysId}
                            >
                                {a.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}
        </div>
    );
}
