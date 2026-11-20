---
title: Home page and search
description: The portal search (typeahead, results page, platform search APIs), my items, knowledge, catalog tiles, quick links and announcements, and how the sp home page composes them.
section: Primitives and utilities
order: 12
tags: [home, search, typeahead, knowledge, catalog, approvals, announcements]
---

# Home page and search

The Service Portal home (`sp` portal, page `home`) is built from small reusable records, not one home widget. Every piece also works on its own on any page, and its logic is exported for other widgets.

```text
widgets      app/hero-search  app/search-results  app/my-items  app/kb-articles  app/catalog-tiles  app/quick-links  app/announcements
                   │                 │                                │
primitives   app/search-box ─────────┘   app/highlighted-value        │
                   │                                                  │
utilities    utilities:app/search (sources, hooks, recent searches) ──┘
host kit     components:skeleton, components:empty, components:kbd, components:tabs, components:card …
```

## Search: what it asks the platform

Search uses the platform's own search, as the user, so ACLs, catalog user criteria and KB user criteria apply. Nothing is a hand-rolled `LIKE` query.

| Source | Platform call | Notes |
|---|---|---|
| `catalog` | `GET /api/sn_sc/servicecatalog/items?sysparm_text=` | The catalog's own search: text index and user criteria. The payload has price and picture; `X-Total-Count` gives the total |
| `knowledge` | `GET /api/now/table/kb_knowledge`, `123TEXTQUERY321=<term>^workflow_state=published^active=true` | The platform text index (Zing), relevance-ranked |
| `requests` | `GET /api/now/table/sc_req_item`, text query, `requested_for` or `opened_by` is (dynamic) Me | The user's own requested items |
| `incidents` | `GET /api/now/table/incident`, text query, `caller_id` or `opened_by` is (dynamic) Me | The user's own incidents |
| `pages` | none: bootstrap pages and menu items | Every word must appear in the label or its menu group |

A term shaped like a record number (`INC0010001`, `RITM0010003`, `KB0000028`) matches `numberSTARTSWITH` instead of the text index.

**Why not the other search APIs?** Checked read-only on a live instance:


- **AI Search** is off (`glide.ais.enabled = false`).
- The **Knowledge REST API** (`/api/sn_km_api/knowledge/…`) isn't installed (400).
- The **Global Search REST API** (`/api/now/globalsearch/search`) works, but it took about 2.4 s per call and searches admin-configured table groups (every task, people), which suits agents better than a portal typeahead.

The sources above answer in about 100 ms each and run in parallel. Swapping a source for AI Search later is a change in `sources.ts` only.

## `utilities:app/search`

| Export | What |
|---|---|
| `useSearch(term, { sources?, limit?, targets?, enabled?, menus? })` | Typeahead over several sources: `{ groups, hits, isFetching, ready, term }`. Remote sources need 2+ characters. Each source is cached per term in the page query cache and keeps its previous hits while the next term loads. Debounce the term yourself (`useDebouncedValue` from `utilities:app/graphql`) |
| `useSearchSource(source, term, { pageSize?, targets?, enabled?, menus? })` | One source with paging (TanStack infinite query of `{ hits, total }`), for "Load more" |
| `usePageEntries(menus = ['primary', 'account'])` | Searchable destinations: menu items (with their group label), then pages no menu item opens |
| `useRecentSearches(max = 6)` | `{ items, add, remove, clear }`, stored in `localStorage` under `x_312987_portal.search.recent.<user>` and synced across tabs |
| `searchSource`, `searchPages` | The plain fetchers |
| `hitLinkProps`, `openHit`, `resultsLinkProps` | Link props and navigation for hits and the results page (`q` `term=…&source=…`) |
| `Highlight` | Wraps the term's words in `<mark>` |
| `SEARCH_SOURCES`, `DEFAULT_SOURCES`, `normalizeSources`, `ME_DYNAMIC`, `SEARCH_KEY` | Source definitions, the "Me" dynamic filter, and the query-key prefix |
| `catalogHit`, `knowledgeHit`, `requestHit`, `incidentHit`, `catalogIcon`, `pictureUrl`, `cleanText`, `textCondition`, `queryTerm`, `getWithTotal` | Mappers and helpers (`getWithTotal` reads `X-Total-Count`) |

