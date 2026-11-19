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
.rps *, .rps *::before, .rps *::after { box-sizing: border-box; }
.rps button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
.rps input, .rps select, .rps textarea { font: inherit; color: var(--rps-fg); background: var(--rps-input); border: 1px solid var(--rps-input-border); border-radius: 2px; padding: 3px 6px; outline: none; user-select: text; }
.rps input:focus, .rps select:focus, .rps textarea:focus { border-color: var(--rps-focus); }
.rps svg { flex: none; }

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
`;
