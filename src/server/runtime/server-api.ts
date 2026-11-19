import { gs, GlideRecordSecure } from '@servicenow/glide'
import { currentUser } from '../security/user.ts'
import { isPlainObject } from '../lib/util.ts'

/**
 * `$rp` — the server-side helper injected into every component server script, modeled on Service
 * Portal's `$sp` (and also injected under that name so SP scripts port over):
 *
 *   (function () {
 *       data.title = $sp.getValue('title')            // option → portal setting
 *       var gr = $sp.getRecord('incident', input.id)   // ACL-checked
 *       data.number = gr ? gr.getDisplayValue('number') : null
 *       data.me = $sp.getUser().name
 *   })()
 */

export interface ServerApiContext {
    input: Record<string, unknown>
    options: Record<string, unknown>
    params: Record<string, string>
    portal: { id: string; slug: string; name: string; settings: Record<string, unknown> }
    page: { route: string | null; params: Record<string, string> } | null
    component: { id: string; uniqueId: string; instanceId: string }
}

export function createServerApi(ctx: ServerApiContext): Record<string, unknown> {
    const settings = isPlainObject(ctx.portal.settings) ? ctx.portal.settings : {}

    /** Option (placement/component default) first, then portal setting — like $sp.getValue. */
    const getValue = (name: string): unknown => {
        if (ctx.options && ctx.options[name] !== undefined && ctx.options[name] !== '') return ctx.options[name]
        return settings[name] !== undefined ? settings[name] : null
    }

    const getRecord = (table?: string, sysId?: string): any => {
        const t = table || (getParameter('table') as string) || ''
        const id = sysId || (getParameter('sys_id') as string) || (getParameter('id') as string) || ''
        if (!t || !id) return null
        const gr: any = new GlideRecordSecure(t)
        return gr.get(id) ? gr : null
    }

    /** input first, then route params (orders/:id → id), like $sp.getParameter's URL lookup. */
    const getParameter = (name: string): unknown => {
        if (ctx.input && ctx.input[name] !== undefined) return ctx.input[name]
        if (ctx.params && ctx.params[name] !== undefined) return ctx.params[name]
        return null
    }

    const getField = (gr: any, field: string) => {
        if (!gr || !gr.isValidRecord || !gr.isValidRecord() || !gr.isValidField(field)) return null
        const el = gr.getElement(field)
        const ed = el.getED()
        return {
            name: field,
            label: String(ed.getLabel()),
            type: String(ed.getInternalType()),
            value: String(gr.getValue(field) || ''),
            display_value: String(gr.getDisplayValue(field) || ''),
        }
    }

    return {
        getValue,
        getDisplayValue: (name: string) => {
            const v = getValue(name)
            return v === null || v === undefined ? '' : String(v)
        },
        getParameter,
        getRecord,
        getField,
        getFields: (gr: any, fields: string) =>
            String(fields || '')
                .split(',')
                .map((f) => f.trim())
                .filter(Boolean)
                .map((f) => getField(gr, f))
                .filter(Boolean),
        canReadRecord: (grOrTable: any, sysId?: string) => {
            if (typeof grOrTable === 'string') {
                const gr: any = new GlideRecordSecure(grOrTable)
                return !!sysId && gr.get(sysId)
            }
            return !!grOrTable && typeof grOrTable.canRead === 'function' && grOrTable.canRead()
        },
        getProperty: (name: string, fallback?: string) => gs.getProperty(name, fallback === undefined ? null : fallback),
        getUser: () => currentUser(),
        hasRole: (role: string) => gs.hasRole(role),
        getPortal: () => ({ id: ctx.portal.id, slug: ctx.portal.slug, name: ctx.portal.name, settings }),
        getPage: () => ctx.page,
        getComponent: () => ctx.component,
        translate: (message: string, args?: unknown) => (args === undefined ? gs.getMessage(message) : gs.getMessage(message, args as any)),
        log: (message: unknown) => gs.info(`[React Portal ${ctx.component.uniqueId}] ${typeof message === 'string' ? message : JSON.stringify(message)}`),
    }
}
