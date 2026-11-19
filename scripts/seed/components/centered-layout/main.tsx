import { Region } from '@portal/runtime'

type Options = { canvas?: 'muted' | 'background' }

/** Header / main / footer with a centered content column. Structure only: the widgets own their look. */
export default function CenteredLayout({ options = {} }: { options?: Options }) {
    return (
        <div className="rp-ctr" data-canvas={options.canvas === 'background' ? 'background' : 'muted'}>
            <Region name="header" as="header" className="rp-ctr__header rp-ctr__slot" />
            <main className="rp-ctr__main">
                <Region name="main" className="rp-ctr__content" />
            </main>
            <Region name="footer" as="footer" className="rp-ctr__footer rp-ctr__slot" />
        </div>
    )
}
