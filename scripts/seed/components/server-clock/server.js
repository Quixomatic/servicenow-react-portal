(function () {
    // Service Portal-style server script: input, data, options, $sp ($rp) and context are in scope.
    var shown = new GlideDateTime().getDisplayValue()
    var parts = String(shown).split(' ')
    var format = options.format || 'datetime'
    data.serverTime = format === 'date' ? parts[0] : format === 'time' ? parts.slice(1).join(' ') : shown
    data.user = $sp.getUser().name
    data.action = context.action
    data.portal = $sp.getPortal().slug
    // Instance identity: placements and embedded instances alike.
    data.instanceId = component.instanceId
    data.embedded = !!component.embedded
    data.key = component.key || null
    data.title = options.title || 'Server script'
    data.badge = options.badge || ''
    if (input && input.message) data.echo = 'Server got: ' + input.message
})()
