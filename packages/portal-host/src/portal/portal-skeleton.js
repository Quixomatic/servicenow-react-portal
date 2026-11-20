import React from 'react';
import { FADE_MS, useFadeOut } from '#/runtime/boot-gate';

// The one loading skeleton for portal mode (every portal uses it): a generic app shell (sidebar
// rail, header bar, sub-header band, a few content cards) in the host kit's shadcn Skeleton look
// (accent-coloured, rounded, pulsing). It covers the whole portal frame from the host's first paint
// until the layout renders, then fades out.
//
// Plain scoped CSS, not Tailwind utilities: it is unlayered (no widget sheet injected mid-load can
// override it) and keyed to theme tokens, with fallbacks for the moment before any theme exists.
// Below 768px of frame width (the app shell's mobile breakpoint, MOBILE_BREAKPOINT) the rail
// drops out, like the real sidebar.
const CSS = `
.rp-boot {
	--rpb-bg: var(--background, #ffffff);
	--rpb-shell: var(--sidebar, var(--rpb-bg));
	--rpb-bone: color-mix(in oklab, var(--accent, #f4f4f5), var(--foreground, #0a0a0a) 5%);
	--rpb-border: var(--border, #e4e4e7);
	--rpb-card: var(--card, var(--rpb-bg));
	position: absolute; inset: 0; z-index: 40;
	display: flex; overflow: hidden;
	background: var(--rpb-shell);
	container: rp-boot / inline-size;
	opacity: 1; transition: opacity ${FADE_MS}ms ease-out;
}
:host(.dark) .rp-boot {
	--rpb-bg: var(--background, #0a0a0a);
	--rpb-bone: color-mix(in oklab, var(--accent, #27272a), var(--foreground, #fafafa) 4%);
	--rpb-border: var(--border, rgba(255, 255, 255, 0.1));
}
.rp-boot[data-phase="fading"] { opacity: 0; pointer-events: none; }
.rp-boot *, .rp-boot *::before, .rp-boot *::after { box-sizing: border-box; }
.rp-boot-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.rp-boot-pieces { flex: 1; min-width: 0; display: flex; }
.rp-boot-b { background: var(--rpb-bone); border-radius: calc(var(--radius, 0.625rem) - 2px); flex: none; animation: rp-boot-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.rp-boot-rail { flex: none; width: 16rem; display: flex; flex-direction: column; padding: 8px; gap: 2px; }
.rp-boot-row { display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 8px; }
.rp-boot-brand { height: 48px; }
.rp-boot-label { height: 32px; display: flex; align-items: center; padding: 0 8px; margin-top: 10px; }
.rp-boot-spacer { flex: 1; }
.rp-boot-user { height: 48px; }
.rp-boot-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rp-boot-header { flex: none; height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px; }
.rp-boot-grow { flex: 1; }
.rp-boot-inset {
	flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
	margin: 0 12px 12px 0; border: 1px solid var(--rpb-border); border-radius: calc(var(--radius, 0.625rem) + 2px);
	background: var(--rpb-bg);
}
.rp-boot-sub { flex: none; height: 40px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; border-bottom: 1px solid var(--rpb-border); }
.rp-boot-content { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 16px; padding: 24px 32px; }
.rp-boot-card { border: 1px solid var(--rpb-border); border-radius: calc(var(--radius, 0.625rem) + 4px); background: var(--rpb-card); padding: 24px 16px; display: flex; flex-direction: column; gap: 10px; }
.rp-boot-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.rp-boot-pills { display: flex; gap: 8px; margin-top: 6px; }
.rp-boot-menu { display: none; }
@container rp-boot (max-width: 767px) {
	.rp-boot-rail { display: none; }
	.rp-boot-menu { display: block; }
	.rp-boot-inset { margin: 0 8px 8px; }
	.rp-boot-content { padding: 16px; }
	.rp-boot-cols { grid-template-columns: minmax(0, 1fr); }
	.rp-boot-wide { display: none; }
}
@keyframes rp-boot-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) {
	.rp-boot { transition: none; }
	.rp-boot-b { animation: none; }
}
`;

/** A skeleton bone: a rounded accent block. */
function B({ w, h = 12, r, className }) {
    return (
        <div
            className={'rp-boot-b' + (className ? ' ' + className : '')}
            style={{ width: w, height: h, borderRadius: r }}
        />
    );
}

function NavRow({ w }) {
    return (
        <div className="rp-boot-row">
            <B w={16} h={16} r={4} />
            <B w={w} h={12} />
        </div>
    );
}

/** Portal-mode loading skeleton. `visible` false → fades out, then unmounts. */
export default function PortalSkeleton({ visible }) {
    const phase = useFadeOut(visible);
    if (phase === 'gone') return null;
    return (
        <div
            className="rp-boot"
            data-phase={phase}
            role="status"
            aria-busy={visible ? 'true' : 'false'}
            aria-live="polite"
            data-rp-boot-skeleton="portal"
        >
            <style>{CSS}</style>
            <span className="rp-boot-sr">Loading…</span>
            <div className="rp-boot-pieces" aria-hidden="true">
                <div className="rp-boot-rail">
                    <div className="rp-boot-row rp-boot-brand">
                        <B w={32} h={32} r={8} />
                        <B w={104} h={14} />
                    </div>
                    <div className="rp-boot-label">
                        <B w={64} h={10} />
                    </div>
                    <NavRow w={72} />
                    <NavRow w={96} />
                    <NavRow w={84} />
                    <NavRow w={104} />
                    <div className="rp-boot-label">
                        <B w={48} h={10} />
                    </div>
                    <NavRow w={64} />
                    <NavRow w={88} />
                    <NavRow w={76} />
                    <div className="rp-boot-spacer" />
                    <div className="rp-boot-row rp-boot-user">
                        <B w={32} h={32} r={8} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <B w={96} h={11} />
                            <B w={132} h={9} />
                        </div>
                    </div>
                </div>
                <div className="rp-boot-main">
                    <div className="rp-boot-header">
                        <B w={18} h={18} r={4} className="rp-boot-menu" />
                        <B w={18} h={18} r={4} className="rp-boot-wide" />
                        <B w={150} h={14} />
                        <div className="rp-boot-grow" />
                        <B w={20} h={20} r={6} />
                        <B w={20} h={20} r={6} />
                    </div>
                    <div className="rp-boot-inset">
                        <div className="rp-boot-sub">
                            <B w={88} h={12} />
                            <B w={120} h={10} className="rp-boot-wide" />
                        </div>
                        <div className="rp-boot-content">
                            <div className="rp-boot-card">
                                <B w={120} h={16} />
                                <B w="min(560px, 90%)" h={12} />
                                <div className="rp-boot-pills">
                                    <B w={76} h={28} />
                                    <B w={68} h={28} />
                                </div>
                            </div>
                            <div className="rp-boot-cols">
                                <div className="rp-boot-card">
                                    <B w={112} h={16} />
                                    <B w="55%" h={10} />
                                    <B w="80%" h={12} />
                                    <B w="70%" h={12} />
                                    <B w="62%" h={12} />
                                </div>
                                <div className="rp-boot-card">
                                    <B w={96} h={16} />
                                    <B w="85%" h={12} />
                                    <B w="60%" h={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
