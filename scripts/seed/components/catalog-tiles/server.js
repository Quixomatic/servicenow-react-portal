(function () {
    /* Popular catalog items: request counts per item over the last `days` days (scope rights:
       aggregate counts only, no record data). The client then loads each item through the catalog
       API as the user, so catalog user criteria still decide what is shown. */
    data.popular = [];
    if ((options.mode || 'popular') !== 'popular') return;
    var days = parseInt(options.days, 10) || 365;
    var agg = new GlideAggregate('sc_req_item');
    agg.addQuery('cat_item.active', true);
    agg.addQuery('sys_created_on', '>=', gs.daysAgoStart(days));
    agg.addAggregate('COUNT');
    agg.groupBy('cat_item');
    agg.orderByAggregate('COUNT');
    agg.query();
    var rows = [];
    while (agg.next()) {
        var id = String(agg.getValue('cat_item') || '');
        if (id) rows.push({ id: id, count: parseInt(agg.getAggregate('COUNT'), 10) || 0 });
    }
    rows.sort(function (a, b) {
        return b.count - a.count;
    });
    data.popular = rows.slice(0, 24);
    data.days = days;
})();
