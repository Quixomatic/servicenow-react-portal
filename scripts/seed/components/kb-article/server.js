(function () {
    /* Knowledge article: count a view the platform's way (input.kbAction === 'view').
       The article is read with GlideRecordSecure, so only readers count, and only published,
       unexpired articles. Then what the platform does on a view:
         KBViewModel.increaseKBView(gr)  → incrementViewCount() (sys_view_count: its write ACL is
                                           nobody, and the method is fenced from scoped code, but the
                                           global Script Include may call it), or the knowledge.view
                                           event when glide.knowman.async_view_update is on
         a kb_use row (article, user, viewed, session_id): what the platform's "Knowledge View" script
                                           action (event kb.view) and its "KB Article Page" widget write.
       Our scope can't queue kb.view (the event belongs to global: "Access to event 'kb.view' from
       scope … has been refused"), so the row is written here, with the scope's rights (users can't
       create kb_use themselves). Everything else is read and written from the client as the user. */
    data.kbView = null
    if (!input || input.kbAction !== 'view') return
    var id = String(input.article || '')
    if (!/^[0-9a-f]{32}$/.test(id)) return
    var kb = new GlideRecordSecure('kb_knowledge')
    if (!kb.get(id)) return
    if (kb.getValue('workflow_state') !== 'published') return
    var validTo = kb.getValue('valid_to')
    if (validTo && validTo < new GlideDate().getValue()) return
    new global.KBViewModel().increaseKBView(kb)
    var use = new GlideRecord('kb_use')
    use.initialize()
    use.setValue('article', id)
    use.setValue('user', gs.getUserID())
    use.setValue('viewed', true)
    use.setValue('session_id', gs.getSessionID())
    use.insert()
    var fresh = new GlideRecord('kb_knowledge')
    fresh.get(id)
    data.kbView = { article: id, views: parseInt(fresh.getValue('sys_view_count'), 10) || 0 }
})()
