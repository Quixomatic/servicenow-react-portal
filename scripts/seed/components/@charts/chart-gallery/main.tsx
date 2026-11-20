import { useState } from 'react';
import { SegmentedControl } from 'components:chart-frame';
import { family as area } from './families/area';
import { family as bar } from './families/bar';
import { family as composed } from './families/composed';
import { family as line } from './families/line';
import { family as pie } from './families/pie';
import { family as radial } from './families/radial';
import { family as sankey } from './families/sankey';
import { family as slope } from './families/slope';
import { family as sparkline } from './families/sparkline';
import { family as status } from './families/status';

/**
 * Chart Gallery (widget, charts/chart-gallery): every chart block of the components:charts/* family
 * with its sample data, grouped by chart family. Each family lists its blocks in ./families/<family>.tsx.
 * Option `family` pins one family; otherwise a segmented control switches (families without blocks
 * are hidden).
 *
 * Visual design of the blocks inspired by ReUI's chart blocks (reui.io); independent implementation.
 */

const ALL = [area, bar, composed, line, pie, radial, sankey, slope, sparkline, status];

export default function ChartGallery({ options = {} }: { options?: { family?: string } }) {
    const families = ALL.filter((f) => f.blocks.length);
    const pinned = options.family ? families.find((f) => f.key === options.family) : undefined;
    const [family, setFamily] = useState(pinned ? pinned.key : families.length ? families[0].key : '');
    const current = families.find((f) => f.key === family) || families[0];
    if (!current) return null;
    return (
        <div className="flex flex-col gap-6">
            {pinned ? null : (
                <div className="overflow-x-auto">
                    <SegmentedControl
                        label="Chart family"
                        value={current.key}
                        onValueChange={setFamily}
                        options={families.map((f) => ({ value: f.key, label: `${f.label} (${f.blocks.length})` }))}
                    />
                </div>
            )}
            {current.blocks.map((b) => (
                <section key={b.key} aria-label={b.title} data-rp-chart-block={b.key} className="min-w-0">
                    {b.render()}
                </section>
            ))}
        </div>
    );
}
