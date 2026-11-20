import { authHeaders } from 'utilities:app/graphql';

/**
 * Async GlideRecord for client scripts, as Workspace provides it (same endpoint, same shape):
 *   GET /api/now/ui/glideRecord/{table}?sysparm_query=&sysparm_limit=&sysparm_display_value=all
 *   GET /api/now/ui/glideRecord/{table}/{sys_id}
 * Only the callback forms work (query(cb), get(id, cb)); synchronous calls log a warning and do
 * nothing, exactly like Workspace. Rows expose fields as properties (gr.location) plus getValue /
 * getDisplayValue. Writes (insert / update / deleteRecord) are not offered.
 */

type Cell = { value: string; display_value: string } | string | null;
type Row = Record<string, Cell>;

export type GlideRecordOptions = {
    onError?: (e: unknown) => void;
    wrap?: <F extends (...a: any[]) => any>(fn: F) => F;
};

function warn(code: string, msg: string) {
    // eslint-disable-next-line no-console
    console.warn(`(GlideRecord) [${code}] ${msg}`);
}

async function getJson(url: string): Promise<any> {
    const r = await fetch(url, { credentials: 'same-origin', headers: authHeaders(false) });
    const text = await r.text();
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch (e) {
        /* not JSON */
    }
    // 404 = "No Record found": an empty result, not an error.
    if (r.status === 404) return { result: [] };
    if (!r.ok) throw new Error((json && json.error && (json.error.message || json.error.detail)) || `HTTP ${r.status}`);
    return json || { result: [] };
}

