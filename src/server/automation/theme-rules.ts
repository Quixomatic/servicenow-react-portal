import { str, int } from '../lib/gr.ts'
import { isValidJson, parseJson } from '../lib/util.ts'
import { slugify } from '../registry/registry.ts'
import { abort, anyChanged } from './guards.ts'

/** before insert/update: key, tokens shape, revision tracking. */
export function normalizeTheme(current: any, previous: any): void {
    let key = str(current, 'key').trim().toLowerCase()
    if (!key) key = slugify(str(current, 'name'))
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(key)) return abort(current, 'Theme key must start with a letter and use lower-case letters, digits and dashes.')
    current.setValue('key', key)

    const tokensText = str(current, 'tokens_json')
    if (!isValidJson(tokensText)) return abort(current, 'tokens_json is not valid JSON.')
    const tokens = parseJson<unknown>(tokensText, {})
    if (tokens !== null && (typeof tokens !== 'object' || Array.isArray(tokens))) {
        return abort(current, 'tokens_json must be a JSON object of token name → value.')
    }

    if (current.isNewRecord()) {
        if (!str(current, 'source_revision')) current.setValue('source_revision', 1)
    } else if (anyChanged(current, ['tokens_json', 'stylesheet'])) {
        current.setValue('source_revision', int(previous, 'source_revision') + 1)
    }
}
