---
title: Host kit
description: The shadcn/ui components, icons and data libraries that ship inside the host and are importable as components: and utilities:.
section: Runtime API
order: 9
tags: [host-kit, shadcn, base-ui, icons, tanstack]
---

# Host kit

The host bundle ships a set of generic UI building blocks and libraries, importable from any component. They're **shadcn/ui on Base UI** styled with the theme's tokens, rendered in the host's React 19, with floating parts rendered in the overlay layer.

> **Note:** The host kit holds **generic** pieces only. Anything domain-aware (fields, form sections, form tabs) is a record primitive built on top of them. See the [layering rule](../concepts/record-imports.md#the-layering-rule).

## Components

| Specifier | Exports |
|---|---|
| `components:button` | `Button` (`variant`: default, outline, secondary, ghost, destructive, link; `size`: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg; `render`), `buttonVariants` |
| `components:badge` | `Badge`, `badgeVariants` |
| `components:card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` |
| `components:dropdown-menu` | `DropdownMenu`, `…Trigger`, `…Content`, `…Group`, `…Label`, `…Item`, `…Sub`, `…SubTrigger`, `…SubContent`, `…CheckboxItem`, `…RadioGroup`, `…RadioItem`, `…Separator`, `…Shortcut`, `…Portal` |
| `components:popover` | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverHeader`, `PopoverTitle`, `PopoverDescription` |
| `components:tooltip` | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` |
| `components:separator` | `Separator` |
| `components:sheet` | `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent` (`side`, `showCloseButton`), `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription` |
| `components:collapsible` | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` (alias `CollapsiblePanel`) |
| `components:tabs` | `Tabs` (`value` / `defaultValue` / `onValueChange`, `orientation`), `TabsList` (`variant`: default, line), `TabsTrigger` (`value`, `disabled`), `TabsContent` / `TabsPanel` (`value`, `keepMounted`) |
| `components:sidebar` | shadcn's Sidebar, wired to `useSidebar()` (below) |
| `components:icon` | `Icon` and helpers (below) |
| `components:rich-text` | `RichText` (read-only, sanitised), `sanitizeHtml`, `safeUrl`, `htmlToText`, `isHtmlEmpty`, `findUnsupportedHtml` (below) |
| `components:rich-text-editor` | `RichTextEditor`, `RichTextToolbar`, `useRichTextEditor`, `loadRichTextEngine`, `isRichTextEngineLoaded` (below) |

`components:tabs` gets roving focus with arrow keys, Home / End, `aria-selected`, `aria-controls` / `aria-labelledby` and `data-active` on the selected tab from Base UI.

> **Note:** **In progress:** `components:dialog` (`Dialog`, `DialogTrigger`, `DialogContent` with `showCloseButton`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`, `DialogOverlay`, `DialogPortal`: modal focus trap, Escape / outside-click dismissal, focus return) and `components:calendar` (`Calendar` with `'YYYY-MM-DD'` values, `min` / `max` / `isDisabled`, locale-aware week start, a WAI-ARIA date grid; plus `weekStartFor`, `parseYmd`, `toYmd`). Both are registered in the working tree but not released yet.

### Base UI's `render` prop

Host-kit triggers follow Base UI: pass `render` to make another element the trigger, instead of shadcn's old `asChild`:

```tsx
<DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>…</DropdownMenuTrigger>
<SidebarMenuButton isActive={item.active} tooltip={item.label} render={<Link {...item.link} />}>…</SidebarMenuButton>
```

### Sidebar

