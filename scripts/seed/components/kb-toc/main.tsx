import { Toc } from 'components:app/toc'
import type { TocItem } from 'components:app/toc'
import type { TocHeading } from 'utilities:app/knowledge'

/**
 * components:app/kb-toc: "On this page" for a knowledge article, on the generic components:app/toc
 * (fumadocs-style track, sliding active segment over every section in view, faded scroll area).
 *
 *   <KbToc headings={toc.headings} rootRef={bodyRef} />                     rail beside the article
 *   <KbToc headings rootRef variant="collapsible" />                        compact bar above the article
 *
 * `headings` come from useArticleToc (utilities:app/knowledge); headings are looked up inside the
 * article body (rootRef), and the spy follows the page's scroller.
 */
export type KbTocProps = {
    headings: TocHeading[]
    rootRef: { current: HTMLElement | null }
    variant?: 'rail' | 'collapsible'
    title?: string
    /** Pixels covered by sticky bars at the top of the scroller. */
    offset?: number
    className?: string
    footer?: any
}

export function tocItems(headings: TocHeading[]): TocItem[] {
    return headings.map((h) => ({ id: h.id, text: h.text, depth: h.level }))
}

export function KbToc({ headings, rootRef, variant = 'rail', title = 'On this page', offset = 0, className, footer }: KbTocProps) {
    return (
        <Toc
            items={tocItems(headings)}
            root={() => rootRef.current}
            offset={offset}
            variant={variant === 'collapsible' ? 'compact' : 'rail'}
            title={title}
            className={className}
            footer={footer}
        />
    )
}

export default function KbTocPreview() {
    return null
}
