---
title: Docs and collections
description: Docs collections, the docs widgets that show them, the collection switcher, and Studio's Docs activity for writing pages and sections.
section: Studio
order: 5
tags: [studio, docs, collections, markdown, editor]
---

# Docs and collections

React Portal's docs portal (`/site/docs`) renders Markdown pages stored on the instance. Pages belong to a **docs collection**, so one instance can host several independent guides, and any portal can show one or more of them.

## The data model

| Table | What it holds |
|---|---|
| `x_312987_portal_doc_collection` | A collection: `key` (unique, used in settings and URLs), `title`, `description`, `icon`, `active` |
| `x_312987_portal_doc_section` | A sidebar section: `collection`, `slug` (unique per collection), `title`, `order`, `icon`, `active` |
| `x_312987_portal_doc` | A page: `doc_section`, `path` (unique per collection), `title`, `markdown` and the derived fields (headings, search text, hashes) |

- A page's collection comes through its section. The page's `collection` column is kept in step by the business rule "RP: Doc page collection from section", and the database index on (`collection`, `path`) keeps paths unique per collection.
- Logged-in users read active rows of all three tables. React Portal admins write them, and Studio writes through the Studio API.
- Pages and sections are deactivated, never deleted. A deactivated section hides its pages.
- React Portal's own guide is the collection **`react-portal`**. It comes from `docs/guide` in the repository (see [Docs pages](../internals/release-workflow.md#docs-pages)). Other collections live on the instance only.

> **Note:** A page still carries the legacy strings `section`, `section_slug` and `section_order`. They are part of the page's content hash (so existing hashes never changed) and mean "the section as of the page's last content write". Read `doc_section`.

## Portals and collections

A portal lists its collections in `settings.docsCollections`, as an array of keys. Edit it in Studio under **Portal settings ▸ Docs collections**.

- The **first** entry is the portal's default. One collection is a list of one.
- When the setting is empty, the docs widgets show `react-portal`.
- Several portals may share a collection.

The current collection travels in the URL as the q key `c`. It's left out for the portal's default, so every older docs link still works:

```text
/x/312987/portal/site/docs/params/page-id/concepts%2Flayouts               the default collection
/x/312987/portal/site/handbook/params/page-id/setup/q/c%3Dtest-guide         another collection
```

- `c` is honoured only when the portal lists that collection. Otherwise the default shows.
- A heading anchor is `h` in the same q (`q/c%3Dtest-guide%26h%3Dinstall`).
- Every docs widget also takes an optional `collection` option. It forces that collection, whatever the URL says.

## The docs widgets

| Component | Collection behaviour |
|---|---|
| `app/docs-sidebar` | Sidebar for the current collection. `headerSwitcher` picks what sits under the search: `portal` (default: the `switcher` option's portal and page jumps), `collections` (the collection switcher) or `none` |
| `app/docs-page`, `app/docs-header` | Current collection; links keep `c` |
| `components:app/docs-search` | Searches the current collection. When the portal has several, an **All collections** toggle searches all of them, and results name their collection |
| `components:app/docs-collection-switcher` | The portal's collections, with title, icon and description. Picking one opens its first page. Renders nothing with one collection |
| `utilities:app/docs` | The data and routing hooks below |

Reusable exports in `utilities:app/docs`:
- `useDocsCollection(override?)` → `{ key, keys, defaultKey, isDefault, q }`. Spread `q` (`{ c }`, or `{}` for the default) into links so they stay in the collection.
- `useDocsCollections(override?)` → `{ collections, current, currentKey, keys, isLoading, switchTo(key) }`, for building your own switcher.
- `portalCollections(portal)` and `collectionQ(key, defaultKey)`.
- `useDocsNav(c?)`, `useDoc(path, c?)`, `usePrefetchDoc(c?)` and `useDocsSearchIndex(enabled, keys?)` take an optional collection key.

```tsx
import { useDocsCollections } from 'utilities:app/docs';

function CollectionTabs() {
    const { collections, currentKey, switchTo } = useDocsCollections();
    return collections.map((c) => (
        <button key={c.key} aria-pressed={c.key === currentKey} onClick={() => switchTo(c.key)}>
            {c.title}
        </button>
    ));
}
```

## The Docs activity

Studio's **Docs** activity edits one collection at a time.

- **Collection picker:** at the top of the tree. It shows the key, the page count and the portals that show the collection. The **+** button creates a collection (title, key, description). The key can't change afterwards.
- **Sections are rows.** **New section**, **Rename** and **Move up / down** each edit section rows only, never every page. Deactivating a section hides it and its pages, and it's listed under **Deactivated** for reactivation.
- **Pages:** new page, drag to reorder or move between sections, deactivate. There's the Markdown and Visual editors, the live preview, and the link picker, as before. The section select moves the page to the end of another section, or into a new one.
- **Badges:** `new` (created in Studio, not in the repo yet) and `edited` (edited since the last seed) on pages and sections.

For `react-portal`, the repository stays canonical. The seed keeps what you edit here, and `npm run docs:pull` writes it back. Other collections have no repository copy. They exist only on the instance.

**Deep links:** `/x/312987/portal/studio/params/view/docs/id/<collection>:<path>`. A bare path is `react-portal`, so links from before collections keep working.

| Opens | URL |
|---|---|
| A page of the guide | `/params/view/docs/id/studio%2Foverview` |
| A page of another collection | `/params/view/docs/id/test-guide%3Asetup` |
| A collection (no page open) | `/params/view/docs/id/test-guide%3A` |
| A heading | add `/q/anchor%3D<heading id>` |
