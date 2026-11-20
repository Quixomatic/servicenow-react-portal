import { gs, GlideRecord, GlideRecordSecure, GlideTableHierarchy } from '@servicenow/glide';
import { GR, str, int, getById, each } from '../lib/gr.ts';
import { T } from '../lib/tables.ts';
import { splitList } from '../lib/util.ts';
import { hasAnyRole } from '../security/access.ts';
import { findPortalBySlug } from '../runtime/portal-service.ts';

/**
 * Record header fields (x_312987_portal_record_field): which fields a record's header (title,
 * subtitle, highlighted-value pills) and ribbon show, per table and portal.
 *
 * Resolution, per slot (title, subtitle, pill, ribbon), for the current user:
 *   1. candidate rows: active, the record's table or one of its parents (incident → task), the
 *      portal listed in `portals` or `portals` empty (every portal), and the user has one of the
 *      row's roles (no roles = everyone). Rows the user lacks the roles for don't exist for them.
 *   2. the winning group is the MOST SPECIFIC (table, portal scope) pair, ranked:
 *        a. table: the exact table beats its parent, the parent beats the grandparent, …;
 *        b. then portal scope: rows that list the portal beat all-portal rows;
 *      (like view rules, where page rules come before portal rules: specificity first, then order).
 *   3. inside the group, rows go by `order` (then field name):
 *        - pill / ribbon: every row of the group, in order;
 *        - title / subtitle: the first row only.
 *   4. a slot with no candidate row is not configured: the component's built-in default applies.
 * The winning rows REPLACE the slot's default; nothing is merged.
 *
 * Values are read as the user (GlideRecordSecure, field ACLs); a field the user can't read is
 * dropped. Only ribbon fields may dot-walk (caller_id.department). One query per call, no cache:
 * an edited row shows on the next load.
 */

export type RecordFieldSlot = 'title' | 'subtitle' | 'pill' | 'ribbon';
export const SLOTS: RecordFieldSlot[] = ['title', 'subtitle', 'pill', 'ribbon'];

export interface ResolvedRecordField {
    slot: RecordFieldSlot;
    field: string;
    /** The row's label, else the dictionary label. */
    label: string;
    /** Internal type of the (last dot-walked) field. */
    type: string;
    /** Reference fields: the referenced table. */
    refTable: string;
    value: string;
    displayValue: string;
    /** The table the winning row names (incident, or task for an inherited row). */
    sourceTable: string;
    /** 'portal' (the row lists the portal) or 'all' (portals empty). */
    scope: 'portal' | 'all';
    order: number;
    rowId: string;
}

export interface RecordFieldsResult {
    table: string;
    /** Slots that have a winning group (the rest use the built-in defaults). */
    slots: RecordFieldSlot[];
    fields: ResolvedRecordField[];
}

const NAME = /^[a-z0-9_]+$/i;
const PATH = /^[a-z0-9_]+(\.[a-z0-9_]+){0,3}$/i;
const SYS_ID = /^[0-9a-f]{32}$/i;

interface Row {
    id: string;
    table: string;
    slot: RecordFieldSlot;
    field: string;
    label: string;
    order: number;
    /** 0 = the record's table, 1 = its parent, … */
    depth: number;
    scope: 'portal' | 'all';
}

/** Schema rarely changes: the table chains are memoized for the life of the module. */
const chainCache: Record<string, string[]> = {};

/** The table and its parents, nearest first ('incident' → ['incident', 'task']); [] if no such table. */
export function tableChain(table: string): string[] {
    if (!NAME.test(table)) return [];
    if (chainCache[table]) return chainCache[table];
    const out: string[] = [];
    try {
        if (!new GlideRecord(table).isValid()) return [];
        const list = new GlideTableHierarchy(table).getTables() as any;
        const names: string[] = [];
        for (let i = 0; i < list.length; i++) names.push(String(list[i]));
        // Order by depth (a table's own hierarchy is one longer than its parent's): don't rely on
        // the API's ordering.
        const depth: Record<string, number> = {};
        names.forEach((n) => {
            try {
                depth[n] = (new GlideTableHierarchy(n).getTables() as any).length;
            } catch (e) {
                depth[n] = 0;
            }
        });
        names.sort((a, b) => depth[b] - depth[a]);
        names.forEach((n) => out.push(n));
    } catch (e) {
        return [table];
    }
    if (!out.length) out.push(table);
    chainCache[table] = out;
    return out;
}

function portalId(idOrSlug: string): string {
    const v = String(idOrSlug || '').trim();
    if (!v) return '';
    if (SYS_ID.test(v)) {
        const p = getById(T.portal, v.toLowerCase());
        return p ? p.getUniqueValue() : '';
    }
    const p = findPortalBySlug(v);
    return p ? p.getUniqueValue() : '';
}

function slotOf(v: string): RecordFieldSlot | null {
    return (SLOTS as string[]).indexOf(v) >= 0 ? (v as RecordFieldSlot) : null;
}

