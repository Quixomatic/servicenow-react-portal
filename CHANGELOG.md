# Changelog

All notable changes to React Portal are documented here.

## [1.18.0] - 2026-11-20

Quick utilities: TurboForge's tfQuickUtils ported into React Portal, ACL-safe by default.

### Added
- **`$sp.quick` (QuickUtils):** a typed port of tfQuickUtils for component server scripts (`src/server/lib/quick-utils.ts`), covering all 30 functions.
  - **`getUniqueValues`:** one GlideAggregate query. 25 ms vs 758 ms for a GlideRecord loop on incident.category; 15 ms vs 3.7 s on task.sys_class_name.
  - Also field, template and schema helpers, role and group checks, and `markdownToHtml`.
- **ACL-checked by default in `$sp.quick`:**
  - record data is filtered by the user's row and field ACLs (per-value GlideRecordSecure probes for `getUniqueValues`);
  - queries that can't be vetted fail closed;
  - Markdown is HTML-escaped and unsafe URLs are dropped.
  - `getUniqueValuesUnchecked` is the documented scope-rights exception.
- **Script Include `x_312987_portal.QuickUtils`:** a `package_private` bridge for classic scripts in the scope. `new QuickUtils()` uses scope rights; `new QuickUtils({ secure: true })` checks ACLs. It shares `ReactPortal.MODULE_ROOT`.
- **Runtime Tests:** 2 new checks (33 in total).
- **Docs:** a "Quick utilities" section in `server-api/sp-api.md` and a QuickUtils section in `server-api/script-include.md`.

### Fixed (vs tfQuickUtils)
- Markdown images rendered as `!<a…>`.
- `truncateText` dropped a character at exactly `max`.
- `convertToUSD` returned `$NaN` for non-numbers.
- `parseFieldAttributes` lost values containing `=`.
- camelCase `compileMeta` keys didn't match.
- `dateDifference` failed on date-times.
- `getCompiledURI` didn't escape the display value and broke with custom domains.
- Dot-walk schema helpers failed on empty records.

### Notes
- The ACL path hasn't been tested yet as a real roleless user.
- `.plans/portal-view-rules.md` holds the spike results and the design for portal-keyed view rules, which compose with the built-in `uiView` through `_query` / `$$parent` in one request. Not built yet.

## [1.17.0] - 2026-11-20

The knowledge base, a docs portal built in React Portal, a refreshed guide, form view
resolution with Workspace view rules, and fixes from the first roleless-customer test.

### Added: knowledge base
- **Pages on `utilities:app/knowledge`:** `kb` (home), `kb/article`, `kb/category`, `kb/search`.
  - KB cards, featured / most viewed / recently updated lists, and category trees with counts.
  - Featured follows the KM portal convention (meta keyword `homepage`).
- **Article reading page:**
  - a 72ch measure with tuned typography in light and dark;
  - a fumadocs-style sticky "On this page" with scroll-spy (a compact bar on narrow layouts);
  - breadcrumbs, reading time, views, print / copy link / share, image zoom;
  - attachments, related articles and "More in category".
