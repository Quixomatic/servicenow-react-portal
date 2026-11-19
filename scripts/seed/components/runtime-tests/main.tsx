import { useEffect, useState } from 'react'
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
    format,
} from '@portal/runtime'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card'
import { Badge } from 'components:badge'
import { Button } from 'components:button'

type Status = 'pass' | 'fail' | 'pending'
type Check = { name: string; status: Status; detail: string }

const check = (name: string, ok: boolean | null, detail: unknown): Check => ({
    name,
    status: ok === null ? 'pending' : ok ? 'pass' : 'fail',
    detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
})

/** Live "unit tests" for every @portal/runtime hook and the $sp server helper. */
export default function RuntimeTests() {
    const { data, pending, server } = useServer()
    const user = useUser()
    const { theme, resolvedTheme } = useTheme()
    const { portal } = usePortal()
    const utils = usePortalUtils()
    const save = useMessage('Save')
    const msgs = useMessages(['Cancel', 'Search'])
    const welcome = useProperty('x_312987_portal.public.welcome')
    const props = useProperties(['x_312987_portal.public.welcome', 'glide.servlet.uri'])
    const me = useRecord('sys_user', user.sysId, { fields: 'name,email,user_name' })
    const incidents = useTableQuery('incident', { query: 'active=true', fields: 'number,short_description,priority', limit: 5, orderBy: '-sys_updated_on' })

    const [ping, setPing] = useState<any>(null)
    const [fetched, setFetched] = useState<any>(null)
    const [inputs, setInputs] = useState<any>(null)
    const [updated, setUpdated] = useState<any>(null)
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
        check('$sp.getValue (option)', sp ? sp.option === 'from placement options' : null, sp?.option),
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
                </div>
            </CardHeader>
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
