import { useEffect, useRef, useState } from 'react'
import {
    useServer,
    useUser,
    useTheme,
    useMessage,
    useMessages,
    useProperty,
    useProperties,
    useRecord,
    useTableQuery,
    usePortalUtils,
    usePortal,
    usePortalLocation,
    useAmbStatus,
    useRecordWatch,
    format,
} from '@portal/runtime'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card'
import { Badge } from 'components:badge'
import { Button } from 'components:button'
import ServerClock from 'components:app/server-clock'

type Status = 'pass' | 'fail' | 'pending'
type Check = { name: string; status: Status; detail: string }

const RW_ID = '34f4b59b83e05310e8fbc9a6feaad3e4' // INC0020831, the dedicated demo incident the server script touches
const ambDiag = () => ((window as any).__rpAmb && (window as any).__rpAmb.diagnostics ? (window as any).__rpAmb.diagnostics() : null)

/** Mounted briefly to prove a watch is released (registry + client) after unmount. */
function ProbeWatch({ query, onStatus }: { query: string; onStatus: (status: string, channel: string | null) => void }) {
    const w = useRecordWatch('sys_user', query, undefined, { invalidate: false })
    useEffect(() => onStatus(w.status, w.channel), [w.status])
    return null
}

const check = (name: string, ok: boolean | null, detail: unknown): Check => ({
    name,
    status: ok === null ? 'pending' : ok ? 'pass' : 'fail',
    detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
})

