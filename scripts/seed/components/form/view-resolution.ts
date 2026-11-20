import { usePortal } from '@portal/runtime'
import { useFormViewCheck } from 'utilities:app/graphql'
import { useRememberedView } from './preferences'

/**
 * Form view resolution (backlog B). In order, the first that applies wins:
 *
 *   1. the URL `view` param (user intent: deep links, the view switcher);
 *   2. the widget / page option `view` (author intent); with `lockView` the option beats the URL;
 *   3. the user's remembered view (x_312987_portal.form.<table>.view, set by the view switcher);
 *   4. Workspace view rules (sysrule_view_workspace) of the portal's `settings.viewRuleConfigId`;
 *   5. the portal's candidate list `settings.formViews` ('sp,ess': the first view that exists);
 *   6. the Default view.
 *
 * 1–3 are sent as uiView's forcedViewName, and only when the view exists for the table (checked
 * first, in one request): an unknown name falls through to the next step instead of silently
 * becoming Default, and the form shows a "View `x` not found" notice for an unknown URL / option
 * view. 4–6 are the platform's own resolution (uiView with viewRuleConfigId + views).
 * 'default' / 'Default view' name the Default view explicitly (it beats the rules).
 */
export type FormViewSource = 'url' | 'option' | 'remembered' | 'auto'

/** The portal's form-view settings (settings_json): { viewRuleConfigId, formViews }. */
export function usePortalViewSettings(): { viewRuleConfigId: string; formViews: string } {
    const ctx = usePortal() as any
    const settings = (ctx && ctx.portal && ctx.portal.settings) || {}
    return {
        viewRuleConfigId: typeof settings.viewRuleConfigId === 'string' ? settings.viewRuleConfigId : '',
        formViews: typeof settings.formViews === 'string' ? settings.formViews : Array.isArray(settings.formViews) ? settings.formViews.join(',') : '',
    }
}

export type ResolvedFormView = {
    /** False until the explicit candidates are checked (and the remembered view is known when it matters). */
    ready: boolean
    /** The view to force ('' = automatic: rules → portal candidates → Default). */
    view: string
    source: FormViewSource
    /** A URL / option view that doesn't exist for the table (for the "not found" notice). */
    missing: string
    remembered: string
    /** Remember a view for the table ('' forgets it: back to automatic). */
    setRemembered: (view: string) => void
}

export function useResolvedFormView(args: { table: string; urlView?: string; optionView?: string; lockView?: boolean; remember?: boolean }): ResolvedFormView {
    const { table } = args
    const urlView = String(args.urlView || '').trim()
    const optionView = String(args.optionView || '').trim()
    const [remembered, setRemembered, rememberedReady] = useRememberedView(args.remember === false ? undefined : table)
    const saved = args.remember === false ? '' : String(remembered || '').trim()
    const explicit: [FormViewSource, string][] = args.lockView
        ? [
              ['option', optionView],
              ['url', urlView],
          ]
        : [
              ['url', urlView],
              ['option', optionView],
          ]
    const named = explicit.filter((c) => !!c[1])
    // Two checks, so the remembered view arriving later never re-checks (or re-keys) a URL / option view.
    const namedCheck = useFormViewCheck(table, named.map((c) => c[1]))
    const savedCheck = useFormViewCheck(table, saved ? [saved] : [])
    // A failed check never blocks the form: treat the names as existing (the old behaviour).
    const settle = (q: { data?: Record<string, boolean>; isError: boolean }, names: string[]) => q.data || (q.isError ? Object.fromEntries(names.map((n) => [n, true])) : null)
    const pending = { ready: false, view: '', source: 'auto' as FormViewSource, missing: '', remembered: saved, setRemembered }
    let missing = ''
    if (named.length) {
        const known = settle(namedCheck, named.map((c) => c[1]))
        if (!known) return pending
        for (const [source, name] of named) {
            if (known[name]) return { ready: true, view: name, source, missing, remembered: saved, setRemembered }
            if (!missing) missing = name
        }
    }
    // No explicit view (or none exists): the remembered one, once it is known.
    if (args.remember !== false && !rememberedReady) return { ...pending, missing }
    if (saved) {
        const known = settle(savedCheck, [saved])
        if (!known) return { ...pending, missing }
        if (known[saved]) return { ready: true, view: saved, source: 'remembered', missing, remembered: saved, setRemembered }
    }
    return { ready: true, view: '', source: 'auto', missing, remembered: saved, setRemembered }
}
