(function () {
    // Exercises the $sp helper so the client can assert on the results.
    var startKeys = Object.keys(data).length // update() must not resend the widget's data
    var me = $sp.getUser()
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
    }
    data.action = context.action
    data.input = input
    data.startKeys = startKeys
})()
