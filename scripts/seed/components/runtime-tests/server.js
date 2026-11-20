(function () {
    // Exercises the $sp helper so the client can assert on the results.
    var startKeys = Object.keys(data).length; // update() must not resend the widget's data
    var me = $sp.getUser();
    data.sp = {
        user: me.name,
        userIsSelf: me.sysId === gs.getUserID(),
        property: $sp.getProperty('x_312987_portal.public.welcome', '(unset)'),
        translated: $sp.translate('Save'),
        parameter: $sp.getParameter('ping'),
        portal: $sp.getPortal().slug,
        canReadSelf: $sp.canReadRecord('sys_user', gs.getUserID()),
        option: $sp.getValue('label'),
        hasAdmin: $sp.hasRole('admin'),
    };
    // $sp.quick (QuickUtils, ACL-checked): distinct incident categories via GlideAggregate, safe Markdown.
    var quickStart = new Date().getTime();
    data.quick = {
        categories: $sp.quick.getUniqueValues('incident', 'category', '', { valueOnly: true }),
        ms: new Date().getTime() - quickStart,
        md: $sp.quick.markdownToHtml('**b** <i>x</i> [j](javascript:alert(1)) [kb](/kb)'),
    };
    // URL params (site params table / sys_id / view / query, or packed inside q) reach the script.
    data.url = {
        table: $sp.getParameter('table'),
        sys_id: $sp.getParameter('sys_id'),
        view: $sp.getParameter('view'),
        query: $sp.getParameter('query'),
        keys: Object.keys($sp.getParameters()).sort(),
    };
    // Test buttons: messages raised server-side become portal toasts; a thrown error becomes an error toast.
    if (input.raiseMessages) {
        gs.addInfoMessage('Info from gs.addInfoMessage');
        gs.addErrorMessage('Error from gs.addErrorMessage');
        $sp.addSuccessMessage('Success from $sp.addSuccessMessage');
        $sp.addWarningMessage('Warning from $sp.addWarningMessage');
    }
    // Record watch test: touch the dedicated demo incident INC0020831 (safe to change) so the
    // client's useRecordWatch sees server-side writes arrive over AMB. Two updates: mark its
    // short_description, then put it back (the value ends unchanged; sys_mod_count moves on).
    // Scope rights (a plain GlideRecord write), so only authors may trigger it: the Tests page is
    // open to every portal user. gs.hasRole is true for admin too.
    if (input.rwTouch && !gs.hasRole('x_312987_portal.developer')) data.rwTouched = 'denied';
    else if (input.rwTouch) {
        var rw = new GlideRecord('incident');
        if (rw.get('34f4b59b83e05310e8fbc9a6feaad3e4')) {
            var base = String(rw.getValue('short_description') || '').replace(/ \[rt [^\]]*\]$/, '');
            rw.setValue('short_description', base + ' [rt ' + String(input.rwTouch).slice(-6) + ']');
            rw.update();
            rw.setValue('short_description', base);
            rw.update();
            data.rwTouched = String(input.rwTouch);
        } else data.rwTouched = 'missing';
    }
    if (input.raiseError) throw new Error('Test error thrown by the Runtime Tests server script');
    // Embedded widgets: a server-built model (signed options; badge is server-only in Server Clock's schema).
    if (context.action === 'initialize')
        data.embedModel = $sp.getWidget(
            'app/server-clock',
            { title: 'Runtime Tests (server-built)', badge: 'signed' },
            { key: 'rt-srv' }
        );
    // Layout-rooted embeds: the Embed Test Layout's sys_id (the sp page embeds/layout uses it).
    if (context.action === 'initialize') {
        var lay = new GlideRecord('x_312987_portal_component');
        if (lay.get('unique_id', 'app/embed-test-layout')) data.testLayout = lay.getUniqueValue();
    }
    data.action = context.action;
    data.input = input;
    data.startKeys = startKeys;
})();
