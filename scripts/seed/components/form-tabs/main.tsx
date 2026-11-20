/**
 * components:app/form-tabs: a record form's sections as tabs, on the host kit's components:tabs.
 *
 *   const tabs = useFormTabState({ sections, visible })        // value + select(name), `tab=` in q
 *   <FormTabs sections={…} visible={…} value={tabs.value} onValueChange={tabs.select}
 *             errors={{ notes: 2 }} renderSection={(s) => <SectionRows … />} />
 *
 * Form behaviour (the generic tablist is components:tabs):
 * - one tab per displayed section; sections hidden by g_form.setSectionDisplay, or with every
 *   field hidden, drop out (pass `visible`). If the chosen tab disappears, the first one shows;
 * - every panel stays mounted (fields keep state, validation sees them); inactive ones are hidden;
 * - badges: fields to fix after a failed save (`errors`, red), else mandatory fields still empty
 *   (computed live from the form store, outlined), each with a screen-reader label;
 * - useFormTabState keeps the chosen tab in the URL (`tab=<section>` inside q, other q keys and
 *   the table / sys-id / view / query params kept; written with replace, so tabs add no Back steps),
 *   so Back and deep links restore it;
 *   select(name) is how the error summary reveals a field ("switch tab, then focus").
 *
 * Tab values are section names (caption in lower case); the first, untitled section is 'main'.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { usePortalLocation, useNavigate } from '@portal/runtime';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'components:tabs';
import { cx, useFormContext, isFieldMissing, isFieldVisible } from 'components:app/field';
import { sectionName, sectionElements } from 'components:app/form-section';

type SectionLike = { id?: string; caption: string; label?: string; rows: string[][][] };

/** Tab value for a section ('main' for the first, untitled one). */
export function tabValue(section: SectionLike): string {
    return sectionName(section) || 'main';
}

export type FormTabState = { value: string; select: (tab: string) => void };

/**
 * The chosen tab: from `tab=` in q (deep links, Back), else the first displayed section. select()
 * writes it back into q (keeping the other q keys and the explicit URL params). `syncUrl: false`
 * keeps it in memory only (e.g. a form inside a dialog).
 */
export function useFormTabState(options: {
    sections: SectionLike[];
    visible: Set<string>;
    syncUrl?: boolean;
    extraValues?: string[];
}): FormTabState {
    const { sections, visible } = options;
    const syncUrl = options.syncUrl !== false;
    const location = (usePortalLocation() as any) || {};
    const navigate = useNavigate();
    const qParams: Record<string, string> =
        (location.qParams && typeof location.qParams === 'object' ? location.qParams : null) || {};
    const fromUrl = syncUrl ? String(qParams.tab || '') : '';
    // `local` answers a click at once; the URL is the truth once it changes (navigation, Back).
    const [local, setLocal] = useState('');
    useEffect(() => {
        if (syncUrl) setLocal('');
    }, [fromUrl, syncUrl]);
    // Extra tabs after the sections (e.g. related lists, 'rl:<name>') are valid tab values too.
    const shown = sections
        .filter((s) => visible.has(sectionName(s)))
        .map(tabValue)
        .concat(options.extraValues || []);
    const wanted = local || (syncUrl ? fromUrl : '');
    const value = shown.indexOf(wanted) >= 0 ? wanted : shown[0] || '';
    const select = useCallback(
        (tab: string) => {
            setLocal(tab);
            if (!syncUrl) return;
            const q = new URLSearchParams();
            Object.keys(qParams).forEach((k) => {
                if (k !== 'tab' && ['table', 'sys_id', 'view', 'query'].indexOf(k) < 0) q.set(k, String(qParams[k]));
            });
            q.set('tab', tab);
            navigate(String(location.page || ''), {
                table: location.table || qParams.table || undefined,
                sysId: location.sysId || qParams.sys_id || undefined,
                view: location.view || qParams.view || undefined,
                query: (typeof location.query === 'string' && location.query) || qParams.query || undefined,
                q: q.toString(),
                // A tab is state on the same entry: no Back step, and no unsaved-changes prompt.
                replace: true,
                skipGuard: true,
            } as any);
        },
        [
            syncUrl,
            navigate,
            location.page,
            location.table,
            location.sysId,
            location.view,
            location.query,
            JSON.stringify(qParams),
        ]
    );
    return { value, select };
}

const noopSubscribe = () => () => {};

/** Per tab: mandatory fields still empty (live). */
function useMissingCounts(sections: SectionLike[]): Record<string, number> {
    const form = useFormContext();
    const key = useSyncExternalStore(
        form ? form.subscribe : noopSubscribe,
        () => {
            if (!form) return '';
            const state = form.getState();
            return sections
                .map((s) => {
                    const n = sectionElements(s).filter(
                        (f) => f in state.meta && isFieldVisible(state, f) && isFieldMissing(state, f)
                    ).length;
                    return `${tabValue(s)}=${n}`;
                })
                .join('&');
        },
        () => ''
    );
    return useMemo(() => {
        const out: Record<string, number> = {};
        key.split('&').forEach((pair) => {
            const [k, v] = pair.split('=');
            if (k !== undefined && v) out[k] = Number(v);
        });
        return out;
    }, [key]);
}

