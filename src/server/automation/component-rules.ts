import { str, int } from '../lib/gr.ts'
import { isValidJson, parseJson } from '../lib/util.ts'
import { canonicalId, slugify, normalizeRegions, DEFAULT_REGIONS, DEFAULT_NAMESPACE } from '../registry/registry.ts'
import { abort, anyChanged } from './guards.ts'

/**
 * Component business rules.
 */

/** Fields whose change requires a rebuild (they're compiled in or pinned into builds). */
export const COMPONENT_BUILD_FIELDS = [
    'client_script',
    'css',
    'tailwind',
    'script',
    'exports_json',
    'options_schema_json',
    'default_options_json',
    'dependency_spec_json',
]

const JSON_FIELDS = ['exports_json', 'options_schema_json', 'default_options_json', 'regions_json', 'dependency_spec_json']
const KINDS = ['widget', 'layout', 'utility']
const SERVER_MODES = ['none', 'on-load', 'on-demand']

/** before insert/update: normalize the definition, canonical id, revision tracking. */
export function normalizeComponent(current: any, previous: any): void {
    const namespace = (str(current, 'namespace') || DEFAULT_NAMESPACE).trim().toLowerCase()
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(namespace)) return abort(current, 'Namespace must be lower-case letters, digits and dashes.')
    current.setValue('namespace', namespace)

    let key = str(current, 'key').trim().toLowerCase()
    if (!key) key = slugify(str(current, 'name'))
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(key)) return abort(current, 'Key must start with a letter and use lower-case letters, digits and dashes.')
    current.setValue('key', key)
    current.setValue('unique_id', canonicalId(namespace, key))

    const kind = str(current, 'kind') || 'widget'
    if (KINDS.indexOf(kind) < 0) return abort(current, 'Kind must be widget, layout or utility.')
    current.setValue('kind', kind)
    if (kind !== 'widget') current.setValue('placeable', false)

    const mode = str(current, 'server_mode') || 'none'
    if (SERVER_MODES.indexOf(mode) < 0) return abort(current, 'Server mode must be none, on-load or on-demand.')

    for (const f of JSON_FIELDS) {
        if (!isValidJson(str(current, f))) return abort(current, `${f} is not valid JSON.`)
    }
    const defaults = parseJson<unknown>(str(current, 'default_options_json'), {})
    if (defaults !== null && (typeof defaults !== 'object' || Array.isArray(defaults))) {
        return abort(current, 'default_options_json must be a JSON object.')
    }

    if (kind === 'layout') {
        const regions = normalizeRegions(parseJson<unknown>(str(current, 'regions_json'), null))
        current.setValue('regions_json', JSON.stringify(regions.length ? regions : DEFAULT_REGIONS))
    }

    if (current.isNewRecord()) {
        if (!str(current, 'source_revision')) current.setValue('source_revision', 1)
    } else if (anyChanged(current, COMPONENT_BUILD_FIELDS)) {
        current.setValue('source_revision', int(previous, 'source_revision') + 1)
    }
}
