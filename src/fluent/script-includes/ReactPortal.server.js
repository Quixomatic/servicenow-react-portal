/**
 * ReactPortal: thin bridge from classic server scripts (background scripts, other
 * scopes, authored component server scripts) to the React Portal server modules.
 * All logic lives in the modules under src/server; this class only delegates.
 *
 *   var rp = new x_312987_portal.ReactPortal();
 *   rp.bootstrap('crm');
 *
 * Module paths include the package version from package.json (1.0.0). If that version
 * changes, update MODULE_ROOT.
 */
var ReactPortal = Class.create()

ReactPortal.MODULE_ROOT = 'x_312987_portal/x-312987-react-portal/1.13.0/src/server/'

ReactPortal.prototype = {
    initialize: function () {},

    _mod: function (path) {
        return require(ReactPortal.MODULE_ROOT + path + '.ts')
    },

    /** Bootstrap payload for a portal slug (access-checked for the current user). */
    bootstrap: function (slug) {
        return this._mod('runtime/portal-service').bootstrap(slug).data
    },

    /** Page manifest for a portal slug and portal-relative path. */
    resolvePage: function (slug, path) {
        return this._mod('runtime/portal-service').resolvePage(slug, path || '').data
    },

    /** Assembled live manifest for a portal sys_id (what a publish would seal). */
    assembleManifest: function (portalId) {
        var gr = new GlideRecord('x_312987_portal_portal')
        if (!gr.get(portalId)) return null
        return this._mod('runtime/portal-service').assembleManifest(gr)
    },

    /** Run a component instance's server script. action: initialize | get | update. */
    execute: function (slug, instanceId, action, input, data) {
        return this._mod('runtime/component-executor').execute({
            portal: slug,
            placementId: instanceId,
            action: action || 'get',
            input: input || {},
            data: data || {},
        })
    },

    /** Reprocess a portal's compiled release (normally automatic). */
    process: function (portalId) {
        return this._mod('release/release-service').processPortal(portalId, true)
    },

    /** Reprocess every portal's release (after a manifest version bump). Returns the count. */
    reprocessAll: function () {
        return this._mod('release/release-service').processAllPortals()
    },

    /**
     * Compile a component or theme now (normally automatic on save). Returns a Promise of the
     * build summary; it settles before the calling script finishes, so log inside then():
     *   new x_312987_portal.ReactPortal().compile('component', id).then(function (b) { gs.info(JSON.stringify(b)) })
     */
    compile: function (type, id, force) {
        var owner = this._mod('source/owner').loadOwner(type || 'component', id)
        return this._mod('build/build-service').compileOwner(owner, !!force)
    },

    runMaintenance: function () {
        return this._mod('maintenance/maintenance').runMaintenance()
    },

    type: 'ReactPortal',
}
