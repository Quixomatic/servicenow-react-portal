import { useState } from 'react'
import { Embed, useEmbeddedWidget, useServer } from '@portal/runtime'
import ServerClock from 'components:app/server-clock'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card'
import { Badge } from 'components:badge'
import { Button } from 'components:button'

/**
 * Embedded widgets: Server Clock imported as a component and rendered as its OWN instances
 * (own id, options, server script, on-load data), four ways.
 */
export default function EmbedDemo({ options }: { options: { title?: string } }) {
    const { data, pending } = useServer()
    const [refreshes, setRefreshes] = useState(0)
    const [format, setFormat] = useState<'datetime' | 'date' | 'time'>('date')
    // spUtils.get equivalent: fetched on demand (and again whenever the options change).
    const fetched = useEmbeddedWidget(ServerClock, { title: 'Fetched (useEmbeddedWidget)', format }, { key: 'fetched' })
    const built = (data as any)?.built

    return (
        <Card>
            <CardHeader>
                <CardTitle>{options?.title || 'Embedded widgets'}</CardTitle>
                <CardDescription>
                    Each clock below is Server Clock running as its own instance inside this widget. The client-declared clocks initialize in one
                    batched request; the server-built clock arrives with this widget's own data.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <section aria-label="Client-declared A" className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">1 · Client-declared (embedKey "client-a")</h3>
                    <ServerClock embedKey="client-a" options={{ title: 'Client-declared A', format: 'datetime' }} onRefresh={() => setRefreshes((n) => n + 1)}>
                        <p className="text-xs text-muted-foreground">
                            children and onRefresh are client-only props · refreshed <span aria-live="polite">{refreshes}</span>×
                        </p>
                    </ServerClock>
                </section>
                <section aria-label="Client-declared B" className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">2 · Client-declared, forged badge (dropped)</h3>
                    {/* badge is "x-embed": "server" in Server Clock's schema: the server ignores it from the client. */}
                    <ServerClock embedKey="client-b" options={{ title: 'Client-declared B', format: 'time', badge: 'forged' }} />
                </section>
                <section aria-label="Server-built" className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">3 · Server-built ($sp.getWidget, signed options)</h3>
                    {built ? <ServerClock model={built} /> : <div className="h-40 animate-pulse rounded-lg bg-muted/60" aria-busy={pending} />}
                </section>
                <section aria-label="Fetched on demand" className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-medium text-muted-foreground">4 · Fetched on demand (useEmbeddedWidget)</h3>
                        <div className="flex gap-1" role="group" aria-label="Fetched clock format">
                            {(['date', 'time', 'datetime'] as const).map((f) => (
                                <Button key={f} size="sm" variant={format === f ? 'default' : 'outline'} aria-pressed={format === f} onClick={() => setFormat(f)}>
                                    {f}
                                </Button>
                            ))}
                        </div>
                    </div>
                    {fetched.model ? (
                        <Embed model={fetched.model} />
                    ) : fetched.error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {String(fetched.error.message || fetched.error)}
                        </p>
                    ) : (
                        <div className="h-40 animate-pulse rounded-lg bg-muted/60" aria-busy="true" />
                    )}
                    {fetched.pending && fetched.model ? <Badge variant="secondary">refetching…</Badge> : null}
                </section>
            </CardContent>
        </Card>
    )
}
