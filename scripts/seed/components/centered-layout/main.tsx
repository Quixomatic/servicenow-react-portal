import { Region } from '@portal/runtime'

/** Header / main / footer with a centered content column. Main still fills and scrolls. */
export default function CenteredLayout() {
    return (
        <div className="rp-ctr">
            <header className="rp-ctr__header">
                <Region name="header" />
            </header>
            <main className="rp-ctr__main">
                <Region name="main" />
            </main>
            <footer className="rp-ctr__footer">
                <Region name="footer" />
            </footer>
        </div>
    )
}
