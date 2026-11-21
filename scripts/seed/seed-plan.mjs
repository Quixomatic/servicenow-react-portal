// Dry-run plan of the seed's portals step (`npm run seed -- --dry-run`): the rendered portals seed runs
// locally in a vm against a read-only snapshot of the instance (now-sdk query). GlideRecord writes are
// recorded instead of sent, so the plan uses the template's own upsert / match / prune code. Business
// rules don't run, and compiles, instance CSS and the reprocess are stubbed out (they write nothing
// the plan reports).
import vm from 'node:vm';

const T = 'x_312987_portal_';
// Tables read with a narrower field list or filter than "every row, every field".
const READS = {
    [T + 'component']: {
        q: 'sys_idISNOTEMPTY',
        fields: ['sys_id', 'namespace', 'key', 'unique_id', 'name', 'kind', 'active'],
    },
    sc_cat_item: { q: 'name=React Portal demo: Team equipment', fields: ['sys_id', 'name'] },
};

/* ---------------- Encoded queries (the subset the template uses) ---------------- */

function parseEncoded(q) {
    const conds = [];
    const order = [];
    for (const term of String(q || '').split('^')) {
        if (!term) continue;
        let m;
        if ((m = /^ORDERBYDESC(.+)$/.exec(term))) order.push([m[1], -1]);
        else if ((m = /^ORDERBY(.+)$/.exec(term))) order.push([m[1], 1]);
        else if (/^(NQ|OR)/.test(term) || term === 'EQ')
            throw new Error(`seed-plan: unsupported query term "${term}" in ${q}`);
        else if ((m = /^([a-z0-9_.]+?)(ISEMPTY|ISNOTEMPTY)$/.exec(term))) conds.push({ f: m[1], op: m[2] });
        else if ((m = /^([a-z0-9_.]+?)(!=|=)(.*)$/.exec(term))) conds.push({ f: m[1], op: m[2], v: m[3] });
        else if ((m = /^([a-z0-9_.]+?)IN(.*)$/.exec(term))) conds.push({ f: m[1], op: 'IN', v: m[2] });
        else throw new Error(`seed-plan: can't parse query term "${term}" in ${q}`);
    }
    return { conds, order };
}

// Glide compares case-insensitively; booleans read back as 1/0 or true/false.
const norm = (v) => {
    const s = v === null || v === undefined ? '' : String(v).toLowerCase();
    return s === '1' ? 'true' : s === '0' ? 'false' : s;
};
function matches(row, c) {
    const v = row[c.f];
    const empty = v === null || v === undefined || v === '';
    if (c.op === 'ISEMPTY') return empty;
    if (c.op === 'ISNOTEMPTY') return !empty;
    if (c.op === '=') return norm(v) === norm(c.v);
    if (c.op === '!=') return norm(v) !== norm(c.v);
    if (c.op === 'IN') return String(c.v).split(',').map(norm).includes(norm(v));
    return false;
}

/* ---------------- Sandbox ---------------- */

