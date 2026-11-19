// Portal Studio chrome: VS Code Dark+/Light+ palette as CSS variables on .rps (plain CSS,
// injected into the host shadow root by studio-app.js; not part of the consumer Tailwind build).
export const STUDIO_CSS = `
.rps {
	--rps-bg: #1e1e1e; --rps-fg: #cccccc; --rps-muted: #8b8b8b; --rps-sidebar: #252526; --rps-title: #323233;
	--rps-tab: #2d2d2d; --rps-tab-active: #1e1e1e; --rps-tabbar: #252526; --rps-border: #3c3c3c; --rps-hover: #2a2d2e;
	--rps-select: #37373d; --rps-select-focus: #04395e; --rps-accent: #007acc; --rps-focus: #007fd4; --rps-status: #007acc;
	--rps-status-fg: #ffffff; --rps-input: #3c3c3c; --rps-input-border: #3c3c3c; --rps-menu: #252526; --rps-error: #f14c4c;
	--rps-warn: #cca700; --rps-ok: #89d185; --rps-badge: #4d4d4d; --rps-drop: rgba(83, 89, 93, 0.5); --rps-banner: #4b1818;
	--separator-border: #3c3c3c; --focus-border: #007fd4; --sash-size: 4px; --sash-hover-size: 4px;
	position: relative; display: flex; flex-direction: column; overflow: hidden;
	background: var(--rps-bg); color: var(--rps-fg);
	font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Ubuntu, sans-serif;
	-webkit-font-smoothing: antialiased; user-select: none;
}
.rps.rps-light {
	--rps-bg: #ffffff; --rps-fg: #3b3b3b; --rps-muted: #717171; --rps-sidebar: #f3f3f3; --rps-title: #dddddd;
	--rps-tab: #ececec; --rps-tab-active: #ffffff; --rps-tabbar: #f3f3f3; --rps-border: #e5e5e5; --rps-hover: #e8e8e8;
	--rps-select: #e4e6f1; --rps-select-focus: #0060c0; --rps-accent: #005fb8; --rps-focus: #0090f1; --rps-status: #007acc;
	--rps-input: #ffffff; --rps-input-border: #cecece; --rps-menu: #ffffff; --rps-error: #e51400; --rps-warn: #bf8803;
	--rps-ok: #388a34; --rps-badge: #c4c4c4; --rps-drop: rgba(38, 119, 203, 0.18); --rps-banner: #fbe2e2;
	--separator-border: #e5e5e5;
}
/* Element resets live in Tailwind's base layer: unlayered rules beat every layered rule, so
 * unlayered resets here would strip the shadcn/Tailwind utilities (layer "utilities") from the
 * buttons and inputs of widgets rendered inside Studio (designer canvas, component preview).
 * In the base layer they still style Studio's own chrome, but widget utilities win over them. */
@layer base {
	.rps *, .rps *::before, .rps *::after { box-sizing: border-box; }
	.rps button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
	.rps input, .rps select, .rps textarea { font: inherit; color: var(--rps-fg); background: var(--rps-input); border: 1px solid var(--rps-input-border); border-radius: 2px; padding: 3px 6px; outline: none; user-select: text; }
	.rps input:focus, .rps select:focus, .rps textarea:focus { border-color: var(--rps-focus); }
	.rps svg { flex: none; }
}
/* Rendered portal content inside Studio (designer canvas, component preview) gets the host's
 * own text styles back (set inline from the host's computed style), not Studio's 13px chrome. */
.rps-host-content { user-select: text; -webkit-font-smoothing: auto; cursor: auto; }

/* title bar */
.rps-titlebar { flex: none; height: 35px; display: flex; align-items: center; gap: 6px; padding: 0 8px; background: var(--rps-title); border-bottom: 1px solid var(--rps-border); }
.rps-brand { font-weight: 600; font-size: 12px; opacity: .85; padding-right: 6px; display: flex; align-items: center; gap: 6px; }
.rps-titlebar .rps-spacer { flex: 1; }
.rps-tbtn { height: 24px; padding: 0 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 5px; font-size: 12px; white-space: nowrap; }
.rps-tbtn:hover { background: rgba(128,128,128,.2); }
.rps-tbtn[aria-pressed="true"] { background: rgba(128,128,128,.28); }
.rps-tbtn.rps-primary { background: var(--rps-accent); color: #fff; }
.rps-tbtn.rps-primary:hover { filter: brightness(1.1); }
.rps-tbtn:disabled { opacity: .5; cursor: default; }
.rps-badge { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px; border-radius: 10px; font-size: 11px; background: var(--rps-badge); color: var(--rps-fg); white-space: nowrap; }
.rps-badge.ok { background: color-mix(in srgb, var(--rps-ok) 25%, transparent); }
.rps-badge.err { background: color-mix(in srgb, var(--rps-error) 30%, transparent); }
.rps-badge.busy { background: color-mix(in srgb, var(--rps-accent) 35%, transparent); }
.rps-dirty-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--rps-fg); display: inline-block; }

/* switcher */
.rps-switcher { position: relative; min-width: 260px; max-width: 420px; flex: 0 1 380px; }
.rps-switcher-btn { width: 100%; height: 24px; display: flex; align-items: center; gap: 6px; padding: 0 8px; border-radius: 6px; background: var(--rps-input); border: 1px solid var(--rps-input-border); font-size: 12px; }
.rps-switcher-btn span.name { flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rps-pop { position: absolute; z-index: 50; background: var(--rps-menu); color: var(--rps-fg); border: 1px solid var(--rps-border); border-radius: 6px; box-shadow: 0 6px 24px rgba(0,0,0,.35); overflow: hidden; }
.rps-pop input.rps-search { width: calc(100% - 12px); margin: 6px; }
.rps-pop .rps-list { max-height: 360px; overflow: auto; padding-bottom: 4px; }
.rps-group-label { padding: 6px 10px 2px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--rps-muted); }
.rps-option { display: flex; align-items: center; gap: 8px; padding: 3px 10px; cursor: pointer; white-space: nowrap; }
.rps-option .sub { color: var(--rps-muted); font-size: 11px; margin-left: auto; overflow: hidden; text-overflow: ellipsis; }
.rps-option.active, .rps-option:hover { background: var(--rps-select-focus); color: #fff; }
.rps-option.active .sub, .rps-option:hover .sub { color: #ddd; }

/* body */
.rps-body { flex: 1; min-height: 0; position: relative; }
.rps-sidebar { height: 100%; display: flex; flex-direction: column; background: var(--rps-sidebar); overflow: hidden; }
.rps-sidebar-title { flex: none; height: 35px; display: flex; align-items: center; padding: 0 12px 0 20px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--rps-muted); }
.rps-section { display: flex; flex-direction: column; min-height: 0; }
.rps-section-head { flex: none; height: 22px; display: flex; align-items: center; gap: 4px; padding: 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; cursor: pointer; border-top: 1px solid var(--rps-border); }
.rps-section-head .actions { margin-left: auto; display: none; gap: 2px; }
.rps-section-head:hover .actions { display: flex; }
.rps-icon-btn { width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; }
.rps-icon-btn:hover { background: rgba(128,128,128,.25); }
.rps-tree { overflow: auto; flex: 1; padding-bottom: 8px; }
.rps-row { height: 22px; display: flex; align-items: center; gap: 5px; padding-right: 8px; cursor: pointer; white-space: nowrap; border: 1px solid transparent; }
.rps-row:hover { background: var(--rps-hover); }
.rps-row.selected { background: var(--rps-select); }
.rps-row.selected.focused { background: var(--rps-select-focus); color: #fff; border-color: var(--rps-focus); }
.rps-row .label { overflow: hidden; text-overflow: ellipsis; }
.rps-row .desc { color: var(--rps-muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
.rps-row.selected.focused .desc { color: #ddd; }
.rps-row .dirty { margin-left: auto; width: 7px; height: 7px; border-radius: 50%; background: currentColor; opacity: .8; }
.rps-row.err .label { color: var(--rps-error); }
.rps-row.warn .label { color: var(--rps-warn); }
.rps-empty { padding: 8px 20px; color: var(--rps-muted); font-size: 12px; }

/* editor groups */
.rps-groups { height: 100%; }
.rps-group { height: 100%; display: flex; flex-direction: column; background: var(--rps-bg); position: relative; }
.rps-tabbar { flex: none; height: 35px; display: flex; background: var(--rps-tabbar); overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
.rps-tabbar::-webkit-scrollbar { height: 3px; }
.rps-tabbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,.4); }
.rps-tabbar-fill { flex: 1; min-width: 20px; }
.rps-tab { flex: none; height: 35px; display: flex; align-items: center; gap: 6px; padding: 0 6px 0 10px; background: var(--rps-tab); border-right: 1px solid var(--rps-border); color: var(--rps-muted); cursor: pointer; max-width: 220px; position: relative; }
.rps-tab .title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rps-tab.preview .title { font-style: italic; }
.rps-tab.active { background: var(--rps-tab-active); color: var(--rps-fg); }
.rps-group.focused .rps-tab.active { box-shadow: inset 0 1px 0 var(--rps-accent); }
.rps-tab .close { width: 20px; height: 20px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; visibility: hidden; }
.rps-tab:hover .close, .rps-tab.active .close { visibility: visible; }
.rps-tab .close:hover { background: rgba(128,128,128,.3); }
.rps-tab.dirty .close .x { display: none; }
.rps-tab.dirty .close .dot { display: block; }
.rps-tab.dirty .close:hover .x { display: block; }
.rps-tab.dirty .close:hover .dot { display: none; }
.rps-tab .close .dot { display: none; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.rps-tab.drop-before::before { content: ""; position: absolute; left: -1px; top: 0; bottom: 0; width: 2px; background: var(--rps-focus); }
.rps-tab-ext { font-size: 10px; font-weight: 700; width: 16px; text-align: center; }
.rps-breadcrumbs { flex: none; height: 22px; display: flex; align-items: center; gap: 4px; padding: 0 12px; font-size: 12px; color: var(--rps-muted); background: var(--rps-bg); }
.rps-editor-area { flex: 1; min-height: 0; position: relative; }
.rps-editor { position: absolute; inset: 0; }
.rps-editor .cm-editor { height: 100%; }
.rps-dropzone { position: absolute; inset: 0; z-index: 20; pointer-events: none; }
.rps-dropzone .hl { position: absolute; background: var(--rps-drop); transition: all .08s; }
.rps-welcome { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--rps-muted); padding: 24px; text-align: center; }
.rps-welcome h2 { margin: 0; font-weight: 400; font-size: 26px; color: var(--rps-fg); }
.rps-welcome .keys { display: grid; grid-template-columns: auto auto; gap: 6px 18px; font-size: 12px; text-align: left; }
.rps-kbd { font-family: inherit; font-size: 11px; padding: 1px 5px; border-radius: 3px; border: 1px solid var(--rps-border); background: rgba(128,128,128,.12); }

/* panel */
.rps-panel { height: 100%; display: flex; flex-direction: column; background: var(--rps-bg); border-top: 1px solid var(--rps-border); }
.rps-panel-head { flex: none; height: 35px; display: flex; align-items: center; gap: 2px; padding: 0 8px; }
.rps-panel-tab { height: 35px; padding: 0 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: var(--rps-muted); border-bottom: 1px solid transparent; }
.rps-panel-tab.active { color: var(--rps-fg); border-bottom-color: var(--rps-fg); }
.rps-count { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--rps-badge); font-size: 11px; display: inline-flex; align-items: center; justify-content: center; text-transform: none; }
.rps-panel-body { flex: 1; min-height: 0; overflow: auto; font-size: 13px; user-select: text; }
.rps-problem-file { height: 22px; display: flex; align-items: center; gap: 6px; padding: 0 8px; font-weight: 600; }
.rps-problem { min-height: 22px; display: flex; align-items: baseline; gap: 6px; padding: 2px 8px 2px 26px; cursor: pointer; }
.rps-problem:hover { background: var(--rps-hover); }
.rps-problem .where { color: var(--rps-muted); font-size: 12px; white-space: nowrap; }
.rps-sev-error { color: var(--rps-error); }
.rps-sev-warning { color: var(--rps-warn); }
.rps-output { font-family: Consolas, "Cascadia Code", Menlo, monospace; font-size: 12px; padding: 4px 12px; white-space: pre-wrap; }
.rps-output .t { color: var(--rps-muted); }
.rps-output .error { color: var(--rps-error); }
.rps-output .warn { color: var(--rps-warn); }

/* status bar */
.rps-statusbar { flex: none; height: 22px; display: flex; align-items: center; background: var(--rps-status); color: var(--rps-status-fg); font-size: 12px; }
.rps-statusbar.failed { background: #c72e0f; }
.rps-statusbar .item { height: 22px; display: inline-flex; align-items: center; gap: 4px; padding: 0 8px; white-space: nowrap; }
.rps-statusbar button.item:hover { background: rgba(255,255,255,.12); }
.rps-statusbar .spacer { flex: 1; }

/* banner, dialogs, menus */
.rps-banner { flex: none; display: flex; align-items: center; gap: 10px; padding: 6px 12px; background: var(--rps-banner); border-bottom: 1px solid var(--rps-border); font-size: 12px; }
.rps-banner .rps-spacer { flex: 1; }
.rps-btn { height: 24px; padding: 0 12px; border-radius: 2px; background: var(--rps-accent); color: #fff !important; font-size: 12px; }
.rps-btn:hover { filter: brightness(1.12); }
.rps-btn.secondary { background: rgba(128,128,128,.3); color: var(--rps-fg) !important; }
.rps-btn:disabled { opacity: .5; }
.rps-overlay { position: absolute; inset: 0; z-index: 100; background: rgba(0,0,0,.35); display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; }
.rps-dialog { width: min(440px, calc(100% - 32px)); background: var(--rps-menu); border: 1px solid var(--rps-border); border-radius: 6px; box-shadow: 0 10px 40px rgba(0,0,0,.45); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.rps-dialog h3 { margin: 0; font-size: 14px; font-weight: 600; }
.rps-dialog label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--rps-muted); }
.rps-dialog .row { display: flex; justify-content: flex-end; gap: 8px; }
.rps-dialog .error { color: var(--rps-error); font-size: 12px; }
.rps-quick { width: min(600px, calc(100% - 32px)); background: var(--rps-menu); border: 1px solid var(--rps-border); border-radius: 6px; box-shadow: 0 10px 40px rgba(0,0,0,.45); overflow: hidden; }
.rps-quick input { width: calc(100% - 12px); margin: 6px; }
.rps-quick .rps-list { max-height: 50vh; overflow: auto; padding-bottom: 6px; }
.rps-menu { position: fixed; z-index: 2147483001; min-width: 180px; background: var(--rps-menu); color: var(--rps-fg); border: 1px solid var(--rps-border); border-radius: 5px; box-shadow: 0 6px 24px rgba(0,0,0,.35); padding: 4px 0; font-size: 13px; }
.rps-menu button { width: 100%; text-align: left; padding: 4px 18px; display: flex; align-items: center; gap: 8px; }
.rps-menu button:hover { background: var(--rps-select-focus); color: #fff; }
.rps-menu .sep { height: 1px; margin: 4px 0; background: var(--rps-border); }

/* properties */
.rps-props { height: 100%; overflow: auto; background: var(--rps-sidebar); padding: 10px 14px; display: flex; flex-direction: column; gap: 10px; font-size: 12px; user-select: text; }
.rps-props h4 { margin: 0; font-size: 11px; text-transform: uppercase; color: var(--rps-muted); letter-spacing: .04em; }
.rps-props label { display: flex; flex-direction: column; gap: 4px; }
.rps-props label.check { flex-direction: row; align-items: center; gap: 8px; }
.rps-props .ro { color: var(--rps-muted); font-family: Consolas, monospace; font-size: 11px; word-break: break-all; }

/* preview */
.rps-preview { position: absolute; inset: 0; overflow: auto; background: var(--background, #fff); color: var(--foreground, #111); user-select: text; }
.rps-preview-bar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 4px 10px; font-size: 12px; background: var(--rps-sidebar); color: var(--rps-fg); border-bottom: 1px solid var(--rps-border); }
.rps-preview-stage { padding: 16px; }
.rps-preview-msg { padding: 16px; color: var(--rps-muted); font-size: 12px; }

.rps-spin { animation: rps-spin 1s linear infinite; }
@keyframes rps-spin { to { transform: rotate(360deg); } }

/* activity bar */
.rps-main { flex: 1; min-height: 0; display: flex; }
.rps-activity { flex: none; width: 48px; display: flex; flex-direction: column; align-items: center; padding-top: 4px; gap: 2px; background: var(--rps-title); border-right: 1px solid var(--rps-border); }
.rps-activity button { width: 48px; height: 46px; display: flex; align-items: center; justify-content: center; color: var(--rps-muted); border-left: 2px solid transparent; }
.rps-activity button:hover { color: var(--rps-fg); }
.rps-activity button[aria-pressed="true"] { color: var(--rps-fg); border-left-color: var(--rps-accent); }
.rps-main > .rps-body { flex: 1; min-width: 0; }

/* page designer */
.rpd { height: 100%; outline: none; }
.rpd-center { height: 100%; display: flex; flex-direction: column; background: var(--rps-bg); }
.rpd-toolbar { flex: none; height: 35px; display: flex; align-items: center; gap: 4px; padding: 0 8px; border-bottom: 1px solid var(--rps-border); background: var(--rps-tabbar); }
.rpd-path { font-size: 12px; color: var(--rps-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rpd-sep { width: 1px; height: 18px; background: var(--rps-border); margin: 0 4px; }
.rpd-stage { flex: 1; min-height: 0; overflow: auto; position: relative; background: repeating-conic-gradient(rgba(128,128,128,.06) 0% 25%, transparent 0% 50%) 50% / 16px 16px; }
.rpd-frame { position: relative; min-height: 100%; margin: 0 auto; background: var(--background, #fff); }
.rpd-frame.device { margin: 12px auto; box-shadow: 0 0 0 1px var(--rps-border), 0 8px 30px rgba(0,0,0,.25); border-radius: 6px; overflow: hidden; }
.rpd-mount { position: relative; }
.rpd-overlay { position: absolute; inset: 0; z-index: 5; }
.rpd-region { position: absolute; outline: 1px dashed transparent; outline-offset: -1px; pointer-events: none; transition: background .1s, outline-color .1s; }
.rpd-overlay:hover .rpd-region { outline-color: rgba(128,128,128,.35); }
.rpd-region.dragging { outline-color: color-mix(in srgb, var(--rps-accent) 55%, transparent); background: color-mix(in srgb, var(--rps-accent) 5%, transparent); }
.rpd-region.over { outline: 2px solid var(--rps-accent); background: color-mix(in srgb, var(--rps-accent) 12%, transparent); }
.rpd-region-label { position: absolute; right: 2px; top: 2px; font: 10px/14px system-ui, sans-serif; padding: 0 5px; border-radius: 3px; background: rgba(30,30,30,.72); color: #fff; opacity: 0; transition: opacity .1s; text-transform: uppercase; letter-spacing: .04em; }
.rpd-overlay:hover .rpd-region-label, .rpd-region.dragging .rpd-region-label { opacity: 1; }
.rpd-portal-strip { position: absolute; pointer-events: none; }
.rpd-portal-strip.dragging { background: repeating-linear-gradient(45deg, color-mix(in srgb, #8b5cf6 12%, transparent) 0 6px, transparent 6px 12px); outline: 1px dashed color-mix(in srgb, #8b5cf6 60%, transparent); outline-offset: -1px; }
.rpd-portal-strip.over { outline: 2px solid #8b5cf6; background: color-mix(in srgb, #8b5cf6 18%, transparent); }
.rpd-strip-label { position: absolute; left: 4px; top: 1px; font: 10px/13px system-ui, sans-serif; color: #8b5cf6; font-weight: 600; text-transform: uppercase; }
.rpd-placement { position: absolute; outline: 1px solid transparent; outline-offset: -1px; cursor: pointer; }
.rpd-placement:hover { outline-color: color-mix(in srgb, var(--rps-accent) 70%, transparent); }
.rpd-placement.portal:hover { outline-color: color-mix(in srgb, #8b5cf6 75%, transparent); }
.rpd-placement.selected { outline: 2px solid var(--rps-accent); }
.rpd-placement.portal.selected { outline-color: #8b5cf6; }
/* Embedded widget instances: read-only, click-through (the click selects the placement beneath). */
.rpd-embed { position: absolute; pointer-events: none; outline: 1px dashed color-mix(in srgb, var(--rps-accent) 55%, transparent); outline-offset: -3px; border-radius: 4px; }
.rpd-embed-label { position: absolute; right: 4px; top: 4px; font-size: 10px; font-style: italic; line-height: 14px; padding: 0 5px; border-radius: 3px; background: color-mix(in srgb, var(--rps-accent) 16%, var(--rps-bg, #1e1e1e)); color: var(--rps-fg, currentColor); opacity: .9; max-width: calc(100% - 8px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rpd-embed-row .label { font-style: italic; }
.rpd-embeds { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.rpd-embed-head { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.rpd-embed-name { font-weight: 600; }
.rpd-embed-status { font-size: 10px; padding: 0 5px; border-radius: 8px; border: 1px solid var(--rps-border, currentColor); color: var(--rps-muted); }
.rpd-embed-status.error { color: var(--rps-error); border-color: var(--rps-error); }
.rpd-embed-status.trusted { color: var(--rps-accent); border-color: var(--rps-accent); }
.rpd-embed-options { margin: 4px 0 0; max-height: 120px; overflow: auto; font-size: 11px; padding: 4px 6px; border-radius: 3px; background: var(--rps-input-bg, rgba(127,127,127,.12)); }
.rpd-placement.dragging { pointer-events: none; }
.rpd-placement.lifted { opacity: .45; }
.rpd-chip { position: absolute; left: 2px; top: 2px; display: none; align-items: center; gap: 3px; padding: 1px 6px 1px 1px; border-radius: 3px; background: var(--rps-accent); color: #fff; font: 11px/16px system-ui, sans-serif; white-space: nowrap; pointer-events: auto; box-shadow: 0 1px 4px rgba(0,0,0,.25); }
.rpd-placement.portal .rpd-chip { background: #7c3aed; }
.rpd-placement:hover .rpd-chip, .rpd-placement.selected .rpd-chip { display: flex; }
.rpd-handle { width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; border-radius: 2px; cursor: grab; color: #fff; }
.rpd-handle:hover, .rpd-handle:focus-visible { background: rgba(255,255,255,.2); outline: none; }
.rpd-handle:focus-visible { box-shadow: 0 0 0 2px #fff; }
.rpd-badge { display: inline-flex; align-items: center; gap: 2px; padding: 0 4px; border-radius: 2px; background: rgba(255,255,255,.22); font-size: 10px; }
.rpd-insert { position: absolute; height: 3px; border-radius: 2px; background: var(--rps-accent); box-shadow: 0 0 0 1px #fff; pointer-events: none; z-index: 6; }
.rpd-drag-chip { display: inline-block; padding: 4px 10px; border-radius: 4px; background: var(--rps-accent); color: #fff; font: 12px system-ui, sans-serif; box-shadow: 0 6px 18px rgba(0,0,0,.35); cursor: grabbing; }
.rpd-pad { padding: 4px 12px 8px; }
.rpd-row-actions { margin-left: auto; display: none; gap: 2px; }
.rps-row:hover .rpd-row-actions { display: flex; }
.rpd-palette-item { gap: 6px; }
.rpd-palette-drag { flex: 1; min-width: 0; display: flex; flex-direction: column; cursor: grab; outline: none; border-radius: 3px; }
.rpd-palette-drag:focus-visible { box-shadow: 0 0 0 1px var(--rps-focus); }
.rpd-inspector { flex: 1; overflow: auto; padding: 4px 12px 16px; user-select: text; }
.rpd-form { display: flex; flex-direction: column; gap: 10px; font-size: 12px; }
.rpd-field { display: flex; flex-direction: column; gap: 3px; }
.rpd-field input:not([type=checkbox]), .rpd-field select, .rpd-field textarea { width: 100%; }
.rpd-check { flex-direction: row; align-items: center; gap: 6px; }
.rpd-label { font-size: 11px; color: var(--rps-muted); }
.rpd-hint { font-size: 11px; color: var(--rps-muted); }
.rpd-error { font-size: 11px; color: var(--rps-error); }
.rpd-mono { font-family: Consolas, "Cascadia Code", Menlo, monospace; font-size: 12px; width: 100%; }
.rpd-json { display: flex; flex-direction: column; gap: 3px; }
.rpd-rows { display: flex; flex-direction: column; gap: 5px; }
.rpd-row { display: flex; align-items: center; gap: 4px; }
.rpd-row > input, .rpd-row > select { flex: 1; min-width: 0; }
.rpd-buttons { display: flex; flex-wrap: wrap; gap: 4px; }

/* blocks in the designer */
.rpd-zone { position: absolute; pointer-events: none; outline: 1px dashed transparent; outline-offset: -2px; }
.rpd-zone.dragging { outline-color: color-mix(in srgb, #0ea5e9 55%, transparent); background: color-mix(in srgb, #0ea5e9 5%, transparent); }
.rpd-zone.over { outline: 2px solid #0ea5e9; background: color-mix(in srgb, #0ea5e9 13%, transparent); }
.rpd-zone-label { position: absolute; left: 3px; top: 2px; font: 10px/14px system-ui, sans-serif; padding: 0 5px; border-radius: 3px; background: #0ea5e9; color: #fff; text-transform: uppercase; letter-spacing: .03em; }
.rpd-placement.block { outline-style: dashed; }
.rpd-placement.block .rpd-chip { background: #0369a1; }
.rpd-placement.block.selected { outline: 2px dashed #0ea5e9; }
/* Design mode only: empty blocks and zones get room to drop into (the portal renders them as-is). */
.rpd-mount.designing [data-rp-kind="block"]:empty, .rpd-mount.designing [data-rp-zone][data-rp-parent]:not([data-rp-placement]):empty { min-height: 3.5rem; outline: 1px dashed color-mix(in srgb, currentColor 25%, transparent); outline-offset: -2px; }
.rpd-presets { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 10px 8px 26px; }
.rpd-presets.inline { padding: 0; }
.rpd-preset { font-size: 11px; padding: 1px 7px; border-radius: 10px; border: 1px solid var(--rps-border); background: var(--rps-bg); cursor: grab; white-space: nowrap; }
.rpd-presets.inline .rpd-preset { cursor: pointer; }
.rpd-preset:hover, .rpd-preset:focus-visible { border-color: var(--rps-focus); outline: none; }
.rpd-preset.active { background: var(--rps-select-focus); color: #fff; border-color: var(--rps-select-focus); }
.rpd-device { display: flex; gap: 2px; padding: 2px; border: 1px solid var(--rps-border); border-radius: 6px; align-self: flex-start; }
.rpd-device .rps-tbtn { height: 22px; }
.rpd-section { border-top: 1px solid var(--rps-border); padding-top: 8px; display: flex; flex-direction: column; gap: 8px; }
.rpd-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--rps-muted); cursor: pointer; display: flex; align-items: center; gap: 6px; }
details.rpd-section > summary { list-style: none; }
details.rpd-section > summary::before { content: '▸'; font-size: 10px; }
details.rpd-section[open] > summary::before { content: '▾'; }
.rpd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rpd-buttons .rps-tbtn { border: 1px solid var(--rps-border); }

/* menus activity */
.rpm-wide { width: 100%; justify-content: center; border: 1px dashed var(--rps-border); }
.rpm-seg { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--rps-border); border-radius: 6px; }
.rpm-seg .rps-tbtn { height: 22px; }
.rpm-seg .rps-tbtn[aria-checked="true"], .rpd-toolbar .rps-tbtn[aria-pressed="true"] { background: var(--rps-select-focus); color: #fff; }
.rpm-viewas { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--rps-muted); }
.rpm-viewas select { max-width: 220px; }
.rpm-stage { display: flex; flex-direction: column; }
.rpm-note { flex: none; padding: 6px 12px; font-size: 12px; background: color-mix(in srgb, var(--rps-warn) 18%, transparent); border-bottom: 1px solid var(--rps-border); color: var(--rps-fg); }
.rpm-note.subtle { background: var(--rps-sidebar); color: var(--rps-muted); }
.rpm-stage .rpd-frame { flex: 1; width: 100%; }
/* Focus the previewed region: the others fade. */
.rpm-mount[data-rpm-focus="sidebar"] [data-rp-region]:not([data-rp-region="sidebar"]),
.rpm-mount[data-rpm-focus="header"] [data-rp-region]:not([data-rp-region="header"]),
.rpm-mount[data-rpm-focus="footer"] [data-rp-region]:not([data-rp-region="footer"]) { opacity: .4; transition: opacity .15s; }
.rpm-mount[data-rpm-focus="sidebar"] [data-rp-region="sidebar"], .rpm-mount[data-rpm-focus="header"] [data-rp-region="header"], .rpm-mount[data-rpm-focus="footer"] [data-rp-region="footer"] { outline: 2px dashed color-mix(in srgb, var(--rps-accent) 70%, transparent); outline-offset: -2px; }
.rpm-mount [data-rp-nav-item] { cursor: pointer; }
.rpm-quick { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 10px 8px; }
.rpm-quick select { flex: 1 1 140px; min-width: 0; }
.rpm-quick .rps-tbtn { border: 1px solid var(--rps-border); }
.rpm-row { gap: 4px; }
.rpm-handle { width: 16px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 3px; cursor: grab; color: var(--rps-muted); flex: none; touch-action: none; }
.rpm-handle:hover, .rpm-handle:focus-visible { color: var(--rps-fg); background: rgba(128,128,128,.2); outline: none; }
.rpm-handle:focus-visible { box-shadow: 0 0 0 1px var(--rps-focus); }
.rpm-twisty { width: 14px; height: 18px; display: inline-flex; align-items: center; justify-content: center; flex: none; color: var(--rps-muted); }
.rpm-sep-row .label { color: var(--rps-muted); letter-spacing: 2px; }
.rpm-readonly .rpm-edit, .rpm-readonly .rpm-quick { opacity: .6; }
.rpm-icon-field { display: flex; flex-direction: column; gap: 6px; }
.rpm-icon-current { display: flex; align-items: center; gap: 4px; }
.rpm-icon-btn { flex: 1; display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 6px; border: 1px solid var(--rps-input-border); border-radius: 4px; background: var(--rps-input); text-align: left; }
.rpm-icon-btn:focus-visible { border-color: var(--rps-focus); outline: none; }
.rpm-icon-swatch { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; background: rgba(128,128,128,.15); }
.rpm-icon-none { font-size: 9px; color: var(--rps-muted); }
.rpm-icon-name { font-family: Consolas, "Cascadia Code", Menlo, monospace; font-size: 12px; }
.rpm-icon-picker { border: 1px solid var(--rps-border); border-radius: 6px; background: var(--rps-bg); display: flex; flex-direction: column; }
.rpm-icon-search { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-bottom: 1px solid var(--rps-border); color: var(--rps-muted); }
.rpm-icon-search input { flex: 1; min-width: 0; border: 0 !important; background: transparent !important; padding: 2px 0 !important; }
.rpm-icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(36px, 1fr)); gap: 4px; padding: 4px; max-height: 232px; overflow-y: auto; outline: none; }
.rpm-icon-grid:focus-visible { box-shadow: inset 0 0 0 1px var(--rps-focus); }
.rpm-icon-cell { height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid transparent; cursor: pointer; color: var(--rps-fg); }
.rpm-icon-cell:hover { background: var(--rps-hover); }
.rpm-icon-cell.current { border-color: color-mix(in srgb, var(--rps-accent) 60%, transparent); }
.rpm-icon-cell.active { background: var(--rps-select-focus); color: #fff; }
.rpm-icon-foot { display: flex; gap: 6px; padding: 4px 8px; border-top: 1px solid var(--rps-border); font-size: 11px; color: var(--rps-muted); }

/* scope banner */
.rps-scope-banner { background: color-mix(in srgb, var(--rps-warn) 22%, var(--rps-bg)); }
.rps-scope-banner strong { font-weight: 600; }
.rps-readonly .rpd-inspector, .rps-readonly [data-rpd-palette] { opacity: .6; pointer-events: none; }
`;
