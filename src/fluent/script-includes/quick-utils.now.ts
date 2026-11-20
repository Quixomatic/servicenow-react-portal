import '@servicenow/sdk/global';
import { ScriptInclude } from '@servicenow/sdk/core';

/**
 * Bridge from classic server scripts in this scope to the QuickUtils module
 * (src/server/lib/quick-utils.ts, a port of TurboForge's tfQuickUtils). Callable as
 * new QuickUtils() (scope rights) or new QuickUtils({ secure: true }) (ACL-checked).
 * Component server scripts use $sp.quick instead.
 */
export const QuickUtilsScriptInclude = ScriptInclude({
    $id: Now.ID['script-include-quick-utils'],
    name: 'QuickUtils',
    script: Now.include('./QuickUtils.server.js'),
    description:
        'QuickUtils bridge (port of tfQuickUtils): getUniqueValues (GlideAggregate), field/schema helpers, templates, roles and groups. new QuickUtils({ secure: true }) checks ACLs.',
    accessibleFrom: 'package_private',
});
