import { QUICK_FILTER_PRESETS } from 'utilities:app/list-data';
import type { QuickFilter } from 'utilities:app/list-data';
import { cx, IconCheck } from 'components:app/field';

/**
 * Quick filters from widget options: preset ids ('active', 'mine', 'myGroups', 'unassigned',
 * 'createdByMe', 'updatedToday'), "label=encoded query" strings, or { id, label, query } objects.
 * Unknown preset ids are dropped.
 */
export function resolveQuickFilters(input: (string | QuickFilter)[] | string | undefined | null): QuickFilter[] {
    const list = Array.isArray(input)
        ? input
        : String(input || '')
              .split(/\n|;/)
              .map((s) => s.trim())
              .filter(Boolean);
    const out: QuickFilter[] = [];
    list.forEach((item, i) => {
        if (item && typeof item === 'object') {
            if (item.query && item.label) out.push({ id: item.id || `q${i}`, label: item.label, query: item.query });
            return;
        }
        const s = String(item || '').trim();
        if (!s) return;
        const eq = s.indexOf('=');
        if (QUICK_FILTER_PRESETS[s]) out.push({ id: s, ...QUICK_FILTER_PRESETS[s] });
        else if (eq > 0)
            out.push({
                id:
                    s
                        .slice(0, eq)
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '') || `q${i}`,
                label: s.slice(0, eq).trim(),
                query: s.slice(eq + 1).trim(),
            });
    });
    return out.filter((q, i) => out.findIndex((x) => x.id === q.id) === i);
}

export type QuickFilterBarProps = {
    filters: QuickFilter[];
    /** Active ids. */
    value: string[];
    onChange: (ids: string[]) => void;
    className?: string;
};

/** Toggle chips (aria-pressed); every active chip's condition is ANDed into the list's query. */
export function QuickFilterBar({ filters, value, onChange, className }: QuickFilterBarProps) {
    if (!filters.length) return null;
    const on = new Set(value);
    return (
        <div role="group" aria-label="Quick filters" className={cx('flex flex-wrap items-center gap-1.5', className)}>
            {filters.map((q) => {
                const pressed = on.has(q.id);
                return (
                    <button
                        key={q.id}
                        type="button"
                        className="rpl-chip"
                        aria-pressed={pressed}
                        title={q.query}
                        onClick={() =>
                            onChange(
                                pressed
                                    ? value.filter((x) => x !== q.id)
                                    : filters.map((f) => f.id).filter((id) => id === q.id || on.has(id))
                            )
                        }
                    >
                        {pressed ? <IconCheck size={12} /> : null}
                        {q.label}
                    </button>
                );
            })}
        </div>
    );
}
