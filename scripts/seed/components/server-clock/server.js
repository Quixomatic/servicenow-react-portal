// Runs on the server with input, data, options, component and context (Service Portal style).
data.serverTime = new GlideDateTime().getDisplayValue()
data.user = gs.getUserDisplayName()
data.action = context.action
data.portal = context.portal
if (input && input.message) data.echo = 'Server got: ' + input.message
