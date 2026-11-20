import { Region } from '@portal/runtime';

type Options = { layoutWidth?: string; sidebarWidth?: string; tocWidth?: string };

const LENGTH = /^\d+(\.\d+)?(px|rem|em|ch|%|vw)$/;
const len = (v: unknown, d: string) => (typeof v === 'string' && LENGTH.test(v.trim()) ? v.trim() : d);

/**
 * The docs portal's frame, after fumadocs' DocsLayout: one scroller (data-docs-scroller) with a
 * sticky sidebar on the left, the page in the middle and a sticky table of contents on the right.
 *   header   mobile top bar (app/docs-header)            sidebar  nav (app/docs-sidebar; a drawer on mobile)
 *   tocbar   the page's "On this page" bar below xl       toc      the page's table of contents, xl and up
 *   main     the page (app/docs-page)                     footer   optional
 * Breakpoints are container queries on the page frame (rp-page): md 768px, xl 1280px, so the
 * designer's device frames get the same layout. Options only set custom properties.
 */
export default function DocsLayout({ options = {} }: { options?: Options }) {
    const style = {
        '--docs-layout-width': len(options.layoutWidth, '97rem'),
        '--docs-sidebar-width': len(options.sidebarWidth, '268px'),
        '--docs-toc-width': len(options.tocWidth, '268px'),
    } as React.CSSProperties;
    return (
        <div className="rp-docs" data-docs-scroller="" style={style}>
            <div className="rp-docs__grid">
                <Region name="header" as="header" className="rp-docs__header" />
                <Region name="sidebar" as="aside" className="rp-docs__sidebar" />
                <Region name="tocbar" className="rp-docs__tocbar" />
                <main className="rp-docs__main">
                    <Region name="main" className="rp-docs__content" />
                </main>
                <Region name="toc" as="aside" className="rp-docs__toc" />
                <Region name="footer" as="footer" className="rp-docs__footer" />
            </div>
        </div>
    );
}
