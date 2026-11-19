---
title: Code editor
description: The Components activity — virtual files, explorer, editor groups, saving and live problems, preview, properties and shortcuts.
section: Studio
order: 2
tags: [studio, editor, codemirror, shortcuts]
---

# Code editor

The **Components** activity edits components and themes like a small VS Code: title bar · explorer | editor groups and panel | properties · status bar.

## Virtual files

A component's record fields appear as files, followed by its extra source files as a folder tree:

| File | Field | Shown for |
|---|---|---|
| `main.tsx` | `client_script` | every kind |
| `styles.css` | `css` | every kind |
| `server.js` | `script` | every kind (empty opens as the Service Portal IIFE template) |
| `options.schema.json` | `options_schema_json` | every kind |
| `options.defaults.json` | `default_options_json` | every kind |
| `regions.json` | `regions_json` | layouts and blocks |
| `theme.css`, `tokens.json` | `stylesheet`, `tokens_json` | themes |

The explorer labels virtual files by role (Client, Styles, Server, Options schema, Defaults, Regions). JSON files are pretty-printed for editing and validated on save. Virtual files can't be deleted or renamed; save one empty instead.

> **Note:** **In progress:** per-kind baseline files (the property `x_312987_portal.studio.kind_files` decides which virtual files each kind has; a file a kind doesn't list stays visible, flagged "Not used", while its field has content).

Extra files: **New File**, **New Folder**, **Rename** and **Delete** from the explorer's context menu. Folders are path prefixes, not records.

## Title bar

- A searchable **switcher** for components and themes (Ctrl/⌘+O).
- **New component**: name and kind; created with a starter and compiled.
- **Revision** badge, **build badge** with compile time (red when the last compile failed: the previous good build keeps serving).
- **Preview**, **Properties** and panel toggles, **Save** (Ctrl/⌘+S).
- The Light / Dark / System toggle.

## Editing

- CodeMirror 6 editors with TypeScript/JSX, CSS and JSON modes, autocomplete for `@portal/runtime` exports and registry modules, and runtime snippets.
- **Editor groups** (allotment splits): single click opens a preview tab, double click pins it. Drag tabs between groups, reorder them, or drop on a group's edge to split. **Open to the Side**, Ctrl/⌘+\ splits right (Shift: down).
- Each tab keeps its editor mounted, so cursor, scroll and undo history survive switching. The same file open in two groups shares one buffer.
- Tab layout persists per component in `localStorage['rp-studio:layout:<type>:<id>']`; general UI state in `rp-studio:ui`.

## Saving and problems

- **Save** sends every dirty file in one revision-checked request and compiles synchronously; the response carries the diagnostics.
- While you type, Studio dry-runs the compiler (`POST /components/{id}/check`) on the unsaved buffers. The **Problems** panel lists errors and warnings with file, line and column; the **Output** panel logs saves and compiles.
- Switching away from unsaved changes asks first.
- If someone else saved since you loaded, a **conflict banner** offers Reload or Overwrite (`409 conflict`).

## Preview

The **Preview** tab renders the component's latest build through the host runtime (same loader, registry and theme), inside an error boundary, with stub portal and instance contexts. It uses `POST /builds/{id}/preview` for the ComponentRef and default options.

> **Note:** The preview has no placement, so server calls and embedded widgets have no server there (`no_server`).

## Properties

The Properties panel edits component metadata: name, description, kind, placeable, active, Tailwind and server mode. Changes save with the next Save.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| Ctrl/⌘+S | Save |
| Ctrl/⌘+P | Quick open (a file of the open component; Ctrl+Enter opens to the side) |
| Ctrl/⌘+O | Switch component or theme |
| Ctrl/⌘+\ (Shift) | Split the editor right (down) |
| Ctrl/⌘+W, Alt+W | Close the tab |
| Ctrl+Tab (Shift), Ctrl+Alt+→/←, Alt+PageDown/PageUp | Next / previous tab |
| Ctrl/⌘+J | Toggle the panel |
| Ctrl/⌘+B | Toggle the explorer |
| Ctrl/⌘+Shift+M | Show Problems |
| Escape | Close quick open |

## Related

- [Client script](../authoring/client-script.md)
- [Studio REST API](../rest-api/studio.md)
