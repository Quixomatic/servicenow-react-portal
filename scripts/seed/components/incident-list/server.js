(function () {
    // Service Portal-style: input (from server.get), data (returned), options (placement), $sp.
    var limit = parseInt($sp.getValue('limit'), 10) || 20;
    var filter = (input && input.filter) || $sp.getValue('filter') || 'active';
    var search = String((input && input.search) || '').trim();

    // Action: assign an incident to the current user.
    if (input && input.action === 'assign' && input.sys_id) {
        var target = $sp.getRecord('incident', input.sys_id); // GlideRecordSecure: ACLs apply
        if (target && target.canWrite()) {
            target.setValue('assigned_to', gs.getUserID());
            target.update();
            data.message = $sp.translate('Assigned {0} to you', [target.getDisplayValue('number')]);
        } else {
            data.error = $sp.translate('You cannot assign this incident');
        }
    }

    var gr = new GlideRecordSecure('incident');
    if (filter === 'active') gr.addActiveQuery();
    if (filter === 'mine') {
        gr.addActiveQuery();
        gr.addQuery('assigned_to', gs.getUserID());
    }
    if (filter === 'opened') gr.addQuery('caller_id', gs.getUserID());
    if (search) {
        var q = gr.addQuery('short_description', 'CONTAINS', search);
        q.addOrCondition('number', 'CONTAINS', search);
    }
    gr.orderByDesc('sys_updated_on');
    gr.setLimit(limit);
    gr.query();

    data.rows = [];
    while (gr.next()) {
        data.rows.push({
            sys_id: gr.getUniqueValue(),
            number: gr.getDisplayValue('number'),
            short_description: gr.getDisplayValue('short_description'),
            priority: gr.getValue('priority'),
            priority_label: gr.getDisplayValue('priority'),
            state: gr.getDisplayValue('state'),
            assigned_to: gr.getDisplayValue('assigned_to'),
            assigned_to_me: gr.getValue('assigned_to') === gs.getUserID(),
            updated: gr.getDisplayValue('sys_updated_on'),
        });
    }
    data.filter = filter;
    data.search = search;
    data.limit = limit;
    data.canAssign = $sp.hasRole('itil');
})();
