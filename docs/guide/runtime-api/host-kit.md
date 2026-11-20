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
| `components:badge` | `Badge` (`variant`: default, secondary, destructive, outline, ghost, link), `badgeVariants` |
| `components:card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` |
| `components:dropdown-menu` | `DropdownMenu`, `…Trigger`, `…Content`, `…Group`, `…Label`, `…Item`, `…Sub`, `…SubTrigger`, `…SubContent`, `…CheckboxItem`, `…RadioGroup`, `…RadioItem`, `…Separator`, `…Shortcut`, `…Portal` |
| `components:popover` | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverHeader`, `PopoverTitle`, `PopoverDescription` |
| `components:tooltip` | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` |
| `components:separator` | `Separator` |
| `components:sheet` | `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent` (`side`, `showCloseButton`), `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription` |
| `components:collapsible` | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` (alias `CollapsiblePanel`) |
| `components:dialog` | `Dialog`, `DialogTrigger`, `DialogContent` (`showCloseButton`), `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`, `DialogOverlay`, `DialogPortal` (below) |
| `components:calendar` | `Calendar`, `weekStartFor`, `parseYmd`, `toYmd` (below) |
| `components:tabs` | `Tabs` (`value` / `defaultValue` / `onValueChange`, `orientation`), `TabsList` (`variant`: default, line), `TabsTrigger` (`value`, `disabled`), `TabsContent` / `TabsPanel` (`value`, `keepMounted`), `tabsListVariants` |
| `components:sidebar` | shadcn's Sidebar, wired to `useSidebar()` (below) |
| `components:icon` | `Icon` and helpers (below) |
| `components:rich-text` | `RichText` (read-only, sanitised), `sanitizeHtml`, `safeUrl`, `htmlToText`, `isHtmlEmpty`, `findUnsupportedHtml` (below) |
| `components:rich-text-editor` | `RichTextEditor`, `RichTextToolbar`, `useRichTextEditor`, `loadRichTextEngine`, `isRichTextEngineLoaded`, plus `sanitizeHtml` and `findUnsupportedHtml` re-exported (below) |
| `components:skeleton` | `Skeleton`: a pulsing placeholder block, sized with classes (`h-4 w-32`, `size-9 rounded-lg`) |
| `components:empty` | `Empty`, `EmptyHeader`, `EmptyMedia` (`variant`: default, icon), `EmptyTitle`, `EmptyDescription`, `EmptyContent`, `emptyMediaVariants`: shadcn's empty state (no data, no results, no access). Sizes with its container, not the viewport |
| `components:kbd` | `Kbd`, `KbdGroup`: keyboard key hints (`<Kbd>/</Kbd>`, `<KbdGroup><Kbd>Ctrl</Kbd><Kbd>K</Kbd></KbdGroup>`) |
| `components:avatar` | `Avatar` (`size`: xs, sm, default, lg, xl), `AvatarImage`, `AvatarFallback`, `AvatarBadge` (`status`: online, away, busy, offline; or an icon child), `AvatarGroup` (`max`, `size`, `renderCount`), `AvatarGroupCount`, `UserAvatar` (`name`, `src`, `initials`, `status`, `size`, `labelled`), `initialsOf`, `splitOverflow`, `avatarVariants` (below) |
| `components:pill` | `Pill` (`variant`: default, secondary, outline, primary, destructive; `size`: sm, default, lg; `icon`, `onRemove`, `removeLabel`, `disabled`), `PillList` (`max`, `overflow`: expand, popover, count; `expanded` / `defaultExpanded` / `onExpandedChange`, `moreLabel`, `lessLabel`, `wrap`), `pillVariants` (below) |
| `components:alert` | `Alert` (`variant`: default, info, success, warning, destructive (aliases error, danger), tip; `title`, `description`, `icon`, `action`, `onDismiss`, `dismissLabel`, `live`), `AlertTitle`, `AlertDescription`, `AlertAction`, `alertVariants`, `alertVariantOf` (below) |
| `components:accordion` | `Accordion` (`value` / `defaultValue` / `onValueChange` as arrays, `multiple`, `variant`: default, card), `AccordionItem` (`value`, `disabled`), `AccordionTrigger` (`headingLevel`, `hideChevron`), `AccordionContent` / `AccordionPanel` |
| `components:breadcrumb` | `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink` (`render`), `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`, `Breadcrumbs` (`items`, `maxItems`, `itemsBefore`, `separator`, `lastIsPage`), `collapseBreadcrumbs` (below) |
| `components:checkbox` | `Checkbox` (`checked` / `defaultChecked` / `onCheckedChange`, `indeterminate`, `disabled`, `size`: sm, default, lg), `CheckboxLabel` (`label`, `description`), `useCheckboxGroupState(ids, selected, onChange)` |
| `components:label-value` | `LabelValue` (`label`, `value` or children, `layout`, `emptyText`, `hint`, `wrap`, `span`), `LabelValueList` (`layout`: stacked, inline, grid; `items`, `columns`, `minColumnWidth`, `labelWidth`, `divided`), `isEmptyValue` (below) |
| `components:stepper` | `Stepper` (`steps`, `current`, `orientation`, `onStepClick`, `allowSkipAhead`, `compact`), `StepMarker`, `stepStatus`, `useStepper(count, initial)` |
| `components:progress` | `Progress` (`value`, `null` = indeterminate; `min`, `max`, `label`, `showValue`, `format`, `variant`: default, success, warning, destructive; `size`: sm, default, lg), `ProgressCircle` (`value`, `size`, `strokeWidth`, `label`), `progressIndicatorVariants` |
| `components:split-button` | `SplitButton` (children, `onClick`, `variant`, `size`, `items` or `menu`, `menuLabel`, `align`, `disabled`, `menuDisabled`, `buttonProps`), `ButtonGroup` (`orientation`), `ButtonGroupSeparator` |
| `components:toggle-group` | `ToggleGroup` (`value` / `defaultValue` / `onValueChange` as arrays, `multiple`, `variant`: segmented, outline, default; `size`, `fullWidth`, `orientation`), `ToggleGroupItem` (`value`), `Toggle` (`pressed` / `onPressedChange`), `toggleVariants`, `useSingleToggle(value, onChange, { required })` |
| `components:resizable` | `ResizablePanelGroup` (`direction`, `autoSaveId`, `onLayout`, `keyboardStep`), `ResizablePanel` (`defaultSize`, `minSize`, `maxSize`, `collapsible`, `collapsedSize`), `ResizableHandle` (`withHandle`, `disabled`, `aria-label`), `useResizableLayout(panels, options)` (below) |
| `components:tree` | `Tree` (`items`, `expanded` / `defaultExpanded` / `onExpandedChange`, `selected` / `defaultSelected` / `onSelect`, `renderLabel`, `size`), `flattenTree`, `useTreeState` (below) |
| `components:heading` | `Heading` (`level` 1–6, `size`: display, xl, lg, md, sm, xs; `variant`: default, muted, primary; `description`, `action`), `headingVariants` |
| `components:image` | `Image` (`src`, `alt`, `aspectRatio`, `fit`, `fallback`, `fallbackSrc`, `placeholder`, `loading`, `onStatusChange`), `useImageStatus(src)` |
| `components:date-range-picker` | `DateRangePicker` (`value` / `onChange` as `{ start, end }`, `presets`, `placeholder`, `clearable`, `min`, `max`, `isDisabled`, `locale`), `DateRangeCalendar`, `defaultRangePresets(today?)`, `formatRange`, `normalizeRange`, `rangeLength` (below) |
| `components:code-editor` | `CodeEditor` (`value`, `onChange`, `onBlur(text, { changed })`, `onSubmit`, `language`, `readOnly`, `disabled`, `invalid`, `placeholder`, `lineNumbers`, `tabSize`, `minLines`, `maxHeight`), `useCodeEditor`, `loadCodeEngine`, `isCodeEngineLoaded`, `codeLanguageForType` (below) |

`components:tabs` gets roving focus with arrow keys, Home / End, `aria-selected`, `aria-controls` / `aria-labelledby` and `data-active` on the selected tab from Base UI.

### Dialog and calendar

`components:dialog` is shadcn's Dialog on Base UI, rendered in the overlay layer inside the shadow root. Base UI supplies the modal focus trap, Escape and outside-click dismissal, focus return to the trigger, `aria-modal` and the title / description wiring. For confirmations and form dialogs, use the record primitives in [Dialogs](../primitives/dialogs.md) instead of building your own.

```tsx
<Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Share</DialogTitle>
            <DialogDescription>Anyone with the link can view.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
        </DialogFooter>
    </DialogContent>
