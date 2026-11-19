import '@servicenow/sdk/global'
import { ScriptInclude } from '@servicenow/sdk/core'

/**
 * Bridge from classic server scripts (background scripts, other scopes, authored component
 * server scripts) to the React Portal server modules. Callable as
 * new x_312987_portal.ReactPortal().
 */
export const ReactPortalScriptInclude = ScriptInclude({
    $id: Now.ID['script-include-react-portal'],
    name: 'ReactPortal',
    script: Now.include('./ReactPortal.server.js'),
    description: 'React Portal server API bridge: bootstrap, resolvePage, assembleManifest, execute, process, runMaintenance.',
    accessibleFrom: 'public',
    callerAccess: 'tracking',
})
