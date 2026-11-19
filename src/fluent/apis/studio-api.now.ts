import '@servicenow/sdk/global'
import { RestApi, Acl } from '@servicenow/sdk/core'
import { developerRole, designerRole, publisherRole } from '../security/roles.now'
import {
    listComponentsRoute,
    listThemesRoute,
    listPortalsRoute,
    componentProjectRoute,
    componentSaveRoute,
    themeProjectRoute,
    themeSaveRoute,
    buildCompleteRoute,
    buildPreviewRoute,
    processRoute,
} from '../../server/api/studio-api'

/**
 * Studio API: /api/x_312987_portal/rp_studio/...
 * Studio roles only (admin inherits them). Handlers re-check the specific duty
 * (author / design / publish).
 */
export const studioApiAcl = Acl({
    $id: Now.ID['acl-rest-studio'],
    type: 'rest_endpoint',
    name: 'x_312987_portal.rp_studio',
    operation: 'execute',
    roles: [developerRole, designerRole, publisherRole],
    adminOverrides: true,
    description: 'React Portal studio API: developer, designer, publisher (admin inherits)',
})

export const studioApi = RestApi({
    $id: Now.ID['rest-studio'],
    name: 'React Portal Studio',
    serviceId: 'rp_studio',
    shortDescription: 'Portal Studio: projects, saves, compiles, previews and portal processing',
    consumes: 'application/json',
    produces: 'application/json',
    enforceAcl: [studioApiAcl],
    versions: [{ $id: Now.ID['rest-studio-v1'], version: 1, isDefault: true, shortDescription: 'React Portal studio v1' }],
    routes: [
        { $id: Now.ID['rest-studio-components'], name: 'list components', method: 'GET', path: '/components', script: listComponentsRoute, version: 1 },
        { $id: Now.ID['rest-studio-themes'], name: 'list themes', method: 'GET', path: '/themes', script: listThemesRoute, version: 1 },
        { $id: Now.ID['rest-studio-portals'], name: 'list portals', method: 'GET', path: '/portals', script: listPortalsRoute, version: 1 },
        {
            $id: Now.ID['rest-studio-component-project'],
            name: 'component project',
            method: 'GET',
            path: '/components/{id}/project',
            script: componentProjectRoute,
            version: 1,
            shortDescription: 'Source tree and metadata',
        },
        {
            $id: Now.ID['rest-studio-component-save'],
            name: 'component save',
            method: 'POST',
            path: '/components/{id}/save',
            script: componentSaveRoute,
            version: 1,
            requestExample: '{"expectedRevision":3,"files":[{"path":"index.tsx","target":"client","content":"…"}]}',
            shortDescription: 'Revision-checked save of fields and files; requests a compile',
        },
        { $id: Now.ID['rest-studio-theme-project'], name: 'theme project', method: 'GET', path: '/themes/{id}/project', script: themeProjectRoute, version: 1 },
        { $id: Now.ID['rest-studio-theme-save'], name: 'theme save', method: 'POST', path: '/themes/{id}/save', script: themeSaveRoute, version: 1 },
        {
            $id: Now.ID['rest-studio-build-complete'],
            name: 'build complete',
            method: 'POST',
            path: '/builds/{id}/complete',
            script: buildCompleteRoute,
            version: 1,
            requestExample: '{"revision":4,"success":true,"compilerVersion":"esbuild-wasm 0.25","assets":[{"path":"index.js","kind":"js","content":"…"}]}',
            shortDescription: 'Compiled outputs and diagnostics from the browser compiler',
        },
        { $id: Now.ID['rest-studio-build-preview'], name: 'build preview', method: 'POST', path: '/builds/{id}/preview', script: buildPreviewRoute, version: 1 },
        {
            $id: Now.ID['rest-studio-process'],
            name: 'process portal',
            method: 'POST',
            path: '/portals/{id}/process',
            script: processRoute,
            version: 1,
            shortDescription: "Force-reprocess the portal's compiled release (normally automatic)",
        },
    ],
})
