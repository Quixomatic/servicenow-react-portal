import '@servicenow/sdk/global'
import { ScriptInclude } from '@servicenow/sdk/core'

/**
 * Global-scope helpers for React Portal (x_312987_portal): session message drain, impersonator,
 * allowlisted preferences, React Portal client-data cleanup, the session's current application.
 * Called from the scoped app as new global.ReactPortalGlobal(). Security notes live in the
 * script's header comment.
 */
export const ReactPortalGlobalScriptInclude = ScriptInclude({
    $id: Now.ID['script-include-react-portal-global'],
    name: 'ReactPortalGlobal',
    script: Now.include('./ReactPortalGlobal.server.js'),
    description:
        'React Portal global helpers (current session/user only): drainSessionMessages, getImpersonatingUserName, getPreference (allowlisted), clearClientData (x_312987_portal.* keys), currentApplication, version.',
    accessibleFrom: 'public',
    // Leave callerAccess unset. With 'tracking' (or 'restriction') the platform refuses calls from
    // x_312987_portal ("When targeting a global resource, only ServiceNow authored scopes are
    // allowed as sources") and global.ReactPortalGlobal resolves to undefined. The caller side is
    // covered by the main app's runtime access tracking / cross-scope privilege instead.
    clientCallable: false,
    sandboxCallable: false,
    active: true,
})
