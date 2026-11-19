import { useEffect, useRef, useState } from 'react'
import { useServer, useUser, useMessage, usePortalUtils } from '@portal/runtime'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card'
import { Button } from 'components:button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from 'components:dropdown-menu'
import { IncidentRow, type Incident } from './parts/IncidentRow'

type ListData = { rows?: Incident[]; filter?: string; search?: string; canAssign?: boolean; message?: string; error?: string }
type Props = { options?: { title?: string } }

const FILTERS = [
    { value: 'active', label: 'Active' },
    { value: 'mine', label: 'Assigned to me' },
    { value: 'opened', label: 'Opened by me' },
]

/**
 * Incidents list driven by the component's server script (useServer): the initial rows come from
 * the on-load server call; filtering, searching and "Assign to me" call server.get(input).
 */
export default function IncidentList({ options = {} }: Props) {
    const { data, pending, error, server } = useServer()
    const user = useUser()
    const utils = usePortalUtils()
    const t = {
        title: useMessage('Incidents'),
        search: useMessage('Search incidents'),
        refresh: useMessage('Refresh'),
        empty: useMessage('No incidents match'),
    }

    const initial = (data || {}) as ListData
    const [rows, setRows] = useState<Incident[] | null>(null)
    const [filter, setFilter] = useState('active')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const first = useRef(true)

    const list = rows ?? initial.rows ?? []
    const canAssign = initial.canAssign ?? user.hasRole('itil')

    const load = (input: Record<string, unknown> = {}) => {
        setLoading(true)
        return server
            .get({ filter, search, ...input })
            .then((res: ListData) => {
                setRows(res.rows || [])
                if (res.error) utils.addErrorMessage(res.error)
                else if (res.message) utils.addInfoMessage(res.message)
                return res
            })
            .catch((e: Error) => utils.addErrorMessage(e.message))
            .finally(() => setLoading(false))
    }

    // Refetch when the filter changes or the search settles (debounced). Skip the first render:
    // the on-load server call already delivered the default list.
    useEffect(() => {
        if (first.current) {
            first.current = false
            return
        }
        const id = setTimeout(() => load(), 350)
        return () => clearTimeout(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, search])

    const activeLabel = FILTERS.find((f) => f.value === filter)?.label || 'Active'

    return (
        <Card>
            <CardHeader className="gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle>{options.title || t.title}</CardTitle>
                        <CardDescription>
                            {utils.format('Hi {0} · {1} shown', user.firstName || user.name, list.length)}
                            {canAssign ? '' : ' · read only (itil role needed to assign)'}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t.search}
                            className="h-8 w-56 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>{activeLabel} ▾</DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {FILTERS.map((f) => (
                                    <DropdownMenuItem key={f.value} onClick={() => setFilter(f.value)}>
                                        {f.label}
                                        {f.value === filter ? <span className="ml-auto text-xs text-muted-foreground">✓</span> : null}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" onClick={() => load()} disabled={loading}>
                            {loading ? '…' : t.refresh}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                {error ? <p className="px-6 text-sm text-destructive">{String((error as Error).message || error)}</p> : null}
                {pending && !rows ? (
                    <div className="space-y-2 px-6">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                        ))}
                    </div>
                ) : list.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-muted-foreground">{t.empty}</p>
                ) : (
                    <div className={'divide-y divide-border transition-opacity ' + (loading ? 'opacity-60' : '')}>
                        {list.map((row) => (
                            <IncidentRow key={row.sys_id} incident={row} canAssign={canAssign} onAssign={() => load({ action: 'assign', sys_id: row.sys_id })} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