function sandbox(db, ops, touched, queries) {
    let seq = 0;
    function GlideRecord(table) {
        touched.add(table);
        const rows = db[table] || [];
        let conds = [];
        let order = [];
        let limit = Infinity;
        let results = [];
        let idx = -1;
        let cur = null;
        let pending = {};
        let isNew = false;
        this.addEncodedQuery = (q) => {
            queries.push([table, q]);
            const p = parseEncoded(q);
            conds = conds.concat(p.conds);
            order = order.concat(p.order);
        };
        this.addQuery = (f, op, v) => {
            if (v === undefined) conds.push({ f, op: '=', v: op });
            else conds.push({ f, op: String(op).toUpperCase() === 'IN' ? 'IN' : op, v });
        };
        this.addActiveQuery = () => conds.push({ f: 'active', op: '=', v: 'true' });
        this.orderBy = (f) => order.push([f, 1]);
        this.orderByDesc = (f) => order.push([f, -1]);
        this.setLimit = (n) => (limit = n);
        this.query = () => {
            results = rows.filter((r) => conds.every((c) => matches(r, c)));
            for (const [f, dir] of order.slice().reverse())
                results.sort((a, b) => (norm(a[f]) < norm(b[f]) ? -dir : norm(a[f]) > norm(b[f]) ? dir : 0));
            results = results.slice(0, limit);
            idx = -1;
        };
        this.next = () => {
            idx++;
            cur = results[idx] || null;
            pending = {};
            isNew = false;
            return !!cur;
        };
        this.hasNext = () => idx + 1 < results.length;
        this.get = (id) => {
            cur = rows.find((r) => r.sys_id === id) || null;
            pending = {};
            return !!cur;
        };
        this.initialize = () => {
            cur = {};
            pending = {};
            isNew = true;
        };
        this.isNewRecord = () => isNew;
        this.isValidField = () => true;
        this.isValidRecord = () => !!cur;
        this.getValue = (f) => {
            const v = f in pending ? pending[f] : cur && cur[f];
            return v === null || v === undefined || v === '' ? null : String(v);
        };
        this.getDisplayValue = (f) => {
            const v = this.getValue(f);
            if (f === 'component') {
                const c = (db[T + 'component'] || []).find((r) => r.sys_id === v);
                return c ? c.unique_id : v;
            }
            return v;
        };
        this.setValue = (f, v) => (pending[f] = v === null || v === undefined ? '' : String(v));
        this.getUniqueValue = () => (cur ? cur.sys_id : null);
        this.insert = () => {
            const id = `(new ${table.replace(T, '')} ${++seq})`;
            cur = Object.assign({ sys_id: id }, pending);
            rows.push(cur);
            db[table] = rows;
            ops.push({ op: 'insert', table, id, fields: pending });
            pending = {};
            isNew = false;
            return id;
        };
        this.update = () => {
            const before = {};
            for (const f of Object.keys(pending)) before[f] = cur[f] === undefined ? '' : cur[f];
            ops.push({ op: 'update', table, id: cur.sys_id, row: cur, before, after: pending });
            Object.assign(cur, pending);
            pending = {};
            return cur.sys_id;
        };
        this.deleteRecord = () => {
            ops.push({ op: 'delete', table, id: cur.sys_id, row: cur });
            return true;
        };
    }
    const stubs = {
        'release/release-service.ts': {
            processPortal: () => ({ revision: '(plan)', problems: [] }),
            portalsForOwner: () => [],
        },
        'build/build-service.ts': { compileOwner: () => Promise.resolve({ upToDate: true }) },
        'source/owner.ts': { loadOwner: () => ({}) },
        'design/instance-style.ts': { refreshInstanceCss: () => Promise.resolve(false) },
    };
    const anything = () =>
        new Proxy(function () {}, {
            get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : anything()),
            apply: () => anything(),
            construct: () => anything(),
        });
    const info = [];
    const errors = [];
    const ctx = {
        GlideRecord,
        gs: {
            getSession: () => ({ putClientData() {}, getClientData: () => '' }),
            info: (m) => info.push(String(m)),
            error: (m) => errors.push(String(m)),
            warn: (m) => info.push(String(m)),
            setProperty: (name, value) => ops.push({ op: 'property', table: 'sys_properties', id: name, value }),
            getProperty: (name, d) => d,
            getErrorMessages: () => '',
            getUserID: () => '',
        },
        require: (path) => {
            const key = Object.keys(stubs).find((k) => String(path).endsWith(k));
            if (!key) throw new Error(`seed-plan: no stub for require(${path})`);
            return stubs[key];
        },
        // The closing smoke test calls the bridge; any answer will do.
        x_312987_portal: { ReactPortal: anything() },
        console,
    };
    return { ctx, info, errors };
}

async function runOnce(script, db) {
    // db is this run's own copy: the recorded writes are applied to it as they happen.
    const ops = [];
    const touched = new Set();
    const queries = [];
    const { ctx, info, errors } = sandbox(db, ops, touched, queries);
    let thrown = null;
    try {
        vm.runInNewContext(script, ctx, { filename: 'seed-portals-plan.js' });
    } catch (e) {
        thrown = e;
    }
    // Let the compile / reprocess promise chain settle (its stubs resolve at once).
    for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
    return { ops, touched, queries, info, errors, thrown, db };
}

/**
 * Simulate a rendered portals seed. `query(table, q, fields|null)` reads the instance (read-only).
 * `mutate(db)` (tests) edits the snapshot before the run. Returns the recorded writes and a report.
 */
