(function () {
    /* Announcements the way Service Portal shows them. Most users can't read the `announcement`
       table (its ACLs admit admins only), so the widget's server script reads it with the scope's
       rights and applies the audience rules itself:
         - active, and now inside from / to (an empty bound is open);
         - roles: empty, or the user holds one of them (gs.hasRole: admin passes every role);
         - "Show for unauthenticated users only" ones are skipped (portal users are logged in);
         - consumer type: options.types 'widget' | 'banner' | 'any'.
       Portal targeting (m2m_announcement_portal) is Service Portal's sp_portal list and has no
       React Portal equivalent, so it isn't applied. Only display fields leave the server. */
    var want = String($sp.getValue('types') || 'widget').toLowerCase();
    var limit = parseInt($sp.getValue('limit'), 10) || 3;
    if (limit < 1) limit = 1;
    if (limit > 20) limit = 20;
    var now = new GlideDateTime().getNumericValue();

    function within(gr, field, cmp) {
        var s = gr.getValue(field);
        if (!s) return true;
        var t = new GlideDateTime(s).getNumericValue();
        return cmp(t);
    }

    function allowedByRoles(list) {
        var roles = String(list || '').split(',');
        var any = false;
        for (var i = 0; i < roles.length; i++) {
            var r = roles[i].trim();
            if (!r) continue;
            any = true;
            if (gs.hasRole(r)) return true;
        }
        return !any;
    }

    var items = [];
    var gr = new GlideRecord('announcement');
    gr.addActiveQuery();
    gr.orderByDesc('display_first');
    gr.orderByDesc('from');
    gr.setLimit(100);
    gr.query();
    while (gr.next() && items.length < limit) {
        if (
            !within(gr, 'from', function (t) {
                return t <= now;
            })
        )
            continue;
        if (
            !within(gr, 'to', function (t) {
                return t >= now;
            })
        )
            continue;
        if (gr.getValue('show_for_unauthenticated_users_only') === '1') continue;
        if (!allowedByRoles(gr.getValue('roles'))) continue;
        var types = String(gr.getDisplayValue('type') || '').toLowerCase();
        if (want !== 'any' && types.indexOf(want) < 0) continue;
        var url = String(gr.getValue('details_url') || '');
        var dismiss = String(gr.getValue('dismiss_options') || '');
        items.push({
            id: gr.getUniqueValue(),
            title: gr.getDisplayValue('title'),
            summary: gr.getDisplayValue('summary'),
            urgent: /urgent/i.test(gr.getDisplayValue('display_style')),
            glyph: String(gr.getValue('glyph') || ''),
            linkText: gr.getDisplayValue('details_link_text'),
            linkUrl: !url ? '' : /^(https?:|mailto:)/i.test(url) ? url : '/' + url.replace(/^\/+/, ''),
            newTab: gr.getValue('click_target') !== 'urlSame',
            dismiss: dismiss === 'dismissible' ? 'forever' : dismiss === 'session_dismissible' ? 'session' : 'none',
        });
    }
    data.items = items;
})();
