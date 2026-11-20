import { useEffect, useMemo, useState } from 'react'
import { usePortal, usePortalLocation, useNavigate, Link } from '@portal/runtime'
import { Card, CardContent } from 'components:card'
import { Button } from 'components:button'
import { Icon } from 'components:icon'
import { useGraphQL, useDebouncedValue, useTableMeta, safeName } from 'utilities:app/graphql'
import { IconPlus, IconSearch, useFormMeta } from 'components:app/field'
import { Combobox } from 'components:app/combobox'
import type { ComboItem } from 'components:app/combobox'
import { RecordForm, useRecordForm, useResolvedFormView } from 'components:app/form'
import { confirmDialog, DialogOutlet } from 'components:app/confirm-dialog'
import { HeaderSlot, useHeaderSlot } from 'utilities:app/header-slots'

/**
 * components:app/record-form: a record's real form view (app/form) as a page widget.
 *
 * Like Service Portal's form widget: table / sys_id / view come from the widget options, else the
 * route params, else the URL params (table, sys_id, view; sys_id=-1 is a new record), so one
 * generic `form` page serves any table. It navigates with explicit table / sys-id / view params.
 * With `picker` (a demo convenience), a search box finds records of the table (number / short
 * description) and "New" opens a new record (the platform reserves its number on load).
 *
 * On a layout with header slots (app/app-subheader) the record's title and state go to the left
 * slot, the UI actions, view switcher and New to the right (the picker shows only with no record open)
 * (headerPlacement: 'auto' | 'header' | 'inline'). `listPage` adds a back button to a list page.
 *
 * Options: { table, sysId, view, lockView, picker, showViews, pickerQuery, headerPlacement, listPage, presentation, attachments, relatedLists, activity }
 *
 * The form's view (useResolvedFormView, backlog B): the URL `view` param, then the `view` option
 * (with `lockView` the option comes first), then the user's remembered view, each only when it exists
 * for the table (an unknown URL / option view shows a "not found" notice); otherwise automatic: the
 * portal's Workspace view rules (settings.viewRuleConfigId), its candidate list (settings.formViews),
 * then Default. The view switcher writes the URL and the remembered view; "Automatic" clears both.
 * presentation: 'stacked' (default) | 'tabs', the default only: the user's toggle on the form wins.
 */
type Options = {
    table?: string
    sysId?: string
    view?: string
    /** The `view` option beats the URL's view param (a page built for one view); hides the view switcher. */
    lockView?: boolean
    picker?: boolean
    showViews?: boolean
    pickerQuery?: string
    headerPlacement?: 'auto' | 'header' | 'inline'
    /** Default section presentation; the user's own toggle (x_312987_portal.form.presentation) wins. */
    presentation?: 'stacked' | 'tabs'
    /** Portal page with the list (back button; gets the table param). '' = none. */
    listPage?: string
    /** Attachments (A6): 'off' (default), 'below' the form, or a 'header' toggle. */
    attachments?: 'off' | 'below' | 'header'
    /** Related lists (A4): 'auto' (default: tabs in tabs mode, sections when stacked), 'tabs', 'stacked' or 'off'. */
    relatedLists?: 'auto' | 'tabs' | 'stacked' | 'off'
    /** Activity (A5), opt-in: 'off' (default), 'notes' (in the Notes section) or 'below' the form. */
    activity?: 'off' | 'notes' | 'below'
}

/** Resolves true when there's nothing to lose or the user agrees to discard (app/confirm-dialog). */
function confirmDiscard(dirty: boolean): Promise<boolean> {
    if (!dirty) return Promise.resolve(true)
    return confirmDialog({ title: 'Discard your unsaved changes?', description: 'Changes on this form that are not saved will be lost.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', destructive: true })
}

const NAME = /^[a-z0-9_]+$/i

/** First non-empty string. */
function pick(...values: unknown[]): string {
    for (const v of values) if (v !== undefined && v !== null && String(v) !== '') return String(v)
    return ''
}

