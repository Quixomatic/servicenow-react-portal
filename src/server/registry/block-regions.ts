import { isPlainObject } from '../lib/util.ts';
import type { RegionDef } from '../../shared/contracts';

/**
 * Block regions (drop zones), declared as data in a block component's regions_json.
 *
 * Entries:
 *   "items"                                         static region
 *   { "name": "items", "label": "Items" }           static region with a label
 *   { "repeat": "tracks", "name": "col-{n}", "label": "Column {n}" }
 *       one region per element of the instance's option `tracks` (an array), or `n` regions
 *       when the option is a number. `{n}` is the 1-based index; `{field}` reads that field
 *       from an array element that is an object (e.g. named grid areas: "name": "{name}").
 *
 * The spec is resolved against each instance's effective options, so changing an instance's
 * options changes its drop zones.
 */

export const MAX_BLOCK_REGIONS = 24;
const NAME_RE = /^[a-z][a-z0-9_-]{0,39}$/;

export interface RegionSpecEntry {
    name: string;
    label?: string;
    repeat?: string;
}

/** Normalize a stored regions_json into spec entries; throws a message for invalid specs. */
export function parseRegionSpec(raw: unknown): RegionSpecEntry[] {
    let list: unknown = raw;
    if (isPlainObject(raw) && Array.isArray((raw as { regions?: unknown }).regions))
        list = (raw as { regions: unknown[] }).regions;
    if (list === null || list === undefined) return [];
    if (!Array.isArray(list)) throw new Error('regions_json must be an array of region entries');
    const out: RegionSpecEntry[] = [];
    for (const item of list) {
        if (typeof item === 'string') {
            out.push({ name: item.trim().toLowerCase() });
            continue;
        }
        if (!isPlainObject(item) || typeof item.name !== 'string' || !item.name.trim()) {
            throw new Error('Each region entry needs a "name" (or is a plain string)');
        }
        const entry: RegionSpecEntry = { name: String(item.name).trim() };
        if (typeof item.label === 'string') entry.label = item.label;
        if (item.repeat !== undefined) {
            if (typeof item.repeat !== 'string' || !/^[A-Za-z_][\w]*$/.test(item.repeat)) {
                throw new Error('"repeat" must name an option, e.g. "tracks"');
            }
            entry.repeat = item.repeat;
        } else {
            entry.name = entry.name.toLowerCase();
            if (!NAME_RE.test(entry.name))
                throw new Error(`Region name "${entry.name}" must be lower-case letters, digits, - or _`);
        }
        out.push(entry);
    }
    return out;
}

function fill(template: string, n: number, item: unknown): string {
    return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
        if (key === 'n') return String(n);
        if (isPlainObject(item) && item[key] !== undefined && item[key] !== null) return String(item[key]);
        return '';
    });
}

/** Resolve a spec against an instance's effective options (invalid or duplicate names are skipped). */
export function resolveRegions(spec: RegionSpecEntry[], options: Record<string, unknown>): RegionDef[] {
    const out: RegionDef[] = [];
    const seen: Record<string, boolean> = {};
    const push = (name: string, label: string | undefined) => {
        const clean = name.trim().toLowerCase();
        if (!NAME_RE.test(clean) || seen[clean] || out.length >= MAX_BLOCK_REGIONS) return;
        seen[clean] = true;
        const def: RegionDef = { name: clean, acceptsContributions: true };
        if (label) def.label = label;
        out.push(def);
    };
    for (const entry of spec) {
        if (!entry.repeat) {
            push(entry.name, entry.label);
            continue;
        }
        const source = options[entry.repeat];
        const items: unknown[] = Array.isArray(source)
            ? source
            : typeof source === 'number' && source > 0
              ? Array.from({ length: Math.min(Math.floor(source), MAX_BLOCK_REGIONS) }, () => null)
              : [];
        items.forEach((item, i) =>
            push(fill(entry.name, i + 1, item), entry.label ? fill(entry.label, i + 1, item) : undefined)
        );
    }
    return out;
}
