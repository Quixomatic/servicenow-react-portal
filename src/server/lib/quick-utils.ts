import {
    gs,
    GlideRecord,
    GlideRecordSecure,
    GlideAggregate,
    GlideDateTime,
    GlideSysAttachment,
} from '@servicenow/glide';

/**
 * QuickUtils: a typed port of James's TurboForge `tfQuickUtils` Script Include
 * (x_312987_turbofo_0.tfQuickUtils), adapted to the x_312987_portal scoped runtime.
 *
 * Two flavours come from one factory:
 *
 *   createQuickUtils({ secure: false })   // "raw": scope rights, faithful to the original (Script Include bridge)
 *   createQuickUtils({ secure: true })    // ACL-checked for the session user ($sp.quick in component scripts)
 *
 * What "secure" changes, per function, is documented in docs/guide/server-api/sp-api.md#quick-utilities.
 * In short: record data (getUniqueValues, getField & co., compileText/compileMeta, getCompiledURI,
 * copyAttachments, getUserGroups for another user) is filtered by the user's row and field ACLs;
 * schema metadata (labels, types, choices) and pure helpers behave the same in both modes;
 * markdownToHtml escapes HTML and drops unsafe link targets.
 */

/** A GlideRecord-ish handle (the typed generics don't help with dynamic tables). */
type GR = any;

export interface QuickUtilsSettings {
    /** Enforce the session user's ACLs on record data. Default false (scope rights). */
    secure?: boolean;
    /** For getGlobalVariableByName / getInputVariableByName (a component script's `input`). */
    input?: Record<string, unknown> | null;
    /** For getGlobalVariableByName (a component script's `options`). */
    options?: Record<string, unknown> | null;
}

export interface UniqueValueOptions {
    /** Group (and display) by a second field, e.g. group by `assignment_group`, display `assignment_group.name`. */
    displayAttribute?: string;
    /** 'a,b' or ['a', { field: 'b', direction: 'desc' }]. Note: GlideAggregate also groups by every sort field. */
    sortBy?: string | Array<string | { field: string; direction?: 'asc' | 'desc' }>;
    /** Return plain values instead of `{ value, display_value }`. */
    valueOnly?: boolean;
    /** Return plain display values instead of `{ value, display_value }`. */
    displayOnly?: boolean;
    /** With valueOnly / displayOnly: return a comma-separated string. */
    asString?: boolean;
    /** Secure mode only: how many matching rows to test per distinct value before giving up on it. Default 500. */
    scanLimit?: number;
}

export interface UniqueValue {
    value: string;
    display_value: string;
}

export interface FieldInfo {
    value: string | null;
    display_value: string;
    label: string | null;
    field_name: string;
    path: string;
    table: string | null;
    type: string | null;
    numeric?: number | null;
    currency_code?: string;
    currency_value?: string;
    currency_display_value?: string;
    reference_currency_code?: string;
    reference_currency_value?: string;
    reference_currency_display_value?: string;
}

export interface FieldDescriptor {
    label: string;
    name: string;
    type: string;
    path: string;
    active: boolean;
    id: string;
    fields: FieldDescriptor[] | null;
}

export interface MetaSource {
    type: 'glide' | 'object' | 'value';
    data: unknown;
}

const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const toList = (v: unknown): string[] =>
    Array.isArray(v)
        ? v.map(s)
        : typeof v === 'string'
          ? v.split(',')
          : v === null || v === undefined
            ? []
            : s(v).split(',');
const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/** True when `table` is a real table. */
function validTable(table: string): boolean {
    if (!table) return false;
    try {
        return !!new GlideRecord(table).isValid();
    } catch (e) {
        return false;
    }
}

/**
 * The element descriptor at the end of a (possibly dot-walked) path, resolved through the
 * dictionary rather than record data, so it works on an empty record too.
 * Returns { table, field, element } where `table` is the table holding the last field.
 */
function resolvePath(table: string, path: string): { table: string; field: string; element: any } | null {
    if (!table || !path || !validTable(table)) return null;
    const hops = path.split('.');
    let current = table;
    for (let i = 0; i < hops.length; i++) {
        const gr: GR = new GlideRecord(current);
        if (!gr.isValidField(hops[i])) return null;
        const el = gr.getElement(hops[i]);
        if (i === hops.length - 1) return { table: current, field: hops[i], element: el };
        const ref = s(el.getReferenceTable());
        if (!ref) return null;
        current = ref;
    }
    return null;
}