export type FormTabsProps = {
    sections: SectionLike[];
    /** Displayed section names (sectionName). */
    visible: Set<string>;
    value: string;
    onValueChange: (tab: string) => void;
    /** Fields to fix per section name, after a failed save. */
    errors?: Record<string, number>;
    renderSection: (section: SectionLike, index: number) => any;
    /**
     * Tabs after the sections (a record's related lists: app/related-lists' useRelatedListTabs).
     * Their panels mount only while selected (lazy), unlike section panels.
     */
    extraTabs?: FormExtraTab[];
    className?: string;
};

/** A tab after the form's sections: value (unique, e.g. 'rl:task_sla.task'), label, optional count, lazy content. */
export type FormExtraTab = { value: string; label: string; count?: number; render: () => any };

export function FormTabs(props: FormTabsProps) {
    const { sections, visible, value } = props;
    const missing = useMissingCounts(sections);
    // Narrow screens: keep the active tab in view inside the scrolling strip (horizontal only, so the
    // page itself never jumps).
    const strip = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const box = strip.current;
        if (!box || box.scrollWidth <= box.clientWidth) return;
        const tab = box.querySelector(`[data-rp-form-tab="${value}"]`) as HTMLElement | null;
        if (!tab) return;
        const left = tab.offsetLeft - box.offsetLeft;
        if (left < box.scrollLeft) box.scrollLeft = left - 8;
        else if (left + tab.offsetWidth > box.scrollLeft + box.clientWidth)
            box.scrollLeft = left + tab.offsetWidth - box.clientWidth + 8;
    }, [value]);
    const shown = sections.map((s, i) => ({ s, i })).filter(({ s }) => visible.has(sectionName(s)));
    return (
        <Tabs
            value={value}
            onValueChange={(v: string) => props.onValueChange(String(v))}
            className={cx('gap-4', props.className)}
            data-rp-form-tabs=""
        >
            {/* w-0 + min-w-full: the strip scrolls sideways instead of widening the form on narrow screens. */}
            <div ref={strip} className="w-0 min-w-full overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                <TabsList
                    variant="line"
                    aria-label="Form sections"
                    className="h-auto min-w-full justify-start gap-1 border-b border-border p-0"
                >
                    {shown.map(({ s }) => {
                        const tab = tabValue(s);
                        const errorCount = (props.errors && props.errors[sectionName(s)]) || 0;
                        const missingCount = missing[tab] || 0;
                        return (
                            <TabsTrigger key={tab} value={tab} className="h-9 flex-none px-3" data-rp-form-tab={tab}>
                                {s.label || s.caption || 'Main'}
                                {errorCount ? (
                                    <span
                                        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-white"
                                        data-rp-tab-badge="errors"
                                    >
                                        {errorCount}
                                        <span className="sr-only"> field{errorCount === 1 ? '' : 's'} to fix</span>
                                    </span>
                                ) : missingCount ? (
                                    <span
                                        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border px-1.5 text-xs font-medium text-muted-foreground"
                                        title={`${missingCount} required field${missingCount === 1 ? '' : 's'} empty`}
                                        data-rp-tab-badge="missing"
                                    >
                                        <span aria-hidden="true">*{missingCount}</span>
                                        <span className="sr-only">
                                            {' '}
                                            {missingCount} required field{missingCount === 1 ? '' : 's'} empty
                                        </span>
                                    </span>
                                ) : null}
                            </TabsTrigger>
                        );
                    })}
                    {(props.extraTabs || []).map((t) => (
                        <TabsTrigger
                            key={t.value}
                            value={t.value}
                            className="h-9 flex-none px-3"
                            data-rp-form-tab={t.value}
                            data-rp-form-extra-tab=""
                        >
                            {t.label}
                            {t.count !== undefined && t.count >= 0 ? (
                                <span
                                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums"
                                    data-rp-tab-badge="count"
                                >
                                    {new Intl.NumberFormat().format(t.count)}
                                    <span className="sr-only"> record{t.count === 1 ? '' : 's'}</span>
                                </span>
                            ) : null}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
            {shown.map(({ s, i }) => (
                // keepMounted: inactive panels are hidden, not removed (field state, validation).
                <TabsContent
                    key={tabValue(s)}
                    value={tabValue(s)}
                    keepMounted
                    className="flex flex-col gap-4"
                    data-rp-form-tab-panel={tabValue(s)}
                >
                    {props.renderSection(s, i)}
                </TabsContent>
            ))}
            {(props.extraTabs || []).map((t) => (
                // Not keepMounted: an extra tab's content (a related list) loads only while it's selected.
                <TabsContent
                    key={t.value}
                    value={t.value}
                    className="flex min-w-0 flex-col gap-4"
                    data-rp-form-tab-panel={t.value}
                >
                    {t.value === value ? t.render() : null}
                </TabsContent>
            ))}
        </Tabs>
    );
}

/** Preview (Studio): three static sections, in memory. */
export default function FormTabsPreview() {
    const sections: SectionLike[] = [
        { caption: '', label: 'Incident', rows: [] },
        { caption: 'notes', label: 'Notes', rows: [] },
        { caption: 'resolution', label: 'Resolution', rows: [] },
    ];
    const visible = new Set(['', 'notes', 'resolution']);
    const tabs = useFormTabState({ sections, visible, syncUrl: false });
    return (
        <div className="max-w-xl p-4">
            <FormTabs
                sections={sections}
                visible={visible}
                value={tabs.value}
                onValueChange={tabs.select}
                errors={{ resolution: 2 }}
                renderSection={(s) => <p className="text-sm text-muted-foreground">{s.label} fields…</p>}
            />
        </div>
    );
}
