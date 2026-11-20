// Docs activity styles (Studio chrome variables; the editor and preview content use the docs'
// own prose CSS from components:app/docs-content, injected when the renderer loads).
export const DOCS_CSS = `
.rpd-docs { height: 100%; }
.rpd-docs .rps-sidebar-title { gap: 4px; padding-right: 6px; }
.rpd-docs-filter { margin: 0 8px 6px; }
.rpd-docs-filter input { width: 100%; }
.rpd-docs-sec { display: flex; align-items: center; gap: 4px; height: 24px; padding: 0 6px 0 8px; margin-top: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--rps-muted); }
.rpd-docs-sec .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rpd-docs-sec .actions, .rpd-docs-row .actions { display: none; gap: 1px; margin-left: auto; }
.rpd-docs-sec:hover .actions, .rpd-docs-row:hover .actions, .rpd-docs-row.selected .actions { display: inline-flex; }
.rpd-docs-sec.drop { background: var(--rps-drop); }
.rpd-docs-row { padding-left: 10px; gap: 6px; }
.rpd-docs-row .handle { display: inline-flex; color: var(--rps-muted); cursor: grab; opacity: 0; }
.rpd-docs-row:hover .handle { opacity: 1; }
.rpd-docs-row.inactive .label { text-decoration: line-through; opacity: .6; }
.rpd-docs-row .rps-icon-btn { width: 20px; height: 20px; }
/* Unsaved page: the accent token (white on the selected row), visible in light and dark. */
.rpd-docs-row .dirty { background: var(--rps-accent); opacity: 1; flex: none; }
.rps-row.selected.focused.rpd-docs-row .dirty { background: #fff; }
.rpd-docs-badge { flex: none; padding: 0 4px; border-radius: 3px; font-size: 10px; line-height: 15px; border: 1px solid var(--rps-border); color: var(--rps-muted); }
.rpd-docs-badge.edited { color: var(--rps-warn); border-color: color-mix(in srgb, var(--rps-warn) 50%, transparent); }
.rpd-docs-badge.studio { color: var(--rps-accent); border-color: color-mix(in srgb, var(--rps-accent) 50%, transparent); }
.rps-row.selected.focused .rpd-docs-badge { color: #fff; border-color: rgba(255,255,255,.5); }
.rpd-docs-center { height: 100%; display: flex; flex-direction: column; background: var(--rps-bg); min-width: 0; }
.rpd-docs-head { flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 1px solid var(--rps-border); min-height: 38px; }
.rpd-docs-head .title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rpd-docs-head .path { color: var(--rps-muted); font-size: 12px; font-family: Consolas, Menlo, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rpd-docs-modes { display: inline-flex; border: 1px solid var(--rps-input-border); border-radius: 4px; overflow: hidden; flex: none; }
.rpd-docs-modes button { height: 22px; padding: 0 10px; font-size: 12px; }
.rpd-docs-modes button[aria-pressed="true"] { background: var(--rps-accent); color: #fff; }
.rpd-docs-meta { flex: none; border-bottom: 1px solid var(--rps-border); background: var(--rps-sidebar); }
.rpd-docs-meta > summary { list-style: none; cursor: pointer; padding: 5px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--rps-muted); display: flex; align-items: center; gap: 6px; }
.rpd-docs-meta > summary::before { content: '▸'; font-size: 10px; }
.rpd-docs-meta[open] > summary::before { content: '▾'; }
.rpd-docs-meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px 12px; padding: 2px 12px 10px; }
.rpd-docs-meta-grid .wide { grid-column: 1 / -1; }
.rpd-docs-meta-grid .rpm-icon-field { max-width: 320px; }
.rpd-docs-toolbar { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 2px; padding: 3px 6px; border-bottom: 1px solid var(--rps-border); background: var(--rps-bg); }
.rpd-docs-toolbar .rps-icon-btn { width: 26px; height: 24px; }
.rpd-docs-toolbar .rps-icon-btn[aria-pressed="true"] { background: rgba(128,128,128,.3); color: var(--rps-accent); }
.rpd-docs-toolbar .sep { width: 1px; height: 16px; background: var(--rps-border); margin: 0 4px; }
.rpd-docs-toolbar select, .rpd-docs-toolbar input { height: 22px; font-size: 12px; padding: 0 4px !important; }
.rpd-docs-toolbar .ctx { display: inline-flex; align-items: center; gap: 4px; margin-left: 6px; padding-left: 6px; border-left: 1px solid var(--rps-border); font-size: 11px; color: var(--rps-muted); }
.rpd-docs-editor { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.rpd-docs-cm { position: absolute; inset: 0; }
.rpd-docs-cm .cm-editor { height: 100%; }
.rpd-docs-visual { position: absolute; inset: 0; overflow: auto; }
.rpd-docs-visual-host { padding: 20px 32px 40vh; max-width: 860px; margin: 0 auto; cursor: text; }
.rpd-docs-visual-content { outline: none; min-height: 300px; white-space: pre-wrap; }
.rpd-docs-visual-content p.is-empty:first-child::before { content: 'Start writing…'; color: var(--muted-foreground); pointer-events: none; }
.rpd-docs-visual-content table { border-collapse: collapse; table-layout: auto; display: block; max-width: 100%; overflow-x: auto; }
/* Inline code in cells wraps at spaces and at the editor's <wbr> break points after '.' and '/' (never
 * mid-identifier), like the docs renderer; a table that is still too wide scrolls sideways. */
.rpd-docs-visual-content td code, .rpd-docs-visual-content th code { overflow-wrap: normal; word-break: normal; white-space: normal; }
.rpd-docs-visual-content td, .rpd-docs-visual-content th { border: 1px solid var(--border); padding: 6px 10px; vertical-align: top; position: relative; }
.rpd-docs-visual-content th { background: var(--muted); font-weight: 600; }
.rpd-docs-visual-content td > p, .rpd-docs-visual-content th > p { margin: 0; }
.rpd-docs-visual-content pre, .rpd-docs-visual-content pre code { line-height: 1.6; }
.rpd-docs-visual-content .selectedCell::after { content: ''; position: absolute; inset: 0; background: color-mix(in srgb, var(--primary) 15%, transparent); pointer-events: none; }
.rpd-docs-visual-content pre { background: var(--muted); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; font-size: 13px; white-space: pre; overflow-x: auto; }
.rpd-docs-visual-content pre code { background: none; padding: 0; border: 0; font-size: inherit; }
.rpd-docs-visual-content img { max-width: 100%; border-radius: 6px; }
.rpd-docs-visual-content img.ProseMirror-selectednode, .rpd-docs-visual-content .ProseMirror-selectednode { outline: 2px solid var(--ring, #3b82f6); outline-offset: 2px; }
.rpd-docs-visual-content .ProseMirror-gapcursor { display: none; pointer-events: none; position: absolute; }
.rpd-docs-visual-content .ProseMirror-gapcursor::after { content: ''; display: block; position: absolute; top: -2px; width: 20px; border-top: 1px solid currentColor; animation: rpd-blink 1.1s steps(2, start) infinite; }
.rpd-docs-visual-content.ProseMirror-focused .ProseMirror-gapcursor { display: block; }
@keyframes rpd-blink { to { visibility: hidden; } }
.rpe-callout { display: flex; flex-direction: column; gap: 4px; margin: 16px 0; padding: 10px 14px; border: 1px solid var(--border); border-left: 4px solid #3b82f6; border-radius: 8px; background: color-mix(in srgb, #3b82f6 6%, transparent); }
.rpe-callout[data-kind="warning"], .rpe-callout[data-kind="caution"] { border-left-color: #f59e0b; background: color-mix(in srgb, #f59e0b 8%, transparent); }
.rpe-callout[data-kind="danger"], .rpe-callout[data-kind="error"] { border-left-color: #ef4444; background: color-mix(in srgb, #ef4444 7%, transparent); }
.rpe-callout[data-kind="tip"], .rpe-callout[data-kind="hint"] { border-left-color: #22c55e; background: color-mix(in srgb, #22c55e 7%, transparent); }
.rpe-callout[data-kind="success"] { border-left-color: #10b981; }
.rpe-callout-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; opacity: .75; user-select: none; }
.rpe-callout-body > :first-child { margin-top: 0; }
.rpe-callout-body > :last-child { margin-bottom: 0; }
.rpe-raw { margin: 14px 0; border: 1px dashed var(--border); border-radius: 8px; background: var(--muted); }
.rpe-raw-label { font-size: 11px; padding: 4px 10px; color: var(--muted-foreground); border-bottom: 1px dashed var(--border); user-select: none; }
.rpe-raw-source { display: block; width: 100%; border: 0; background: transparent; color: inherit; font: 12.5px/1.5 Consolas, Menlo, monospace; padding: 8px 10px; resize: vertical; outline: none; white-space: pre; overflow-x: auto; }
.rpd-docs-problems { flex: none; max-height: 120px; overflow: auto; border-top: 1px solid var(--rps-border); background: var(--rps-sidebar); font-size: 12px; }
.rpd-docs-problems .item { display: flex; gap: 6px; align-items: baseline; padding: 2px 10px; cursor: pointer; }
.rpd-docs-problems .item:hover { background: var(--rps-hover); }
.rpd-docs-problems .item .where { color: var(--rps-muted); flex: none; font-size: 11px; }
.rpd-docs-problems .err { color: var(--rps-error); }
.rpd-docs-problems .warn { color: var(--rps-warn); }
.rpd-docs-problems .info { color: var(--rps-muted); }
.rpd-docs-preview { height: 100%; overflow: auto; background: var(--background, #fff); }
.rpd-docs-preview-inner { padding: 24px 32px 80px; max-width: 860px; margin: 0 auto; }
.rpd-docs-preview-head { margin-bottom: 24px; }
.rpd-docs-preview-head h1 { font-size: 30px; line-height: 1.2; font-weight: 700; margin: 0 0 8px; letter-spacing: -.01em; }
.rpd-docs-preview-head p { margin: 0; font-size: 17px; color: var(--muted-foreground); }
.rpd-docs-preview-bar { gap: 6px; }
.rpd-docs-link-pop { position: absolute; z-index: 60; left: 50%; top: 70px; transform: translateX(-50%); width: min(560px, 92%); }
.rpd-docs-link-pop .rps-list { max-height: 380px; }
.rpd-docs-link-pop .rps-option .heading { padding-left: 26px; }
.rpd-docs-link-pop .rps-option .hash { font-family: Consolas, Menlo, monospace; font-size: 11px; color: var(--rps-muted); margin-left: auto; }
.rpd-docs-link-pop .rps-option.active .hash { color: #ddd; }
.rpd-docs-link-pop .tip { padding: 4px 10px 8px; font-size: 11px; color: var(--rps-muted); }
.rpd-docs-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--rps-muted); text-align: center; padding: 24px; }
.rpd-docs-empty h2 { margin: 0; font-weight: 400; font-size: 22px; color: var(--rps-fg); }
.rps-readonly .rpd-docs-meta-grid, .rps-readonly .rpd-docs-toolbar { opacity: .6; pointer-events: none; }
`;