/**
 * Field paths an encoded query reads, or null when the query can't be vetted (text search,
 * RLQUERY, unknown syntax): secure callers then refuse the query (fail closed).
 */
export function encodedQueryFields(query: string): string[] | null {
    if (!query) return [];
    const fields: string[] = [];
    const terms = String(query).replace(/\^\^/g, '\u0000').split('^');
    for (let term of terms) {
        term = term.replace(/^(OR|NQ)(?=[a-z_]|ORDERBY|GROUPBY)/, '');
        if (term === '' || term === 'EQ') continue;
        const order = /^(?:ORDERBYDESC|ORDERBY|GROUPBY)([a-z_][a-z0-9_.]*)$/.exec(term);
        if (order) {
            fields.push(order[1]);
            continue;
        }
        const m = /^([a-z_][a-z0-9_.]*)([=!<>]|[A-Z])(.*)$/.exec(term);
        if (!m) return null;
        fields.push(m[1]);
        // Field-to-field comparisons read the right-hand field as well.
        const ff = /^(?:SAMEAS|NSAMEAS|GT_FIELD|LT_FIELD|GT_OR_EQUALS_FIELD|LT_OR_EQUALS_FIELD)(.*)$/.exec(m[2] + m[3]);
        if (ff) {
            if (!/^[a-z_][a-z0-9_.]*$/.test(ff[1])) return null;
            fields.push(ff[1]);
        }
    }
    return fields;
}

/** Can the session user read `path` on this positioned record (each hop for dot-walks)? */
function canReadPath(gr: GR, path: string): boolean {
    if (!gr || typeof gr.canRead !== 'function' || !gr.canRead()) return false;
    const hops = path.split('.');
    let rec: GR = gr;
    for (let i = 0; i < hops.length; i++) {
        if (!rec.isValidField(hops[i])) return false;
        const el = rec.getElement(hops[i]);
        if (!el || !el.canRead()) return false;
        if (i === hops.length - 1) return true;
        // An empty reference ends the walk: there's no further data to see.
        if (!s(rec.getValue(hops[i]))) return true;
        const next: GR = el.getRefRecord();
        if (!next || !next.isValidRecord() || !next.canRead()) return false;
        rec = next;
    }
    return true;
}

