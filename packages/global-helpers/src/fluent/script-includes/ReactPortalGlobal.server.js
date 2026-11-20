/**
 * ReactPortalGlobal: global-scope helpers for the React Portal scoped app (x_312987_portal).
 *
 * Why this exists
 *   ServiceNow fences some session/user APIs away from scoped code: gs.flushMessages() throws
 *   MethodNotAllowedException, gs.getImpersonatingUserName() and gs.getPreference() are blocked,
 *   GlideSession.clearClientData() is missing, and gs.getCurrentApplicationId() reports the
 *   caller's own scope instead of the session's current application (the app picker). This
 *   script include runs in global and exposes a few narrow wrappers over exactly those calls.
 *
 * Security rationale
 *   - Every method acts only on the CURRENT user's own session or preferences. Nothing takes a
 *     user id, a table name or a GlideRecord. Nothing evaluates script, reads or writes records,
 *     or changes another user's state.
 *   - Inputs are validated against fixed allowlists:
 *       getPreference(name): exactly 'apps.current_app', names starting 'updateSetForScope',
 *                            or names starting 'x_312987_portal.'. Anything else returns null.
 *       clearClientData(key): only keys starting 'x_312987_portal.'. Anything else is a no-op
 *                             that returns false.
 *   - drainSessionMessages() returns the current session's queued info/error messages and
 *     clears that queue. Those are messages the user would see on their next page anyway; the
 *     portal shows them as toasts instead. It can't read another session's queue.
 *   - getImpersonatingUserName() / currentApplication() return facts about the current session
 *     that the user can already see in the classic UI header.
 *   - Not client-callable (no GlideAjax), not sandbox-callable, not mobile-callable: only
 *     server-side scripts can reach it. Accessible from all application scopes with no caller
 *     access setting (tracking/restriction make the platform refuse custom-scope callers of a
 *     global resource); each calling scope holds a sys_scope_privilege (execute) for it.
 *   - Every method catches its own errors and returns a neutral value (empty lists, null,
 *     false), so a platform change can't break the caller; callers feature-detect via version().
 */
var ReactPortalGlobal = Class.create();

ReactPortalGlobal.VERSION = '1.0.0';
ReactPortalGlobal.SCOPE_PREFIX = 'x_312987_portal.';

ReactPortalGlobal.prototype = {
    initialize: function () {},

    /** Feature-detection string: bump when the API surface changes. */
    version: function () {
        return ReactPortalGlobal.VERSION;
    },

    /**
     * Read the session's queued info, error and warning messages, then flush the queue.
     * Messages are returned as queued (they may contain HTML the platform would render).
     * @returns {{ info: string[], error: string[], warning: string[] }}
     */
    drainSessionMessages: function () {
        var out = { info: [], error: [], warning: [] };
        try {
            out.info = this._strings(gs.getInfoMessages());
            out.error = this._strings(gs.getErrorMessages());
        } catch (e) {
            // reading failed: still try to flush below
        }
        try {
            if (typeof gs.getWarningMessages === 'function') out.warning = this._strings(gs.getWarningMessages());
        } catch (e1) {
            // no warning queue on this release
        }
        try {
            gs.flushMessages();
        } catch (e2) {
            // nothing more we can do
        }
        return out;
    },

    /**
     * User name of the person impersonating the current user, or null when not impersonating.
     * @returns {string|null}
     */
    getImpersonatingUserName: function () {
        try {
            var name = gs.getImpersonatingUserName();
            return name ? String(name) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * The current user's preference value, for allowlisted names only.
     * @param {string} name
     * @returns {string|null}
     */
    getPreference: function (name) {
        var key = name == null ? '' : String(name);
        if (!this._preferenceAllowed(key)) return null;
        try {
            var value = gs.getPreference(key);
            return value == null ? null : String(value);
        } catch (e) {
            return null;
        }
    },

    /**
     * Remove a React Portal session client-data key (only keys starting 'x_312987_portal.').
     * @param {string} key
     * @returns {boolean} true when the key was cleared
     */
    clearClientData: function (key) {
        var k = key == null ? '' : String(key);
        if (k.length <= ReactPortalGlobal.SCOPE_PREFIX.length || k.indexOf(ReactPortalGlobal.SCOPE_PREFIX) !== 0)
            return false;
        try {
            gs.getSession().clearClientData(k);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * The session's current application (the classic UI application picker), read from global,
     * where gs.getCurrentApplicationId() reflects the session instead of the calling script's scope.
     * @returns {{ id: string, scope: string, name: string }|null}
     */
    currentApplication: function () {
        try {
            var id = String(gs.getCurrentApplicationId() || '');
            if (!id) return null;
            return {
                id: id,
                scope: String(gs.getCurrentApplicationScope() || ''),
                name: String(gs.getCurrentApplicationName() || ''),
            };
        } catch (e) {
            return null;
        }
    },

    /* ---------------- internals ---------------- */

    _preferenceAllowed: function (key) {
        if (!key) return false;
        if (key === 'apps.current_app') return true;
        if (key.indexOf('updateSetForScope') === 0) return true;
        return key.length > ReactPortalGlobal.SCOPE_PREFIX.length && key.indexOf(ReactPortalGlobal.SCOPE_PREFIX) === 0;
    },

    /** A Java List or JS array of messages as a JS array of strings. */
    _strings: function (list) {
        var out = [];
        if (!list) return out;
        if (typeof list.size === 'function') {
            var n = list.size();
            for (var i = 0; i < n; i++) out.push(String(list.get(i)));
            return out;
        }
        if (typeof list.length === 'number') {
            for (var j = 0; j < list.length; j++) out.push(String(list[j]));
        }
        return out;
    },

    type: 'ReactPortalGlobal',
};
