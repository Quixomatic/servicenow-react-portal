import { useCallback, useEffect, useRef, useState } from 'react';
import { useInViewOnce } from '@portal/runtime';
import { SegmentedControl } from 'components:chart-frame';
import { family as area } from './families/area';
import { family as barFirst } from './families/bar';
import { family as barMore } from './families/bar-more';
import { family as composed } from './families/composed';
import { family as line } from './families/line';
import { family as pie } from './families/pie';
import { family as radial } from './families/radial';
import { family as sankey } from './families/sankey';
import { family as slope } from './families/slope';
import { family as sparkline } from './families/sparkline';
import { family as status } from './families/status';
import { family as live } from './families/live';

/**
 * Chart Gallery (widget, charts/chart-gallery): every chart block of the components:charts/* family
 * with its sample data, grouped by chart family. Each family lists its blocks in ./families/<family>.tsx.
 * Option `family` pins one family; otherwise a segmented control switches (families without blocks
 * are hidden).
 *
 * Visual design of the blocks inspired by ReUI's chart blocks (reui.io); independent implementation.
 */

// Bar has two family files (two helpers built it); one Bar tab.
const bar = { ...barFirst, blocks: barFirst.blocks.concat(barMore.blocks) };

const ALL = [area, bar, composed, line, pie, radial, sankey, slope, sparkline, status, live];

export default function ChartGallery({ options = {} }: { options?: { family?: string } }) {
    const families = ALL.filter((f) => f.blocks.length);
    const pinned = options.family ? families.find((f) => f.key === options.family) : undefined;
    const [family, setFamily] = useState(pinned ? pinned.key : families.length ? families[0].key : '');
    const current = families.find((f) => f.key === family) || families[0];
    if (!current) return null;
    return (
        // contain:inline-size keeps the blocks' intrinsic widths from widening the page column on narrow screens.
        <div className="flex w-full min-w-0 flex-col gap-6 [contain:inline-size]">
            {pinned ? null : (
                // The family switcher scrolls sideways on narrow screens instead of widening the page.
                <div className="w-full max-w-full min-w-0 overflow-x-auto pb-1">
                    <SegmentedControl
                        label="Chart family"
                        value={current.key}
                        onValueChange={setFamily}
                        options={families.map((f) => ({ value: f.key, label: `${f.label} (${f.blocks.length})` }))}
                    />
                </div>
            )}
            {current.blocks.map((b) => (
                <LazyBlock key={b.key} entry={b} />
            ))}
        </div>
    );
}

// Last measured height per block (survives tab switches), so a placeholder keeps the block's real size.
const heights = new Map<string, number>();
// Estimated card height before a block has ever been measured.
const DEFAULT_HEIGHT = 540;

/**
 * One gallery section. Two things keep a family tab cheap:
 * - the block mounts only once its section comes within 600px of the viewport (a tab otherwise mounts
 *   and animates every block at once); until then a same-height placeholder holds its place so the
 *   scroll position and layout don't jump;
 * - content-visibility: auto lets the browser skip style, layout and paint of sections that are off
 *   screen. That matters here: the Next Experience shell ships a stylesheet whose :has() rules turn any
 *   class / text / node change into a style recalc of the whole document, so every element on the page
 *   makes every hover frame slower. overflow-clip-margin keeps card shadows and tooltips that poke past
 *   the section from being clipped by the paint containment.
 */
function LazyBlock({ entry }: { entry: { key: string; title: string; render: () => any } }) {
    const [ref, inView] = useInViewOnce({ rootMargin: '600px 0px' }) as [(el: Element | null) => void, boolean];
    const boxRef = useRef<HTMLElement | null>(null);
    const setRefs = useCallback(
        (el: HTMLElement | null) => {
            boxRef.current = el;
            ref(el);
        },
        [ref]
    );
    useEffect(() => {
        const el = boxRef.current;
        if (!inView || !el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver((entries) => {
            const box = entries[0] && entries[0].borderBoxSize && entries[0].borderBoxSize[0];
            const h = box ? box.blockSize : entries[0].contentRect.height;
            if (h > 0) heights.set(entry.key, h);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [inView, entry.key]);
    const estimate = heights.get(entry.key) || DEFAULT_HEIGHT;
    return (
        <section
            ref={setRefs}
            aria-label={entry.title}
            data-rp-chart-block={entry.key}
            className="min-w-0"
            style={{
                contentVisibility: 'auto',
                containIntrinsicSize: `auto ${Math.round(estimate)}px`,
                overflowClipMargin: '32px',
            }}
        >
            {inView ? (
                entry.render()
            ) : (
                <div
                    aria-hidden="true"
                    data-rp-chart-placeholder=""
                    className="w-full rounded-xl border border-border bg-card"
                    style={{ height: estimate }}
                />
            )}
        </section>
    );
}
