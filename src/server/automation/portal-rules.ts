import { getById, each, str, bool } from '../lib/gr.ts'
import { T } from '../lib/tables.ts'
import { isValidJson } from '../lib/util.ts'
import { abort } from './guards.ts'

/**
 * Portal business rules.
 */

/** before insert/update: slug, JSON fields, layout kind, home page ownership. */
export function normalizePortal(current: any, previous: any): void {
    const slug = str(current, 'slug').trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) {
        return abort(current, 'Portal slug must be lower-case letters, digits and dashes (e.g. "crm"), up to 63 characters.')
    }
    current.setValue('slug', slug)

    for (const f of ['navigation_json', 'settings_json']) {
        if (!isValidJson(str(current, f))) return abort(current, `${f} is not valid JSON.`)
    }

    const layout = getById(T.component, str(current, 'default_layout'))
    if (layout && str(layout, 'kind') !== 'layout') return abort(current, 'Default layout must be a component of kind "layout".')

    const home = getById(T.page, str(current, 'home_page'))
    if (home && str(home, 'portal') !== current.getUniqueValue()) return abort(current, 'Home page must belong to this portal.')
}

/** after insert/update when is_default becomes true: only one default portal. */
export function enforceSingleDefault(current: any, previous: any): void {
    if (!bool(current, 'is_default')) return
    each(T.portal, `is_default=true^sys_id!=${current.getUniqueValue()}`, (other) => {
        other.setValue('is_default', false)
        other.setWorkflow(false)
        other.update()
    })
}