export default function RecordFormWidget({ options = {} }: { options?: Options }) {
    const location = usePortalLocation() as any
    const portal = usePortal() as any
    const navigate = useNavigate()
    const loc = location || {}
    // location.params = the q keys plus the explicit table / sys_id / view / query params (explicit win).
    const query = loc.params && typeof loc.params === 'object' ? loc.params : {}
    const route = (portal && portal.page && portal.page.params) || {}
    // Like Service Portal's form widget: widget options, then route params, then URL params.
    const rawTable = pick(options.table, route.table, loc.table, query.table, 'incident')
    const table = NAME.test(rawTable) ? rawTable : 'incident'
    const sysId = pick(options.sysId, route.sys_id, route.sysId, loc.sysId, query.sys_id)
    // View resolution: URL → option (lockView: option → URL) → remembered → automatic (rules → portal
    // candidates → Default). Explicit names are checked first, so an unknown one falls through.
    const urlView = pick(route.view, loc.mode === 'studio' ? '' : loc.view, query.view)
    const optionView = pick(options.view)
    const lockView = !!options.lockView && !!optionView
    const resolved = useResolvedFormView({ table, urlView, optionView, lockView })
    const view = resolved.view
    // Encoded query presetting a new record (g_aw.openRecord(table, '-1', { query })).
    const presetQuery = pick(typeof loc.query === 'string' ? loc.query : '', query.query)
    const page = String(loc.page || '')
    const go = (next: { sysId?: string; view?: string; table?: string; query?: string }) => {
        const id = next.sysId !== undefined ? next.sysId : sysId
        // Only the URL's own view travels with navigation (never the remembered or automatic one).
        const v = next.view !== undefined ? next.view : urlView
        navigate(page, {
            table: next.table || table,
            sysId: id || undefined,
            view: next.table ? next.view || undefined : v || undefined,
            query: next.query || undefined,
        })
    }
    const [dirty, setDirty] = useState(false)

    // Header slots on this layout (app-shell sub-header)?
    const leftSlot = useHeaderSlot('left')
    const rightSlot = useHeaderSlot('right')
    const toHeader = options.headerPlacement !== 'inline' && !!(leftSlot && rightSlot)

    const listPage = useMemo(() => {
        const target = options.listPage || ''
        if (!target) return ''
        const pages: any[] = (portal && portal.pages) || []
        return pages.some((p) => [p.route, p.routePattern, p.route_pattern, p.path].indexOf(target) >= 0) ? target : ''
    }, [portal && portal.pages, options.listPage])

    const back = listPage ? (
        <Button variant="ghost" size="icon-sm" aria-label="Back to the list" title="Back to the list" className="shrink-0" render={<Link to={listPage} table={table} />} data-rp-form-back="">
            <Icon name="arrow-left" />
        </Button>
    ) : null
    const newButton = (
        <Button variant="outline" size={toHeader ? 'sm' : 'default'} onClick={() => confirmDiscard(dirty).then((ok) => ok && go({ sysId: '-1' }))} data-rp-new-record="">
            <IconPlus size={14} /> New
        </Button>
    )
    const picker = <RecordPicker table={table} baseQuery={options.pickerQuery || ''} onPick={(id) => confirmDiscard(dirty).then((ok) => ok && go({ sysId: id }))} />
    const headerSlots = toHeader
        ? {
              left: (node: any) => (
                  <HeaderSlot name="left">
                      <div className="flex min-w-0 items-center gap-2">
                          {back}
                          {node}
                      </div>
                  </HeaderSlot>
              ),
              right: (node: any) => (
                  <HeaderSlot name="right">
                      <div className="flex min-w-0 items-center justify-end gap-1.5">{node}</div>
                  </HeaderSlot>
              ),
          }
        : undefined

    return (
        <div className="flex min-w-0 flex-col gap-4" data-rp-record-form-widget="">
            {/* Queued dialogs (discard confirmation, g_modal from client scripts) render here. */}
            <DialogOutlet />
            {options.picker !== false ? (
                toHeader ? (
                    // Header bar: New sits with the record's actions (headerActions). The picker only
                    // shows while no record is open (the bar has no room next to the UI actions; the
                    // list page is the way to find records). No record yet: New goes to the right slot.
                    !sysId ? (
                        <>
                            <HeaderSlot name="right">
                                <div className="flex items-center justify-end gap-1.5">{newButton}</div>
                            </HeaderSlot>
                            <Card>
                                <CardContent className="flex flex-wrap items-center gap-3">{picker}</CardContent>
                            </Card>
                        </>
                    ) : null
                ) : (
                    <Card>
                        <CardContent className="flex flex-wrap items-center gap-3">
                            {back}
                            {picker}
                            {/* The demo New only while no record is open: an open record's New / Insert come from its UI actions. */}
                            {!sysId ? newButton : null}
                        </CardContent>
                    </Card>
                )
            ) : null}
            {toHeader && !sysId && back ? (
                <HeaderSlot name="left">
                    <div className="flex min-w-0 items-center gap-2">{back}<h1 className="m-0 truncate text-sm font-medium">{portal && portal.page ? portal.page.title || portal.page.name : ''}</h1></div>
                </HeaderSlot>
            ) : null}
            {sysId && !resolved.ready ? null : sysId ? (
                <FormFor
                    key={`${table}|${sysId}|${view}|${presetQuery}`}
                    table={table}
                    sysId={sysId}
                    view={view}
                    query={presetQuery}
                    showViews={options.showViews !== false && !lockView}
                    viewPinned={resolved.source !== 'auto'}
                    missingView={resolved.missing}
                    headerSlots={headerSlots}
                    presentation={options.presentation === 'tabs' ? 'tabs' : options.presentation === 'stacked' ? 'stacked' : undefined}
                    attachments={options.attachments === 'below' || options.attachments === 'header' ? options.attachments : undefined}
                    relatedLists={options.relatedLists === 'tabs' || options.relatedLists === 'stacked' || options.relatedLists === 'off' ? options.relatedLists : undefined}
                    activity={options.activity === 'notes' || options.activity === 'below' ? options.activity : undefined}
                    onDirty={setDirty}
                    onViewChange={(v) => {
                        confirmDiscard(dirty).then((ok) => {
                            if (!ok) return
                            // '' = Automatic (forget the remembered view), 'default' = force Default.
                            resolved.setRemembered(v)
                            go({ view: v })
                        })
                    }}
                    onCreated={(id) => go({ sysId: id })}
                    onOpenRecord={(t, id, params) => confirmDiscard(dirty).then((ok) => ok && go({ table: t, sysId: id, view: '', query: params && params.query ? String(params.query) : undefined }))}
                />
            ) : (
                <Card>
                    <CardContent className="text-sm text-muted-foreground">Pick a record or create a new one.</CardContent>
                </Card>
            )}
        </div>
    )
}