- **Feedback written the platform way** (`kb_feedback` as the user): Was this helpful?, star rating, flag with reason, gated by the `glide.knowman.*` properties.
- **View counting** through `KBViewModel.increaseKBView` plus a `kb_use` row (the `kb.view` event is refused from app scope, so it isn't used).
- **KB search:** text index, facets (KB, category, type), highlighted excerpts, sort and paging. The hero search and search results link into it, and the results page accepts `q=`.
- **Permissions:** the platform's KB ACLs (can-read / cannot-read user criteria) apply to every read. Totals stay exact, and zero-access users get clear empty states.
- **New generic `components:app/toc`:** fumadocs' track with curved bends, a sliding active segment over every section in view, a dot riding the track, fade masks and smooth scroll, with rail and compact variants. Plus KB primitives `kb-article-view`, `kb-toc`, `kb-feedback`, `kb-category-tree` and `kb-article-list`.
- **Breaking:** `app/knowledge` became `utilities:app/knowledge`.

### Added: docs portal
- **`/site/docs`** renders `docs/guide` with fumadocs' docs layout and UX:
  - a sidebar with sections, tinted icon tiles, a switcher and a collapse button;
  - the article with breadcrumb, description and previous/next;
  - the floating TOC (`components:app/toc`);
  - a mobile top bar, drawer and TOC bar.

  It has its own `docs` theme, starting as a copy of `sp-light`.
- **New table `x_312987_portal_doc`** (read for logged-in users, admin writes), plus a diff-based docs step in `npm run seed` (`--docs`, `--docs-all`, `--no-docs`). Pages that leave the guide are deactivated, never deleted.
- **`utilities:app/markdown`:** GFM straight to React elements (vendored marked lexer; no HTML strings).
- **`utilities:app/code-highlight`:** a dependency-free highlighter.
- **`utilities:app/docs`:** data, search, routing and heading hooks. Client-side search (Ctrl/⌘+K or `/`) with heading deep links.
- **`rp-embed` fenced blocks** render allow-listed widgets as live examples.

### Added: form view resolution
- **Order:** URL `view` → widget option `view` (`lockView` puts it first and hides the switcher) → the user's remembered view → Workspace view rules (portal `settings.viewRuleConfigId`) → the portal's default views (`settings.formViews`) → Default.
- **Named views are checked before they're forced.** An unknown one shows "View `x` not found, showing <view>", using the view's label.
- **The view switcher gains Automatic** (back to rule resolution); picking Default really forces Default.
- **Studio** Portal settings ▸ Form views: a view-rule picker and default views.
- **Lists:** Workspace has no list view rules (documented); lists use the resolved view as given.
- **Not yet decided:** no rules are configured on any portal yet, so forms behave as before.

### Changed: docs
- **The guide is refreshed for v1.12–v1.16:**
  - every "In progress" marker verified and rewritten;
  - new "What's new" and Dialogs pages, and a Seeding section in release-workflow;
  - the catalog split into its own nav section;
  - 0 broken links or anchors.

### Fixed (roleless-customer test)
- **Server-script errors** return a generic "The server script failed" plus a reference to anyone below designer or developer. The execution log keeps the details.
- **Widget error placeholders and the page error view** show plain sentences and a reference to non-authors.
- **The Diagnostics pill** shows only to admin, designer or developer roles, in mock mode, or with `?rpdiag=1`.
- **sp demo menu groups** (Components, More) show only to Studio roles. A 404 page no longer shows a "Service desk / Home" breadcrumb.
- **Announcements** are read server-side with Service Portal's rules (active, dates, roles), so customers can see them.
- **Runtime Tests:** the record-touch test needs the developer role.
- **Unreadable records** show "This record doesn't exist or you don't have access to it."
- **Toasts** decode HTML-escaped platform messages (`&#39;`) to plain text.
- **"RP: Validate placement"** always allows deactivating a placement, even when its component changed kind (the seed's prune was blocked).
- **The seed** skips half-built component folders with a warning instead of failing.

### Notes
- **UX route ACL `x.312987.portal.*`** (UI Builder auto-created, requiring `canvas_user`) was switched to the `user_is_authenticated` security attribute on the instance, by hand. It isn't in Fluent yet.
- **AMB:** the platform accepts record-watch subscriptions to unreadable records and sends metadata only (number, changed field names, who), never values. Our code never renders that metadata, and the docs are corrected.
- **Test user** `rp.customer` is inactive. Test orders REQ0010005 and REQ0010006 were kept.

## [1.16.0] - 2026-11-20

Related lists, attachments and the activity stream; a real Service Portal home with search and a
user-centred menu; and a seeding and reprocessing overhaul (portal reprocess ~40× faster,
diff-based `npm run seed`).

### Added: related lists
- **`app/related-list`** (one related list of any record) and **`app/related-lists`** (tabs, stacked or single), on the platform's own `formLayout.relatedLists` and `getListLayout` calls.
  - Reference, many-to-many and scripted relationships.
  - Counts, lazy loading, omit-if-empty, personalisation per list, live refresh.
  - Hooks: `useRelatedLists`, `useRelatedList`.
- **Record forms show related lists:** as extra tabs in tabs mode, or as collapsible sections below a stacked form. RecordForm option `relatedLists` (`auto` / `tabs` / `stacked` / `off`).
- **Actions:** New (child with the parent preset); Add / Edit… / Remove for many-to-many.
- **`g_form`:** `showRelatedList` / `hideRelatedList` / `showRelatedLists` / `hideRelatedLists` / `getRelatedListNames` now work.
- **New `app/related-lists-card` widget**, with demos on the sp Lists page.

### Added: attachments (functionality first; presentation undecided)
- **`utilities:app/attachments`:** Workspace's attachment query plus the Attachment API.
  - Hooks for list, permissions, uploads with progress / cancel / retry, and optimistic rename / delete.
  - Extension, size and name checks; headless drop and paste hooks; live updates over AMB.
  - New records attach to the sys_id the form reserves.
- **Primitives:** `app/attachment-dropzone`, `app/attachment-list` (list / grid / chips, thumbnails, image preview, `renderItem`), `app/attachment-panel`, and `app/attachment-field` for the `file_attachment` / `user_image` types.
- **RecordForm option `attachments`:** `off` (default), `below`, or a `header` toggle. `g_form.enableAttachments` / `disableAttachments` work.
- **New `app/attachments-card` widget,** and an sp Attachments page comparing three presentations.
- **Shared uploads:** HTML-field images and catalog attachment variables upload through the shared utility.

### Added: activity stream and journals (presentation undecided)
- **`utilities:app/activity`** on the platform's own calls (`GlideActivity getEvents`, `putJournal`), live over AMB `/activity/events/<sys_id>`.
- **Primitives:**
  - `app/activity-stream`: accessible feed, filters, day groups, field changes old → new, attachments, emails; plus `RecordActivity` and the chat-style `ActivityConversation`.
  - `app/journal-composer`: work notes / comments, Ctrl/⌘+Enter, form-bound mode.
  - `app/journal-field`: replaces the textarea for journal fields; a form save posts the entry.
- **New `app/activity-card` widget** (timeline / conversation / compact), and an sp Activity page comparing the presentations.
- **RecordForm option `activity`:** `off` (default), `notes` or `below`.

### Added: Service Portal home, search and menu
- **The sp home, rebuilt from reusable widgets:**
  - a hero search in the banner;
  - announcements;
  - quick-link tiles with live counts;
  - My active items (requests, incidents, approvals; live);
  - Knowledge (popular, latest, topics);
  - popular catalog tiles;
  - a "Can't find what you need?" band.
- **Search on the platform's own search, as the user** (catalog search API plus the text index):
  - `utilities:app/search`;
  - the `app/search-box` combobox (grouped typeahead, recent searches, `/` shortcut);
  - an `app/search-results` page with tabs per source.
- **Knowledge page `app/knowledge`:** browse topics and most-viewed articles, or read an article through rich text, with related articles.
- **Host kit:** `components:skeleton`, `components:empty`, `components:kbd`. New primitive `app/highlighted-value`.
- **Menu items carry list parameters** (`params_json.record`: table, sys_id, view, query), and the active item is matched on them.
  - The sp Service desk menu: My requests, My incidents, My approvals, My tasks and My surveys (only for users who have some), Knowledge, Catalog.
  - The breadcrumb and list header show the item's title.
- **Banner sub-header:** gains a full-width row for the hero search.

### Changed: seeding and reprocessing
- **Portal reprocess ~40× faster.** `assembleManifest` now caches registry lookups for the duration of one call (`withRegistryCache`).
  - sp went from ~60 s to ~1.4 s, and its queries from 55,662 to 546; app from ~22 s to ~1 s.
  - Manifests are byte-identical to before. Every seed, Studio save and designer save benefits.
- **New `npm run seed`:** diff-based.
  - It reads the instance's components and extra files, and seeds only the ones that differ.
  - It runs the portals step only when the template changed (marker property `x_312987_portal.seed.template_hash`).
  - It splits payloads under the instance's ~1.5 MB exec limit, reprocesses once at the end, and waits on each run's `[seed] done` line, so runs never stack.
  - Flags: `--dry-run`, `--all`, `--only`, `--portals`, `--reprocess`.
- **Batch mode for every seed:**
  - compile-on-save and per-write portal reprocess are suppressed for the run;
  - each changed component compiles once, in dependency order;
  - each portal reprocesses once at the end (only writing when the manifest hash changed);
  - per-phase timings and per-table write counts in the log;
  - stale components are reported, never deleted.
- **`build-seed.mjs`:** `--only`, `--part i/n`, `--portals`. A shared `seed-lib.mjs` is used by both tools.
- **Seed upserts** compare values ignoring platform formatting (booleans, JSON key order, CRLF), so unchanged records aren't rewritten.
- **`reprocessForOwner`** respects the batch flag. **Placement instance CSS** always compiles; inside a batch only the portal reprocess is deferred.

### Fixed
- **Placement instance CSS** wasn't compiled under the first version of the batch seed (grid spans and block options were missing).
- **`app/field-dialog` / `g_modal.showFields`:** reference and glide_list fields now search.

### Notes
- Runtime Tests: 31/31.
- Catalog coverage: 173 match / 34 partial / 158 none; high usefulness 93 / 11 / **0** (no high-usefulness gaps left).
- Not yet tested as a non-admin (roleless) user.

## [1.15.0] - 2026-11-19

Cart and checkout on the platform's Service Catalog cart, and the variable editor now saves.

### Added
- **Cart and checkout** on the platform's Service Catalog cart API, the same cart Service Portal and Employee Center use.
  - Cart hooks in `utilities:app/catalog`: `useCart({ live })`, `useCartCount`, `useAddToCart`, `useUpdateCartItem`, `useRemoveCartItem`, `useEmptyCart`, `useCheckout`, `useCartRequestedFor`, `useItemOrderOptions`, plus the fetchers and `cartErrorMessage`.
  - One shared query key keeps every cart view in step.
- **`app/catalog-item`:**
  - Add to cart beside Order now, with the same validation and onSubmit scripts, and a "View cart" toast;
  - honours `no_cart` / `no_cart_v2` / `no_order_now` / `no_order`; option `cart: false`.
- **New `app/cart`:**
  - lines with the platform's variable summary, delivery time, quantity, remove and prices (recurring subtotals included);
  - cart-level requested for, delegation-checked per item;
  - Empty cart with a confirm dialog;
  - one-step checkout showing the REQ number and a link, plus a review step for two-step instances or `review: 'always'`.
- **New `app/cart-button`:** a header cart with a count badge and a summary popover, live through record watch, in the new `header-actions` slot of `app/app-header`.
- **sp and app:** a `cart` page and the header cart button; `glide.sc.checkout.twostep` is exposed to the portal.
- **`app/requested-for-field`:** `itemId` accepts a list of item ids (a cart), and the message names the items that fail.
- **Docs:** new guide page `primitives/cart.md`.

### Fixed
- **The variable editor saves.** It posts the record's Save UI action in Workspace's variable shape: `variables.<name>` flagged as a variable, with the question id and type; multi-row sets also carry `containerType` and their columns.
  - A hard guard refuses any multi-row save without column data, because the platform would delete every row.
  - Verified from the editor UI on a test request item (a text variable and a multi-row cell, both restored).
- **Cart quantity changes** write `sc_cart_item.quantity` through the Table API. The REST `PUT /cart/{id}` replaces a line's variables, so a quantity-only update had wiped them.
- **After checkout** the old cart's requested-for query is dropped instead of refetched, which had logged a harmless 404.

### Notes
- **Live test orders (kept):**
  - REQ0010003, placed from the cart: RITM0010003 Standard Laptop and RITM0010004 Bulk Mobile Devices with one multi-row row;
  - REQ0010004 / RITM0010005, through Order now with item-level requested for.
- **Not built:**
  - Save as draft (the platform has no API to list or resume drafts);
  - editing a line's variables from the cart;
  - delivery address and special instructions.
- **Two-step review:** built, but not verified live (this instance is one-step).
- **Demo catalog item** (custom variable and set-level row scripts) is still waiting on a decision.

## [1.14.0] - 2026-11-19

Catalog wave 2 (multi-row rows with real form logic, requested-for and delegation, custom
variables, a variable editor) and rich text (TipTap) for HTML fields and variables.

### Added: catalog
- **Multi-row variable set rows run real form logic.** Each row editor, inline or dialog, is its own `g_form` scope (`createRowScope` / `useRowScope`):
  - the set's catalog UI policies and client scripts run in the row;
  - onSubmit can block the row save;
  - `g_service_catalog.parent` reaches the item form.
- **Multi-row editing:**
  - inline row editing by keyboard (Enter opens, Enter saves, Escape cancels, focus returns);
  - per-row prices and a rows total, and the platform price call now counts the rows;
  - Remove all, with a confirm dialog.
- **Requested for:**
  - new `app/requested-for-field` (delegation check on every pick; `useRequestedFor`, `useDelegationCheck`);
  - variable type 31 uses it;
  - `catalog-item` gains an item-level "Requested for", sent as `sysparm_requested_for`. It keeps the previous person after an ineligible pick. Option `requestedFor: 'hidden'` turns it off.
- **Custom variables:** the attribute `rp_component=app/<key>` (with optional `rp_options={…}`) renders one of our components as a real input, given the value, `onChange`, the field and the catalog form. Registry utility `utilities:app/custom-variables`; demo primitive `app/star-rating-variable`.
- **New `app/variable-editor`:** a record's variables (e.g. a RITM's), read-only or editable, from Workspace's form-layout data, with the record's catalog policies and scripts. Saving goes through the record's Save UI action. Demo page: sp `variable-editor`.
- **Quantity** is now the combobox Select.

### Added: rich text
- **Host kit `components:rich-text-editor`:** a shadcn-styled TipTap 3 editor with an HTML value.
  - Toolbar: text styles, bold, italic, underline, strikethrough, code, lists, quote, link and image dialogs, undo/redo.
  - Keyboard: one Tab stop, Alt+F10 to reach the toolbar, Ctrl/⌘+K for links.
  - Read-only and disabled modes, and a headless `useRichTextEditor` hook.
- **Bundle:** TipTap/ProseMirror load as a lazy `portal-rte.jsdbx` chunk (131 KB gzip) only when an editor mounts. The main bundle grows by 9.8 KB gzip. TipTap is vendored (`pnpm run vendor:rte`) because the CLI's babel rejects its `@jsxImportSource` pragmas.
- **Host kit `components:rich-text`:** a sanitised renderer plus reusable `sanitizeHtml`:
  - allow-listed tags and attributes; every `on*` handler, script and frame is removed;
  - safe URL schemes only, and `rel="noopener noreferrer"` on links;
  - also exports `htmlToText`, `isHtmlEmpty` and `findUnsupportedHtml`.

  `app/variable`'s sanitiser now delegates to it.
- **`app/html-field`:** html and translated_html fields, and catalog variable type 23, on the editor through `field-control`.
  - It commits only real edits, and warns before editing would drop formatting it can't keep.
  - Images uploaded to a saved record's attachments.
- **Lists:** HTML columns show plain text, and edit inline in a rich-text popover.

### Fixed
- **Delegation "false" answers were treated as eligible** (since 1.7).
- **Reference search inside multi-row rows returned nothing:** row lookups now use the platform's `<item>$<set>` record id (since 1.7).

### Notes
- Catalog coverage: 154 match / 40 partial / 171 none (high usefulness 84 / 16 / 4); 31 of 32 variable types match.
- **Waiting on James:**
  - a demo catalog item (our scope can't create catalog records, so the choice is a one-off global script or Fluent demo data), and with it live checks of the custom variable and set-level row client scripts;
  - one real order-now;
  - one variable-editor save.

  Set-level row UI policies are verified on an out-of-box item.
- **Prepared but not run:** `scripts/seed/catalog-demo-global.js` (option A).

## [1.13.0] - 2026-11-19

User criteria for portals, pages and menu items; related lists on every table; dialogs and
`g_modal.showFields`; new field types and a calendar; embeds under layouts and lazy embeds;
a Studio Dependencies panel; per-kind Studio files; and permanent documentation.

### Added: user criteria
- **"Available for" / "Not available for" on portals, pages and menu items**, as m2m tables following the catalog, Knowledge and Employee Center pattern:
  - `x_312987_portal_portal_uc` / `_portal_uc_no`, `page_uc` / `page_uc_no`, `item_uc` / `item_uc_no`;
  - 24 ACLs and related lists on the forms.
- **Rules:**
  - an empty "Available for" means everyone, and "Not available for" always wins;
  - criteria AND with the existing role checks, which are unchanged;
  - studio users and admins bypass;
  - no widget-level criteria.
- **Enforcement:**
  - the portal check covers bootstrap, resolve, the executor, properties and assets;
  - the bootstrap page list is filtered per user, and a hidden page returns the usual page-not-found;
  - menu page items drop for hidden pages, and menu items can carry their own criteria;
  - placements, embeds and layout roots on hidden pages are refused.
- **Cost:** one `sn_uc.UserCriteriaLoader.getMatchingCriteria` call per request. Rows are read live, so the release manifest stays the same for every user.
- **Studio "View as user":** a user picker in the page designer and the Menus preview shows which pages and items a user's criteria hide (`GET /rp_studio/users`, `/portals/{id}/audience`).
- **Demo:** an sp "Agents only" page and an "Agent handbook" menu item, restricted to "Users with 'itil' role".

### Added: related lists everywhere
- Every classic form shows its children:
  - portal: pages, menus, placements, releases, criteria;
  - page: placements, menu items, criteria;
  - menu → items; menu item → child items and criteria;
  - component: source files, builds, imports, imported by, placements, pages and portals using it as a layout;
  - theme: portals, source files, builds;
  - build: assets, dependencies, imported by;
  - release → entries;
  - placement → child placements.
- 29 related lists with their own columns, plus "Imports" / "Imported by" relationships.

### Added: dialogs and form runtime
- **Host kit `components:dialog`** (shadcn on Base UI). On top of it:
  - `app/confirm-dialog`: `confirm` / `alert`, `useConfirm` / `useDialog`, and a dialog queue. It replaces `window.confirm`; the discard prompt is now "Keep editing / Discard".
  - `app/field-dialog`: a fields spec as a modal form (`showFields`, `useFieldsDialog`).
- **`g_modal.showFields`** resolves `{ updatedFields }`; `g_modal.confirm` / `alert` use the dialogs.
- **Multi-row variable sets:** the row editor uses `components:dialog`.
- **Forms:**
  - annotations (`app/form-annotation`);
  - 2-, 3- and 4-column split rows;
  - per-field "Changed by someone else" markers with Use theirs / Keep mine;
  - the chosen view is remembered per table in `x_312987_portal.form.<table>.view`;
  - `g_form.addDecoration` / `removeDecoration` with a FieldShell adornment slot.
- **Reusable:** `createGForm` / `attachGForm` put `g_form` on any form store; also `applyRemoteValues`, `useRememberedView`, `useCollapsedSections`, `usePresentationPreference`, `useOwnPreference` and `useFormTabState`.

### Added: fields
- **Host kit `components:calendar`:** an Intl-based grid with no date library. It uses the locale's week start, has month and year grids, and full keyboard support.
- **`app/date-field` / `app/datetime-field`:** typed entry in the user's ServiceNow format with lenient parsing, plus a calendar popover (Today, time box, zone, Done) and min/max.
- **`app/time-field`** (`glide_time`).
- **`app/conditions-field`:** the condition builder for the `conditions` type.
- **`app/table-name-field` / `app/field-name-field`.**
- **Phone:** E.164 with a country picker.
- **Currency:** the code picker is our combobox select.
- **`utilities:app/datetime`:** reusable zone, format, parse and calendar helpers.
- **Condition builder** rows adapt to their container width.
- **Field demo:** the new types, standalone and bound to real records.

### Added: embeds
- **Studio Dependencies panel:** imports (kind badges; widgets marked embeddable) and "Used by", each opening that component, plus an "Embedded by N components" badge. New endpoint `GET /rp_studio/components/{id}/dependencies`.
- **Lazy embeds:** the `lazy` prop (`true` or `{ rootMargin, height }`) defers initialize until the embed nears the viewport. New runtime hook `useInViewOnce`.
- **Embeds under layouts:** rooted at `layout:<sys_id>` and authorised against the page's effective layout (otherwise 404), with the same import-edge walk, option filtering, signed tokens and limits as placements. Layouts can have their own server script. Test page: sp `embeds/layout`.

### Added: Studio
- **Per-kind baseline files,** driven by the new property `x_312987_portal.studio.kind_files` (JSON, kind → files; built-in fallback):

  | Kind | Files |
  |---|---|
  | widget | `main.tsx`, `styles.css`, `server.js`, options |
  | layout | `main.tsx`, `styles.css`, `server.js`, `regions.json`, options |
  | block | `main.tsx`, `styles.css`, `regions.json`, options |
  | primitive | `main.tsx`, `styles.css` |
  | utility | `main.tsx` |

  - Extra source files work for every kind.
  - Legacy content in an unlisted file stays visible, flagged "Not used by \<kind\>", until emptied.
  - The rule is enforced on save, on check, by the compiler and by builds.
  - The New component dialog shows each kind's files and offers Primitive.
- **Landing page:** the 5 most recently opened components, aligned shortcut list, and the New component button no longer wraps.

### Added: documentation
- **`docs/guide/`:** 62 pages plus `_nav.json`, covering concepts, authoring, the client runtime API, the `$sp` server API, primitives, REST APIs, Studio, security, platform internals and reference. Written for a future docs portal.

### Notes
- Runtime Tests: 31/31 live (new: lazy embed, layout-rooted embed, another page's layout returns 404).
- Catalog coverage refreshed by the agents (`docs/primitives/catalog.*`).
- The docs pass found stale comments and unused properties: `build.retention_days`, `visibility_config_json`, the publisher role's "publish/rollback" wording. They're backlog cleanup.

## [1.12.0] - 2026-11-19

Record forms get collapsible sections, a tabbed mode and a proper page header. The app-shell
sub-header gains bar, banner and hidden variants. A compiler change fixes the recurring
`hidden sm:block` cascade bug at its root.

### Fixed
- **Tailwind variants no longer lose to other components' base utilities.**
  - Responsive and state variants (`sm:block`, `max-sm:flex`, `hover:`, `dark:`, `data-[…]:`, `group-*`, `@container`…) used to lose to `.hidden`, `.flex` or `.grid` emitted by a stylesheet loaded later on the page.
  - Every Tailwind sheet (component builds, placement classes, the host's framework CSS) now moves variant rules into a new `@layer rp-variants` after `utilities`. Layer order: `theme, base, components, utilities, rp-variants`.
  - Rules whose declarations are all `!important` stay in `utilities`, so important overrides behave as before.
  - Widget `styles.css` stays unlayered.
- **Removed** the temporary `max-sm:…!` workarounds from `app/app-subheader`.
- **Sticky save bar** was sized for the wrong card padding (8px too wide each side). It's gone in header modes, and correct in the fallback.

### Added
- **Collapsible form sections:**
  - new primitive `app/form-section`, built on the host kit's `components:collapsible`;
  - clear headings with dividers;
  - collapse state remembered per user and table (`x_312987_portal.form.<table>.collapsed`);
  - a collapsed section opens when a save finds fields to fix in it.
- **Tabbed form mode:** host kit `components:tabs` (shadcn on Base UI), plus the new primitive `app/form-tabs`, which owns the form behaviour.
  - An untitled first section (e.g. incident's main fields) always stays on top, never collapsible or a tab.
  - Tabs show error and required badges.
  - Validation and error-summary links switch to the right tab.
  - `tab=` is kept in `q` for Back and deep links.
  - The tab strip scrolls on its own on phones.
- **Form settings (cog) menu** with **View ▸** and **Layout ▸** (Stacked / Tabs) submenus. The user's choice is stored in `x_312987_portal.form.presentation`; we never write platform preferences.
- **Form header:**
  - the unsaved indicator (leftmost), UI actions, Discard/Save (Ctrl/⌘+S) and the cog live in the page header;
  - in a banner sub-header (the sp and app `form` pages), the full record header: back, table, large title, badges, short description;
  - compact in a bar sub-header;
  - without header slots, or with `headerPlacement: 'inline'`, the card's own header row;
  - on phones the UI actions move into More, and Save stays visible.
- **`g_form.setSectionDisplay` / `getSectionNames`** now work. A section hidden by script, or with every field hidden, disappears in both modes.
- **App-shell sub-header variants:** layout option `subheader`:
  - `bar` (unchanged);
  - `banner`: a hero band with `subheaderTitle` (default: page title), `subheaderSubtitle`, `subheaderIcon` and `subheaderTint` (`primary`, `chart-1…5`, `none`), aligned to the content width;
  - `hidden`: main reclaims the space, and `HeaderSlot` users fall back inline.

  It can be set portal-wide or per page, and the designer's layout-options forms edit it. Switching never remounts widgets.
- **`utilities:app/list-data`:** `fetchUserPreferenceValue` / `saveUserPreferenceValue`, limited to `x_312987_portal.*` names.
- **`app/record-form` option `presentation`** (`stacked` | `tabs`): a default only; the user's choice wins.

### Changed
- **Record form pages** (sp, app) use the portal content width (6xl) instead of full bleed, and the banner sub-header.
- **The demo "+ New"** shows only when the picker is on and no record is open.
- **Seed demo:** sp home uses a banner ("How can we help?"); Runtime Tests hides the sub-header.
- **Compiler `rp-server-compiler/5`** (`src/server/compiler/variant-layer.ts`); builds recompile. The host's `build:css` runs the same pass (`packages/portal-host/scripts/variant-layer.mjs`).

### Notes
- A variant in one sheet can still lose to a conflicting *variant* in a later sheet (e.g. `md:hidden` vs `sm:flex`). One sheet per portal stays on the backlog.
- Runtime Tests: 28/28 live. The Runtime Tests card's toast buttons still overflow sideways at 390px; this was already the case before this release.

## [1.11.0] - 2026-11-19

Service Portal on the app shell, generic list and form pages with explicit URL params, and a
refreshed catalog coverage map.

### Changed
- **The `sp` portal uses `app/app-shell`** (plain texture), in its own `sp-light` theme and brand:
  - a full-height collapsible sidebar (icon rail, Ctrl/⌘+B) with the header beside it, an inset main card, and the sub-header with slots;
  - the user account menu in the sidebar footer;
  - **no footer**;
  - a primary menu in three groups (Service desk / Components / More) with icons, and a new `account` menu.

  `sp-light` gains `sidebar-*` and `chart-1…5` tokens for light and dark.
- **Lists and forms navigate with explicit `table` / `sys-id` / `view` / `query` URL params** instead of packing them
  into `q`. Search, sort and page still ride in `q`, and older links that pack params into `q` still work.
- **The seed deactivates (never deletes)** menu items and portal placements it no longer defines.

### Added
- **sp `list` page** ("Record list", full bleed): a generic `list-view` for any table via URL params (default
  incident), with the toolbar in the sub-header slots, the table as the only scroller, and live updates.
- **`form` page on sp and app** ("Record form", full bleed). `RecordForm` gains `headerSlots`: title, number,
  badges and short description go left; UI actions (`UiActionBar maxButtons`), view switcher and New go right.
  - `record-form` options: `headerPlacement`, and `listPage` (a back-to-list button that carries the table).
  - The app portal gets a form page and a menu entry.
- **Widget options:**
  - `app-sidebar`: `brandIcon`, `logo`, `tints`, `footerNote`;
  - `app-header`: `tints`, `brand`;
  - `app-subheader`: wraps on narrow frames.
- **Docs:** `docs/primitives/catalog.json` / `catalog.md` coverage refreshed against what's built. Every entry has
  `ourMatch` / `ourComponent` / `coverageNotes`.

  | Tier | Match | Partial | None |
  |---|---|---|---|
  | All 365 | 127 | 62 | 176 |
  | High | 68 | 31 | 5 |

  New sections cover wave status and what's built.

### Notes
- **Root cause of the recurring `hidden sm:block` bug:** each widget's CSS carries its own Tailwind `@layer utilities`.
  Same-named layers merge, so a later widget's base utility (e.g. `.grid`) beats an earlier widget's responsive
  variant at equal specificity.
  - Temporary workaround: important variants (`max-sm:flex!`) in `app-subheader`.
  - The fix (variants in a later sub-layer) is next on the backlog.
- **Not honoured yet:** view rules. Workspace's form query ignores classic view rules, and Workspace view rules need a
  view-rule config id. It's on the backlog.
- **User criteria** are feasible: `sn_uc.UserCriteriaLoader` works in scope. On the backlog.

## [1.10.0] - 2026-11-19

A large feature release: lists, full record forms with the platform's form runtime, embedded widgets,
menus in Studio, standard URL params, and live record updates.

### Added: lists (primitives wave 3)
- **`utilities:app/list-data`:** list data through the platform's own calls, plus encoded queries as data.
  - `GlideListLayout_Query.getListLayout` returns rows, count and column metadata in one call.
  - `GlideConditionBuilder_Query` provides breadcrumbs and dot-walking.
  - `GlideListLayoutInline_Query` handles inline-edit ACLs and multi-row writes.
  - Personalization is saved as user preferences.
  - Encoded queries can be parsed and serialized: AND/OR, `^NQ`, ORDERBY, keywords, relative dates.
- **`components:app/condition-builder`:**
  - AND/OR and new-criteria groups, with operators per type;
  - a dot-walk field picker, 4 levels deep;
  - value editors from the field primitives;
  - breadcrumbs labelled by the platform's parser.
- **`components:app/data-table`:** built on TanStack Table and TanStack Virtual.
  - **Grid:** a real `role="grid"` with full keyboard support and aria-sort/rowcount/rowindex. Columns resize, and there are skeleton and empty states.
  - **Data:** server-side paging, sort, filter and search.
  - **Editing:** a right-click Show matching / Filter out menu, and inline edit gated by `list_edit` ACLs.
  - **Personalization:** a column chooser (order, visibility, widths, dot-walked columns), persisted per user.
  - **Options:** every feature can be switched off; `page`/`card`/`plain` variants; pagination or infinite scroll; related lists; bulk actions.
- **Widgets:**
  - `app/list-view`, a full-bleed page list. Its state lives in the URL and rows open the form page; `toolbarPlacement` can put the toolbar in the header.
  - `app/list-card`, a list you can drop in anywhere.
- **Host modules:** `utilities:react-table` and `utilities:react-virtual`.
- **`utilities:app/header-slots`:** `HeaderSlot` / `HeaderSlotOutlet` / `useHeaderSlot`. `app/app-subheader` has left/center/right outlets, and the full-bleed list puts its title, count and actions in them.

### Added: record forms and the form runtime (primitives wave 4)
- **`components:app/form` and the `app/record-form` widget:**
  - It renders the record's real form view through Workspace's `GlideViewQuery_Query.uiView` (layout, policies, scripts, UI actions, scratchpad).
  - Header, view switcher, sections and columns, an error summary, a sticky save bar (Ctrl/⌘+S), and a guard for unsaved changes.
  - Save and create go through the platform's Save UI action (`/api/now/ui/ui_action`), sending only the changed fields.
  - It reads `table` / `sys_id` / `view` from options, then the route, then the URL.
- **UI policies** on record forms and catalog items. They're evaluated in the browser, using the server's pre-evaluated terms; reverse-if-false, onLoad=false, run-scripts, and last-writer-wins precedence with scripts are all handled.
- **`utilities:app/gform`, a `g_form` compatibility layer** that runs existing client scripts unchanged:
  - onLoad/onChange/onSubmit in a sandbox with no window or document;
  - `g_user` and `g_scratchpad`;
  - GlideAjax through `/xmlhttp.do` and async GlideRecord;
  - `getMessage`, a basic `g_modal`, and `g_aw.openRecord`.
- **UI action bar:** client actions run through the shim and server actions through the platform; redirects stay in the portal.
- **Conflict check:** a "Changed by someone else" prompt (Reload / Overwrite).
- **Catalog:** catalog client scripts and UI policies run, and onSubmit can block an order.

### Added: embedded widgets
- **Embedding by import:** importing a widget record and rendering it in TSX (`<ServerClock embedKey options/>`) creates a real embedded instance with its own server script, options, on-load data and error boundary. `.Raw` opts out.
- **`$sp.getWidget(id, options, { key })`** builds a child model server-side, running the child's script nested.
- **Client APIs:** `useEmbeddedWidget`, `useGetWidget` / `usePortalUtils().getWidget` and `<Embed model>`.
- **Security:**
  - Only widgets the placed widget actually imports can run, authorized step by step; anything else returns 404.
  - Client options are filtered by the child's schema.
  - Server-only options need an HMAC-style signed token, bound to placement, path, options and user, with a 12-hour lifetime and a runtime-generated private secret.
  - Limits: depth 4, 50 embeds per initialize, 20 `getWidget` calls per instance.
- **Designer:** read-only embed markers on the canvas, rows in the outline, and an Embeds section in the properties panel.
- **Manifest version 4.**

### Added: menus in Studio
- **Seeded menu records:** sp, crm and app now use primary/footer/account menu records, including cross-portal route items (`params_json.portal`). `navigation_json` is kept only as a fallback.
- **Any Lucide icon renders:** `components:icon` loads the full sprite on demand (cached).
- **The Studio Menus activity:**
  - a live preview through the portal's real widgets, in sidebar, rail, header and footer modes;
  - "View as" by role;
  - a drag-and-drop tree, quick-add (including "All pages"), the item form with a Lucide icon picker, and the server's script errors shown inline;
  - undo/redo.
- **Studio scope banner:** "Switch to React Portal", with editing disabled while out of scope, and the current app and update set shown in the status bar.
- **Deep links:** `view=menus` and `id=<menu or item>` open the activity.

### Added: standard URL params
- **Host properties** `table`, `sysId`, `view` and `query`, matching optional `site` page params. They can also be packed inside `q`, and an explicit param wins.
- **`usePortalLocation()`** returns `table`, `sysId`, `view`, `query`, `qParams` and `params`; `<Link>` and `navigate()` accept them.
- **Server scripts get the URL context:** `$sp.getParameter` checks input, then route params, then URL params; new `$sp.getParameters()`.
- **UIB URL format:** one `params` segment with dash-cased names (`sys-id`), read directly from the URL. Optional params missing from the URL reset, which fixes stale state on Back.

### Added: live record updates (AMB)
- **Runtime:** `useRecordWatch`, `useAmbChannel` and `useAmbStatus` reuse the shell's AMB client (one socket), with shared, reference-counted subscriptions, reconnect refresh and a mock bus.
- **`live` option on `useRecord` and `useTableQuery`.**
- **Lists:** optional live refresh with a highlight on changed rows.
- **Forms:** a clean form refreshes silently; a dirty one shows a "Changed by someone else" banner.

### Changed
- **Breaking: `usePortalLocation().query`** is now the encoded-query string; the old q-keys object is `qParams`.
- **Overlay container:** dropdowns, popovers and tooltips now open inside host-created roots, such as the designer canvas and the menus preview.
- **`build-seed.mjs`** inserts sources with a function replacement, so `$'` in component code no longer corrupts the seed.

### Fixed
- Default imports of component records resolved to the namespace object (React #130).
- Incident list: a double scroll bar, the sub-header right slot rendering left-aligned, and an empty middle breadcrumb.

### Notes
- Runtime Tests: 28/28 live.
- Test records left on the instance: INC0020825 and INC0020831 ("safe to delete"; INC0020831 is the Runtime Tests watch target).
- Known follow-ups:
  - re-initialize on-load widgets when URL params change;
  - lists and form navigation should use explicit params instead of `q`;
  - the recurring `hidden sm:block` cascade problem inside widgets;
  - a Studio dependencies panel, lazy embeds, and embeds in layouts;
  - AMB non-admin filtering is untested;
  - the Studio URL sync depends on James's studio navigate mapping.

## [1.9.2] - 2026-11-19

A global helper app gets past scope fencing: server messages now behave exactly like Service Portal's.

### Added
- **React Portal Global Helpers** (`packages/global-helpers/`): a separate global-scope Fluent application
  (`sys_app` `e4be8f1e…`, built and installed from its own folder) with the Script Include
  `global.ReactPortalGlobal`:
  - `drainSessionMessages()`, `getImpersonatingUserName()`, `currentApplication()`, `version()`;
  - `getPreference()` (allowlisted) and `clearClientData()` (our keys only).

  It acts only on the current user's own session and preferences. Caller access is left unset (caller tracking blocks
  scoped callers); access is through a cross-scope privilege.
- **Cross-scope privilege** in the main app's Fluent (`src/fluent/security/cross-scope.now.ts`, adopting record
  `03bbad5f…`), so other instances get the grant on install.
- **`src/server/lib/global-helpers.ts`:** a bridge that imports `global` from `@servicenow/glide/global` (types in
  `@types/`) and returns null when the helper app isn't installed.

### Changed
- **Server messages are drained after every widget call, like Service Portal:** read, toasted and flushed. Repeated
  identical messages always show, and nothing is left as a banner on the next classic page. Without the helper
  app, the previous read-only behaviour remains.
- **Impersonation:** `useUser()` / `$sp.getUser()` gain `impersonatedBy`.
- **Designer and menu rejection messages** are drained instead of leaking as banners.
- **Session flags** are cleared through the helper, else blanked.
- **The version bump** includes `packages/global-helpers/package.json` (lockstep).

### Notes
- Inside scripted REST, global `gs.getInfoMessages()` reads empty while scoped reads see the queue, so the drain is
  a scoped read followed by the helper's flush.
- Release flow: also run `cd packages/global-helpers && now-sdk build && now-sdk install`.

## [1.9.1] - 2026-11-19

Server-script messages reach the portal.

### Added
- **Server messages become toasts.**
  - Any `gs.addInfoMessage` / `gs.addErrorMessage` a component's server script raises is read back after the
    script runs and returned to the client, as `meta.messages` on execute, `instances[id].messages` on
    initialize, or in the error details when the script fails. The portal shows each as a toast coloured by
    type.
  - New `$sp.addInfoMessage`, `addErrorMessage`, `addWarningMessage` and `addSuccessMessage`.
  - `gs` messages also stay queued for the next classic UI page, as usual: `gs.flushMessages()` is blocked in scope.
  - **Known limitation:** the session ignores a `gs` message identical to one still queued, so a repeated
    identical `gs.addInfoMessage` (e.g. from a business rule on every save) toasts only the first time until a
    classic page clears the queue. `$sp.add*Message` is unaffected (it never touches the session).
- **Runtime Tests:** "Server messages" and "Server error" buttons, which exercise server-raised toasts without
  breaking anything.

## [1.9.0] - 2026-11-19

The app shell. Layouts only place slots; header, sidebar and footer widgets own their look. Adds a
collapsible shadcn-style sidebar, layout options, navigation menus as records (backend), a
ChannelGuide-style Dashboard portal, server-error toasts, and staged/pinned server inputs.

### Added
- **Layout options:**
  - Layouts declare an options schema and defaults; the portal default lives in `settings.layoutOptions`, and pages
    override it with a new `layout_options_json`.
  - Bootstrap and resolve return the effective `layoutOptions`. Layouts receive an `options` prop and
    `useLayout()`, and option changes don't remount widgets.
  - The designer has a layout-options form in portal settings and a page-level "Portal default / Custom" override.
- **Slot-only layouts:**
  - Standard Layout (option `header: full | beside-sidebar`, `contentPadding`) and Centered Layout only place
    regions.
  - `site-header`, `nav-sidebar` and `site-footer` own their height, borders, width and styling.
- **Collapsible sidebar:**
  - `useSidebar()`: expanded/collapsed, persisted per portal, Ctrl/⌘+B, an overlay sheet on mobile (by frame
    width), and an `available` flag.
  - New registry modules `components:sidebar|sheet|tooltip|collapsible|icon`.
- **`useNavigation(key = 'primary')`:** items, `activePath` (breadcrumbs) and the active item. It reads menu records
  first, then the legacy `portal.navigation`.
- **Dashboard portal (`/site/app`)** in the style of the ChannelGuide dashboard:
  - new `app/app-shell` layout (inset main card, textured background, one shared header-band height);
  - `app/app-sidebar` (collapsible groups, icon rail, user menu), `app/app-header` (breadcrumbs, sidebar trigger)
    and `app/app-subheader`;
  - `app-neutral` theme.
- **Navigation menus (backend):**
  - `x_312987_portal_menu` (per portal, unique key) and `x_312987_portal_menu_item` (page / route / url / group /
    separator / dynamic; parent groups, icon, target, match, tooltip, roles, condition), with validation, a
    syntax check on scripts at save, and reprocessing.
  - Bootstrap `menus` is resolved per user: roles, conditions, page access, empty groups dropped.
  - `$sp.getMenu(key)`, `getMenus()`, `getMenuItem(id)`. Manifest version 3.
  - Studio APIs for menus, items (move, reorder, delete with lift/cascade) and icon search.
  - A Lucide icon-picker formatter on the classic menu-item form, using the full Lucide set served from
    `/rp/icons/lucide`.
- **Scope awareness:** `GET /rp_studio/context` returns the current application, whether it's in scope, and the
  update set. Studio writes reject with 409 `wrong_scope` when the current application isn't React Portal. (The
  rejection itself is not yet exercised live.)
- **Server errors reach the user:**
  - Action errors (`server.get/update/refresh`) toast automatically; opt out per call (`{ toast: false }`) or per
    widget (`useServer({ toastErrors: false })`).
  - On-load script errors show a banner above the widget.
  - Developers and admins see the message, script line and a reference ID; other users see a generic message
    plus the reference.
- **Staged and pinned server inputs:**
  - `server.setInputs()` / `setInput()` are sent with the next call, then cleared.
  - `server.pinInputs()` / `unpinInputs()` are sent with every call (function values are read at call time), and
    `useServer({ pinned })` pins reactive values.
  - Merge order: pinned → staged → the call's own input. `server.inputs`.
- **Studio `view` URL parameter** (`code` | `pages`), via a new `view` host property.
- **Runtime Tests:** two new checks (staged/pinned inputs; `update` sends no data), 18 in total.

### Changed
- **`server.update(input?)` sends inputs only.** The widget's data is never sent back to the server, and the server
  ignores client data: every action starts from empty `data`.
- **Toasts:** bottom-centre, with colours by type (success / error / warning / info) tinted from theme tokens in
  light and dark.
- **The seed** sets per-portal settings, layout and portal widgets (it no longer resets `settings_json`), and
  recompiles every component.
- **Compiler `rp-server-compiler/4`.**

### Fixed
- **Widget responsive utilities lost to the host's Tailwind** (`hidden md:block` stayed hidden). The host's
  framework CSS was an adopted stylesheet, which sorts after every widget `<style>`. It's now injected in the
  framework slot, before widget CSS.
- **Tailwind classes with `=` inside brackets were dropped** (`group-data-[collapsible=icon]:hidden`,
  `data-[side=left]:…`). The class extractor now splits only outside square brackets.
- **Menu condition evaluation** produced a trailing "SyntaxError" at the end of transactions for scripts that
  throw.

### Known gaps
- No Studio Menus editor yet; the designer's legacy navigation editor only understands `{label, page}`.
- Each portal's `navigation_json` hasn't been migrated to `primary` menu records yet.
- `components:icon` resolves a curated set, not every Lucide name.

## [1.8.0] - 2026-11-19

Content width: pages no longer stretch edge to edge. Each page picks a max width for its main
content, or full bleed, with a portal-wide default.

### Added
- **Page setting `content_width`:** Portal default (the default) / Full bleed / 7xl (80rem) / 6xl (72rem) /
  5xl (64rem) / 4xl (56rem) / 3xl (48rem). It's on the page form and in the page designer's page panel.
- **Portal default `settings.contentWidth`,** set under "Default content width" in the designer's portal
  settings. If it's unset, 7xl.
- **Resolve returns `page.contentWidth`,** the effective width: page, then portal, then 7xl.
- **The host exposes it as `--rp-content-max`** around the layout (a `display: contents` wrapper, so layouts
  don't remount), in the portal and the designer canvas. Any layout can use it.

### Changed
- **Standard Layout** centres its main content and caps it at `--rp-content-max`.
- **Centered Layout** uses it as its column width when one is set, else its own 760px.

## [1.7.0] - 2026-11-19

Primitives, wave 2: catalog variables. Catalog items and record producers render from the
platform's own catalog GraphQL, reuse the field primitives for their variables, and submit through
the platform's order-now and submit-producer APIs.

### Added
- **`utilities:app/catalog`:**
  - Fetchers:
    - `fetchCatalogItem`: one GraphQL query, `AppCatalogView_Query.itemViewLayout`. It returns header, pricing, variables, the layout tree, defaults and a draft record for attachments.
    - `fetchItemPrice`: `/api/sn_sc/servicecatalog/items/{id}/price`.
    - `submitCatalogItem`: `order_now` / `submit_producer`.
    - `fetchMrvsRowForm`: the platform's MRVS row-form call.
    - `validateVariableRegex`, `checkDelegation`, `uploadVariableAttachment`.
  - Hooks: `useCatalogItem`, `useItemPrice`, `useMrvsRowForm`.
- **`components:app/variable`:**
  - `variableSpec()` maps all 32 `item_option_new` types onto field metadata and renders them through
    `app/field-control`, so variables reuse the field primitives.
  - `createCatalogForm` / `useCatalogForm` / `CatalogFormProvider`:
    - built on the form store, with fields named `variables.<name>`;
    - any method accepts `<name>`, `IO:<sys_id>` or the sys_id, so g_form-style catalog scripts can plug in later;
    - `serializeVariables()`.
  - Renders labels, sanitised rich-text labels, breaks, and attachment and macro variables.
- **`components:app/attachment-variable`:** an accessible drop zone with extension and size checks.
- **`components:app/mrvs`:** a multi-row variable set grid.
  - Add, edit and remove rows in a native modal dialog with its own form store per row, using the platform's row
    form metadata.
  - Max-row and unique-column rules; the value is the platform's MRVS JSON.
- **`components:app/variable-container`:** `<VariableLayout>` renders containers as titled column sections,
  checkbox groups as named fieldsets, variable sets, and MRVS.
- **Widgets:**
  - `app/catalog-item`: header with picture, description and price; variables; quantity.
    - Submitting validates first: an error summary takes focus and links to each field.
    - Then order now or submit producer; it shows the number with a link and offers "Start another".
  - `app/catalog-picker`: featured items and live search.
- **The `sp` page `catalog`:** the picker and item in a ⅓ + ⅔ Columns block, with six demo items: zoom webinar,
  bulk mobile devices (MRVS), parking sticker, Standard Laptop, Firewall Rule Change, and Report Outage (record
  producer).

### Changed
- **Required-field errors** now appear after Validate/Submit, or after the user clears a value they changed. They
  no longer appear just from tabbing through an empty field, which shifted the layout under the pointer.

### Notes
- Verified live on dev189813:
  - all six items render;
  - list collector and reference search; the requested-for qualifier is applied by the server;
  - MRVS add/edit/remove; price follows quantity;
  - the error summary; keyboard use; light and dark.
- Two real test submissions were made and kept: **REQ0010002 / RITM0010002** (bulk mobile devices, with one MRVS
  row) and **INC0020811** (Report Outage).
- Not yet built:
  - catalog UI policies and client scripts (e.g. a field that should show only when a checkbox is ticked still
    shows);
  - delegation and requested-for in the UI; inline MRVS editing; MRVS row prices in the total.
  - Dependent variable choices and references inside MRVS rows are untested, because no demo item has them.
  - Cart, checkout and order guides stay in the backlog.

## [1.6.0] - 2026-11-19

Primitives, wave 1: a shared GraphQL utility, the `app/field` base, and 15 field primitives built on
it. They're all real component records that widgets import, and they bind to live ServiceNow
metadata, choices and reference search.

### Added
- **`utilities:app/graphql` (utility).**
  - `graphql()` sends `POST /api/now/graphql` with X-UserToken; also `gql`, `restGet`, `GraphQLError`.
  - TanStack Query hooks:
    - `useTableMeta` / `useFieldMeta`: `/api/now/ui/meta/{table}` (labels, types, choices, references, max lengths; cached 10 min).
    - `useFormBootstrap`: `GlideLayout_Query.formLayout` (values, display values, field states, sections).
    - `useChoices`: `choiceDataRetriever` with the unsaved dependent values.
    - `useReferenceSearch`: `referenceDataRetriever`, so the server applies the field's reference qualifier against the unsaved form state.
    - `useRecordValues` / `useReferenceDisplay`: `GlideRecord_Query`.
    - Plus `useGraphQL`, `useDebouncedValue` and `useGraphQLClient`.
- **`components:app/field` (primitive).**
  - `useField`: value + displayValue, staged/dirty/touched, mandatory/readOnly/visible/disabled, messages and
    validation, ids for accessibility. Precedence: explicit props → form overrides → server state → dictionary.
  - `FieldShell`: label, required marker, hint, polite live-region messages, an unsaved-changes marker, a
    selectable read-only view, horizontal/vertical layouts and a fieldset mode.
  - `FormProvider` / `useForm` and a form store with a `g_form`-style API (getValue/getDisplayValue/setValue,
    setMandatory/setReadOnly/setVisible/setDisabled/setLabel, field and form messages, isDirty, serialize,
    validate, reset, onChange), layered so a `g_form` shim can sit on top later.
  - A field-type registry: `registerFieldType`, `resolveFieldComponent`.
- **Field primitives:**
  - `app/combobox`: an accessible editable combobox plus a select-only Select. Popups render in the top layer,
    so they escape clipped cards.
  - String, textarea, number (integer and decimal, locale-aware, stepping), boolean (checkbox or switch), choice
    (select, radio or scale; dependent values), reference (recent picks, search, extra columns), list (chips).
  - Date and date/time (converted to the user's ServiceNow time zone, daylight-saving aware).
  - Email, URL, phone, password (show/hide, confirm), currency, duration.
  - `app/field-control` picks the right primitive from the dictionary type.
- **`app/field-demo` widget and an `sp` page `fields`:** every primitive standalone, and bound to a real incident
  in a form context.
- **Host:** `utilities:react-query` registered for utilities. Record imports load in parallel and evaluate in
  dependency order.
- **Seed:** `build-seed.mjs` orders component folders by their record imports, and the seed recompiles the
  import graph in dependency order, so one seed run builds everything.

### Notes
- Verified live on dev189813:
  - reference search returns real users;
  - subcategory follows the unsaved category;
  - "Assigned to" search is scoped to the unsaved assignment group;
  - keyboard use, validation with aria wiring, dirty/serialize/reset, read-only, light and dark.
- `useFormBootstrap` for a new record (`sysId = -1`) evaluates defaults, which reserves the next number (e.g. INC);
  it never refetches a new record in the background.
- Not yet built: HTML and journal fields (they fall back to textarea), attachment and time fields, a custom
  calendar popover, and saving from `useForm`.

## [1.5.0] - 2026-11-19

Blocks: page-structure components with drop zones (grids with subgrid, columns, sections and
more), per-instance styling compiled on the server, and the groundwork for primitives: a new
`primitive` kind and imports from one component record into another.

### Added
- **Blocks: a new component kind, `block`.** Page-structure building blocks placed on pages:
  - Each block declares its drop zones as data in `regions_json`: static names, or templates driven by the
    instance's options (`{ "repeat": "tracks", "name": "col-{n}" }`).
  - Instances nest through `placement.parent`, with `region` naming the drop zone, up to 6 levels deep.
  - Six seed blocks: `app/section`, `app/container`, `app/grid` (a real CSS grid; nested grids can use
    subgrid), `app/columns` (presets ½+½, ⅓+⅔, ⅔+⅓, ⅓×3, ¼×4, sidebar + main), `app/stack`, `app/split`.
  - New `sp` page `layouts` demonstrates them.
- **Per-instance styling.** Placements gain `layout_json` (span, start, order and self-alignment in the parent
  grid), `classes` (Tailwind) and a read-only `instance_css`. The server compiles instance CSS from:
  - the classes, through the server-side Tailwind compiler;
  - style tokens (padding, background, radius, shadow…, where theme colour names map to theme variables);
  - the grid layout;
  - block options annotated with `"x-css-var"` in the options schema.

  Every group supports `tablet` / `mobile` overrides, emitted as container queries against the page frame
  (`rp-page`), so the designer's device widths render exactly. The CSS recompiles from the designer, and from a
  business rule (`RP: Compile placement instance CSS`) when a placement is edited directly on the instance.
- **The page designer supports blocks:**
  - a Blocks group in the palette, with presets;
  - nested drop zones and an outline that shows the tree;
  - moving blocks with their subtrees;
  - Styling, Grid and Classes sections with base / tablet / mobile editing;
  - deleting a non-empty block asks whether to move its contents out or delete everything.
- **Runtime:** `useBlock()` returns `{ placementId, options, regions, rootProps }`, and `<Region>` inside a block
  renders that instance's children. Region gains `className` and `contents` (display: contents, so children are
  direct grid or flex items). Instance CSS is injected once per placement.
- **The `primitive` component kind:** reusable building blocks (fields, lists, forms) that widgets import and
  that are never placed on a page. Studio has a starter for new ones.
- **Imports between component records:**
  - `components:<ns>/<key>` reaches a primitive, widget or block; `utilities:<ns>/<key>` reaches a utility.
  - The compiler records these as component dependencies and fails clearly if the target is missing, the wrong
    kind, not compiled yet, or the component itself.
  - Compiled modules export every named export (`__rpExports`).
  - The manifest lists each component's transitive imports, dependencies first. The host loads and registers
    them before evaluating the component. Studio preview uses the same path.
  - Recompiling a primitive reprocesses every portal that uses it, directly or through imports.
- **Navigator:** Blocks, Primitives and Utilities modules.

### Fixed
- **Navigator filters weren't applied.** The Widgets, Layouts and Properties modules used the "List Filter" link
  type, which only pre-fills the condition builder. They're now filtered lists.
- **Widgets nested in blocks got no on-load data.** Batch initialize now includes placements inside blocks.

### Changed
- **Manifest version 2:** top-level region maps hold top-level placements only, and blocks carry their resolved
  drop zones and nested children. Placements carry `layout`, `classes` and `css`.
- **Compiler version `rp-server-compiler/3`:** builds recompile on their next compile.
- **Placement validation** accepts widgets and blocks, and checks a child's region against its parent block's
  resolved drop zones.

### Internal
- Docs: `docs/primitives/catalog.json` and `catalog.md`, a catalog of 333 Next Experience components plus 32
  catalog variable-type mappings with a primitives roadmap, committed separately.
- New server modules: `registry/block-regions.ts`, `design/instance-style.ts`, `lib/css-safe.ts` and
  `lib/session-flags.ts`. `lib/session-flags.ts` is lightweight, so business rules don't load the compiler.

## [1.4.0] - 2026-11-19

A drag-and-drop page designer in Portal Studio: lay out pages on a live canvas that renders the
real portal, backed by a new design API that edits pages and placements in place.

### Added
- **Page designer** (Studio activity bar → Pages; `packages/portal-host/src/studio/designer/`).
  - Left column: the portal picker, portal settings, the page list (create, delete, set as home page) and an
    outline of every region and its widgets.
  - Centre: a live canvas that renders the page through the real portal runtime: same router, layout, loader,
    theme and light/dark mode.
  - Right column: a widget palette with search and "+" to add, plus a properties panel.
  - Drag and drop with dnd-kit:
    - palette → region creates a placement;
    - placements move within and between regions, and between page and portal-wide scope;
    - the keyboard sensor supports Space, the arrow keys and Space again.
  - Undo and redo of every write (Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y), Delete to remove, Escape to deselect.
  - Desktop, tablet (820px) and mobile (390px) canvas widths, plus an interact/preview toggle.
- **Schema-driven widget options.** Components with an `options_schema_json` get a generated form in the
  properties panel (raw JSON as a fallback). The demo widgets now ship `options.schema.json`, which the seed
  generator maps to `options_schema_json`.
- **`PortalPreview`** (`src/portal/portal-preview.js`): the portal runtime driven by props instead of UI
  Builder, exposed through registry internals for the canvas.
- **Design API** (`src/server/design/design-service.ts`, new `rp_studio` routes):
  - `GET /design/{id}` (resolve a portal or page id), `GET /portals/{id}/design`, `GET /pages/{id}/design`;
  - `POST/PATCH/DELETE /placements[/{id}]`, `POST/PATCH/DELETE /pages[/{id}]`, `PATCH /portals/{id}`.
  - Placements are renumbered on move, and target regions are validated against the layout's `regions_json`
    before any write.
- **Session summaries:** `.claude/skills/session-summary` writes a dated summary to `.docs/summaries/` and
  refreshes the resume prompt's state block before a compaction.

### Changed
- **Batched reprocessing.** Designer writes set the `x_312987_portal.skip_reprocess` session flag, so the
  reprocess business rules skip and the portal's release is processed once per batch instead of once per
  record.
- **Standing rules moved from `CLAUDE.md` to Claude memories**; `CLAUDE.md` is removed.

### Fixed
- **Unstyled buttons in Studio previews.** Studio's `<button>` reset sat outside any cascade layer, so it beat
  Tailwind's layered utilities and stripped shadcn Button styling in the canvas and the component Preview tab.
  The resets now live in Tailwind's `base` layer. Previews also take the host's font instead of Studio's 13px
  chrome font (`src/studio/host-text.js`).

### Internal
- dnd-kit (`@dnd-kit/core`, `sortable`, `utilities`) added to the host. The mock runtime gained design data
  for local designer development (`?rpmock=1`).

## [1.3.1] - 2026-11-19

Two demo components that exercise the new runtime end to end, and a Tailwind extraction fix they
exposed.

### Added
- **Incident List** (`scripts/seed/components/incident-list/`): an on-load widget driven by `useServer`.
  Its IIFE server script uses `$sp` and `GlideRecordSecure` (platform ACLs apply) for filtering
  (Active / Assigned to me / Opened by me), search and "Assign to me"; the client uses `useUser`
  (greeting, `hasRole('itil')`), `useMessage`, `usePortalUtils` (toasts, `format`), shadcn Card, Badge,
  Button and DropdownMenu, and an extra file (`parts/IncidentRow.tsx`). New `sp` page `incidents`.
- **Runtime Tests** (`scripts/seed/components/runtime-tests/`): a live checklist for every
  `@portal/runtime` hook and the `$sp` helper (useUser, useTheme, usePortal, useMessage(s),
  useProperty(ies), useRecord, useTableQuery, format, fetchJson, server.get, on-load data) plus toast
  buttons. 16/16 pass on the instance. New `sp` page `tests`.
- **Demo property** `x_312987_portal.public.welcome`, readable from widgets via `useProperty`.

### Fixed
- **Tailwind arbitrary values were dropped.** The compiler's class extraction split on `(` and `,`, so
  classes like `grid-cols-[7rem_minmax(0,1fr)_auto]` or `bg-[rgb(1,2,3)]` never generated CSS. It now
  splits on whitespace and quotes only (plus JSX punctuation).
- **Compiler upgrades now rebuild components**: the compiler version (`rp-server-compiler/2`) is part
  of each build's input hash, so a compiler change marks builds out of date instead of keeping old output.

## [1.3.0] - 2026-11-18

Light/dark/system mode across portals and Studio, Service Portal-style server scripts with a `$sp`
helper, and spUtils-style client hooks.

### Added
- **Light / dark / system mode.** `useTheme()` in `@portal/runtime` with the next-themes API
  (`theme`, `setTheme`, `resolvedTheme`, `systemTheme`, `themes`): defaults to system and follows
  `prefers-color-scheme` live, persists in localStorage (`rp-theme`) and syncs across tabs, and is
  applied as `.dark` on the host before first paint (mirrored to overlays; `color-scheme` set).
  next-themes itself can't be used: it targets `<html>`, which our shadow root never sees.
- **Per-mode theme tokens.** `tokens.json` accepts `{ "light": {…}, "dark": {…} }` (flat objects still
  work); bootstrap returns `tokensDark`, applied on `:host(.dark)`; themes without a dark set fall back
  to the shadcn default dark palette.
- **Mode toggles.** The seeded Site Header has a Light / Dark / System menu (`parts/ModeToggle.tsx`,
  shadcn's ModeToggle pattern), and Studio's title bar has the same toggle sharing one preference
  (CodeMirror switches VS Code light/dark). Both demo portals now ship light and dark palettes.
- **`$sp` / `$rp` in server scripts.** Injected into every component server script, modeled on Service
  Portal: `getValue`, `getDisplayValue`, `getParameter`, `getRecord` (ACL-checked), `getField(s)`,
  `canReadRecord`, `getProperty`, `getUser`, `hasRole`, `getPortal`, `getPage`, `getComponent`,
  `translate`, `log`.
- **Service Portal-style IIFE server scripts.** An empty `server.js` opens as SP's
  `(function () { /* populate the 'data' object */ })()` template; the seed uses it.
- **Current user in bootstrap** (`user`: sys_id, name, email, title, avatar, roles, time zone, language).
- **Runtime endpoints** `GET /properties` (only properties a portal exposes via
  `settings.exposedProperties` or under `x_312987_portal.public.`; everything else is null) and
  `POST /messages` (gs.getMessage in the user's language).
- **spUtils-style hooks** in `@portal/runtime`: `useUser` (`hasRole`, `hasAnyRole`), `useProperty(ies)`,
  `useMessage(s)` (batched per tick), `usePortalUtils` (`addInfoMessage` / `addErrorMessage` /
  `addTrivialMessage` toasts via shadcn Sonner, `format`, `getMessage`, `scrollTo`, `fetchJson`,
  `refresh`, `getHeaders`), `useServer`, `useRecord` and `useTableQuery` (Table API + TanStack Query,
  platform ACLs apply). The host README documents every runtime export.

### Fixed
- **Server-script errors are reported.** GlideScopedEvaluator swallows errors, so a broken script used to
  return partial `data`. The compiled server script now captures the error and execute/initialize
  return `script_error` with the author's line number (also logged to the execution log).
- **Bootstrap 500**: `gs.getImpersonatingUserName()` is blocked in scoped apps; impersonation detection
  now degrades gracefully.

### Internal
- Host bundle ~781 KB (+Sonner); Studio chunk ~1.0 MB.

## [1.2.0] - 2026-11-18

Portal Studio: a VS Code-style editor for components and themes, running in the host on a
`studio` page, with save compiling on the server and live problems while you type.

### Added
- **Portal Studio (host `mode = studio`).** A workbench in `packages/portal-host/src/studio/`:
  - title bar with a searchable component/theme switcher, New component, Save (Ctrl+S) and a
    build badge with compile time
  - an explorer showing each component's virtual files (Client, Styles, Server, Options schema,
    Defaults, Regions) and its extra files as a folder tree, with new file/folder, rename and delete
  - CodeMirror 6 editors in split editor groups (allotment): preview and pinned tabs, drag tabs
    between groups or onto an edge to split, Open to the Side, Ctrl+\ split, quick open (Ctrl+P)
  - VS Code light/dark themes, a Problems panel driven by the server's check endpoint, an
    Output log, properties for component metadata, a status bar
  - a Preview that renders the latest build through the host runtime, unsaved-change guards,
    a 409 conflict banner (reload or overwrite), and per-component tab/layout persistence
  - routing through the host's `recordId` (the studio page's optional `id` URL parameter)
- **Studio ships as its own chunk** (`portal-studio.jsdbx`, ~1 MB): portal pages don't download the
  editor; the portal bundle is unchanged.
- **More virtual files.** Components now expose `options.schema.json`, `options.defaults.json` and
  (layouts) `regions.json`; themes expose `tokens.json`. JSON is pretty-printed for editing,
  validated on save, and an unchanged placeholder (`{}` / `[]`) saves as a no-op.
- **`POST /components/{id}/check`** (Studio API): dry-run compile of unsaved buffers merged over the
  saved project; returns errors with file/line/column (and invalid JSON) without writing anything.
- **`POST /components`** (Studio API): create a widget, layout or utility with a starter client
  script, compiled on create.

### Changed
- **Save compiles synchronously.** `POST /components/{id}/save` (and themes) returns the finished
  compile result, so Studio shows errors straight from the save response. Compile-on-save business
  rules stand down during a Studio save so a multi-file save compiles once.
- **REST handlers may return a Promise** (`src/server/api/http.ts`); it settles before the request's
  script finishes, so the response body is still written.

### Fixed
- **Scoped `GlideSession` has no `clearClientData`**: the compile-suppression flag is cleared with
  `putClientData(key, '')`.

### UI Builder setup
- Page `studio`, no required URL parameters, optional `id`. React Portal Host with Mode = `studio`
  and Record id bound to `@context.props.id`; Portal navigate → Link to destination → `studio` with
  `id` = payload Record id.

## [1.1.0] - 2026-11-18

First working cut of React Portal: a Service Portal successor on Next Experience, where portals,
layouts, widgets and themes are records, widgets are written in TSX/JSX and compiled on the instance
when saved, and a React 19 host component renders them inside a single UI Builder page.

### Added
- **Data model (Fluent, 12 tables).** `portal`, `theme`, `component` (widgets, layouts and utilities in
  one table), `source_file`, `page`, `placement` (the spec's widget_instance), `build`, `build_asset`,
  `build_dep`, `release`, `release_entry` and `execution_log`. All but `execution_log` extend
  `sys_metadata`, so authored content and its compiled output travel in update sets. Default forms,
  unique indexes, choices and cascade rules on every table.
- **Components are one record with baseline fields**, like a Service Portal widget: `client_script`
  (compiled as `main.tsx`), `css`, `tailwind`, `script` (server), options schema/defaults, regions for
  layouts. Optional extra files (`source_file`) are imported with relative paths; `main.tsx`,
  `styles.css`, `server.js` and `theme.css` are reserved virtual names.
- **Server-side compiler (no WebAssembly).** `src/server/compiler/compiler.ts`: Sucrase for TSX/TS/JSX/JS,
  a small linker that bundles relative imports into one ES module and resolves `react`,
  `@portal/runtime`, `components:*` and `utilities:*` from the host registry, and Tailwind v4
  `compile()` for the classes used (shadcn token mapping, `dark:` keyed to the host) with the author's
  CSS appended after it. Vendor bundles in `src/server/compiler/vendor/` (`npm run vendor:compiler`).
- **Compile on save.** Business rules compile a component, theme or extra file when it changes, overwrite
  its single build record (`index.js` + `index.css`), and reprocess affected portals. A failed compile keeps
  serving the last good output and records file/line diagnostics on the build.
- **One build per component/theme and one release per portal.** The release holds the portal's compiled
  manifest (theme, layouts, pages, placements, asset URLs) and is reprocessed automatically when its
  inputs change; it is only written when the manifest actually changes. No release history: reverting an
  input reprocesses it.
- **Runtime REST API** `/api/x_312987_portal/rp`: `GET /portals/{slug}/bootstrap`, `POST /pages/resolve`,
  `POST /instances/initialize` (batch on-load), `POST /instances/{id}/execute`, and
  `GET /assets/{build}/{file}/raw` (immutable caching via a `?v=` content hash).
- **Studio REST API** `/api/x_312987_portal/rp_studio`: component/theme/portal listings, project read,
  revision-checked save, browser compile completion, preview context, and portal reprocess.
- **Component executor.** Runs a build's server script through `GlideScopedEvaluator` with `input`,
  `data`, `options`, `component` and `context` (`putVariable` / `getVariable`, the TurboForge pattern).
- **Security.** Roles `x_312987_portal.developer`, `.designer`, `.publisher`, `.admin` (contains the
  others); 52 table ACLs (consumers never read the tables directly) and REST endpoint ACLs; per-request
  portal and page access checks.
- **Automation.** 23 business rules (normalization, validation, scope inheritance for generated records,
  reprocess, compile), the `ReactPortal` Script Include bridge (`bootstrap`, `resolvePage`, `execute`,
  `compile`, `process`, `runMaintenance`), a nightly maintenance job, 8 system properties, and a
  React Portal application menu.
- **Host component `x-312987-portal-host`** (`packages/portal-host`, ui-component CLI): React 19 via
  `@quixomatic/ui-renderer-react-simple`, shadcn/ui on Base UI with Tailwind v4 in shadow DOM, TanStack
  Router (memory history: portal shell as the root route, pages as child routes) and TanStack Query, a
  module registry on `globalThis.__REACT_PORTAL__` for compiled widgets, layouts with regions and
  `RegionPortal`, per-widget error boundaries, theme token injection, and full-height layout framing.
- **Diagnostics.** A pinned pill that opens a drawer upward, plus `window.__RP_DIAG__()` with
  mark/since counters for mounts, renders, navigation, query cache, router and style events.
- **Demo seed.** `scripts/seed/components/` holds eight real TSX/JSX components (two layouts, header,
  sidebar, footer, a card with an extra file, an on-load server-script widget, a record detail with a
  header contribution); `node scripts/seed/build-seed.mjs` generates `scripts/seed-demo.js`, which
  creates the `sp` and `crm` portals.

### Internal
- **Versioning workflow.** `CHANGELOG.md`, `npm run version:bump` (`scripts/bump-version.mjs`, lockstep
  across the app, the host package, and the module paths in the Script Include and seed template), and
  the `version-bump` / `release-notes` skills ported from ChannelGuide. `CLAUDE.md` records the standing
  rules and instance gotchas.
- **`ignoreTransformTableList`** in `now.config.json` keeps a Fluent sync from pulling the CLI's UX
  records or portal content into source.
