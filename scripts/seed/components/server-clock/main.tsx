import { useState } from 'react'
import { useComponent } from '@portal/runtime'
import { Card, CardHeader, CardTitle, CardContent } from 'components:card'
import { Button } from 'components:button'
import { Badge } from 'components:badge'

type ClockData = { serverTime?: string; user?: string; action?: string; echo?: string }

/** On-load widget: initial data comes from its server script; buttons call it again. */
export default function ServerClock() {
    const { data, pending, error, server } = useComponent()
    const d = (data || {}) as ClockData
    const [reply, setReply] = useState<unknown>(null)

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Server script</CardTitle>
                <Badge variant="secondary">{d.action || (pending ? 'loading' : '—')}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                {error ? <p className="text-sm text-destructive">{String((error as Error).message || error)}</p> : null}
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Server time</dt>
                    <dd className="font-mono">{d.serverTime || '—'}</dd>
                    <dt className="text-muted-foreground">Hello</dt>
                    <dd className="font-mono">{d.user || '—'}</dd>
                </dl>
                <div className="flex gap-2">
                    <Button size="sm" onClick={() => server.get({ message: 'ping from the browser' }).then(setReply, (e: Error) => setReply({ error: e.message }))}>
                        server.get()
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => server.refresh()}>
                        server.refresh()
                    </Button>
                </div>
                {reply ? <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(reply, null, 2)}</pre> : null}
            </CardContent>
        </Card>
    )
}
