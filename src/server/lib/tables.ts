/** Table names for every React Portal table (prefix x_312987_portal_). */
export const T = {
    portal: 'x_312987_portal_portal',
    theme: 'x_312987_portal_theme',
    component: 'x_312987_portal_component',
    sourceFile: 'x_312987_portal_source_file',
    page: 'x_312987_portal_page',
    placement: 'x_312987_portal_placement',
    build: 'x_312987_portal_build',
    buildAsset: 'x_312987_portal_build_asset',
    buildDep: 'x_312987_portal_build_dep',
    release: 'x_312987_portal_release',
    releaseEntry: 'x_312987_portal_release_entry',
    executionLog: 'x_312987_portal_execution_log',
    menu: 'x_312987_portal_menu',
    menuItem: 'x_312987_portal_menu_item',
} as const

export const SCOPE = 'x_312987_portal'

export const ROLES = {
    developer: 'x_312987_portal.developer',
    designer: 'x_312987_portal.designer',
    publisher: 'x_312987_portal.publisher',
    admin: 'x_312987_portal.admin',
} as const

/** Base path of the runtime scripted REST API (default version, no version prefix). */
export const RUNTIME_API_BASE = '/api/x_312987_portal/rp'
