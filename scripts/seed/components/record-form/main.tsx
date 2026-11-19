import { useEffect, useMemo, useState } from 'react'
import { usePortal, usePortalLocation, useNavigate } from '@portal/runtime'
import { Card, CardContent } from 'components:card'
import { Button } from 'components:button'
import { useGraphQL, useDebouncedValue, useTableMeta, safeName } from 'utilities:app/graphql'
import { IconPlus, IconSearch, useFormMeta } from 'components:app/field'
import { Combobox } from 'components:app/combobox'
import type { ComboItem } from 'components:app/combobox'
import { RecordForm, useRecordForm } from 'components:app/form'

/**
 * components:app/record-form: a record's real form view (app/form) as a page widget.
 *
 * Like Service Portal's form widget: table / sys_id / view come from the widget options, else the
 * route params, else the URL params (table, sys_id, view; sys_id=-1 is a new record), so one
 * generic `form` page serves any table. With `picker` (a demo convenience), a search box finds
 * records of the table (number / short description) and "New" opens a new record (the platform
 * reserves its number on load).
 *
 * Options: { table, sysId, view, picker, showViews, pickerQuery }
 */
type Options = { table?: string; sysId?: string; view?: string; picker?: boolean; showViews?: boolean; pickerQuery?: string }

function confirmDiscard(dirty: boolean) {
    return !dirty || window.confirm('Discard your unsaved changes?')
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
    // URL params: today location.query is the parsed query object; the standard-params plumbing
    // adds location.params (and location.query becomes the `query` URL param). Read both.
    const query = (loc.params && typeof loc.params === 'object' ? loc.params : null) || (loc.query && typeof loc.query === 'object' ? loc.query : {})
    const route = (portal && portal.page && portal.page.params) || {}
    // Like Service Portal's form widget: widget options, then route params, then URL params
    // (usePortalLocation's table / sysId / view, else the raw query string).
    const rawTable = pick(options.table, route.table, loc.table, query.table, 'incident')
    const table = NAME.test(rawTable) ? rawTable : 'incident'
    const sysId = pick(options.sysId, route.sys_id, route.sysId, loc.sysId, query.sys_id)
    const view = pick(options.view, route.view, loc.view, query.view)
    // Encoded query presetting a new record (g_aw.openRecord(table, '-1', { query })).
    const presetQuery = pick(typeof loc.query === 'string' ? loc.query : '', query.query)
    const page = String(loc.page || '')
    const go = (next: { sysId?: string; view?: string; table?: string; query?: string }) => {
        const params = new URLSearchParams()
        const id = next.sysId !== undefined ? next.sysId : sysId
        const v = next.view !== undefined ? next.view : view
        params.set('table', next.table || table)
        if (id) params.set('sys_id', id)
        if (v && !next.table) params.set('view', v)
        if (next.query) params.set('query', next.query)
        navigate(page, { q: params.toString() })
    }
    const [dirty, setDirty] = useState(false)

    return (
        <div className="flex flex-col gap-4" data-rp-record-form-widget="">
            {options.picker !== false ? (
                <Card>
                    <CardContent className="flex flex-wrap items-center gap-3">
                        <RecordPicker table={table} baseQuery={options.pickerQuery || ''} onPick={(id) => confirmDiscard(dirty) && go({ sysId: id })} />
                        <Button variant="outline" onClick={() => confirmDiscard(dirty) && go({ sysId: '-1' })} data-rp-new-record="">
                            <IconPlus size={14} /> New
                        </Button>
                    </CardContent>
                </Card>
            ) : null}
            {sysId ? (
                <FormFor
                    key={`${table}|${sysId}|${view}|${presetQuery}`}
                    table={table}
                    sysId={sysId}
                    view={view}
                    query={presetQuery}
                    showViews={options.showViews !== false}
                    onDirty={setDirty}
                    onViewChange={(v) => confirmDiscard(dirty) && go({ view: v })}
                    onCreated={(id) => go({ sysId: id })}
                    onOpenRecord={(t, id, params) => confirmDiscard(dirty) && go({ table: t, sysId: id, view: '', query: params && params.query ? String(params.query) : undefined })}
                />
            ) : (
                <Card>
                    <CardContent className="text-sm text-muted-foreground">Pick a record or create a new one.</CardContent>
                </Card>
            )}
        </div>
    )
}

function FormFor(props: { table: string; sysId: string; view: string; query: string; showViews: boolean; onDirty: (d: boolean) => void; onViewChange: (v: string) => void; onCreated: (id: string) => void; onOpenRecord: (table: string, sysId: string, params?: Record<string, unknown>) => void }) {
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
    return <RecordForm form={form} showViews={props.showViews} onViewChange={props.onViewChange} />
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