/** Live "unit tests" for every @portal/runtime hook and the $sp server helper. */
export default function RuntimeTests() {
    const { data, pending, server, instanceId } = useServer()
    const user = useUser()
    const { theme, resolvedTheme } = useTheme()
    const { portal } = usePortal()
    const loc = usePortalLocation() as any
    const utils = usePortalUtils()
    const save = useMessage('Save')
    const msgs = useMessages(['Cancel', 'Search'])
    const welcome = useProperty('x_312987_portal.public.welcome')
    const props = useProperties(['x_312987_portal.public.welcome', 'glide.servlet.uri'])
    const me = useRecord('sys_user', user.sysId, { fields: 'name,email,user_name' })
    const incidents = useTableQuery('incident', { query: 'active=true', fields: 'number,short_description,priority', limit: 5, orderBy: '-sys_updated_on' })

    // ---- record watch (AMB) -----------------------------------------------------------------------
    const amb = useAmbStatus()
    const rwQuery = `sys_id=${RW_ID}`
    const [rwEvents, setRwEvents] = useState<any[]>([])
    const watch = useRecordWatch('incident', rwQuery, (e: any) => setRwEvents((l) => l.concat({ action: e.action, operation: e.operation, changes: e.changes, modCount: e.modCount })), { invalidate: false })
    const twin = useRecordWatch('incident', rwQuery, undefined, { invalidate: false }) // same channel: shared
    const [shared, setShared] = useState<any>(null)
    const rwToken = useRef(String(Date.now()))
    const [rwTouch, setRwTouch] = useState<any>(null)
    useEffect(() => {
        if (watch.status !== 'subscribed' || rwTouch) return
        const d = ambDiag()
        const mine = d ? d.channels.filter((c: any) => c.name === watch.channel) : []
        setShared({ channels: mine.length, listeners: mine[0] ? mine[0].listeners : 0, source: d && d.source, twin: twin.channel === watch.channel })
        setRwTouch({ sent: true })
        server.get({ rwTouch: rwToken.current }, { toast: false }).then(
            (d: any) => setRwTouch({ ok: d.rwTouched === rwToken.current }),
            (e: Error) => setRwTouch({ error: e.message }),
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watch.status])
    const [rwTimedOut, setRwTimedOut] = useState(false)
    useEffect(() => {
        if (!rwTouch || !rwTouch.ok) return undefined
        const id = setTimeout(() => setRwTimedOut(true), 10000)
        return () => clearTimeout(id)
    }, [rwTouch])
    // Lifecycle: mount a probe watch, unmount it once subscribed, then expect the channel gone.
    const [probe, setProbe] = useState<{ mounted: boolean; channel: string | null; released: boolean | null }>({ mounted: true, channel: null, released: null })
    const onProbe = (status: string, channel: string | null) => {
        if (status === 'subscribed' && probe.mounted) setProbe({ mounted: false, channel, released: null })
    }
    useEffect(() => {
        if (probe.mounted || !probe.channel) return undefined
        const id = setTimeout(() => {
            const d = ambDiag()
            const ours = d ? d.channels.some((c: any) => c.name === probe.channel) : true
            const client = d && d.clientChannels ? d.clientChannels.indexOf(probe.channel!) >= 0 : false
            setProbe((p) => ({ ...p, released: !ours && !client }))
        }, 2500)
        return () => clearTimeout(id)
    }, [probe.mounted, probe.channel])

    const [ping, setPing] = useState<any>(null)
    const [fetched, setFetched] = useState<any>(null)
    const [inputs, setInputs] = useState<any>(null)
    const [updated, setUpdated] = useState<any>(null)
    const [embedClient, setEmbedClient] = useState<any>(null)
    const [embedSigned, setEmbedSigned] = useState<any>(null)
    const [embedDenied, setEmbedDenied] = useState<any>(null)
    useEffect(() => {
        server.get({ ping: 'pong' }).then(setPing, (e: Error) => setPing({ error: e.message }))
        // Staged inputs go with the next call only; pinned ones (static or read at call time) with every call.
        server.pinInputs({ pinned: 'P', live: () => 'L' })
        server.setInputs({ staged: 'S' })
        server
            .get({ call: 'C' })
            .then((first: any) => server.get().then((second: any) => ({ first: first.input, second: second.input })))
            .then((r: any) => {
                setInputs(r)
                // update() sends inputs only: the server script starts with empty data.
                return server.update({ upd: 1 }).then((d: any) => setUpdated({ startKeys: d.startKeys, upd: d.input?.upd, pinned: d.input?.pinned, action: d.action }))
            })
            .catch((e: Error) => setInputs({ error: e.message }))
        utils
            .fetchJson('/api/now/table/sys_user?sysparm_limit=1&sysparm_fields=sys_id')
            .then((r: any) => setFetched({ ok: Array.isArray(r.result), count: r.result?.length }), (e: Error) => setFetched({ error: e.message }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Embedded widgets: a client-fetched model (getWidget), the signed server-built model's token
    // round trip, and a request for a widget this component doesn't import.
    const execEmbed = (embed: any) =>
        fetch(`/api/x_312987_portal/rp/instances/${instanceId}/execute`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { ...utils.getHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ portal: portal?.slug, action: 'get', embed }),
        }).then(async (r) => ({ status: r.status, data: ((await r.json().catch(() => null)) || {}).result?.data }))
    // Only the initialize result carries it (update() replaces data), so keep the first one seen.
    const [serverModel, setServerModel] = useState<any>(null)
    useEffect(() => {
        if (!serverModel && (data as any)?.embedModel) setServerModel((data as any).embedModel)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])
    useEffect(() => {
        if (!instanceId || !serverModel || embedSigned) return
        utils
            .getWidget(ServerClock, { title: 'Runtime Tests (client)', badge: 'forged' }, { key: 'rt-client' })
            .then((m: any) => setEmbedClient({ ok: m.ok, token: m.token, instanceId: m.data?.instanceId, embedded: m.data?.embedded, badge: m.data?.badge, title: m.options?.title, error: m.error?.message }), (e: Error) => setEmbedClient({ error: e.message }))
        const path = ['app/server-clock']
        const keys = ['rt-srv']
        Promise.all([
            execEmbed({ path, keys, options: serverModel.options, token: serverModel.token }),
            execEmbed({ path, keys, options: { ...serverModel.options, title: 'tampered' }, token: serverModel.token }),
        ]).then(
            ([signed, tampered]) => setEmbedSigned({ signed: signed.data?.badge, tampered: tampered.data?.badge, tamperedTitle: tampered.data?.title, status: [signed.status, tampered.status] }),
            (e: Error) => setEmbedSigned({ error: e.message }),
        )
        execEmbed({ path: ['app/hello-card'], keys: ['nope'], options: {} }).then((r) => setEmbedDenied({ status: r.status }), (e: Error) => setEmbedDenied({ error: e.message }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instanceId, serverModel])

    const sp = (data as any)?.sp
    const checks: Check[] = [
        check('useUser: current user', !!user.sysId && !!user.name, `${user.name} (${user.userName}), ${user.roles.length} roles`),
        check('useUser: hasRole("admin")', user.hasRole('admin'), String(user.hasRole('admin'))),
        check('useTheme', !!resolvedTheme, `theme=${theme} resolved=${resolvedTheme}`),
        check('usePortal', !!portal?.slug, `portal=${portal?.slug}`),
        check('useMessage("Save")', save ? !!save : null, save || '…'),
        check('useMessages', msgs.isLoading ? null : !!msgs.messages?.Cancel, msgs.messages),
        check('useProperty (exposed)', welcome.isLoading ? null : welcome.value === 'Hello from a system property', welcome.value),
        check('useProperties (unexposed → null)', props.isLoading ? null : props.values?.['glide.servlet.uri'] === null, props.values),
        check('useRecord(sys_user, me)', me.isLoading ? null : me.data?.user_name === user.userName, me.error ? String(me.error) : me.data),
        check('useTableQuery(incident)', incidents.isLoading ? null : Array.isArray(incidents.data), incidents.error ? String(incidents.error) : `${incidents.data?.length} rows: ${(incidents.data || []).map((r: any) => r.number).join(', ')}`),
        check('format', format('{0} of {1}', 1, 2) === '1 of 2' && utils.format('{a}-{b}', { a: 'x', b: 'y' }) === 'x-y', format('{0} of {1}', 1, 2)),
        check('usePortalUtils.fetchJson', fetched ? !!fetched.ok : null, fetched),
        check('useServer: on-load data ($sp)', pending ? null : !!sp && sp.userIsSelf && sp.canReadSelf, sp),
        check('useServer: server.get(input)', ping ? ping.sp?.parameter === 'pong' && ping.action === 'get' : null, ping ? { parameter: ping.sp?.parameter, action: ping.action } : '…'),
        check(
            'useServer: staged inputs consumed, pinned kept',
            inputs ? !inputs.error && inputs.first?.staged === 'S' && inputs.first?.call === 'C' && inputs.first?.pinned === 'P' && inputs.first?.live === 'L' && !inputs.second?.staged && !inputs.second?.call && inputs.second?.pinned === 'P' : null,
            inputs || '…',
        ),
        check('useServer: update(input) sends no data back', updated ? updated.startKeys === 0 && updated.upd === 1 && updated.pinned === 'P' && updated.action === 'update' : null, updated || '…'),
        check('$sp.getProperty', sp ? sp.property === 'Hello from a system property' : null, sp?.property),
        check(
            'URL params: client + $sp.getParameter',
            pending || !(data as any)?.url
                ? null
                : ['table', 'sys_id', 'view', 'query'].every((k) => String((data as any).url[k] || '') === String((k === 'sys_id' ? loc?.sysId : loc?.[k]) || '')),
            { client: { table: loc?.table, sysId: loc?.sysId, view: loc?.view, query: loc?.query }, server: (data as any)?.url },
        ),
        check('$sp.getValue (option)', sp ? sp.option === 'from placement options' : null, sp?.option),
        check(
            '$sp.getWidget: server-built model',
            pending ? null : !!serverModel && serverModel.ok && !!serverModel.token && serverModel.data?.embedded === true && serverModel.data?.badge === 'signed' && serverModel.data?.instanceId === `${instanceId}~rt-srv`,
            serverModel ? { ok: serverModel.ok, key: serverModel.key, badge: serverModel.data?.badge, instanceId: serverModel.data?.instanceId, token: serverModel.token ? 'yes' : 'no', error: serverModel.error } : '…',
        ),
        check(
            'getWidget: client model, own instance',
            embedClient ? embedClient.ok && embedClient.embedded === true && embedClient.instanceId === `${instanceId}~rt-client` && embedClient.badge === '' && embedClient.token === null : null,
            embedClient || '…',
        ),
        check('embed: signed options kept, tampered dropped', embedSigned ? embedSigned.signed === 'signed' && embedSigned.tampered === '' && embedSigned.tamperedTitle === 'tampered' : null, embedSigned || '…'),
        check('useAmbStatus: connected', amb.connection === 'connecting' ? null : amb.connection === 'open', amb),
        check('useRecordWatch: subscribed', watch.status === 'subscribing' || watch.status === 'idle' ? null : watch.status === 'subscribed', { status: watch.status, error: watch.error, channel: watch.channel }),
        check('useRecordWatch: two hooks share one channel', shared ? shared.channels === 1 && shared.listeners >= 2 && shared.twin : null, shared || '…'),
        check(
            'useRecordWatch: fires after a server write',
            rwTouch && rwTouch.error ? false : rwEvents.length ? true : rwTimedOut ? false : null,
            { touch: rwTouch, record: 'incident INC0020831', events: rwEvents.slice(-2) },
        ),
        check('useRecordWatch: released after unmount', probe.released, probe),
        check('embed: non-imported widget → 404', embedDenied ? embedDenied.status === 404 : null, embedDenied || '…'),
    ]
    const passed = checks.filter((c) => c.status === 'pass').length
    const failed = checks.filter((c) => c.status === 'fail').length

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle>Runtime tests</CardTitle>
                    <CardDescription>
                        {passed}/{checks.length} passing{failed ? ` · ${failed} failing` : ''}
                    </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => utils.addInfoMessage('Info toast from usePortalUtils')}>
                        Info toast
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => utils.addErrorMessage('Error toast from usePortalUtils')}>
                        Error toast
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => utils.addTrivialMessage('Trivial toast')}>
                        Trivial toast
                    </Button>
                    {/* Server-side: the script raises gs/$sp messages, or throws; both reach the page as toasts. */}
                    <Button size="sm" variant="outline" onClick={() => server.get({ raiseMessages: true }).catch(() => {})}>
                        Server messages
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => server.get({ raiseError: true }).catch(() => {})}>
                        Server error
                    </Button>
                </div>
            </CardHeader>
            {probe.mounted && user.userName ? <ProbeWatch query={`user_name=${user.userName}`} onStatus={onProbe} /> : null}
            <CardContent className="px-0">
                <div className="divide-y divide-border">
                    {checks.map((c) => (
                        <div key={c.name} className="grid grid-cols-[4.5rem_16rem_minmax(0,1fr)] items-center gap-3 px-6 py-2 text-sm">
                            <Badge variant={c.status === 'pass' ? 'default' : c.status === 'fail' ? 'destructive' : 'secondary'}>{c.status}</Badge>
                            <span className="font-medium">{c.name}</span>
                            <code className="truncate text-xs text-muted-foreground" title={c.detail}>
                                {c.detail}
                            </code>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
