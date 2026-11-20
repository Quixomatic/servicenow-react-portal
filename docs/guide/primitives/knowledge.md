---
title: Knowledge base
description: The KB home, article reading page, category browsing and KB search; utilities:app/knowledge (hooks, permissions, feedback, view counting) and the KB record primitives.
section: Primitives and utilities
order: 13
tags: [knowledge, kb, article, search, feedback, kb_feedback, kb_use, user-criteria, toc]
---

# Knowledge base

The knowledge experience is four pages built from small reusable records. Every piece also works on its own on any page, and its logic is exported.

```text
widgets      app/kb-home   app/kb-article   app/kb-category   app/kb-search   app/kb-articles (home card)
                  │              │                 │                │
primitives   app/kb-article-list  app/kb-article-view  app/kb-toc (on app/toc)  app/kb-feedback  app/kb-category-tree
                  │              (+ app/attachment-list, app/search-box)
utilities    utilities:app/knowledge  (data, permissions, TOC, feedback, view counting, print / share)
host kit     components:rich-text (sanitiser), components:dialog, components:tooltip, components:card …
```

## Pages (sp portal)

| Route | Widget | URL state |
|---|---|---|
| `kb` | `app/hero-search` (banner, knowledge only) + `app/kb-home` | none. Old links with a `sys_id` or `q category=` are forwarded to the article / category page |
| `kb/article` | `app/kb-article` | `sys_id` |
| `kb/category` | `app/kb-category` | `q`: `kb`, `category`, `sort`, `page`, `all=0` (subcategories off) |
| `kb/search` | `app/kb-search` | `q`: `term`, `kb`, `category`, `type`, `sort`, `page` |

Separate pages (rather than one page with modes) let a designer compose each one, and every state is in the URL, so Back, refresh and shared links work. The primary menu's **Knowledge** item opens `kb` and, matching by prefix, stays active on all four.

The homepage hero search, `app/search-results` and the knowledge card on the home page open articles on `kb/article`; the knowledge group's **See all** (dropdown) and **Search in Knowledge** (results page) open `kb/search` (`targets.kbSearchPage` / the `kbSearchPage` option).

## Permissions: what the platform enforces