export async function planPortals({ script, query, mutate, db: given }) {
    const db = given || {};
    const loaded = new Set(Object.keys(db));
    let run;
    // Pass 1 finds the tables the template reads; each later pass loads what's new, until stable.
    for (let pass = 0; pass < 6; pass++) {
        run = await runOnce(script, JSON.parse(JSON.stringify(db)));
        const missing = [...run.touched].filter((t) => !loaded.has(t));
        if (!missing.length) break;
        for (const t of missing) {
            const r = READS[t] || { q: 'sys_idISNOTEMPTY', fields: null };
            db[t] = await query(t, r.q, r.fields);
            loaded.add(t);
        }
    }
    if (mutate) {
        mutate(db);
        run = await runOnce(script, JSON.parse(JSON.stringify(db)));
    }
    if (run.thrown)
        throw new Error(`seed-plan: the portals seed failed in the simulation: ${run.thrown.stack || run.thrown}`);
    if (run.errors.length)
        throw new Error(`seed-plan: the simulation logged errors: ${run.errors.join(' | ').slice(0, 1500)}`);
    return { ops: run.ops, db: run.db, report: report(run.ops, run.db) };
}

/* ---------------- Report ---------------- */

const SKIP_TABLES = new Set(['sys_properties']);
const short = (v) => {
    const s = String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ');
    return s.length > 60 ? s.slice(0, 57) + '…' : s;
};

function report(ops, db) {
    const byId = (t, id) => (db[t] || []).find((r) => r.sys_id === id);
    const comp = (id) => {
        const c = byId(T + 'component', id);
        return c ? c.unique_id : id || '(none)';
    };
    const where = (row) => {
        const portal = byId(T + 'portal', row.portal);
        const page = byId(T + 'page', row.page);
        const parent = row.parent ? byId(T + 'placement', row.parent) : null;
        return (
            (portal ? portal.slug : '?') +
            '/' +
            (row.page ? (page ? page.route_pattern || '(home)' : row.page) : '(portal)') +
            (parent
                ? ' in ' + comp(parent.component) + ' ' + (parent.seed_slot || parent.region + '@' + parent.order)
                : '')
        );
    };
    const label = (t, row) =>
        t === T + 'placement'
            ? `${where(row)} ${row.seed_slot || row.region + '@' + row.order} ${comp(row.component)}`
            : row.unique_id || row.slug || row.route_pattern || row.label || row.key || row.name || row.sys_id;
    const lines = [];
    const counts = {};
    const bump = (t, k) => {
        counts[t] = counts[t] || { insert: 0, update: 0, adopt: 0, deactivate: 0, delete: 0 };
        counts[t][k]++;
    };
    for (const o of ops) {
        if (SKIP_TABLES.has(o.table)) continue;
        const t = o.table.replace(T, '');
        if (o.op === 'insert') {
            bump(t, 'insert');
            lines.push(`  + ${t}: ${label(o.table, o.fields)}`);
        } else if (o.op === 'delete') {
            bump(t, 'delete');
            lines.push(`  - ${t}: ${label(o.table, o.row)} (DELETE)`);
        } else {
            const fields = Object.keys(o.after);
            const merged = Object.assign({}, o.before, o.row);
            if (fields.length === 1 && fields[0] === 'seed_slot' && !o.before.seed_slot) {
                bump(t, 'adopt');
                continue; // listed as a count only: the stamp changes nothing else
            }
            if (fields.length === 1 && fields[0] === 'active' && o.after.active === 'false') {
                bump(t, 'deactivate');
                lines.push(`  x ${t}: ${label(o.table, o.row)} deactivated`);
                continue;
            }
            bump(t, 'update');
            const desc = fields
                .filter((f) => !(f === 'seed_slot' && !o.before.seed_slot))
                .map((f) =>
                    f === 'component'
                        ? `component ${comp(o.before[f])} -> ${comp(o.after[f])}`
                        : /_json$|script|css|content/.test(f)
                          ? f
                          : `${f} ${short(o.before[f])} -> ${short(o.after[f])}`
                );
            lines.push(`  ~ ${t}: ${label(o.table, merged)}: ${desc.join(', ')}`);
        }
    }
    return { counts, lines };
}
