import { Badge } from 'components:badge'
import { Button } from 'components:button'

export type Incident = {
    sys_id: string
    number: string
    short_description: string
    priority: string
    priority_label: string
    state: string
    assigned_to: string
    assigned_to_me: boolean
    updated: string
}

/** Priority 1 → destructive, 2 → primary, 3+ → secondary. */
function priorityVariant(p: string): 'destructive' | 'default' | 'secondary' {
    if (p === '1') return 'destructive'
    if (p === '2') return 'default'
    return 'secondary'
}

export function IncidentRow({ incident, canAssign, onAssign }: { incident: Incident; canAssign: boolean; onAssign: () => void }) {
    return (
        <div className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-4 px-6 py-3 hover:bg-muted/50">
            <a
                href={`/incident.do?sys_id=${incident.sys_id}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm font-medium text-primary no-underline hover:underline"
            >
                {incident.number}
            </a>
            <div className="min-w-0">
                <div className="truncate text-sm font-medium">{incident.short_description || '(no short description)'}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={priorityVariant(incident.priority)}>{incident.priority_label}</Badge>
                    <span>{incident.state}</span>
                    <span>·</span>
                    <span>{incident.assigned_to || 'Unassigned'}</span>
                    <span>·</span>
                    <span>{incident.updated}</span>
                </div>
            </div>
            {canAssign && !incident.assigned_to_me ? (
                <Button variant="outline" size="xs" onClick={onAssign}>
                    Assign to me
                </Button>
            ) : (
                <span className="text-xs text-muted-foreground">{incident.assigned_to_me ? 'Yours' : ''}</span>
            )}
        </div>
    )
}