</Dialog>
```

`components:calendar` is a date grid with no date library. Values are `'YYYY-MM-DD'` strings and the math is in UTC, so the user's time zone never shifts a day. Month and weekday names come from `Intl` in `locale`, and the week start from the locale unless `weekStartsOn` says otherwise.

- Props: `value`, `onSelect(ymd)`, `defaultMonth` (`'YYYY-MM'`), `onMonthChange(ym)`, `min`, `max`, `isDisabled(ymd)`, `locale`, `weekStartsOn`, `today`, `autoFocus`, `footer`.
- Keyboard (WAI-ARIA date grid): arrows move a day or a week, Home / End go to the start or end of the week, PageUp / PageDown change the month (Shift: the year), Enter / Space pick. The caption button switches to a month grid, then a year grid; Escape goes back one level.
- It's pure UI: no time zones and no glide values. `app/date-field` and `app/datetime-field` wrap it for ServiceNow values; see [Fields](../primitives/fields.md).

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

## Design-system pieces

These generic pieces cover Next Experience's design-system components (`now-avatar`, `now-pill`, `now-alert`, `now-accordion`, `now-breadcrumbs`, `now-checkbox`, `now-label-value-*`, `now-stepper`, `now-progress-bar`, `now-split-button`, `now-grouped-button`, `now-resizable-panes`, `now-content-tree`, `now-heading`, `now-image`, `now-date-range-picker`, `now-code-editor`). Each one uses theme tokens, works in light and dark, and follows the WAI-ARIA pattern for its role. The sp portal's **Components ▸ Primitives** page shows all of them.

### Avatar and pill

```tsx
import { UserAvatar, AvatarGroup } from 'components:avatar'
import { Pill, PillList } from 'components:pill'

