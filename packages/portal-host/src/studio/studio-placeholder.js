import React, { useState } from 'react';
import { useTheme } from '#/runtime/theme-mode';
import { useAvailableHeight } from '#/runtime/use-available-height';
import { FADE_MS, useFadeOut } from '#/runtime/boot-gate';

// Shown while the Studio chunk loads (mode = studio), or if it fails to load. It lives in the main
// bundle, so it must not depend on the Studio stylesheet (studio-css.js): plain scoped CSS with
// Studio's palette (VS Code Dark+ / Light+), following the host's light/dark preference. Both
// states fill the host below its top edge, the same height Studio itself takes.
const CSS = `
.rps-boot {
	--b-bg: #1e1e1e; --b-title: #323233; --b-side: #252526; --b-tabbar: #252526; --b-tab: #1e1e1e; --b-border: #3c3c3c;
	--b-bone: rgba(204, 204, 204, 0.13); --b-bone-strong: rgba(204, 204, 204, 0.2); --b-accent: #007acc; --b-fg: #cccccc; --b-error: #f14c4c;
	--b-status: #007acc; --b-status-bone: rgba(255, 255, 255, 0.35);
	position: relative; display: flex; flex-direction: column; overflow: hidden;
	background: var(--b-bg); color: var(--b-fg);
	font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Ubuntu, sans-serif;
	container: rps-boot / inline-size;
}
.rps-boot.light {
	--b-bg: #ffffff; --b-title: #dddddd; --b-side: #f3f3f3; --b-tabbar: #f3f3f3; --b-tab: #ffffff; --b-border: #e5e5e5;
	--b-bone: rgba(59, 59, 59, 0.09); --b-bone-strong: rgba(59, 59, 59, 0.14); --b-accent: #005fb8; --b-fg: #3b3b3b; --b-error: #e51400;
}
.rps-boot.overlay { position: absolute; top: 0; left: 0; right: 0; z-index: 2147483000; opacity: 1; transition: opacity ${FADE_MS}ms ease-out; }
.rps-boot.overlay[data-phase="fading"] { opacity: 0; pointer-events: none; }
.rps-boot *, .rps-boot *::before, .rps-boot *::after { box-sizing: border-box; }
.rps-boot-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.rps-boot-pieces { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.rps-boot-b, .rps-boot-switch { animation: rps-boot-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.rps-boot-b { flex: none; background: var(--b-bone); border-radius: 3px; }
.rps-boot-title { flex: none; height: 35px; display: flex; align-items: center; gap: 10px; padding: 0 8px; background: var(--b-title); border-bottom: 1px solid var(--b-border); }
.rps-boot-switch { flex: 0 1 380px; min-width: 120px; height: 24px; border-radius: 6px; background: var(--b-bone); }
.rps-boot-grow { flex: 1; }
.rps-boot-save { width: 56px; height: 24px; border-radius: 4px; background: var(--b-accent); opacity: 0.55; flex: none; }
.rps-boot-main { flex: 1; min-height: 0; display: flex; }
.rps-boot-activity { flex: none; width: 48px; display: flex; flex-direction: column; align-items: center; padding-top: 4px; background: var(--b-title); border-right: 1px solid var(--b-border); }
.rps-boot-act { width: 48px; height: 46px; display: flex; align-items: center; justify-content: center; border-left: 2px solid transparent; }
.rps-boot-act.on { border-left-color: var(--b-accent); }
.rps-boot-explorer { flex: none; width: 260px; overflow: hidden; display: flex; flex-direction: column; background: var(--b-side); border-right: 1px solid var(--b-border); }
.rps-boot-explorer-title { height: 35px; display: flex; align-items: center; padding: 0 20px; }
.rps-boot-row { height: 22px; display: flex; align-items: center; gap: 6px; padding-right: 12px; }
.rps-boot-editor { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rps-boot-tabs { flex: none; height: 35px; display: flex; background: var(--b-tabbar); }
.rps-boot-tab { width: 140px; height: 35px; display: flex; align-items: center; gap: 8px; padding: 0 10px; border-right: 1px solid var(--b-border); }
.rps-boot-tab.on { background: var(--b-tab); box-shadow: inset 0 1px 0 var(--b-accent); }
.rps-boot-code { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 9px; padding: 14px 0 0; background: var(--b-bg); overflow: hidden; }
.rps-boot-line { display: flex; align-items: center; gap: 22px; height: 10px; overflow: hidden; }
.rps-boot-gutter { width: 48px; display: flex; justify-content: flex-end; }
.rps-boot-panel { flex: none; height: 190px; display: flex; flex-direction: column; border-top: 1px solid var(--b-border); background: var(--b-bg); }
.rps-boot-panel-head { height: 35px; display: flex; align-items: center; gap: 20px; padding: 0 18px; }
.rps-boot-status { flex: none; height: 22px; display: flex; align-items: center; gap: 14px; padding: 0 10px; background: var(--b-status); }
.rps-boot-status .rps-boot-b { background: var(--b-status-bone); }
.rps-boot-error { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; text-align: center; }
@container rps-boot (max-width: 640px) {
	.rps-boot-explorer { width: 170px; }
	.rps-boot-wide { display: none; }
	.rps-boot-line { gap: 12px; }
	.rps-boot-gutter { width: 28px; }
}
@keyframes rps-boot-pulse { 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) {
	.rps-boot.overlay { transition: none; }
	.rps-boot-b, .rps-boot-switch { animation: none; }
}
`;

