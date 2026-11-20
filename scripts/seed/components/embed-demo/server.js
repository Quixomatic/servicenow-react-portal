(function () {
    // Server-built embed: runs Server Clock's script now, with options this script chose. They're
    // signed, so the embed keeps them (badge is "x-embed": "server": a client can't set it).
    data.built = $sp.getWidget(
        'app/server-clock',
        { title: 'Server-built ($sp.getWidget)', format: 'time', badge: 'signed' },
        { key: 'built' }
    );
    data.title = options.title;
})();