<UserAvatar name="Beth Anglin" src={photoUrl} status="online" size="sm" />
<AvatarGroup max={4}>{people.map((p) => <UserAvatar key={p.id} name={p.name} />)}</AvatarGroup>

<PillList max={3} overflow="popover" aria-label="Watch list">
    {watchers.map((w) => <Pill key={w.id} onRemove={() => remove(w.id)}>{w.name}</Pill>)}
</PillList>
```

- **Avatar:** the image shows once it has loaded; until then, or if it fails, the initials show.
  - `UserAvatar` is decorative by default, because the name is usually printed next to it. Use `labelled` to give it `role="img"` with the name and presence as its accessible name.
  - `AvatarBadge status` adds an sr-only label ("Online").
  - `AvatarGroup max` keeps the count chip inside the limit: `max={3}` of 5 shows 2 avatars and "+3".
- **Pill:** the remove button is a real button. Enter, Space, Backspace and Delete all work on it. After a removal, focus moves to the next pill's button.
- **PillList:** renders `role="list"`, and Left, Right, Home and End move between the pills' buttons. Its `overflow` setting picks what the "+N" control does:
  - `expand` (default): shows the rest inline, followed by "Show less";
  - `popover`: shows the rest in a popover;
  - `count`: a static count.
- `splitOverflow(items, max)` is the shared helper: `{ visible, hidden, overflow }`.

### Alert

```tsx
<Alert variant="warning" title="This record changed" onDismiss={close}
       action={<Button size="sm" variant="outline">Reload</Button>}>
    Abel Tuter updated it a minute ago.
</Alert>
```

- **Roles:** `warning` and `destructive` alerts are `role="alert"` (assertive); the others are `role="status"` (polite). Pass `live={false}` for a notice that's there on load and shouldn't be announced.
- **Icons:** with `title` / `description` the status icon is added for you. Pass `icon={false}` to hide it, or compose the parts yourself (an svg first, then `AlertTitle`, `AlertDescription`, `AlertAction`).
- Toasts stay with `toast()` from the runtime (Sonner); use an alert for inline, in-context messages.

### Breadcrumb

`Breadcrumbs` takes `items` (`{ label, href?, render?, icon?, onClick? }`); the last item is the current page (`aria-current="page"`).
- `maxItems` collapses the middle into an ellipsis button with a menu of the hidden items. `itemsBefore` (default 1) sets how many leading items stay.
- For portal links, pass the runtime's Link as `render`: `{ label: 'Knowledge', render: <Link to="kb" /> }`.
- `collapseBreadcrumbs(count, maxItems, itemsBefore)` returns the index split for custom trails.

### Label and value

```tsx
<LabelValueList layout="grid" minColumnWidth="12rem">
    <LabelValue label="Number">INC0010001</LabelValue>
    <LabelValue label="Assigned to" />            {/* — and "Empty" for screen readers */}
    <LabelValue label="Description" span="full">…</LabelValue>
</LabelValueList>
```

- The list renders a `<dl>` with `<dt>` / `<dd>` pairs; a standalone `LabelValue` is a labelled group.
- **Layouts:**
  - `stacked`: the label sits above the value;
  - `inline`: a label column and a value column (falls back to stacked in containers under about 28rem; `labelWidth`, `divided`);
  - `grid`: stacked pairs in as many columns as fit (`minColumnWidth`), or a fixed number of `columns`.
- For field-bound read-only values, keep using `app/field`'s read-only shell.

### Resizable panes and tree

```tsx
<ResizablePanelGroup direction="horizontal" autoSaveId="kb-split" className="h-96 rounded-lg border">
    <ResizablePanel defaultSize={30} minSize={15} collapsible>…</ResizablePanel>
    <ResizableHandle withHandle />
    <ResizablePanel defaultSize={70}>…</ResizablePanel>