function FormFor(props: {
    table: string
    sysId: string
    view: string
    query: string
    showViews: boolean
    viewPinned?: boolean
    missingView?: string
    headerSlots?: { left?: (node: any) => any; right?: (node: any) => any }
    headerActions?: any
    presentation?: 'stacked' | 'tabs'
    attachments?: 'off' | 'below' | 'header'
    relatedLists?: 'auto' | 'tabs' | 'stacked' | 'off'
    activity?: 'off' | 'notes' | 'below'
    onDirty: (d: boolean) => void
    onViewChange: (v: string) => void
    onCreated: (id: string) => void
    onOpenRecord: (table: string, sysId: string, params?: Record<string, unknown>) => void
}) {
    const form = useRecordForm({
        table: props.table,
        sysId: props.sysId,
        view: props.view,
        query: props.query,
        onSaved: (result, info) => {
            if (info.isNew && result.sysId) props.onCreated(result.sysId)
        },
        onOpenRecord: props.onOpenRecord,
    })
    const meta = useFormMeta(form)
    const { onDirty } = props
    useEffect(() => onDirty(meta.isDirty), [meta.isDirty, onDirty])
    return <RecordForm form={form} showViews={props.showViews} viewPinned={props.viewPinned} missingView={props.missingView} onViewChange={props.onViewChange} headerSlots={props.headerSlots} headerActions={props.headerActions} presentation={props.presentation} attachments={props.attachments} relatedLists={props.relatedLists} activity={props.activity} />
}

/** Columns the picker searches and shows, when the table has them (first = label). */
const SEARCH_FIELDS = ['number', 'name', 'short_description', 'user_name', 'title']

function RecordPicker({ table, baseQuery, onPick }: { table: string; baseQuery: string; onPick: (sysId: string) => void }) {
    const [text, setText] = useState('')
    const [open, setOpen] = useState(false)
    const term = useDebouncedValue(text.trim(), 250).replace(/\^/g, '')
    const t = safeName(table, 'table')
    const tableMeta = useTableMeta(t)
    const cols = tableMeta.data ? SEARCH_FIELDS.filter((f) => !!tableMeta.data![f]).slice(0, 2) : []
    const like = term && cols.length ? cols.map((c) => `${c}LIKE${term}`).join('^OR') : ''
    const q = [baseQuery, like, 'ORDERBYDESCsys_updated_on'].filter(Boolean).join('^')
    const search = useGraphQL(
        `query rpRecordPick($q: String) { GlideRecord_Query { ${t}(queryConditions: $q, pagination: { limit: 15 }) { _results { sys_id { value } ${cols.map((f) => `${f} { displayValue }`).join(' ')} } } } }`,
        { q },
        { keepPrevious: true, enabled: !!tableMeta.data },
    )
    const items: ComboItem[] = useMemo(() => {
        const rows = (search.data && search.data.GlideRecord_Query && search.data.GlideRecord_Query[t] && search.data.GlideRecord_Query[t]._results) || []
        return rows.map((r: any) => ({
            value: r.sys_id.value,
            label: (cols[0] && r[cols[0]] && r[cols[0]].displayValue) || r.sys_id.value,
            description: cols[1] && r[cols[1]] ? r[cols[1]].displayValue : undefined,
        }))
    }, [search.data, t, cols.join(',')])
    const labels = cols.map((c) => (tableMeta.data && tableMeta.data[c] ? tableMeta.data[c].label.toLowerCase() : c))
    return (
        <div className="min-w-64 flex-1" data-rp-record-picker="">
            <Combobox
                aria-label={`Find a ${table} record`}
                placeholder={labels.length ? `Search by ${labels.join(' or ')}…` : 'Search…'}
                inputValue={text}
                onInputChange={setText}
                open={open}
                onOpenChange={setOpen}
                items={items}
                loading={search.isFetching}
                startAdornment={<IconSearch size={14} className="text-muted-foreground" />}
                onSelect={(item) => {
                    setText('')
                    setOpen(false)
                    onPick(item.value)
                }}
            />
        </div>
    )
}
