---
title: History and Back
description: The tab's navigation history, replace navigation, useBackTarget and the app/back-button primitive, entry titles, per-entry state and scroll, navigation guards.
section: Runtime API
order: 4
tags: [history, back, useBackTarget, replace, useEntryTitle, useHistoryState, useScrollRestoration, useNavigationGuard]
---

# History and Back

Back in React Portal means **where you were in this tab**, not a fixed parent page. Home → My active items → a requested item → Back lands on Home; list → New → Save → Back lands on the list, not on a blank form.

The browser's history is the real history. The host only *observes* it: every URL the shell settles on becomes an entry in a per-tab store, keyed by the shell's `history.state.position`, so entries line up one-to-one with the browser's back and forward buttons. Back is `history.go(-n)` to the target entry. The host never writes `window.history`.

## Push and replace

Every navigation **pushes** a new entry unless you ask for **replace**:

```tsx
navigate('list', { table: 'incident', query, replace: true })   // a filter change: no Back step
<Link to="kb/search" q={{ term, page: 2 }} replace>Next</Link>
```

Use replace when the place stays the same and only its state changes, or when one place *becomes* another:

| Replace | Push |
|---|---|
| list filter, search, sort, page | opening a record |
| form tab, form view switch | New (a blank `-1` form) |
| KB facets, sort, paging; a new term on the results page | a search from another page |
| new record saved (`-1` → its sys_id) | a KB category → another category |
| order / checkout success (the form becomes the confirmation) | the record opened from a success page |
| legacy-URL forwards | |

Replace needs the `site` page's handler in script mode ([UI Builder setup](../getting-started/ui-builder-setup.md#setting-up-the-site-pages-handler)). Without it, replace navigations still work, as pushes.

## `useBackTarget(opts?)`

```ts
const back = useBackTarget({
    parent: { to: 'list', table: 'incident', label: 'Incidents' },   // optional declared parent
    fallbackHome: true,                                                // default
})
// back = { available, label, title, source, go }
<button onClick={back.go} aria-label={back.label}>←</button>
```

The target, in order:

1. **History.** The previous entry in this tab, skipping:
   - entries of **another portal** (Back stays inside the current portal);
   - blank new-record forms (`sys_id=-1`) you left without saving;
   - deleted records (`markEntries`);
   - entries for the **same place** as here (same page and record; only q / query / view differ).
2. **Declared parent** (`parent`): for deep links and new tabs, where there's no history. It's an "up" navigation (a push), so the browser's Back still returns to the deep-linked page.
3. **Browser back**, when the shell's position says there's an entry before this one that the store lost.
4. **Portal home**, unless you're on it (`fallbackHome: false` turns this off).

| Field | Meaning |
|---|---|
| `available` | `false` on the home page with no history: hide the button |
| `label` | `Back to <title>`, or `Back` |
| `title` | The target's title: the widget's entry title (`useEntryTitle`), the navigation's `title`, the q `title`, the page title, or `Home` |
| `source` | `history`, `parent`, `browser`, `home` or `none` |
| `go()` | Runs the navigation guards, then goes. Resolves `false` if a guard said no |

`goBack(opts?)` (also `usePortalUtils().goBack`) is the imperative form for the active portal.

## `components:app/back-button`

The reusable affordance. The behaviour is `useBackTarget`; the primitive only renders, and renders nothing when there's nowhere to go.

```tsx
import { BackButton } from 'components:app/back-button'

<BackButton parent={{ to: 'list', table: 'incident' }} />
<BackButton display="icon" variant="outline" />
```

| Prop | Meaning |
|---|---|
| `parent` | The declared parent (`{ to, table?, sysId?, recordId?, query?, q?, view?, label? }`); its label defaults to the page's title |
| `fallbackHome` | Default `true` |
| `display` | `auto` (default: arrow + label from `sm` up, arrow only below), `icon`, `label` |
| `variant`, `size` | `components:button` variant (default `ghost`) and `xs` / `sm` / `default` |
| `label` | Override the visible text (the `aria-label` stays the full "Back to …") |
| `onBack` | Called after a successful Back |

Widgets and layouts place it; the shell adds no automatic arrow. The record form, KB article and record detail widgets use it.

## Entry titles: `useEntryTitle(title)`

```ts
useEntryTitle(record ? record.number : '')   // "Back to INC0010023"
```

Labels the current entry. The record form uses the record's title, the list view its list title, the search pages `Search: <term>`, success screens `Submitted <number>`. `navigate(to, { title })` gives a new entry a label before its widgets load.

## Per-entry state: `useHistoryState(key, initial)`

Like `useState`, but the value belongs to the current history entry: Back or Forward to the entry restores it.

```ts
const [tab, setTab] = useHistoryState('my-items.tab', 'requests')
```

Use it for view state that isn't worth a URL param (my-items' active tab). Values must be JSON. State that should survive a shared link belongs in the URL (q) instead.

## Scroll: `useScrollRestoration(target, key?)`

```ts
useScrollRestoration('main')              // the main region's scroller (the host does this for you)
useScrollRestoration(scrollerRef, 'list') // a widget's own scroller
```

Remembers the element's `scrollTop` per entry and restores it when the entry becomes current again, retrying for up to 1.5 s while content loads and stopping as soon as the user scrolls. The host restores the main region on every page; the list view restores its table. With `pagination: 'scroll'` only the first page's offset can come back.

## Deleted records: `markEntries(match, flags)`

```ts
markEntries({ table: 'incident', sysId }, { gone: true })
```

Back then skips every entry of that record. The record form does this after a delete action, then goes Back.

## Navigation guards: `useNavigationGuard(when, confirm)`

```ts
useNavigationGuard(isDirty, () => confirmDialog({ title: 'Discard your unsaved changes?' }))
```

While `when` is true, `navigate()`, `<Link>` and Back (`go()`, `goBack()`) await `confirm()` and stop if it resolves `false`. Pass `skipGuard: true` to `navigate()` when your widget already asked. The browser's own back button can't be stopped (popstate can't be cancelled); that's accepted.

## `useNavHistory()`

`{ entries, cursor, epoch }`: every entry oldest first, with its `label`. For diagnostics or a "recent" menu.

## How it works

- **Store:** one per browser tab (sessionStorage `x_312987_portal.nav.v1`), shared by every host instance on the page, capped at 50 positions. Entries carry their portal, page, record params, title, kind (`page`, `record`, `new-record`, `success`), flags, scroll and widget state.
- **Applying a location:** same position and same URL → a pop or reload; position + 1 → a push (forward entries dropped); same position, different URL → a replace (forward entries kept; the same place keeps its scroll and state); anything else (a popstate to an unknown entry) → inserted.
- **New tab, typed URL, link from the classic UI:** a fresh document with no shell position starts a new history (`[current]`), so Back goes to the declared parent, then home. A reload keeps the history.
- **Success screens live in the URL:** the catalog item replaces its entry with q `ordered=<sys_id>` (plus `ordered_table` for record producers), the cart with q `done=<sc_request sys_id>`. A reload, or Back from the request you opened there, shows the confirmation again.
- **Breadcrumbs are hierarchy, never history.** A record page adds its declared parent to the header trail ("Incidents / INC0010023") with `HeaderCrumbs` (`utilities:app/header-slots`).
- **Studio's page designer** uses a memory-mode history: no storage, no browser; Back re-navigates the preview.

## Related

- [Portal and location](portal-and-location.md)
- [UI Builder setup](../getting-started/ui-builder-setup.md)
- [Host architecture](../internals/host-architecture.md)
