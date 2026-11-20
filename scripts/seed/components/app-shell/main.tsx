import { Region } from '@portal/runtime';

type Options = {
    texture?: 'noise' | 'plain';
    contentPadding?: 'none' | 'sm' | 'md' | 'lg';
    /** The sub-header region: 'bar' (40px), 'banner' (hero band) or 'hidden' (region gone). The
     *  sub-header widget reads it (and subheaderTitle / subheaderSubtitle / subheaderIcon /
     *  subheaderTint) through useLayout().options. */
    subheader?: 'bar' | 'banner' | 'hidden';
};

/**
 * Dashboard shell (shadcn sidebar variant="inset"): the sidebar and the top header sit directly on
 * the textured page background; main is an inset card with an optional sub-header bar and a
 * scrolling body capped at the page's content width.
 *
 *   ┌ sidebar ┐┌ header ───────────────────────────┐
 *   │         │╭ card ─────────────────────────────╮
 *   │         ││ subheader                         │
 *   │         ││ main (scrolls)                    │
 *   │         │╰───────────────────────────────────╯
 *   └─────────┘  footer
 *
 * Structure only: the widgets own their look. Options switch CSS, never the element tree.
 */
export default function AppShell({ options = {} }: { options?: Options }) {
    const pad = ['none', 'sm', 'md', 'lg'].includes(options.contentPadding as string) ? options.contentPadding : 'md';
    const sub = options.subheader === 'banner' || options.subheader === 'hidden' ? options.subheader : 'bar';
    return (
        <div
            className="rp-app"
            data-texture={options.texture === 'plain' ? 'plain' : 'noise'}
            data-pad={pad}
            data-subheader={sub}
        >
            <Region name="sidebar" as="aside" className="rp-app__sidebar rp-app__slot" />
            <div className="rp-app__column">
                <Region name="header" as="header" className="rp-app__header rp-app__slot" />
                <div className="rp-app__row">
                    <main className="rp-app__card">
                        <Region name="subheader" className="rp-app__subheader rp-app__slot" />
                        <div className="rp-app__scroll">
                            <Region name="main" className="rp-app__content" />
                        </div>
                    </main>
                </div>
                <Region name="footer" as="footer" className="rp-app__footer rp-app__slot" />
            </div>
        </div>
    );
}