</ResizablePanelGroup>
```

- **Sizes** are percentages. There's no extra dependency: this is shadcn's API on our own splitter.
- **Handle:** each handle is a WAI-ARIA window splitter (`role="separator"`, `aria-valuenow` / `-min` / `-max`, `aria-controls`). It has one Tab stop.
  - Arrows move it by `keyboardStep` (5%); hold Shift for 20%.
  - Home / End go to the limits.
  - Enter collapses a `collapsible` panel and restores it.
  - Pointer drag works with mouse, pen and touch; a double-click toggles the collapse.
- **`autoSaveId`** keeps the layout in `localStorage` (`x_312987_portal.resizable.<id>`).
- `useResizableLayout(panels)` is the same state machine for custom splitters.

`Tree` items are `{ id, label, icon?, children?, hasChildren?, loading?, disabled?, badge?, title? }`.
- **Lazy loading:** to load children on demand, set `hasChildren` and fill `children` from `onExpandedChange(ids, { id, expanded })`. Set `loading` while you fetch.
- **Keyboard:**
  - Up / Down move between visible items.
  - Right opens an item or moves to its first child; Left closes it or moves to the parent.
  - Home / End jump to the first / last item.
  - Enter / Space select.
  - `*` opens every sibling.
  - Typing jumps to the next item that starts with the typed text.
- One Tab stop (roving tabindex), with `aria-level`, `aria-setsize`, `aria-posinset`, `aria-expanded` and `aria-selected`.
- `flattenTree(items, expandedSet)` and `useTreeState(options)` are exported for custom trees.

### Date range picker

```tsx
const [range, setRange] = useState({ start: '', end: '' });
<DateRangePicker value={range} onChange={setRange} presets={defaultRangePresets()} aria-label="Period" />
```

- **Picking:** the first click sets the start and the second the end (an earlier day swaps them). Hovering or focusing previews the range. Presets are buttons beside the calendar.
- **Values:** `'YYYY-MM-DD'` strings with no time zones, like `components:calendar`.
- **Calendar props:** the calendar gained `rangeStart`, `rangeEnd` and `onDayHover`, so a custom range UI can use it directly.
- **Record fields:** [`app/date-range-field`](../primitives/fields.md#date-range-and-code-fields) binds the picker to two fields of a record.

### Code editor

```tsx
import { CodeEditor } from 'components:code-editor'
<CodeEditor value={code} onChange={setCode} language="javascript" aria-label="Script" />
<CodeEditor value={json} language="json" readOnly />
```

- **Engine:** CodeMirror 6, with line numbers, folding, search (Ctrl/⌘+F), bracket matching and closing, word autocomplete, history and soft-wrapped lines.
- **Languages:** `javascript`, `typescript`, `jsx`, `tsx`, `json`, `css`, `html` and `xml` (read by the HTML parser), plus `text`. `codeLanguageForType(glideType)` maps script, xml, css, json and html_script fields.
- **Theme:** the chrome uses the portal's tokens, and the syntax colours use `light-dark()`, so they follow the host's light or dark mode without reconfiguring.
- **Keyboard:**
  - Tab indents. Escape then Tab moves focus on, as CodeMirror documents.
  - Ctrl/⌘+Enter calls `onSubmit`.
  - Read-only code stays a Tab stop, so it can be selected and copied.
- **Lazy engine:** CodeMirror is not in the host bundle. It ships as a separate chunk (`portal-code.jsdbx`) loaded with `import()` the first time an editor mounts, then cached for the page.
  - Until it arrives, the value shows in a same-sized monospace block.
  - If the chunk fails, a plain textarea takes over, with Retry.
- **Headless:** `useCodeEditor(options)` returns `{ mountRef, status, error, retry, focus, getValue, changed }`.

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
| `Icon` | `<Icon name label? fallback? {...svgProps} />`: decorative (`aria-hidden`) unless `label` is given, which makes it `role="img"` with that `aria-label` |
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
| URLs | `href`: http(s), mailto, tel or relative. `img src`: http(s), relative, or base64 raster `data:image/…` (`allowDataImages: false` refuses those). `javascript:`, `vbscript:`, other `data:`, `file:`, `blob:` are dropped, including obfuscated forms (whitespace or control characters inside the scheme). Relative platform URLs (`sys_attachment.do?…`) become root-relative |
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
