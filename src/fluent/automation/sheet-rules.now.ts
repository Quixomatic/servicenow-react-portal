import '@servicenow/sdk/global';
import { Record, ScriptAction } from '@servicenow/sdk/core';
import { compilePortalSheetEvent } from '../../server/automation/sheet-rules';

/**
 * Background portal sheet compile (x_312987_portal.portal_sheet.background, off by default). A save
 * whose classes the portal sheet doesn't cover queues the event (gs.eventQueue in
 * src/server/release/portal-utilities.ts) instead of compiling inline; the script action compiles the
 * sheet and patches the release. The app's own sequential queue, polled every 2 s, runs the jobs one
 * at a time and starts them sooner than the default queue (polled every 10 s).
 */

Record({
    $id: Now.ID['queue-portal-sheet'],
    table: 'sysevent_queue',
    data: {
        sys_class_name: 'sysevent_queue',
        queue: 'x_312987_portal.portal_sheet',
        suffix: 'portal_sheet',
        description: 'React Portal: background portal utilities sheet compiles, one at a time.',
        poll_interval: '1970-01-01 00:00:02',
        job_config: 'job_count',
        job_config_value: 1,
        provider: '44af4464431212108da9a574a9b8f2f5',
        automatic_processing: true,
        processing_order: 'sequential',
    },
});

Record({
    $id: Now.ID['event-portal-sheet-compile'],
    table: 'sysevent_register',
    data: {
        suffix: 'portal_sheet.compile',
        event_name: 'x_312987_portal.portal_sheet.compile',
        description: 'Compile a portal utilities sheet in the background (parm1: portal, parm2: queued at ms).',
        table: 'x_312987_portal_portal',
        fired_by: 'Script: src/server/release/portal-utilities.ts queueSheetEvent',
        priority: 100,
        queue: 'x_312987_portal.portal_sheet',
    },
});

ScriptAction({
    $id: Now.ID['sa-portal-sheet-compile'],
    name: 'RP: Compile portal sheet (background)',
    description:
        'Background mode of the portal utilities sheet: re-plans from the stored manifest, compiles the sheet when it no longer matches, and patches the release.',
    eventName: 'x_312987_portal.portal_sheet.compile',
    active: true,
    order: 100,
    script: compilePortalSheetEvent,
});
