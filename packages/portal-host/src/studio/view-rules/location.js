// View rules activity: its deep-link entry (studio/deep-link/registry.js).
//   /x/312987/portal/studio/params/view/view-rules/id/<portal slug | sys_id>/q/rule%3D<rule sys_id>
// The open portal and the selected rule live here (not in component state), so a link can set them
// before the activity mounts. The editor component reports rule selection through options.onSelectRule.
import { createActivityState, registerStudioLocation } from '../deep-link/registry';

export const viewRulesState = createActivityState({ portalId: '', portalSlug: '', ruleId: '' });

/** Pick a portal (from the portal list entry); clears the rule unless one is given. */
export function selectViewRulesPortal(portal, ruleId) {
    if (!portal) return;
    viewRulesState.set({ portalId: portal.id, portalSlug: portal.slug || '', ruleId: ruleId || '' });
}

registerStudioLocation({
    activity: 'viewRules',
    param: 'view-rules',
    aliases: ['viewRules', 'rules'],
    qKeys: ['rule'],
    serialize() {
        const s = viewRulesState.get();
        if (!s.portalId) return {};
        const slug = s.portalSlug && !/[:/]/.test(s.portalSlug) ? s.portalSlug : '';
        return { id: slug || s.portalId, rule: s.ruleId || '' };
    },
    async apply(params, ctx) {
        const list = (await ctx.portals()) || [];
        let portal = null;
        if (params.id) {
            portal =
                list.find((p) => p.id === params.id) ||
                list.find((p) => p.slug === params.id) ||
                list.find((p) => String(p.slug).toLowerCase() === params.id.toLowerCase()) ||
                null;
            if (!portal) ctx.notFound(`No portal "${params.id}"`);
        }
        if (!portal && viewRulesState.get().portalId) {
            if (params.rule !== undefined && params.rule !== viewRulesState.get().ruleId)
                viewRulesState.set({ ruleId: params.rule || '' });
            return undefined;
        }
        if (!portal) portal = list.find((p) => p.isDefault) || list[0] || null;
        selectViewRulesPortal(portal, params.rule || '');
        return undefined;
    },
    subscribe(ctx, onChange) {
        return viewRulesState.subscribe(onChange);
    },
    label() {
        const s = viewRulesState.get();
        return 'View rules' + (s.portalSlug ? ' · ' + s.portalSlug : '');
    },
});
