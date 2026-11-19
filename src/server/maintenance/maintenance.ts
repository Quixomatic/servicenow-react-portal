import { gs } from '@servicenow/glide'
import { newGR, each } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { minutesFromNow, propInt } from '../lib/util.ts'

/**
 * Nightly maintenance (scheduled job "React Portal: maintenance"):
 * 1. clear compile requests nobody completed (pending_revision older than the abandon window);
 * 2. trim the execution log past retention.
 * (There's one build per component/theme and one release per portal, so nothing else accumulates.)
 */

export interface MaintenanceReport {
    abandonedCompiles: number
    trimmedLogs: number
}

export function runMaintenance(): MaintenanceReport {
    const report: MaintenanceReport = { abandonedCompiles: 0, trimmedLogs: 0 }

    const abandonBefore = minutesFromNow(-propInt('build.abandon_minutes', 60))
    each(T.build, `pending_revision>0^requested_at<${abandonBefore}`, (b) => {
        b.setValue('pending_revision', 0)
        b.setValue('last_error', 'Compile requested but never completed (abandoned).')
        b.update()
        report.abandonedCompiles++
    })

    const logDays = propInt('execution_log.retention_days', 14)
    const logs = newGR(T.executionLog)
    logs.addEncodedQuery(`sys_created_on<${minutesFromNow(-logDays * 24 * 60)}`)
    logs.query()
    report.trimmedLogs = logs.getRowCount()
    logs.deleteMultiple()

    gs.info(`[React Portal] maintenance: ${JSON.stringify(report)}`)
    return report
}
