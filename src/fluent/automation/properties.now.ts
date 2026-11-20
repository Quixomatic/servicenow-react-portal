import '@servicenow/sdk/global';
import { Property } from '@servicenow/sdk/core';
import { adminRole } from '../security/roles.now';

Property({
    $id: Now.ID['prop-runtime-abi'],
    name: 'x_312987_portal.runtime_abi_version',
    type: 'string',
    value: '1',
    description: 'Host runtime ABI that new builds target. Bump when the host registry contract changes incompatibly.',
    roles: { read: [adminRole], write: [adminRole] },
});

Property({
    $id: Now.ID['prop-log-executions'],
    name: 'x_312987_portal.log_executions',
    type: 'boolean',
    value: 'false',
    description: 'Log successful server-script executions to the execution log (errors are always logged).',
    roles: { read: [adminRole], write: [adminRole] },
});

Property({
    $id: Now.ID['prop-log-retention'],
    name: 'x_312987_portal.execution_log.retention_days',
    type: 'integer',
    value: '14',
    description: 'Days to keep execution log rows.',
    roles: { read: [adminRole], write: [adminRole] },
});

Property({
    $id: Now.ID['prop-build-abandon'],
    name: 'x_312987_portal.build.abandon_minutes',
    type: 'integer',
    value: '60',
    description: 'Minutes before a build still in "building" is treated as abandoned.',
    roles: { read: [adminRole], write: [adminRole] },
});

Property({
    $id: Now.ID['prop-build-retention'],
    name: 'x_312987_portal.build.retention_days',
    type: 'integer',
    value: '30',
    description: 'Days to keep failed/stale builds that no release, owner or dependency references.',
    roles: { read: [adminRole], write: [adminRole] },
});

Property({
    $id: Now.ID['prop-build-max-bytes'],
    name: 'x_312987_portal.build.max_bytes',
    type: 'integer',
    value: '5242880',
    description: "Maximum total size of one build's assets, in bytes.",
    roles: { read: [adminRole], write: [adminRole] },
});

Property({
    $id: Now.ID['prop-source-max-file'],
    name: 'x_312987_portal.source.max_file_bytes',
    type: 'integer',
    value: '1048576',
    description: 'Maximum size of one source file, in bytes.',
    roles: { read: [adminRole], write: [adminRole] },
});

Property({
    $id: Now.ID['prop-max-files'],
    name: 'x_312987_portal.max_files_per_owner',
    type: 'integer',
    value: '200',
    description: 'Maximum number of files in one save request.',
    roles: { read: [adminRole], write: [adminRole] },
});

Property({
    $id: Now.ID['prop-public-welcome'],
    name: 'x_312987_portal.public.welcome',
    type: 'string',
    value: 'Hello from a system property',
    description: 'Demo: properties under x_312987_portal.public. are readable from widgets via useProperty().',
});

Property({
    $id: Now.ID['prop-studio-kind-files'],
    name: 'x_312987_portal.studio.kind_files',
    type: 'string',
    value: '{"widget":["main.tsx","styles.css","server.js","options.schema.json","options.defaults.json"],"layout":["main.tsx","styles.css","server.js","regions.json","options.schema.json","options.defaults.json"],"block":["main.tsx","styles.css","regions.json","options.schema.json","options.defaults.json"],"primitive":["main.tsx","styles.css"],"utility":["main.tsx"]}',
    description:
        'Studio: which baseline files each component kind has. JSON object, kind → array of file names from main.tsx, styles.css, server.js, options.schema.json, options.defaults.json, regions.json. main.tsx is always included; unknown names are ignored; a kind left out uses its built-in default; invalid JSON falls back to the built-in default (with a log warning). Applies to Studio, saves, the compiler and server scripts (e.g. add "server.js" to "block" to give blocks a server script). A file a kind does not list stays visible and editable, flagged "Not used", while its field still has content. Extra source files are not affected. Themes always have theme.css and tokens.json.',
    roles: { read: [adminRole], write: [adminRole] },
});
