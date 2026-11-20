import '@servicenow/sdk/global';
import { ScheduledScript } from '@servicenow/sdk/core';

/** Nightly: expire abandoned builds, trim the execution log, garbage-collect unreferenced builds. */
ScheduledScript({
    $id: Now.ID['job-maintenance'],
    name: 'React Portal: maintenance',
    script: Now.include('./maintenance.server.js'),
    frequency: 'daily',
    executionTime: { hours: 3, minutes: 15, seconds: 0 },
});
