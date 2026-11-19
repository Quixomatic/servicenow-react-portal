import '@servicenow/sdk/global'
import { Role } from '@servicenow/sdk/core'

/** Authors widget, layout and theme source code. */
export const developerRole = Role({
    name: 'x_312987_portal.developer',
    description: 'React Portal: author component and theme source code in Portal Studio',
})

/** Arranges portals: pages, placements, options and themes. */
export const designerRole = Role({
    name: 'x_312987_portal.designer',
    description: 'React Portal: design portals, pages, placements and component options',
})

/** Publishes and rolls back portal releases. */
export const publisherRole = Role({
    name: 'x_312987_portal.publisher',
    description: 'React Portal: publish and roll back portal releases',
})

/** Full administration of React Portal. Contains every other React Portal role. */
export const adminRole = Role({
    name: 'x_312987_portal.admin',
    description: 'React Portal: full administration',
    containsRoles: [developerRole, designerRole, publisherRole],
})
