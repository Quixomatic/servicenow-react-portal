import { Region } from '@portal/runtime'

type Options = { header?: 'full' | 'beside-sidebar'; contentPadding?: 'none' | 'sm' | 'md' | 'lg' }

/**
 * Structure only: places header / sidebar / main / footer and makes main the only scroller.
 * The widgets in each slot own their look (height, borders, background, width, collapse).
 * Options switch CSS (data attributes), never the element tree, so changing them never
 * remounts a widget.
 */
export default function StandardLayout({ options = {} }: { options?: Options }) {
    const header = options.header === 'beside-sidebar' ? 'beside-sidebar' : 'full'
    const pad = ['none', 'sm', 'md', 'lg'].includes(options.contentPadding as string) ? options.contentPadding : 'md'
    return (
        <div className="rp-std" data-header={header} data-pad={pad}>
            <Region name="header" as="header" className="rp-std__header rp-std__slot" />
            <Region name="sidebar" as="aside" className="rp-std__sidebar rp-std__slot" />
            <main className="rp-std__main">
                <Region name="main" className="rp-std__content" />
            </main>
            <Region name="footer" as="footer" className="rp-std__footer rp-std__slot" />
        </div>
    )
}
