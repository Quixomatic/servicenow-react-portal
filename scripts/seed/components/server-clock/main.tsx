import { useState, type ReactNode } from 'react';
import { useComponent } from '@portal/runtime';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components:card';
import { Button } from 'components:button';
import { Badge } from 'components:badge';

type ClockData = {
    serverTime?: string;
    user?: string;
    action?: string;
    echo?: string;
    instanceId?: string;
    embedded?: boolean;
    key?: string | null;
    badge?: string;
};
type ClockOptions = { title?: string; format?: string; badge?: string };

/**
 * On-load widget: initial data comes from its server script; buttons call it again.
 * Placed on a page or embedded in another widget (import ServerClock from 'components:app/server-clock'):
 * embedded, it's its own instance with its own options. `children` and `onRefresh` are client-only props.
 */
export default function ServerClock({
    embedded,
    children,
    onRefresh,
}: {
    embedded?: boolean;
    children?: ReactNode;
    onRefresh?: (data: ClockData) => void;
}) {
    const { data, options, pending, error, server, instanceId } = useComponent();
    const d = (data || {}) as ClockData;
    const o = (options || {}) as ClockOptions;
    const [reply, setReply] = useState<unknown>(null);

    return (
        <Card data-embedded={embedded ? '' : undefined}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                    <CardTitle>{o.title || 'Server script'}</CardTitle>
                    <CardDescription className="truncate font-mono text-xs" title={instanceId}>
                        {embedded ? 'embedded · ' : ''}
                        {instanceId}
                    </CardDescription>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {d.badge ? <Badge>{d.badge}</Badge> : null}
                    <Badge variant="secondary">{d.action || (pending ? 'loading' : '—')}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {error ? (
                    <p role="alert" className="text-sm text-destructive">
                        {String((error as Error).message || error)}
                    </p>
                ) : null}
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Server time</dt>
                    <dd className="font-mono" aria-live="polite">
                        {d.serverTime || '—'}
                    </dd>
                    <dt className="text-muted-foreground">Hello</dt>
                    <dd className="font-mono">{d.user || '—'}</dd>
                    <dt className="text-muted-foreground">Format</dt>
                    <dd className="font-mono">{o.format || 'datetime'}</dd>
                </dl>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        onClick={() =>
                            server
                                .get({ message: 'ping from the browser' })
                                .then(setReply, (e: Error) => setReply({ error: e.message }))
                        }
                    >
                        server.get()
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            server.refresh().then(
                                (next: ClockData) => onRefresh && onRefresh(next),
                                () => {}
                            )
                        }
                    >
                        server.refresh()
                    </Button>
                </div>
                {reply ? (
                    <pre className="overflow-auto rounded-md bg-muted p-2 text-xs">
                        {JSON.stringify(reply, null, 2)}
                    </pre>
                ) : null}
                {children}
            </CardContent>
        </Card>
    );
}