Everything is read **as the user** (Table API and Aggregate API in the user's session). Checked on `<instance>`:

| Table | Read ACL | Effect |
|---|---|---|
| `kb_knowledge_base` | `KBScopedKnowledgeSNC.canReadKnowledgeBase` | The KB's **can read** (`kb_uc_can_read_mtom`) and **cannot read** (`kb_uc_cannot_read_mtom`) user criteria. `glide.knowman.block_access_with_no_user_criteria` applies |
| `kb_category` | follows the category's KB | Categories of unreadable KBs don't come back |
| `kb_knowledge` | `KBScopedKnowledgeSNC.canReadArticle` | The KB's criteria, plus the article's `can_read_user_criteria` / `cannot_read_user_criteria` when `glide.knowman.apply_article_read_criteria` is on (it's off on `<instance>`, and no article uses them) |

Impersonating sample users (read-only exec) confirmed it: users of an ACME company see IT, Test and Knowledge (33 published articles, 37 categories); a user with no company and no roles sees only Test and Knowledge, 0 published articles and 6 categories. So no `sn_uc.UserCriteriaLoader` evaluation is needed on our side.

Row ACLs filter rows **after** the query, so `X-Total-Count` would still count unreadable rows. Every article query therefore carries `kb_knowledge_baseIN<the user's readable KBs>` (from `useKnowledgeBases`): totals, paging and facet counts stay exact.

**Published only:** normal lists and search use `workflow_state=published ^ active=true ^ (valid_to empty or ≥ today)`. Opening a draft, retired or expired article by `sys_id` works only for users the ACL still lets read it (authors, KB managers, admins); they see a "not visible to readers" notice. Views of such articles aren't counted.

## View counting (the platform's way)

On a view the platform does two things (its Contextual Search and AI Search Assist widgets, `register_kb_view`), and `app/kb-article`'s `server.js` does the same:

1. `new global.KBViewModel().increaseKBView(gr)` → `gr.incrementViewCount()` (`sys_view_count`; that field's write ACL is `nobody`, and `incrementViewCount` itself is fenced from scoped code, but the global Script Include may call it), or the `knowledge.view` event when `glide.knowman.async_view_update` is on.
2. A `kb_use` row (article, user, `viewed`, `session_id`). The platform writes it from the `kb.view` event's **Knowledge View** script action, but our scope can't queue that global event ("Access to event 'kb.view' from scope … has been refused"), and `KBViewModel._logPageView` called from our scope queues it malformed. So `server.js` inserts the same row itself, with the scope's rights, as the platform's **KB Article Page** widget does. Users can't create `kb_use` rows directly (create needs `knowledge_admin`).

The article is read with `GlideRecordSecure` first, so only readers count, and only published, unexpired articles. The client calls it once per article per mount (`useRecordArticleView`). Any other widget can count views with `recordArticleView(server, sysId)` if its server script handles `input.kbAction === 'view'` the same way (the snippet is in `utilities:app/knowledge`'s header).

## Feedback (`kb_feedback`)

The KM portal's widgets call `KBPortalService.saveUsefulWithParams` / `saveStarRatingWithParams` / `kbWriteCommentWithParams`. Those check the `glide.knowman.show_*` properties and their `.roles`, then insert a `kb_feedback` row with `GlideRecordSecure`. We do the same insert through the Table API as the user, so the same create ACL (the user must be able to read the article) and the same business rules run:

- **Set SessionID and User for Flag** fills `session_id` and `user`;
- **Calculate Article Rating** and **Populate Helpful Count** update the article's `rating` and `helpful_count`;
- **Set Flagged Status** sets `kb_knowledge.flagged`;
- **Knowledge Feedback Task Creation** opens a feedback task for "not helpful", low ratings and flags (with the comment).

| Control | Row written | Shown when |
|---|---|---|
| Was this helpful? Yes / No | `useful = yes / no` (No sends the optional comment, and a reason when `…enable_actionable_feedback_for_helpful` is on, in the same row) | `show_rating_options` and `show_yn_rating` (+ roles), KB `disable_mark_as_helpful` off |
| Star rating 1–5 | `rating` | `show_rating_options` and `show_star_rating` (+ roles), KB `disable_rating` off |
| Flag article | `flagged = true`, `comments` (required), `reason` when `…enable_actionable_feedback_for_flag` is on | `show_flag` (+ roles: `itil, knowledge, knowledge_admin` here), KB and article `disable_suggesting` off |

Like `KBViewModel.createOrUpdateLastFeedback`, a second vote or rating in the same browser session **updates** the row it wrote (the creator may update their own feedback) instead of adding another. The helpful share ("82% of 11 readers") comes from `kb_feedback` grouped by `useful`; the average comes from the article's `rating`.

The properties reach the client through the portal's `settings.exposedProperties` (the sp portal lists them). Where a property isn't exposed, the platform's default applies.

## `utilities:app/knowledge`

### Hooks

| Hook | Returns |
|---|---|
| `useKnowledgeBases({ ids?, includeEmpty? })` | `{ data, all, byId, readableIds, isLoading, ready }`: readable, active KBs with published article counts, in the platform's order. Empty KBs are left out (`glide.knowman.show_only_populated`) unless `includeEmpty` |
| `useKbCategories({ ids? })` | `{ tree: { byKb, byId }, kbs, isLoading }`: the category tree; each node has `own` and `count` (own + descendants), `depth`, `children` |
| `useKbArticles({ kb, category, deep, types, sort, limit, page, featured, exclude, term, withText, knowledgeBases })` | `{ articles, total, pages, isLoading, isFetching }` |
| `useKbSearch({ term, kb, category, types, sort, page, pageSize })` | `{ articles (with excerpts), total, pages, facets: { kb, category, type } }`. Each facet is counted with the other filters but not its own |
| `useKbArticle(sysId)` | The article (`KbArticle`), `null` when missing or unreadable |
| `useRelatedArticles(article, { limit })` | Text-index matches on the title's keywords, the article itself excluded |
| `useArticleToc(html, { title })` | `{ html, headings }`: sanitised HTML with heading ids (`kb-<slug>`) and the TOC (the two highest heading levels present) |
| `useTocSpy(rootRef, ids, offset?)` | The heading being read (scroll position of the nearest scroller, shadow DOM safe) |
| `useArticleFeedback(sysId)` | `{ mine, stats, vote(value, { comments, reason }), rate(n), flag(comment, reason), pending, error }` |
| `useKbFeedbackConfig(kb, article)` | `{ helpful, rating, flag, flagReasons, helpfulReasons }` from the properties, roles and KB / article switches |
| `useRecordArticleView(server, sysId)` | Counts one view per article per mount |
| `useKbProperties()` | The exposed `glide.knowman.*` values (`KB_PROPERTIES`) |

### Functions

| Group | Exports |
|---|---|
| Fetchers | `fetchKnowledgeBases`, `fetchCategoryTree`, `fetchArticles`, `fetchFacets`, `fetchArticle`, `fetchFeedbackStats`, `createFeedback`, `updateFeedback`, `recordArticleView` |
| Queries | `publishedCondition()`, `articleCondition(query)`, `categoryWithDescendants`, `categoryPath`, `KB_SORTS` (relevance, views, updated, published, rating, title) |
| Text | `prepareArticleHtml`, `slugify`, `readingMinutes` (≈ 230 words a minute), `articleText`, `excerpt(text, term)`, `keywords(title)`, `formatKbDate(value, { relative })` |
| Navigation | `kbLinks({ home, article, category, search })` → `<Link>` props for every KB page; `scrollToHeading`, `scrollParent` |
| Actions | `printArticle(article)` (a clean print window: the article alone, print typography), `shareArticle` (Web Share API, else copy), `copyText`, `canShare`, `articleUrl` |

**Search:** the platform text index (`123TEXTQUERY321`, relevance-ranked; `KB0000028`-shaped terms match the number), as `utilities:app/search`'s knowledge source does. AI Search is off and the Knowledge REST API isn't installed on `<instance>`.

**Featured** follows the KM portal's Featured widget (`KBPortalService.getFeaturedArticles`): articles whose meta keywords contain `glide.knowman.default_keyword` (`homepage`). `kb_knowledge` has no `featured` field.

## Record primitives

| Record | Exports |
|---|---|
| `app/kb-article-view` | `KbArticleHeader` (breadcrumb Knowledge › KB › category path › number, title, state notice, meta, actions slot), `KbArticleBody` (reading typography `rp-kb-prose`: 72ch measure, 1rem / 1.75, headings with scroll margin, lists, tables in a scroll frame with zebra rows, code, quotes, images that open a zoom dialog; light and dark), `KbArticleMeta`, `KbBreadcrumb`, `KbAuthorAvatar`, `KbArticleSkeleton`, `KbArticleUnavailable` |
| `app/kb-toc` | `KbToc` (`rail` beside the article; `collapsible`: the compact bar for narrow layouts), `tocItems(headings)`: the article's headings on `app/toc` |
| `app/toc` | Generic, used by the KB and docs pages. `Toc` (`items` `{ depth, text, id }`, `container` and `root` as element or getter, `offset`, `onSelect`, `variant` `rail` / `compact`, `title`, `footer`, `maxHeight`), `TocList`, `TocProgress`, `useTocActive(items, { container, root, offset })` → `{ active, current }`, `scrollToTocItem`, `findHeading`, `scrollParentOf`. After fumadocs' TOC: a 1px track at x 8 / 16 / 24 by relative depth with curved bends, a primary segment that slides (clip-path) over **every section in view**, a dot riding the track (offset-path), muted items that turn primary when active, a list with faded edges that keeps the active item in view. The compact bar shows a progress ring and crossfades "On this page" to the current heading. Headings are found in `root` (or the TOC's own root node), never through `document`; clicks smooth-scroll the container to `offset` + 12px and focus the heading |
| `app/kb-feedback` | `KbFeedback`, `KbFlagButton`, `KbFlagDialog`, `StarRatingInput` (radio group: arrows, Home, End), `StarRatingDisplay` |
| `app/kb-category-tree` | `KbCategoryTree` (expand / collapse, counts, the active category's ancestors open), `KbSubcategoryGrid` |
| `app/kb-article-list` | `KbArticleList`, `KbArticleRow` (`rows`: title and excerpt with highlighted terms, KB · category · views · updated; `compact`), `KbPager` (numbered links), `KbSortSelect`, `KbArticleListSkeleton`, `pageWindow` |

## Widgets and options

| Widget | Options |
|---|---|
| `app/kb-home` | `knowledgeBases`, `showSearch`, `searchPlaceholder`, `suggestions`, `showBases`, `showFeatured`, `showPopular`, `showRecent`, `showCategories`, `limit` (6), `articlePage`, `categoryPage`, `searchPage` |
| `app/kb-article` | `knowledgeBases`, `showToc`, `attachments` (`auto`: the article's **Display attachments**, as the platform; `always`; `never`), `showFeedback`, `showRelated`, `showMoreInCategory`, `relatedLimit` (5), `countViews`, `homePage`, `categoryPage`, `searchPage`, `articlePage`. Server mode `on-demand` (view counting) |
| `app/kb-category` | `knowledgeBases`, `pageSize` (15), `sort` (`views`), `showTree`, `showSubcategories`, `homePage`, `articlePage`, `searchPage` |
| `app/kb-search` | `knowledgeBases`, `pageSize` (10), `categoryLimit` (8), `suggestions`, `homePage`, `articlePage`, `categoryPage` |
| `app/kb-articles` | Home card: `title`, `modes` (`popular`, `recent`, `featured`), `limit`, `knowledgeBase`, `kbPage` (KB home), `articlePage`, `categoryPage`, `showCategories`, `categoriesLimit`, `compact` |

Layouts follow the widget's own width (container queries), not the viewport:

- **Article:** at 980px and wider, the article and a sticky **On this page** rail (15.5rem); narrower, one column with the contents as a disclosure above the body. Related articles and **More in <category>** sit side by side from 760px.
- **Category and search:** the tree / facets column appears from 860px; below it, search shows a **Filters** button.

## Users who can't read anything

- When the Aggregate API refuses the user (403 for some roleless users), KB counts fall back to the Table API's `X-Total-Count` per KB; category trees and tiles show without numbers instead of disappearing; "Browse by topic" chips and the helpful share hide.
- A user whose readable KBs have no published articles sees "No articles are available to you" with **Search the portal** and **Home**. Lists, search and categories show their own empty states; no hook waits forever on an error.

## Not done yet

- Article comments (the platform's `kb_feedback` comment thread), contribute and edit flows, article templates, subscriptions, versions (no versioning plugin on `<instance>`), translations.
- KB search suggestions from `ts_query_kb` and search analytics (`search_id` on feedback and views).

## Related

- [Home page and search](home-and-search.md)
- [Attachments](attachments.md)
- [User criteria](../concepts/user-criteria.md)
- [Host kit: rich text](../runtime-api/host-kit.md#rich-text)
- [Menus](../concepts/menus.md)
