/**
 * QuickUtils: thin bridge from classic server scripts in the x_312987_portal scope to the
 * QuickUtils module (src/server/lib/quick-utils.ts), a port of TurboForge's tfQuickUtils.
 * All logic lives in the module; this class only delegates.
 *
 *   var qu = new QuickUtils();                      // scope rights, like tfQuickUtils
 *   var cats = qu.getUniqueValues('incident', 'category', 'active=true', { valueOnly: true });
 *
 *   var sqd = new QuickUtils({ secure: true });     // ACL-checked for the session user ($sp.quick)
 *
 * The module path comes from ReactPortal.MODULE_ROOT (versioned; npm run version:bump moves it).
 */
var QuickUtils = Class.create()

QuickUtils.prototype = {
    initialize: function (settings) {
        var s = settings || {}
        this._qu = require(ReactPortal.MODULE_ROOT + 'lib/quick-utils.ts').createQuickUtils({
            secure: !!s.secure,
            input: s.input || null,
            options: s.options || null,
        })
    },

    copyAttachments: function (fromTable, fromRecID, toTable, toRecID) {
        return this._qu.copyAttachments(fromTable, fromRecID, toTable, toRecID)
    },
    validGroups: function (list) {
        return this._qu.validGroups(list)
    },
    dateDifference: function (date1, date2) {
        return this._qu.dateDifference(date1, date2)
    },
    createSimpleSet: function (stringArray) {
        return this._qu.createSimpleSet(stringArray)
    },
    getAllFields: function (table, referenceField, path, activeFieldList) {
        return this._qu.getAllFields(table, referenceField, path, activeFieldList)
    },
    getJournalFields: function (table, fieldTypes, allowedFields) {
        return this._qu.getJournalFields(table, fieldTypes, allowedFields)
    },
    getColumnType: function (table, field) {
        return this._qu.getColumnType(table, field)
    },
    getColumnTableName: function (table, field) {
        return this._qu.getColumnTableName(table, field)
    },
    getColumnInfo: function (table, field) {
        return this._qu.getColumnInfo(table, field)
    },
    getColumnLabel: function (table, field) {
        return this._qu.getColumnLabel(table, field)
    },
    getColumnElement: function (table, field) {
        return this._qu.getColumnElement(table, field)
    },
    getTableColumns: function (table, fields) {
        return this._qu.getTableColumns(table, fields)
    },
    getColumnChoices: function (table, field, force) {
        return this._qu.getColumnChoices(table, field, force)
    },
    getField: function (gr, field) {
        return this._qu.getField(gr, field)
    },
    getFieldsArray: function (gr, fields) {
        return this._qu.getFieldsArray(gr, fields)
    },
    getFieldsObject: function (gr, fields, optionalObj) {
        return this._qu.getFieldsObject(gr, fields, optionalObj)
    },
    hasRole: function (roleString, exact) {
        return this._qu.hasRole(roleString, exact)
    },
    hasRoleExactly: function (roleName) {
        return this._qu.hasRoleExactly(roleName)
    },
    getUserGroups: function (userID, options) {
        return this._qu.getUserGroups(userID, options)
    },
    getCompiledURI: function (current, path) {
        return this._qu.getCompiledURI(current, path)
    },
    truncateText: function (text, max) {
        return this._qu.truncateText(text, max)
    },
    compileText: function (text, current, record) {
        return this._qu.compileText(text, current, record)
    },
    compileMeta: function (text, dataSources) {
        return this._qu.compileMeta(text, dataSources)
    },
    getUniqueValues: function (table, groupingAttribute, encodedQuery, options) {
        return this._qu.getUniqueValues(table, groupingAttribute, encodedQuery, options)
    },
    getUniqueValuesUnchecked: function (table, groupingAttribute, encodedQuery, options) {
        return this._qu.getUniqueValuesUnchecked(table, groupingAttribute, encodedQuery, options)
    },
    convertToUSD: function (number, prefix) {
        return this._qu.convertToUSD(number, prefix)
    },
    parseFieldAttributes: function (attrs) {
        return this._qu.parseFieldAttributes(attrs)
    },
    getGlobalVariableByName: function (name, defaultValue) {
        return this._qu.getGlobalVariableByName(name, defaultValue)
    },
    getInputVariableByName: function (name, defaultValue) {
        return this._qu.getInputVariableByName(name, defaultValue)
    },
    markdownToHtml: function (markdown, options) {
        return this._qu.markdownToHtml(markdown, options)
    },

    type: 'QuickUtils',
}
