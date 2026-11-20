import { usePortal, usePortalLocation } from '@portal/runtime';
import { Card, CardHeader, CardContent } from 'components:card';
import { SlaTimers } from 'components:app/sla-timer';

/**
 * components:app/sla-card: a record's SLAs as live timers (app/sla-timer), placeable next to a form.
 *
 * Options: { title, sysId, activeOnly, variant } The record comes from the options, else the route
 * params, else the URL params (sys_id), so a ticket page can place it next to app/record-form.
 */
type Options = { title?: string; sysId?: string; activeOnly?: boolean; variant?: 'card' | 'compact' };

const REAL_ID = /^[0-9a-f]{32}$/i;

function pick(...values: unknown[]): string {
    for (const v of values) if (v !== undefined && v !== null && String(v) !== '') return String(v);
    return '';
}

export default function SlaCard({ options = {} }: { options?: Options }) {
    const location = (usePortalLocation() as any) || {};
    const portal = usePortal() as any;
    const query = location.params && typeof location.params === 'object' ? location.params : {};
    const route = (portal && portal.page && portal.page.params) || {};
    const sysId = pick(options.sysId, route.sys_id, route.sysId, location.sysId, query.sys_id);
    const title = options.title === undefined ? 'SLAs' : options.title;
    return (
        <Card data-rp-sla-card={sysId}>
            {title ? (
                <CardHeader>
                    <h2 className="m-0 text-base font-semibold">{title}</h2>
                </CardHeader>
            ) : null}
            <CardContent>
                {REAL_ID.test(sysId) ? (
                    <SlaTimers
                        sysId={sysId}
                        activeOnly={!!options.activeOnly}
                        variant={options.variant === 'compact' ? 'compact' : 'card'}
                    />
                ) : (
                    <p className="m-0 text-sm text-muted-foreground">Open a record to see its SLAs.</p>
                )}
            </CardContent>
        </Card>
    );
}