/** Candidate rows for the user (step 1). */
function candidates(chain: string[], portal: string): Row[] {
    const rows: Row[] = [];
    const q = `active=true^tableIN${chain.join(',')}^portalsISEMPTY` + (portal ? `^ORportalsLIKE${portal}` : '');
    each(
        T.recordField,
        q,
        (gr: GR) => {
            const slot = slotOf(str(gr, 'slot'));
            const field = str(gr, 'field').trim();
            if (!slot || !field) return;
            if (slot === 'ribbon' ? !PATH.test(field) : !NAME.test(field)) return;
            const listed = splitList(str(gr, 'portals'));
            if (listed.length && listed.indexOf(portal) < 0) return;
            if (!hasAnyRole(splitList(str(gr, 'roles')))) return;
            const table = str(gr, 'table');
            rows.push({
                id: gr.getUniqueValue(),
                table,
                slot,
                field,
                label: str(gr, 'label').trim(),
                order: int(gr, 'order', 100),
                depth: chain.indexOf(table),
                scope: listed.length ? 'portal' : 'all',
            });
        },
        ['order']
    );
    return rows;
}

/** Steps 2–3: the winning rows of one slot ([] = not configured). */
export function winningRows(rows: Row[], slot: RecordFieldSlot): Row[] {
    const mine = rows.filter((r) => r.slot === slot && r.depth >= 0);
    if (!mine.length) return [];
    const rank = (r: Row) => r.depth * 2 + (r.scope === 'portal' ? 0 : 1);
    let best = Infinity;
    mine.forEach((r) => {
        if (rank(r) < best) best = rank(r);
    });
    const group = mine
        .filter((r) => rank(r) === best)
        .sort((a, b) => a.order - b.order || (a.field < b.field ? -1 : a.field > b.field ? 1 : 0));
    return slot === 'title' || slot === 'subtitle' ? group.slice(0, 1) : group;
}

/**
 * The element at a (possibly dot-walked) path, from the dictionary (works without a record):
 * { label, type, refTable } or null when a hop isn't a field.
 */
function describe(table: string, path: string): { label: string; type: string; refTable: string } | null {
    const hops = path.split('.');
    let current = table;
    for (let i = 0; i < hops.length; i++) {
        const gr: GR = new GlideRecord(current);
        if (!gr.isValidField(hops[i])) return null;
        const el = gr.getElement(hops[i]);
        const type = String(el.getED().getInternalType() || '');
        const ref = type === 'reference' ? String(el.getReferenceTable() || '') : '';
        if (i === hops.length - 1) return { label: String(el.getLabel() || hops[i]), type, refTable: ref };
        if (!ref) return null;
        current = ref;
    }
    return null;
}

/** Resolve the header fields of a table (and a record's values, read as the user). Never throws. */
export function resolveRecordFields(table: string, portal: string, sysId?: string): RecordFieldsResult {
    const out: RecordFieldsResult = { table: String(table || ''), slots: [], fields: [] };
    try {
        const chain = tableChain(String(table || '').trim());
        if (!chain.length) return out;
        const pid = portalId(portal);
        const rows = candidates(chain, pid);
        if (!rows.length) return out;
        let record: GR | null = null;
        const id = String(sysId || '').trim();
        if (SYS_ID.test(id)) {
            const rec: GR = new GlideRecordSecure(chain[0]);
            record = rec.get(id) ? rec : null;
        }
        SLOTS.forEach((slot) => {
            const win = winningRows(rows, slot);
            if (!win.length) return;
            out.slots.push(slot);
            win.forEach((r) => {
                const d = describe(chain[0], r.field);
                if (!d) return;
                let value = '';
                let displayValue = '';
                if (record) {
                    // getElement can be null for an empty (dot-walked) reference: the field is valid
                    // (describe), so that's an empty value, not an unreadable one.
                    const el = record.getElement(r.field);
                    if (el && el.canRead() === false) return;
                    const v = el ? el.toString() : '';
                    value = v === null || v === undefined || v === 'null' ? '' : String(v);
                    const dv = el && v ? el.getDisplayValue() : '';
                    displayValue = dv === null || dv === undefined ? '' : String(dv);
                }
                out.fields.push({
                    slot,
                    field: r.field,
                    label: r.label || d.label,
                    type: d.type,
                    refTable: d.refTable,
                    value,
                    displayValue,
                    sourceTable: r.table,
                    scope: r.scope,
                    order: r.order,
                    rowId: r.id,
                });
            });
        });
    } catch (e) {
        gs.error(`[React Portal] record header fields failed for ${table}: ${e}`);
    }
    return out;
}

/** GraphQL Query:resolve(table, portal, sysId) (any authenticated user). */
export function recordFieldsResolver(env: any): RecordFieldsResult {
    const a = env && env.getArguments ? env.getArguments() : {};
    const arg = (k: string) => {
        const v = a ? a[k] : undefined;
        return v === undefined || v === null ? '' : String(v);
    };
    return resolveRecordFields(arg('table'), arg('portal'), arg('sysId'));
}