function B({ w, h = 8, r, strong, className, style }) {
    return (
        <div
            className={'rps-boot-b' + (className ? ' ' + className : '')}
            style={{
                width: w,
                height: h,
                borderRadius: r,
                background: strong ? 'var(--b-bone-strong)' : undefined,
                ...style,
            }}
        />
    );
}

// Explorer tree: [indent, label width] per row (a folder, its files, another folder…).
const TREE = [
    [8, 92],
    [24, 70],
    [24, 104],
    [24, 64],
    [8, 80],
    [24, 118],
    [24, 86],
    [40, 60],
    [40, 96],
    [24, 72],
    [8, 66],
    [24, 90],
];
// Code lines: [indent, width].
const CODE = [
    [0, 210],
    [0, 260],
    [0, 0],
    [0, 320],
    [24, 280],
    [24, 190],
    [48, 360],
    [48, 240],
    [24, 120],
    [0, 40],
    [0, 0],
    [0, 300],
    [24, 420],
    [48, 260],
    [48, 330],
    [72, 200],
    [48, 150],
    [24, 90],
    [0, 30],
    [0, 0],
    [0, 270],
    [24, 180],
];

function SkeletonPieces() {
    return (
        <div className="rps-boot-pieces" aria-hidden="true">
            <div className="rps-boot-title">
                <B w={14} h={14} r={3} strong />
                <B w={78} h={10} strong />
                <B w={22} h={20} r={4} className="rps-boot-wide" />
                <div className="rps-boot-switch" />
                <B w={42} h={10} className="rps-boot-wide" />
                <div className="rps-boot-grow" />
                <B w={16} h={16} r={4} className="rps-boot-wide" />
                <B w={16} h={16} r={4} className="rps-boot-wide" />
                <B w={16} h={16} r={4} />
                <div className="rps-boot-save" />
            </div>
            <div className="rps-boot-main">
                <div className="rps-boot-activity">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className={'rps-boot-act' + (i === 0 ? ' on' : '')}>
                            <B w={22} h={22} r={4} strong={i === 0} />
                        </div>
                    ))}
                </div>
                <div className="rps-boot-explorer">
                    <div className="rps-boot-explorer-title">
                        <B w={62} h={8} />
                    </div>
                    {TREE.map(([indent, w], i) => (
                        <div key={i} className="rps-boot-row" style={{ paddingLeft: indent + 12 }}>
                            <B w={14} h={12} r={2} />
                            <B w={w} h={8} />
                        </div>
                    ))}
                </div>
                <div className="rps-boot-editor">
                    <div className="rps-boot-tabs">
                        <div className="rps-boot-tab on">
                            <B w={16} h={10} r={2} strong />
                            <B w={80} h={8} strong />
                        </div>
                        <div className="rps-boot-tab rps-boot-wide">
                            <B w={16} h={10} r={2} />
                            <B w={70} h={8} />
                        </div>
                    </div>
                    <div className="rps-boot-code">
                        {CODE.map(([indent, w], i) => (
                            <div key={i} className="rps-boot-line">
                                <div className="rps-boot-gutter">
                                    <B w={i + 1 < 10 ? 7 : 14} h={8} />
                                </div>
                                {w ? <B w={w} h={8} style={{ marginLeft: indent }} /> : null}
                            </div>
                        ))}
                    </div>
                    <div className="rps-boot-panel">
                        <div className="rps-boot-panel-head">
                            <B w={64} h={8} />
                            <B w={52} h={8} strong />
                        </div>
                    </div>
                </div>
            </div>
            <div className="rps-boot-status">
                <B w={60} h={8} />
                <B w={34} h={8} />
                <div className="rps-boot-grow" />
                <B w={110} h={8} className="rps-boot-wide" />
                <B w={36} h={8} />
            </div>
        </div>
    );
}

/** Loading → Studio skeleton (fades out once `ready`), error → a full-height message. */
export default function StudioPlaceholder({ loading, ready, error }) {
    const [el, setEl] = useState(null);
    const height = useAvailableHeight(el);
    const { resolvedTheme } = useTheme();
    const phase = useFadeOut(!!loading && !ready);
    const cls = 'rps-boot' + (resolvedTheme === 'dark' ? '' : ' light');
    if (error) {
        return (
            <div ref={setEl} className={cls} style={{ height }} role="alert" data-rps-placeholder="error">
                <style>{CSS}</style>
                <div className="rps-boot-error">
                    <div style={{ fontSize: 18 }}>Portal Studio</div>
                    <div style={{ color: 'var(--b-error)', maxWidth: 560 }}>
                        Studio failed to load: {String((error && error.message) || error)}
                    </div>
                </div>
            </div>
        );
    }
    if (phase === 'gone') return null;
    return (
        <div
            ref={setEl}
            className={cls + ' overlay'}
            style={{ height }}
            data-phase={phase}
            role="status"
            aria-busy={phase === 'shown' ? 'true' : 'false'}
            aria-live="polite"
            data-rp-boot-skeleton="studio"
            data-rps-placeholder=""
        >
            <style>{CSS}</style>
            <span className="rps-boot-sr">Loading Portal Studio…</span>
            <SkeletonPieces />
        </div>
    );
}
