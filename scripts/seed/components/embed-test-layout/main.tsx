import { Region, useServer } from '@portal/runtime'
import ServerClock from 'components:app/server-clock'

/**
 * Test layout for layout-rooted embeds (.plans/embedded-widgets.md phase 5). Only the sp page
 * "embeds/layout" uses it. The layout imports Server Clock and renders it twice as its own
 * instances, rooted at 'layout:<this layout's sys_id>':
 * - client-declared (batched initialize, authorized against the page's effective layout);
 * - server-built by this layout's own on-load server script ($sp.getWidget, signed options).
 */
export default function EmbedTestLayout() {
    const { data, pending } = useServer()
    const d = (data || {}) as { clock?: any; instanceId?: string }
    return (
        <div className="min-h-dvh bg-muted text-foreground">
            <Region name="header" as="header" />
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
                <section aria-label="Widgets embedded by the layout" className="space-y-3 rounded-xl border border-dashed bg-background p-4" data-embed-test-layout="">
                    <div>
                        <h2 className="text-sm font-semibold">Embedded by the layout</h2>
                        <p className="break-all text-xs text-muted-foreground">
                            These clocks belong to the layout, not to a placement: root <code className="font-mono">{d.instanceId || 'layout:…'}</code>
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <ServerClock embedKey="layout-client" options={{ title: 'Layout · client-declared', format: 'time' }} />
                        {d.clock ? <ServerClock model={d.clock} /> : <div className="h-40 animate-pulse rounded-lg bg-muted/60" aria-busy={pending} />}
                    </div>
                </section>
                <main>
                    <Region name="main" className="flex flex-col gap-4" />
                </main>
            </div>
            <Region name="footer" as="footer" />
        </div>
    )
}
