import '@servicenow/sdk/global'
import { ApplicationMenu, Record } from '@servicenow/sdk/core'
import { developerRole, designerRole, publisherRole } from '../security/roles.now'

export const reactPortalMenu = ApplicationMenu({
    $id: Now.ID['menu-react-portal'],
    title: 'React Portal',
    hint: 'React Portal portals, components, builds and releases',
    description: 'Service Portal successor on Next Experience',
    roles: [developerRole, designerRole, publisherRole],
    active: true,
})

Record({
    $id: Now.ID['module-sep-portals'],
    table: 'sys_app_module',
    data: { title: 'Portals', application: reactPortalMenu, link_type: 'SEPARATOR', roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'], active: true, order: 100 },
})
Record({
    $id: Now.ID['module-portals'],
    table: 'sys_app_module',
    data: { title: 'Portals', application: reactPortalMenu, link_type: 'LIST', name: 'x_312987_portal_portal', roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'], active: true, order: 110 },
})
Record({
    $id: Now.ID['module-pages'],
    table: 'sys_app_module',
    data: { title: 'Pages', application: reactPortalMenu, link_type: 'LIST', name: 'x_312987_portal_page', roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'], active: true, order: 120 },
})
Record({
    $id: Now.ID['module-placements'],
    table: 'sys_app_module',
    data: { title: 'Placements', application: reactPortalMenu, link_type: 'LIST', name: 'x_312987_portal_placement', roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'], active: true, order: 130 },
})
Record({
    $id: Now.ID['module-themes'],
    table: 'sys_app_module',
    data: { title: 'Themes', application: reactPortalMenu, link_type: 'LIST', name: 'x_312987_portal_theme', roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'], active: true, order: 140 },
})

Record({
    $id: Now.ID['module-sep-components'],
    table: 'sys_app_module',
    data: { title: 'Components', application: reactPortalMenu, link_type: 'SEPARATOR', roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'], active: true, order: 200 },
})
Record({
    $id: Now.ID['module-widgets'],
    table: 'sys_app_module',
    data: {
        title: 'Widgets',
        application: reactPortalMenu,
        link_type: 'FILTER',
        name: 'x_312987_portal_component',
        filter: 'kind=widget',
        roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'],
        active: true,
        order: 210,
    },
})
Record({
    $id: Now.ID['module-layouts'],
    table: 'sys_app_module',
    data: {
        title: 'Layouts',
        application: reactPortalMenu,
        link_type: 'FILTER',
        name: 'x_312987_portal_component',
        filter: 'kind=layout',
        roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'],
        active: true,
        order: 220,
    },
})
Record({
    $id: Now.ID['module-all-components'],
    table: 'sys_app_module',
    data: { title: 'All Components', application: reactPortalMenu, link_type: 'LIST', name: 'x_312987_portal_component', roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'], active: true, order: 230 },
})
Record({
    $id: Now.ID['module-source-files'],
    table: 'sys_app_module',
    data: {
        title: 'Source Files',
        application: reactPortalMenu,
        link_type: 'LIST',
        name: 'x_312987_portal_source_file',
        roles: ['x_312987_portal.developer'],
        active: true,
        order: 240,
    },
})

Record({
    $id: Now.ID['module-sep-delivery'],
    table: 'sys_app_module',
    data: { title: 'Delivery', application: reactPortalMenu, link_type: 'SEPARATOR', roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'], active: true, order: 300 },
})
Record({
    $id: Now.ID['module-builds'],
    table: 'sys_app_module',
    data: { title: 'Builds', application: reactPortalMenu, link_type: 'LIST', name: 'x_312987_portal_build', roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'], active: true, order: 310 },
})
Record({
    $id: Now.ID['module-releases'],
    table: 'sys_app_module',
    data: { title: 'Releases', application: reactPortalMenu, link_type: 'LIST', name: 'x_312987_portal_release', roles: ['x_312987_portal.developer', 'x_312987_portal.designer', 'x_312987_portal.publisher'], active: true, order: 320 },
})
Record({
    $id: Now.ID['module-execution-log'],
    table: 'sys_app_module',
    data: {
        title: 'Execution Log',
        application: reactPortalMenu,
        link_type: 'LIST',
        name: 'x_312987_portal_execution_log',
        roles: ['x_312987_portal.developer', 'x_312987_portal.publisher'],
        active: true,
        order: 330,
    },
})

Record({
    $id: Now.ID['module-sep-admin'],
    table: 'sys_app_module',
    data: { title: 'Administration', application: reactPortalMenu, link_type: 'SEPARATOR', roles: ['x_312987_portal.admin'], active: true, order: 400 },
})
Record({
    $id: Now.ID['module-properties'],
    table: 'sys_app_module',
    data: {
        title: 'Properties',
        application: reactPortalMenu,
        link_type: 'FILTER',
        name: 'sys_properties',
        filter: 'nameSTARTSWITHx_312987_portal.',
        roles: ['x_312987_portal.admin'],
        active: true,
        order: 410,
    },
})