export function createQuickUtils(settings: QuickUtilsSettings = {}) {
    const secure = !!settings.secure;
    // The scope-rights flavour, created on first use (secure getUserGroups needs it for the user's own groups).
    let rawUtils: any = null;
    const raw = (): any => rawUtils || (rawUtils = createQuickUtils({ ...settings, secure: false }));

    // ── getUniqueValues ─────────────────────────────────────────────────────────────────────
    /**
     * Unique values of a field via GlideAggregate (one GROUP BY query, no row iteration).
     * Secure mode: every distinct value must be backed by at least one row the user can read,
     * with every grouped / sorted / queried field readable on that row (one short
     * GlideRecordSecure probe per value). Queries that can't be vetted return [].
     */
    function getUniqueValues(
        table: string,
        groupingAttribute: string,
        encodedQuery?: string | null,
        options?: UniqueValueOptions | null
    ): Array<UniqueValue | string> | string {
        const opts: UniqueValueOptions = options || {};
        const out: Array<UniqueValue | string> = [];
        const finish = () => ((opts.valueOnly || opts.displayOnly) && opts.asString ? out.join(',') : out);
        if (!table || !groupingAttribute) return finish();
        const displayAttribute = opts.displayAttribute || groupingAttribute;
        const sorts: Array<{ field: string; desc: boolean }> = [];
        if (opts.sortBy) {
            for (const so of typeof opts.sortBy === 'string' ? opts.sortBy.split(',') : opts.sortBy) {
                if (typeof so === 'string') {
                    if (so.trim()) sorts.push({ field: so.trim(), desc: false });
                } else if (so && so.field) sorts.push({ field: String(so.field), desc: so.direction === 'desc' });
            }
        }
        let checkFields: string[] = [];
        if (secure) {
            const qf = encodedQueryFields(encodedQuery ? String(encodedQuery) : '');
            if (qf === null) return finish();
            checkFields = [groupingAttribute, displayAttribute, ...sorts.map((x) => x.field), ...qf].filter(
                (f, i, a) => a.indexOf(f) === i
            );
            // Unknown fields would be ignored by the query (widening it), so refuse them.
            for (const f of checkFields) if (!resolvePath(table, f)) return finish();
        } else if (!validTable(table)) return finish();

        const ga: any = new GlideAggregate(table);
        ga.addAggregate('COUNT');
        for (const so of sorts) {
            if (so.desc) ga.orderByDesc(so.field);
            else ga.orderBy(so.field);
        }
        ga.groupBy(groupingAttribute);
        if (displayAttribute !== groupingAttribute) ga.groupBy(displayAttribute);
        if (encodedQuery !== undefined && encodedQuery !== null && encodedQuery !== '')
            ga.addEncodedQuery(String(encodedQuery));
        ga.query();
        const scanLimit = Math.max(1, Math.min(10000, Number(opts.scanLimit) || 500));
        while (ga.next()) {
            const display = ga.getDisplayValue(displayAttribute);
            // The original skips the "no value" group (empty display of the grouping field).
            if (!ga.getDisplayValue(groupingAttribute)) continue;
            const value = s(ga.getValue(groupingAttribute));
            if (secure) {
                const probe: GR = new GlideRecordSecure(table);
                if (encodedQuery) probe.addEncodedQuery(String(encodedQuery));
                probe.addQuery(groupingAttribute, value);
                if (displayAttribute !== groupingAttribute) {
                    const dv = s(ga.getValue(displayAttribute));
                    if (dv) probe.addQuery(displayAttribute, dv);
                    else probe.addNullQuery(displayAttribute);
                }
                probe.setLimit(scanLimit);
                probe.query();
                let ok = false;
                while (!ok && probe.next()) ok = checkFields.every((f) => canReadPath(probe, f));
                if (!ok) continue;
            }
            if (opts.valueOnly) out.push(value);
            else if (opts.displayOnly) out.push(s(display));
            else out.push({ display_value: s(display), value });
        }
        return finish();
    }

    // ── Schema helpers (dictionary metadata; same in both modes) ───────────────────────────
    /** `{ value, display_value }` = the field's internal type, or null. Dot-walks allowed. */
    function getColumnType(
        table: string,
        field: string
    ): { value: string | null; display_value: string | null } | null {
        if (!table || !field) return null;
        const r = resolvePath(table, field);
        const type = r ? s(r.element.getED().getInternalType()) : null;
        return { value: type, display_value: type };
    }

    /**
     * The table a column's value lives in: for a reference column the referenced table, else
     * the table holding the (last dot-walked) column. null when invalid.
     */
    function getColumnTableName(t: string, f: string): string | null {
        if (!t || !f) return null;
        try {
            const r = resolvePath(t, f);
            if (!r) return null;
            const type = s(r.element.getED().getInternalType());
            if (type === 'reference') return s(r.element.getReferenceTable()) || null;
            return r.table;
        } catch (e) {
            return null;
        }
    }

    /** The field's label, or null. */
    function getColumnInfo(table: string, field: string): string | null {
        if (!table || !field) return null;
        const r = resolvePath(table, field);
        return r ? s(r.element.getLabel()) : null;
    }

    function getColumnLabel(
        table: string,
        field: string
    ): { value: string | null; display_value: string | null } | null {
        if (!table || !field) return null;
        const label = getColumnInfo(table, field);
        return { value: label, display_value: label };
    }

    function getColumnElement(table: string, field: string): { value: string; display_value: string } | null {
        if (!table || !field) return null;
        return { value: field, display_value: field };
    }

    function getTableColumns(table: string, fields: string | string[]) {
        if (!table) return [];
        return toList(fields).map((f) => ({
            column_label: getColumnLabel(table, f),
            element: getColumnElement(table, f),
            type: getColumnType(table, f),
        }));
    }

    /** Choices of a string / choice / boolean column (any type with `force`): [{ value, label }]. */
    function getColumnChoices(
        table: string,
        field: string,
        force?: boolean
    ): Array<{ value: string; label: string }> | null {
        if (!table || !field) return null;
        try {
            const r = resolvePath(table, field);
            if (!r) return [];
            const type = s(r.element.getED().getInternalType());
            if (type !== 'string' && type !== 'choice' && type !== 'boolean' && !force) return [];
            if (type === 'boolean') {
                return [
                    { value: '1', label: 'True' },
                    { value: '0', label: 'False' },
                ];
            }
            const gr: GR = new GlideRecord(r.table);
            gr.initialize();
            const values = gr.getElement(r.field).getChoices();
            const choices: Array<{ value: string; label: string }> = [];
            for (let i = 0; i < values.length; i++) {
                const v = s(values[i]);
                gr.setValue(r.field, v);
                choices.push({ value: v, label: s(gr.getElement(r.field).getChoiceValue()) });
            }
            return choices;
        } catch (e) {
            return [];
        }
    }

    /**
     * Every field of a table (or of the table `referenceField` points to), sorted by label.
     * Fields whose path is in `activeFieldList` are marked active and expanded one level
     * (their reference table's fields), recursively.
     */
    function getAllFields(
        table: string,
        referenceField?: string | null,
        path?: string | null,
        activeFieldList?: string[] | null
    ): FieldDescriptor[] | null {
        if (!table) return null;
        let target = table;
        if (referenceField) {
            const r = resolvePath(table, referenceField);
            target = r ? s(r.element.getReferenceTable()) : '';
        }
        if (!target || !validTable(target)) return null;
        const gr: GR = new GlideRecord(target);
        gr.initialize();
        const elements = gr.getElements();
        const fields: FieldDescriptor[] = [];
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const name = s(el.getName());
            const d: FieldDescriptor = {
                label: s(el.getLabel()),
                name,
                type: s(el.getED().getInternalType()),
                path: path ? path + '.' + name : name,
                active: false,
                id: s(gs.generateGUID()),
                fields: [],
            };
            if (activeFieldList && activeFieldList.indexOf(d.path) !== -1) {
                d.active = true;
                d.fields = getAllFields(target, d.name, d.path, activeFieldList);
            }
            fields.push(d);
        }
        return fields.sort((a, b) => {
            const la = a.label.toUpperCase();
            const lb = b.label.toUpperCase();
            return la < lb ? -1 : la > lb ? 1 : 0;
        });
    }

    /** Journal fields of a table; or the fields of `fieldTypes`; or exactly `allowedFields`. */
    function getJournalFields(
        table: string,
        fieldTypes?: string | string[] | null,
        allowedFields?: string | string[] | null
    ): FieldDescriptor[] {
        const types = typeof fieldTypes === 'string' ? fieldTypes.split(',') : fieldTypes;
        const allowed = typeof allowedFields === 'string' ? allowedFields.split(',') : allowedFields;
        return (getAllFields(table) || []).filter((field) => {
            if (allowed && allowed.length) return allowed.indexOf(field.name) !== -1;
            if (types && types.length) return types.indexOf(field.type) !== -1;
            return field.type === 'journal_input' || field.type === 'journal';
        });
    }

    // ── Record data ────────────────────────────────────────────────────────────────────────
    /**
     * A field of a record as `{ value, display_value, label, field_name, path, table, type, … }`
     * (dot-walks follow references). Secure mode: null when the user can't read the record, any
     * hop, or the field.
     */
    function getField(gr: GR, f: string): FieldInfo | null {
        if (!gr || !f) return null;
        if (secure && !canReadPath(gr, f)) return null;
        const hops = String(f).split('.');
        let rec: GR = gr;
        for (let i = 0; i < hops.length - 1; i++) {
            if (!rec.isValidField(hops[i])) return null;
            rec = rec.getElement(hops[i]).getRefRecord();
            if (!rec) return null;
        }
        const name = hops[hops.length - 1];
        if (!rec.isValidField(name)) return null;
        const rootTable = s(gr.getTableName());
        const recTable = s(rec.getTableName());
        const value = rec.getValue(name);
        const info: FieldInfo = {
            value: value === null || value === undefined ? null : String(value),
            display_value: s(gs.getMessage(s(rec.getDisplayValue(name)))),
            label: getColumnInfo(recTable, name),
            field_name: name,
            path: f,
            table: getColumnTableName(rootTable, f),
            type: (getColumnType(recTable, name) || { value: null }).value,
        };
        if (info.type === 'glide_date_time' || info.type === 'glide_date') {
            info.numeric = info.value ? new GlideDateTime(info.value).getNumericValue() : null;
        }
        if (info.type === 'currency' || info.type === 'price') {
            const el = rec.getElement(name);
            info.currency_code = s(el.getCurrencyCode());
            info.currency_value = s(el.getCurrencyValue());
            info.currency_display_value = s(el.getCurrencyDisplayValue());
            info.reference_currency_code = s(el.getReferenceCurrencyCode());
            info.reference_currency_value = s(el.getReferenceValue());
            info.reference_currency_display_value = s(el.getReferenceDisplayValue());
        }
        return info;
    }

    /** getField for each of 'a,b,c' (or an array). Secure mode: unreadable fields are null. */
    function getFieldsArray(gr: GR, fields: string | string[]): Array<FieldInfo | null> {
        return toList(fields).map((f) => getField(gr, f));
    }

    /** { [field]: getField(gr, field) }, optionally merged into `optionalObj`. */
    function getFieldsObject(
        gr: GR,
        fields: string | string[],
        optionalObj?: Record<string, unknown> | null
    ): Record<string, unknown> {
        const obj: Record<string, unknown> = optionalObj || {};
        for (const f of toList(fields)) obj[f] = getField(gr, f);
        return obj;
    }

    /** An HTML link to the record (`_uri_`) or to the record a reference path points to. */
    function getCompiledURI(current: GR, path: string): string | null {
        if (!current || !path) return null;
        const isCurrent = path === '_uri_';
        const target = path.replace('._uri_', '');
        let table: string | null;
        let sysId: string | null;
        let display: string;
        if (isCurrent) {
            if (secure && !current.canRead()) return null;
            table = s(current.getTableName());
            sysId = s(current.getUniqueValue());
            display = s(current.getDisplayValue());
        } else {
            const fi = getField(current, target);
            if (!fi) return null;
            table = getColumnTableName(s(current.getTableName()), target);
            sysId = fi.value;
            display = fi.display_value;
        }
        if (!table || !sysId) return null;
        const base =
            s(gs.getProperty('glide.servlet.uri')) ||
            'https://' + s(gs.getProperty('instance_name')) + '.service-now.com/';
        const url = base.replace(/\/?$/, '/') + encodeURIComponent(table) + '.do?sys_id=' + encodeURIComponent(sysId);
        return '<a href="' + escapeHtml(url) + '" target="_blank">' + escapeHtml(display) + '</a>';
    }

    /** Replace {current.field} / {record.field} (and *._uri_ links) with display values. */
    function compileText(text: string, current?: GR, record?: GR): string | null {
        if (!text) return null;
        if (!current) return text;
        return String(text).replace(/{(.*?)}/g, (_m: string, token: string) => {
            let c = token.replace(/\s+/g, '').toLowerCase();
            let out: string | null = '';
            if (c.indexOf('current.') === 0) {
                c = c.substring('current.'.length);
                out =
                    c.indexOf('_uri_') !== -1
                        ? getCompiledURI(current, c)
                        : (getField(current, c) || { display_value: '' }).display_value;
            } else if (c.indexOf('record.') === 0 && record) {
                c = c.substring('record.'.length);
                out =
                    c.indexOf('_uri_') !== -1
                        ? getCompiledURI(record, c)
                        : (getField(record, c) || { display_value: '' }).display_value;
            }
            return out ? out : '';
        });
    }

    /**
     * Replace {source.path} tokens from named data sources:
     *   { type: 'glide', data: gr }   → display value (… .getvalue = value, … .shortvalue = display truncated to 100)
     *   { type: 'object', data: obj } → the (nested) property
     *   { type: 'value', data: x }    → x
     */
    function compileMeta(text: string, dataSources: Record<string, MetaSource>): string | null {
        if (!text || !dataSources) return null;
        const identifiers = Object.keys(dataSources);
        return String(text).replace(/{(.*?)}/g, (_m: string, token: string) => {
            const identifier = token.split('.')[0];
            if (identifiers.indexOf(identifier) === -1) return '';
            const source = dataSources[identifier];
            if (!source) return '';
            const raw = token.replace(/\s+/g, '');
            const c = raw.toLowerCase();
            const parts = c.split('.');
            const last = parts[parts.length - 1];
            let out: unknown = '';
            if (source.type === 'glide') {
                if (!source.data) return '';
                let path = parts.slice(1).join('.');
                if (last === 'getvalue' || last === 'shortvalue') path = parts.slice(1, -1).join('.');
                const fi = getField(source.data, path);
                if (!fi) return '';
                if (last === 'getvalue') out = fi.value;
                else if (last === 'shortvalue') out = truncateText(fi.display_value, 100);
                else out = fi.display_value;
            } else if (source.type === 'object') {
                // Exact-case property first, then the lowercased one the original looked up.
                const exact = raw.split('.').slice(1);
                const lower = parts.slice(1);
                const walk = (props: string[]) => {
                    let v: any = source.data;
                    for (const p of props) {
                        if (v === null || v === undefined) return undefined;
                        v = v[p];
                    }
                    return v;
                };
                out = walk(exact);
                if (out === undefined) out = walk(lower);
            } else if (source.type === 'value') {
                out = source.data;
            }
            return out ? String(out) : '';
        });
    }

    /** Copy every attachment of one record to another. Secure: source readable, target writable. */
    function copyAttachments(fromTable: string, fromRecID: string, toTable: string, toRecID: string): boolean {
        if (!fromTable || !fromRecID || !toTable || !toRecID) return false;
        const from: GR = secure ? new GlideRecordSecure(fromTable) : new GlideRecord(fromTable);
        if (!from.get(fromRecID)) return false;
        if (secure) {
            const to: GR = new GlideRecordSecure(toTable);
            if (!to.get(toRecID) || !to.canWrite()) return false;
        }
        new GlideSysAttachment().copy(fromTable, fromRecID, toTable, toRecID);
        return true;
    }

    // ── Users, groups, roles ───────────────────────────────────────────────────────────────
    /** True when at least one group in the list is active and has an active member (one aggregate). */
    function validGroups(list: string | string[]): boolean {
        const groups = toList(list)
            .map((g) => g.trim())
            .filter((g) => /^[0-9a-f]{32}$/.test(g));
        if (!groups.length) return false;
        // Scope rights on purpose: the answer is a boolean about group staffing (approval routing),
        // and roleless users can't read sys_user_grmember.
        const ga: any = new GlideAggregate('sys_user_grmember');
        ga.addAggregate('COUNT');
        ga.addQuery('group', 'IN', groups.join(','));
        ga.addQuery('group.active', true);
        ga.addQuery('user.active', true);
        ga.query();
        return ga.next() && parseInt(s(ga.getAggregate('COUNT')), 10) > 0;
    }

    /** Active groups of a user (default: the current user), as sys_ids or a comma-separated string. */
    function getUserGroups(userID?: string | null, options?: { asString?: boolean } | null): string[] | string {
        const me = s(gs.getUserID());
        const user = s(userID) || me;
        const opts = options || {};
        const query = 'group.active=true^user=' + user;
        // Your own memberships are always yours to see; someone else's follow the ACLs in secure mode.
        const list =
            user === me
                ? raw().getUniqueValues('sys_user_grmember', 'group', query, { valueOnly: true })
                : getUniqueValues('sys_user_grmember', 'group', query, { valueOnly: true });
        const arr = Array.isArray(list) ? (list as string[]) : [];
        return opts.asString ? arr.join(',') : arr;
    }

    /** The current user has the exact role (no admin override; inherited roles count). */
    function hasRoleExactly(roleName: string): boolean {
        const name = s(roleName).trim();
        if (!name) return false;
        const role: GR = new GlideRecord('sys_user_role');
        role.addQuery('name', name);
        role.setLimit(1);
        role.query();
        if (!role.next()) return false;
        const has: GR = new GlideRecord('sys_user_has_role');
        has.addQuery('user', gs.getUserID());
        has.addQuery('role', role.getUniqueValue());
        has.setLimit(1);
        has.query();
        return has.hasNext();
    }

    /** The current user has any of the comma-separated roles (`exact`: without the admin override). Empty → true. */
    function hasRole(roleString: string, exact?: boolean): boolean {
        if (!roleString) return true;
        const user = gs.getUser();
        for (const r of String(roleString).split(',')) {
            const name = r.trim();
            if (!name) continue;
            if (exact ? hasRoleExactly(name) : user.hasRole(name)) return true;
        }
        return false;
    }

    // ── Pure helpers ───────────────────────────────────────────────────────────────────────
    /** Days between two dates ('yyyy-MM-dd', a date-time string, or a GlideDateTime), always ≥ 0. */
    function dateDifference(date1: unknown, date2: unknown): number {
        const num = (d: unknown): number => {
            const text = s(d).trim();
            const gdt = new GlideDateTime(/^\d{4}-\d{2}-\d{2}$/.test(text) ? text + ' 00:00:00' : text);
            return Number(gdt.getNumericValue());
        };
        return Math.abs(num(date1) - num(date2)) / (1000 * 60 * 60 * 24);
    }

    /** Unique values of an array or comma-separated string, in first-seen order. */
    function createSimpleSet(stringArray: string | unknown[] | null | undefined): unknown[] {
        if (!stringArray) return [];
        const arr = typeof stringArray === 'string' ? stringArray.split(',') : stringArray;
        return arr.filter((item, pos, self) => self.indexOf(item) === pos);
    }

    /** `text` cut to `max` characters with '...' appended when longer. */
    function truncateText(text: string, max: number): string {
        const t = s(text);
        return t.length > max ? t.substr(0, max - 1) + '...' : t;
    }

    /** 1234.5 → '$1,234.50'. null / objects pass through; non-numeric input is returned unchanged. */
    function convertToUSD(number: unknown, prefix?: string): unknown {
        if (typeof number === 'object' || number === null || number === undefined) return number;
        const n = parseFloat(String(number));
        if (isNaN(n)) return number;
        return (prefix || '$') + n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }

    /** 'ref_qual_elements=a;b,no_email=true' → { ref_qual_elements: 'a;b', no_email: 'true' }. */
    function parseFieldAttributes(attrs: string): Record<string, string> {
        if (!attrs || typeof attrs !== 'string') return {};
        const out: Record<string, string> = {};
        for (const pair of attrs.split(',')) {
            const i = pair.indexOf('=');
            if (i === -1) out[pair] = undefined as unknown as string;
            else out[pair.substring(0, i)] = pair.substring(i + 1);
        }
        return out;
    }

    /** input[name], else options[name], else the default (falsy values fall through, as in the original). */
    function getGlobalVariableByName(name: string, defaultValue?: unknown): unknown {
        if (!name) return null;
        const fallback = defaultValue === undefined ? null : defaultValue;
        const input = settings.input;
        const options = settings.options;
        if (input && input[name]) return input[name];
        if (options && options[name]) return options[name];
        return fallback;
    }

    /** input[name], else the default. */
    function getInputVariableByName(name: string, defaultValue?: unknown): unknown {
        if (!name) return null;
        const fallback = defaultValue === undefined ? null : defaultValue;
        const input = settings.input;
        return input && input[name] ? input[name] : fallback;
    }

    /**
     * A small Markdown subset → HTML (headers, ``` blocks, `code`, bold/italic, lists, links, images).
     * Secure mode (and `{ safe: true }`): the source is HTML-escaped first and link/image targets
     * other than http(s), mailto, relative and anchor URLs are dropped, so the output is safe to render.
     */
    function markdownToHtml(markdown: string, mdOptions?: { safe?: boolean } | null): string {
        const safe = mdOptions && mdOptions.safe !== undefined ? !!mdOptions.safe : secure;
        // Browsers ignore tabs, newlines and other control characters inside URLs, so vet the URL without them.
        const cleanUrl = (u: string) => (safe ? u.replace(/[\u0000-\u0020\u007f]/g, '') : u);
        const okUrl = (u: string) => !safe || /^(https?:|mailto:)/i.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u);
        const lines = (safe ? escapeHtml(s(markdown)) : s(markdown)).split('\n');
        let html = '';
        let inList = false;
        let listType = '';
        let inCodeBlock = false;
        for (let line of lines) {
            if (/^```/.test(line)) {
                if (inCodeBlock) {
                    html += '</code></pre>';
                    inCodeBlock = false;
                } else {
                    const m = line.match(/^```(\w+)?/);
                    const lang = m && m[1] ? m[1] : '';
                    html += '<pre><code' + (lang ? ' class="language-' + lang + '"' : '') + '>';
                    inCodeBlock = true;
                }
                continue;
            }
            if (inCodeBlock) {
                html += line + '\n';
                continue;
            }
            if (/^#{1,6}\s/.test(line)) {
                const level = (line.match(/^#+/) as RegExpMatchArray)[0].length;
                line = '<h' + level + '>' + line.slice(level + 1).trim() + '</h' + level + '>';
            } else if (/`([^`]+)`/.test(line)) {
                line = line.replace(/`([^`]+)`/g, '<code>$1</code>');
            } else {
                line = line
                    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>');
            }
            if (/^\s*[*-]\s/.test(line)) {
                if (!inList || listType !== 'ul') {
                    if (inList) html += '</ol>';
                    html += '<ul>';
                    inList = true;
                    listType = 'ul';
                }
                line = '<li>' + line.replace(/^\s*[*-]\s/, '') + '</li>';
            } else if (/^\s*\d+\.\s/.test(line)) {
                if (!inList || listType !== 'ol') {
                    if (inList) html += '</ul>';
                    html += '<ol>';
                    inList = true;
                    listType = 'ol';
                }
                line = '<li>' + line.replace(/^\s*\d+\.\s/, '') + '</li>';
            } else if (inList) {
                html += listType === 'ul' ? '</ul>' : '</ol>';
                inList = false;
            }
            // Images before links (the original ran links first, which turned images into "!<a…>").
            line = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m: string, alt: string, src: string) =>
                okUrl(cleanUrl(src)) ? '<img src="' + cleanUrl(src) + '" alt="' + alt + '">' : alt
            );
            line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m: string, label: string, href: string) =>
                okUrl(cleanUrl(href)) ? '<a href="' + cleanUrl(href) + '">' + label + '</a>' : label
            );
            if (line.trim()) html += '<p>' + line + '</p>';
        }
        if (inList) html += listType === 'ul' ? '</ul>' : '</ol>';
        if (inCodeBlock) html += '</code></pre>';
        return html.trim();
    }

    const api = {
        secure,
        copyAttachments,
        validGroups,
        dateDifference,
        createSimpleSet,
        getAllFields,
        getJournalFields,
        getColumnType,
        getColumnTableName,
        getColumnInfo,
        getColumnLabel,
        getColumnElement,
        getTableColumns,
        getColumnChoices,
        getField,
        getFieldsArray,
        getFieldsObject,
        hasRole,
        hasRoleExactly,
        getUserGroups,
        getCompiledURI,
        truncateText,
        compileText,
        compileMeta,
        getUniqueValues,
        /**
         * getUniqueValues with scope rights and no ACL checks, even in secure mode. For values that
         * aren't sensitive and must cover rows the user can't read (dashboard totals, approval
         * routing). Never pass it a client-supplied table, field or query.
         */
        getUniqueValuesUnchecked: (
            table: string,
            groupingAttribute: string,
            encodedQuery?: string | null,
            options?: UniqueValueOptions | null
        ): Array<UniqueValue | string> | string =>
            secure
                ? raw().getUniqueValues(table, groupingAttribute, encodedQuery, options)
                : getUniqueValues(table, groupingAttribute, encodedQuery, options),
        convertToUSD,
        parseFieldAttributes,
        getGlobalVariableByName,
        getInputVariableByName,
        markdownToHtml,
    };
    // getUserGroups reads the current user's own memberships with scope rights in both modes.
    rawUtils = secure ? null : api;
    return api;
}

export type QuickUtils = ReturnType<typeof createQuickUtils>;