export function createGlideRecordClass(options: GlideRecordOptions = {}) {
    const wrap = options.wrap || (<F>(fn: F) => fn);
    class GlideRecord {
        [key: string]: any;
        tableName: string;
        private _conditions: string[] = [];
        private _encoded = '';
        private _order: string[] = [];
        private _limit = 500;
        private _rows: Row[] = [];
        private _index = -1;
        private _fields: string[] = [];
        private _base: Set<string>;

        constructor(table: string) {
            this.tableName = table;
            this._base = new Set(Object.keys(this).concat(['_base']));
        }
        addQuery(field: string, oper?: unknown, value?: unknown) {
            if (arguments.length === 1) {
                this._encoded = this._encoded ? `${this._encoded}^${field}` : String(field);
                return;
            }
            const op = arguments.length === 2 ? '=' : String(oper);
            const v = arguments.length === 2 ? oper : value;
            this._conditions.push(`${field}${op}${v == null ? '' : String(v)}`);
        }
        addEncodedQuery(q: string) {
            this.addQuery(q);
        }
        setEncodedQuery(q: string) {
            this._encoded = q;
        }
        getEncodedQuery() {
            return [this._encoded].concat(this._conditions, this._order).filter(Boolean).join('^');
        }
        orderBy(f: string) {
            this._order.push('ORDERBY' + f);
        }
        addOrderBy(f: string) {
            this.orderBy(f);
        }
        orderByDesc(f: string) {
            this._order.push('ORDERBYDESC' + f);
        }
        setLimit(n: number) {
            this._limit = Number(n) || 500;
        }
        getLimit() {
            return this._limit;
        }
        setDisplayFields(fields: string[]) {
            this._fields = Array.isArray(fields) ? fields.concat(fields.indexOf('sys_id') < 0 ? ['sys_id'] : []) : [];
        }
        getTableName() {
            return this.tableName;
        }
        query(callback?: (gr: GlideRecord) => void) {
            if (typeof callback !== 'function')
                return warn(
                    'Q:NOCB',
                    'Query must be called with a callback function (synchronous GlideRecord is not supported)'
                );
            const p = new URLSearchParams({
                sysparm_display_value: 'all',
                sysparm_table: this.tableName,
                sysparm_query: '^' + this.getEncodedQuery(),
                sysparm_limit: String(this._limit),
            });
            if (this._fields.length) p.set('sysparm_fields', this._fields.join(','));
            const done = wrap(callback);
            getJson(`/api/now/ui/glideRecord/${encodeURIComponent(this.tableName)}?${p}`)
                .then((json) => this._load(json && json.result))
                .catch((e) => {
                    warn('Q:FAILED', String((e && e.message) || e));
                    this._load([]);
                })
                .then(() => done(this));
        }
        get(a: unknown, b?: unknown, c?: unknown) {
            if (typeof b === 'function') {
                const cb = b as (gr: GlideRecord) => void;
                const p = new URLSearchParams({ sysparm_display_value: 'all' });
                if (this._fields.length) p.set('sysparm_fields', this._fields.join(','));
                const done = wrap(cb);
                getJson(
                    `/api/now/ui/glideRecord/${encodeURIComponent(this.tableName)}/${encodeURIComponent(String(a))}?${p}`
                )
                    .then((json) => this._load(json && json.result))
                    .catch((e) => {
                        warn('GET:FAILED', String((e && e.message) || e));
                        this._load([]);
                    })
                    .then(() => {
                        this.next();
                        done(this);
                    });
                return;
            }
            if (typeof c === 'function') {
                this.addQuery(String(a), b);
                this.setLimit(1);
                const cb = c as (gr: GlideRecord) => void;
                this.query((gr) => {
                    gr.next();
                    cb(gr);
                });
                return;
            }
            warn('GET:NOCB', 'get must be called with a callback function (synchronous GlideRecord is not supported)');
            return false;
        }
        private _load(result: unknown) {
            this._rows = Array.isArray(result) ? (result as Row[]) : result ? [result as Row] : [];
            this._index = -1;
        }
        hasNext() {
            return this._index + 1 < this._rows.length;
        }
        next() {
            if (!this.hasNext()) return false;
            this._index++;
            // Expose the row's values as properties (gr.location, gr['caller_id.name'] as nested objects).
            for (const k of Object.keys(this))
                if (!this._base.has(k) && k.charAt(0) !== '_' && k !== 'tableName') delete this[k];
            const row = this._rows[this._index] || {};
            for (const k of Object.keys(row)) {
                const cell = row[k];
                const v = cell && typeof cell === 'object' ? (cell as any).value : cell;
                if (k.indexOf('.') > 0) {
                    const parts = k.split('.');
                    let at: any = this;
                    parts.slice(0, -1).forEach((part) => {
                        if (typeof at[part] !== 'object' || at[part] === null) at[part] = {};
                        at = at[part];
                    });
                    at[parts[parts.length - 1]] = v;
                } else if (typeof (GlideRecord.prototype as any)[k] !== 'function') this[k] = v;
            }
            return true;
        }
        getRowCount() {
            return this._rows.length;
        }
        gotoTop() {
            this._index = -1;
        }
        getValue(f: string) {
            const row = this._rows[this._index];
            const cell = row && row[f];
            return cell && typeof cell === 'object'
                ? String((cell as any).value ?? '')
                : cell == null
                  ? ''
                  : String(cell);
        }
        getDisplayValue(f?: string) {
            const row = this._rows[this._index] as any;
            if (!row) return '';
            if (!f) return row.display_value ? String(row.display_value) : '';
            const cell = row[f];
            return cell && typeof cell === 'object'
                ? String(cell.display_value ?? '')
                : cell == null
                  ? ''
                  : String(cell);
        }
        getUniqueValue() {
            return this.getValue('sys_id');
        }
        insert() {
            warn('W:NOSUPPORT', 'insert is not supported in React Portal client scripts');
        }
        update() {
            warn('W:NOSUPPORT', 'update is not supported in React Portal client scripts');
        }
        deleteRecord() {
            warn('W:NOSUPPORT', 'deleteRecord is not supported in React Portal client scripts');
        }
        toString() {
            return 'GlideRecord';
        }
    }
    return GlideRecord;
}

/** Fetch one record as a GlideRecord row (used by g_form.getReference). */
export function fetchRecordRow(GlideRecord: any, table: string, sysId: string, callback: (gr: any) => void) {
    const gr = new GlideRecord(table);
    gr.get(sysId, callback);
}