`components:sidebar` exports `Sidebar` (`variant`: sidebar, floating, inset; `collapsible`: offcanvas, icon, none; `width`), `SidebarTrigger` (hidden while no collapsible sidebar is mounted), `SidebarRail`, `SidebarInset`, `SidebarInput`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarSeparator`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuSkeleton`, `SidebarMenuSub`, `SidebarMenuSubButton`, `SidebarMenuSubItem`, `sidebarMenuButtonVariants`, and `useSidebar` (the same hook as the runtime's).

- There's no provider to render: state comes from the portal shell's [`useSidebar()`](layout-and-navigation.md#usesidebar).
- It fills the layout's sidebar slot (in flow, not fixed) and becomes a Sheet in the overlay layer on mobile.
- `SidebarMenuButton`'s `tooltip` shows on the icon rail only.
- Style rail states with the `group-data-rail:` variant (`data-rail` is set while icon-collapsed).

## Icons

`components:icon` renders **any Lucide icon by name**:

```tsx
import { Icon } from 'components:icon'
<Icon name="layout-dashboard" className="size-4" />
```

- Kebab or Pascal case, Lucide's aliases, plus a few of ours (`home`, `dashboard`).
- A curated set is bundled and renders instantly. Any other name loads the full Lucide sprite once (`GET /api/x_312987_portal/rp/icons/lucide`, about 420 KB), cached in memory, in `localStorage` per Lucide version, and by the browser via ETag. Meanwhile an empty box of the same size holds the space.
- Unknown names (or a failed load) render `fallback`: a neutral circle by default, `fallback={false}` for nothing, or any element.

| Export | Meaning |
|---|---|
| `Icon` | `<Icon name fallback? {...svgProps} />` |
| `getIcon(name)` | Component or `null` (a sprite-backed component for non-curated names) |
| `hasIcon(name)` | `true` / `false`, or `undefined` until the sprite has loaded |
| `loadIcons()` | `Promise` that loads the sprite |
| `allIconNames()` | Every name (after the sprite loads) |
| `icons`, `iconNames` | The curated set |

## Rich text

`components:rich-text-editor` is a TipTap 3 editor with an HTML value; `components:rich-text` renders HTML read-only. Both are generic: `components:app/html-field` adds the field model (label, mandatory, dirty, `g_form`, record image uploads).

```tsx
import { RichTextEditor } from 'components:rich-text-editor'
import { RichText, sanitizeHtml } from 'components:rich-text'

<RichTextEditor value={html} onChange={setHtml} onBlur={(html, { changed }) => changed && save(html)} aria-label="Notes" />
<RichText html={article.text} />
```

**Editor props:** `value` / `onChange(html)` (sanitised, `''` when empty), `onBlur(html, { changed })` (focus left the editor, its toolbar and dialogs; `changed` = the user edited since the last external value), `onFocus`, `readOnly` (renders `RichText`), `disabled`, `placeholder`, `autoFocus`, `invalid`, `required`, `id`, `aria-label` / `aria-labelledby` / `aria-describedby` (on the `role="textbox"` contenteditable), `minHeight` / `maxHeight`, `onUploadImage(file) → Promise<{ src, alt? }>` (paste, drop and the Image dialog's Upload; without it images are URL-only), `toolbarHide` (item keys: `block`, `bold`, `italic`, `underline`, `strike`, `code`, `bulletList`, `orderedList`, `blockquote`, `link`, `image`, `undo`, `redo`), `notice`.

- **Toolbar:** text style (paragraph, headings 1–4, code block), bold, italic, underline, strikethrough, inline code, bulleted / numbered list, quote, link and image (dialogs on `components:dialog`), undo / redo. It's a `role="toolbar"` with one Tab stop (arrow keys, Home, End), `aria-pressed` on toggles, and the shortcut in each button's title and `aria-keyshortcuts`.
- **Keys:** TipTap's (Ctrl/⌘+B, I, U, Shift+S, E, Shift+7, Shift+8, Shift+B, Alt+1–4, Z, Y / Shift+Z), plus Ctrl/⌘+K for the link dialog and Alt+F10 to move to the toolbar. Tab leaves the editor, except in lists where it indents.
- **Lazy engine:** TipTap and ProseMirror are not in the host bundle. They ship as a separate chunk (`portal-rte.jsdbx`, about 130 KB gzipped) loaded with `import()` the first time an editor mounts, then cached for the page. Until then the editor shows its value read-only under a disabled toolbar. If the chunk fails, it offers Retry and a plain HTML textarea.
- **Headless:** `useRichTextEditor({ value, onChange, onBlur, editable, placeholder, attributes, onImageFiles, onShortcut })` returns `{ mountRef, editor, status, error, retry, changed, getHtml, focus }` for a custom frame; `<RichTextToolbar editor onDialog />` is the toolbar alone.
- Content the editor's schema can't represent (tables, colours and fonts, embedded media, alignment…) is dropped when edited. `findUnsupportedHtml(html)` names it, so callers can warn first.

**The sanitiser** (`sanitizeHtml(html, { allowImages?, allowDataImages?, allowTables?, linkTarget? })`) runs on everything `RichText` renders, on pasted HTML and on the editor's output. It parses into an inert `DOMParser` document, so nothing runs while sanitising.

| Rule | |
|---|---|
| Tags | Allow-list: text and inline formatting, headings, paragraphs, lists, quotes, code, `hr`, tables, `img`, `a`. Unknown tags are unwrapped (their text stays); `script`, `style`, `iframe`, `object`, `embed`, `svg`, `math`, form controls, media, `template` are removed with their content; comments are removed |
| Attributes | Per-tag allow-list (`href`, `src`, `alt`, `title`, `width` / `height`, `colspan` / `rowspan`, `start`…). Every `on*` handler, `class`, `id`, `data-*`, `aria-*` is dropped; `style` keeps `text-align` only |
| URLs | `href`: http(s), mailto, tel or relative. `img src`: http(s), relative, or base64 raster `data:image/…` (`allowDataImages: false` refuses those). `javascript:`, `vbscript:`, other `data:`, `file:`, `blob:` are dropped, including obfuscated forms such as `java
script:`. Relative platform URLs (`sys_attachment.do?…`) become root-relative |
| Links | Always `rel="noopener noreferrer"`; `target="_blank"` only on absolute http(s) links (`linkTarget: 'keep'` or `'none'` to change that) |

`htmlToText(html, { newlines? })` gives plain text (lists, counters, list cells); `isHtmlEmpty(html)` is true for `''`, `<p></p>`, `<p><br></p>`, `&nbsp;`; `safeUrl(url, 'href' | 'src')` is the URL rule alone.

## Data libraries

| Specifier | What |
|---|---|
| `utilities:react-query` | TanStack Query v5, the host's copy: hooks share the page's `QueryClient` |
| `utilities:react-table` | TanStack Table v8: headless table state (`useReactTable`, `getCoreRowModel`, `flexRender`, `createColumnHelper`, sorting, selection, visibility, ordering, sizing, pinning). Use `manualSorting` / `manualPagination` / `manualFiltering` for server-side lists |
| `utilities:react-virtual` | TanStack Virtual v3 (`useVirtualizer`, `useWindowVirtualizer`) |
| `utilities:cn` | The `cn` class-name helper |

`components:app/data-table` (a record primitive) builds the record list on these. See [Lists](../primitives/lists.md).

## Registry details

The registry lives on `globalThis.__REACT_PORTAL__`:

| Member | Meaning |
|---|---|
| `modules` | Specifier → module namespace (React, runtime, host kit, and record imports as they load) |
| `abi` | The runtime ABI (`RUNTIME_ABI`) |
| `reactVersion` | The host's React version |
| `register(name, mod)` | Register a module at runtime |
| `embeds` | Live embedded instances (`{ version, list }`) |
| `internals` | Host internals for Portal Studio (not part of the widget API) |

## Related

- [Runtime API overview](overview.md)
- [Styling](../authoring/styling.md)
