/**
 * components:app/docs-toc — the docs portal's adapter over the generic components:app/toc (the
 * fumadocs-style floating TOC: sliding indicator on a track, multi-section scroll-spy, fade masks,
 * smooth scroll). This file only wires it to app/docs-layout:
 *   - the spy container is the layout's scroller ([data-docs-scroller]), not window;
 *   - the offset clears the sticky bars (none on desktop; the mobile header + this bar below md).
 *
 *   import DocsToc, { DocsTocBar } from 'components:app/docs-toc'
 *   <DocsToc items={[{ depth: 2, text: 'Regions', id: 'regions' }]} />   the xl column (rail)
 *   <DocsTocBar items={items} title="Layouts" />                          the full-width bar below xl
 */
import { useState } from 'react';
import { Icon } from 'components:icon';
import { cn } from 'utilities:cn';
import { Toc, TocList, TocProgress, useTocActive, scrollToTocItem } from 'components:app/toc';
import type { TocItem } from 'components:app/toc';
import { getDocsScroller } from 'utilities:app/docs';

export type { TocItem };

/** Height of the sticky bars above the content, measured live (mobile header + tocbar). */
function stickyOffset(el: Element | null) {
    const scroller = getDocsScroller(el);
    if (!scroller) return 0;
    const header = scroller.querySelector('.rp-docs__header') as HTMLElement | null;
    const bar = scroller.querySelector('.rp-docs__tocbar') as HTMLElement | null;
    return (header && header.offsetParent ? header.offsetHeight : 0) + (bar && bar.offsetParent ? bar.offsetHeight : 0);
}

/** The desktop table of contents (fills the layout's toc column; fumadocs: pt-12, pe-4). */
export default function DocsToc({
    items,
    title = 'On this page',
    footer,
}: {
    items: TocItem[];
    title?: string;
    footer?: React.ReactNode;
}) {
    const [el, setEl] = useState<HTMLElement | null>(null);
    return (
        <div ref={setEl} className="rp-docs-toc flex h-full min-h-0 w-full flex-col pt-12 pe-4 pb-2">
            {el ? (
                <Toc
                    items={items}
                    container={() => getDocsScroller(el)}
                    offset={16}
                    title={title}
                    footer={footer}
                    maxHeight="calc(100cqh - 7rem)"
                />
            ) : null}
        </div>
    );
}

/** The sticky "On this page" bar below xl (fumadocs TOCPopover: full width, border-b, blurred). */
export function DocsTocBar({ items, title }: { items: TocItem[]; title?: string }) {
    // The spy resolves its container when it mounts, so it mounts once the bar's element exists.
    const [el, setEl] = useState<HTMLElement | null>(null);
    if (!items.length) return null;
    return <div ref={setEl}>{el ? <TocBarInner items={items} title={title} el={el} /> : null}</div>;
}

function TocBarInner({ items, title, el }: { items: TocItem[]; title?: string; el: HTMLElement }) {
    const [open, setOpen] = useState(false);
    const container = () => getDocsScroller(el);
    const offset = stickyOffset(el);
    const { active, current } = useTocActive(items, { container, offset, anchorRef: { current: el } });
    const idx = items.findIndex((i) => i.id === current);
    const currentItem = idx >= 0 ? items[idx] : null;
    const showItem = !!currentItem && !open;
    const lastActive = items.reduce((n, it, i) => (active.includes(it.id) ? i : n), -1);
    const select = (id: string) => {
        setOpen(false);
        scrollToTocItem(id, { container, offset: stickyOffset(el), anchor: el });
    };
    return (
        <div className={cn('border-b bg-background/80 backdrop-blur-sm transition-colors', open && 'shadow-lg')}>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className="flex h-10 w-full items-center gap-2.5 px-4 py-2.5 text-start text-sm text-muted-foreground focus-visible:outline-none sm:px-6"
            >
                <TocProgress
                    value={(lastActive + 1) / Math.max(1, items.length)}
                    className={cn('size-[18px] shrink-0', open && 'text-primary')}
                />
                <span className="grid flex-1 *:col-start-1 *:row-start-1 *:my-auto">
                    <span
                        className={cn(
                            'truncate transition-[opacity,translate,color]',
                            open && 'text-foreground',
                            showItem && 'pointer-events-none -translate-y-full opacity-0'
                        )}
                    >
                        {title || 'On this page'}
                    </span>
                    <span
                        className={cn(
                            'truncate transition-[opacity,translate]',
                            !showItem && 'pointer-events-none translate-y-full opacity-0'
                        )}
                    >
                        {currentItem ? currentItem.text : ''}
                    </span>
                </span>
                <Icon
                    name="chevron-down"
                    className={cn('mx-0.5 size-4 shrink-0 transition-transform', open && 'rotate-180')}
                />
            </button>
            {open ? (
                <div className="rp-docs-toc flex max-h-[50cqh] flex-col overflow-auto px-4 pb-3 sm:px-6">
                    <TocList items={items} active={active} onSelect={select} className="pt-1" />
                </div>
            ) : null}
        </div>
    );
}
