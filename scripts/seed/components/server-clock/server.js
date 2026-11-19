(function () {
    // Service Portal-style server script: input, data, options, $sp ($rp) and context are in scope.
    data.serverTime = new GlideDateTime().getDisplayValue()
    data.user = $sp.getUser().name
    data.action = context.action
    data.portal = $sp.getPortal().slug
    if (input && input.message) data.echo = 'Server got: ' + input.message
})()
