import '@servicenow/sdk/global'
import { RestApi, Acl } from '@servicenow/sdk/core'
import {
    bootstrapRoute,
    resolvePageRoute,
    initializeRoute,
    executeRoute,
    assetRoute,
    propertiesRoute,
    messagesRoute,
} from '../../server/api/runtime-api'
import { iconSpriteRoute } from '../../server/api/icon-api'

/**
 * Runtime API: /api/x_312987_portal/rp/...  (v1 is the default, so no version prefix needed)
 * Any authenticated user may call it; every handler checks portal and page access itself.
 */
export const runtimeApiAcl = Acl({
    $id: Now.ID['acl-rest-runtime'],
    type: 'rest_endpoint',
    name: 'x_312987_portal.rp_runtime',
    operation: 'execute',
    securityAttribute: 'user_is_authenticated',
    roles: [],
    description: 'React Portal runtime API: authenticated users (portal/page access is checked per request)',
})

export const runtimeApi = RestApi({
    $id: Now.ID['rest-runtime'],
    name: 'React Portal Runtime',
    serviceId: 'rp',
    shortDescription: 'Portal bootstrap, page resolution, component server calls and compiled assets',
    consumes: 'application/json',
    produces: 'application/json',
    enforceAcl: [runtimeApiAcl],
    versions: [{ $id: Now.ID['rest-runtime-v1'], version: 1, isDefault: true, shortDescription: 'React Portal runtime v1' }],
    routes: [
        {
            $id: Now.ID['rest-runtime-bootstrap'],
            name: 'bootstrap',
            method: 'GET',
            path: '/portals/{slug}/bootstrap',
            script: bootstrapRoute,
            version: 1,
            shortDescription: 'Active release, theme, default layout, portal-level placements and pages',
        },
        {
            $id: Now.ID['rest-runtime-resolve'],
            name: 'resolve page',
            method: 'POST',
            path: '/pages/resolve',
            script: resolvePageRoute,
            version: 1,
            requestExample: '{"portal":"crm","page":"orders/42"}',
            shortDescription: 'Page manifest: layout and placements per region',
        },
        {
            $id: Now.ID['rest-runtime-initialize'],
            name: 'initialize instances',
            method: 'POST',
            path: '/instances/initialize',
            script: initializeRoute,
            version: 1,
            requestExample: '{"portal":"crm","page":"orders","instances":["<placement sys_id>"]}',
            shortDescription: 'Batch-run on-load server scripts',
        },
        {
            $id: Now.ID['rest-runtime-execute'],
            name: 'execute instance',
            method: 'POST',
            path: '/instances/{instance}/execute',
            script: executeRoute,
            version: 1,
            requestExample: '{"portal":"crm","action":"get","input":{"q":"abc"}}',
            shortDescription: "Run one instance's server script (pinned build)",
        },
        {
            $id: Now.ID['rest-runtime-properties'],
            name: 'properties',
            method: 'GET',
            path: '/properties',
            script: propertiesRoute,
            version: 1,
            parameters: [
                { $id: Now.ID['rest-runtime-properties-portal'], name: 'portal', required: true, shortDescription: 'Portal slug' },
                { $id: Now.ID['rest-runtime-properties-names'], name: 'names', required: true, shortDescription: 'Comma-separated property names' },
            ],
            shortDescription: 'System properties the portal exposes (settings.exposedProperties or x_312987_portal.public.*)',
        },
        {
            $id: Now.ID['rest-runtime-messages'],
            name: 'messages',
            method: 'POST',
            path: '/messages',
            script: messagesRoute,
            version: 1,
            requestExample: '{"keys":["Save","Cancel"]}',
            shortDescription: "Translated UI messages in the user's language",
        },
        {
            $id: Now.ID['rest-runtime-asset'],
            name: 'asset',
            method: 'GET',
            path: '/assets/{build}/{file}/raw',
            script: assetRoute,
            version: 1,
            produces: 'text/javascript,text/css,application/json,*/*',
            shortDescription: 'Immutable compiled build asset (JS/CSS)',
        },
        {
            $id: Now.ID['rest-runtime-icons-lucide'],
            name: 'lucide icons',
            method: 'GET',
            path: '/icons/lucide',
            script: iconSpriteRoute,
            version: 1,
            shortDescription: 'Lucide icon sprite (inner SVG markup by name) for the classic-form icon picker',
        },
    ],
})
