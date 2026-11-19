import { Region } from '@portal/runtime'

/** Header / sidebar / main / footer. Main takes all remaining space and is the only scroller. */
export default function StandardLayout() {
    return (
        <div className="rp-std">
            <header className="rp-std__header">
                <Region name="header" />
            </header>
            <div className="rp-std__body">
                <aside className="rp-std__sidebar">
                    <Region name="sidebar" />
                </aside>
                <main className="rp-std__main">
                    <Region name="main" />
                </main>
            </div>
            <footer className="rp-std__footer">
                <Region name="footer" />
            </footer>
        </div>
    )
}
