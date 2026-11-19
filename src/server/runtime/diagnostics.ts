import { newGR } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { propBool } from '../lib/util.ts'

/**
 * RPDiagnostics: execution logging. Errors are always logged; successes only when the
 * x_312987_portal.log_executions property is true. Never stores input, data or source.
 */
export interface ExecutionLogEntry {
    correlationId: string
    action: string
    outcome: 'success' | 'error' | 'denied'
    durationMs: number
    releaseId?: string | null
    buildId?: string | null
    placementId?: string | null
    componentId?: string | null
    portalId?: string | null
    error?: string
}

export function logExecution(entry: ExecutionLogEntry): void {
    if (entry.outcome === 'success' && !propBool('log_executions', false)) return
    try {
        const gr = newGR(T.executionLog)
        gr.initialize()
        gr.setValue('correlation_id', entry.correlationId)
        gr.setValue('action', entry.action)
        gr.setValue('outcome', entry.outcome)
        gr.setValue('duration_ms', entry.durationMs)
        if (entry.releaseId) gr.setValue('release', entry.releaseId)
        if (entry.buildId) gr.setValue('build', entry.buildId)
        if (entry.placementId) gr.setValue('placement', entry.placementId)
        if (entry.componentId) gr.setValue('component', entry.componentId)
        if (entry.portalId) gr.setValue('portal', entry.portalId)
        if (entry.error) gr.setValue('sanitized_error', entry.error)
        gr.insert()
    } catch (e) {
        // Logging must never break a request.
    }
}
