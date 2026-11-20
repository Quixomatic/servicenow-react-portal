(function () {
    // A layout's own on-load server script: it runs under the layout root 'layout:<sys_id>',
    // authorized against the page's effective layout, and can build embeds of widgets the layout imports.
    data.clock = $sp.getWidget(
        'app/server-clock',
        { title: 'Layout · server-built ($sp.getWidget)', format: 'date', badge: 'layout' },
        { key: 'layout-built' }
    );
    data.instanceId = component.instanceId;
    data.page = context.page;
})();