A hit is `{ id, source, title, subtitle?, meta?, state?, number?, icon?, image?, link: { to, q?, table?, sysId?, query?, href? } }`. `targets` (`{ catalogPage, kbPage, recordPage }`) decides where hits open.

## `components:app/search-box`

The search combobox (Service Portal's typeahead, Next Experience's `sn-search-combobox`).

```tsx
import { SearchBox } from 'components:app/search-box'
<SearchBox size="lg" resultsPage="search" targets={{ catalogPage: 'catalog', kbPage: 'kb', recordPage: 'form' }} suggestions={['VPN']} />
```

| Prop | Meaning |
|---|---|
| `size` | `default` (36px) or `lg` (56px hero box with a Search button) |
| `sources`, `limit`, `targets` | Passed to `useSearch` (`limit` = hits per group, default 4) |
| `resultsPage` | Enter / "Search everything" / "See all" open it with `q` `term` (and `source`); `''` = none |
| `onSubmit(term)` | Replaces the results-page navigation |
| `suggestions` | "Popular searches" in the empty dropdown |
| `shortcut` | `/` focuses the box from anywhere (default on for `lg`) |
| `defaultValue`, `autoFocus`, `placeholder`, `showButton`, `aria-label`, `className` | |

Keyboard and ARIA follow the WAI-ARIA combobox pattern: the input has `role="combobox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant`, and options sit in labelled groups. ↑ and ↓ move through all groups and wrap; Home and End jump; Enter opens the active option, or the results page when none is active. Escape closes the list, then clears the text; Tab closes. An empty box lists recent searches (each removable, plus Clear) and suggestions. The list renders in the top layer (`app/combobox`'s `Popup`), so the banner and cards never clip it.

Also exported: `SearchHitRow` (one result row with highlight, number, state pill or meta), `HitMedia` (picture or tinted icon tile) and `SOURCE_TINT`.

## `components:app/highlighted-value`

A status-like value as a pill or dot (`now-highlighted-value`): `<HighlightedValue label="In Progress" />`. Props: `label`, `value`, `field`, `tone` (overrides the derived one), `variant` (`pill` default, or `dot`), `size` (`sm`, `default`), `title`, `className`. `toneFor(label, { field, value })` derives the tone:

- priority, urgency, impact and severity go by value;
- everything else goes by keywords in the label: rejected → danger; closed or cancelled → neutral; resolved, approved or complete → success; on hold, waiting, pending or requested → warning; in progress or work → progress; new or open → info.

Tones use theme tokens where they exist (primary, destructive, muted), plus emerald, amber and sky with dark variants. Exports: `HighlightedValue`, `toneFor`, `TONE_PILL`, `TONE_DOT`; type `HighlightTone` (`neutral`, `info`, `progress`, `warning`, `success`, `danger`). The platform's `sys_ux_highlighted_value_config` colours aren't read yet.

## Widgets

| Widget | Options | Reusable exports |
|---|---|---|
| `app/hero-search` | `placement` (`banner`: into the app sub-header banner's `below` slot, inline when the layout has none; `inline`), `placeholder`, `sources`, `resultsPage`, `catalogPage`, `kbPage`, `recordPage`, `suggestions` (chips under the box and in the dropdown), `showChips` | |
| `app/search-results` | `resultsPage`, `sources`, `catalogPage`, `kbPage`, `recordPage`, `pageSize` (10), `perSource` (4), `suggestions` | |
| `app/my-items` | `title`, `description`, `sources` (`requests`, `incidents`, `approvals`), `limit` (5), `recordPage`, `listPage`, `catalogPage`, `live` | `useMyItems(kind, { limit, live, enabled })`, `MY_ITEM_KINDS`, `relativeTime` |
| `app/kb-articles` | `title`, `modes` (`popular`, `recent`, `featured`), `limit` (6), `knowledgeBase`, `kbPage` (KB home), `articlePage`, `categoryPage`, `showCategories`, `categoriesLimit`, `compact` | `topCategories`; data from `utilities:app/knowledge`, rows from `app/kb-article-list` |
| `app/catalog-tiles` | `title`, `description`, `mode` (`popular`, `items`, `category`), `items`, `exclude`, `category`, `limit` (8), `days` (365), `columns`, `catalogPage` | `useCatalogItemsById`, `useCategoryItems`, `CatalogTile` |
| `app/quick-links` | `variant` (`tiles`, `cta`, `list`), `title`, `description`, `items`, `menu` (take the items from a portal menu), `columns` | `useRecordCount(table, query, { enabled? })` |
| `app/announcements` | `types` (`widget`, `banner`, `any`), `limit` | `useAnnouncements`, `useDismissedAnnouncements` |

Behaviour notes:

- **My items:**
  - Tabs with live counts. Requests show the item's stage (e.g. "Waiting for Approval"), incidents their state, approvals the approved record.
  - Rows open the record form page. "View all" opens the list page with the same "Me" query the menu uses, so the menu item highlights.
  - Each kind watches its filter over AMB (`useRecordWatch`, with the user's sys_id as a literal) and refetches when a matching record changes.
  - The list keeps a full page's height, so switching tabs never makes the card jump.
- **Knowledge:** the KB pages (home, article, category, search) are described in [Knowledge base](knowledge.md). Knowledge hits open `kb/article`; the knowledge group's **See all** opens `kb/search` when the targets name `kbSearchPage` (the `kbSearchPage` option on `app/hero-search` and `app/search-results`). `targets.kb` limits the knowledge source to one KB; the source skips expired articles. The results page reads `q=…` as well as `term=…`.
- **Catalog tiles:**
  - `popular` counts requests per item over the last `days` (365) in the widget's server script. Those are aggregate counts with scope rights, never record data.
  - Each item is then loaded through the catalog API as the user, so user criteria decide what shows. `items` fill up to `limit`; `exclude` hides items.
  - Tiles show the picture or an icon picked from the item's name and category, the category, two lines of description, the price ("No charge" otherwise), and Request → the catalog page with `q` `item=<sys_id>`.
- **Quick links:** `countTable` / `countQuery` add a count badge, e.g. the "My approvals" tile shows `3 pending`.
- **Announcements:**
  - The platform's `announcement` table, filtered on the client to the from/to window, the user's roles and the consumer type. Urgent display styles use the destructive tone.
  - Dismissal follows the record's dismiss option: for the session (`sessionStorage`), for good (`localStorage`, `x_312987_portal.announcements.dismissed`), or not at all.
  - Portal targeting (`m2m_announcement_portal`) isn't applied. Users the table's ACL denies see nothing.

## The sp home page

Seeded in `scripts/seed/seed-template.js` (`prune: true` deactivates the old demo cards):

1. The app-shell **banner** sub-header ("How can we help?") with `app/hero-search` in its `below` slot and popular-search chips.
2. `app/announcements` (nothing when there are none).
3. `app/quick-links` tiles: Report an issue (the Report Outage record producer), Request something, Knowledge, My approvals (with a pending count).
4. A 12-track `app/grid`: `app/my-items` (span 7) and `app/kb-articles` (span 5), stacked on tablet and mobile. Both fill the row's height.
5. `app/catalog-tiles`: most requested, filled with featured items.
6. `app/quick-links` `cta`: "Can't find what you need?".

Pages added with it: `search` (`app/search-results`) and `kb` (since the knowledge wave: `app/kb-home`, plus `kb/article`, `kb/category` and `kb/search`). The primary menu's **Service desk** group lists Home, My requests, My incidents, My approvals, My tasks and My surveys (the last two only for users who have some: a menu condition), Knowledge and Catalog. The "My …" items open the generic `list` page with explicit record params and a title (see [Menus: explicit record params](../concepts/menus.md#explicit-record-params)). The generic Record list and Record form moved to the Components group.

## Related

- [Menus](../concepts/menus.md)
- [Layouts (banner sub-header)](../concepts/layouts.md)
- [Host kit](../runtime-api/host-kit.md)
- [Live updates](../runtime-api/live-updates.md)
