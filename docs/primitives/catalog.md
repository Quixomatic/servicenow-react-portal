# Next Experience component catalog: a primitive plan for React Portal

First pass, compiled 2026-11-19 from instance `dev189813` (read-only). The machine-readable data is in [`catalog.json`](./catalog.json).

**Coverage refreshed 2026-11-19 against v1.13.0** (plus the working tree: catalog wave 2 and the rich-text fields). Every `catalog.json` entry now has `ourMatch` (`match: …` / `partial: … — gap` / `none`), `ourComponent` (our record ids) and `coverageNotes`, judged from the code in `scripts/seed/components/*` and the host. Status: §3 (counts), §4 (matrix), §12 (waves and parity phases), §13 (what's built). The prioritized backlog is in [`.plans/backlog.md`](../../.plans/backlog.md).

This document describes what ServiceNow Next Experience (Seismic / UXF) ships. It does so to inform which **primitives** React Portal builds as `x_312987_portal_component` records with `kind = primitive`. Everything here is written in our own words. No ServiceNow source is copied into this repo; only identifiers such as tag, prop, event and GraphQL field names appear.

---

## 1. Design principles

Parity is the minimum we aim for. The real goal is to do better in our stack: React 19, TanStack Query and Router, shadcn on Base UI, Tailwind v4 and TypeScript.

1. **Typed props and hooks, not string attributes.** Seismic passes `"true"` strings, `formData` blobs and dictionary attributes as `name=value` strings. Our primitives get typed props, discriminated unions per field type, and hooks such as `useField`, `useForm` and `useRecordList`.
2. **Composable primitives, not monolithic macroponents.** For example, `now-record-list-connected` has more than 100 `hide*` booleans. We ship small parts (`DataTable`, `Pagination`, `FilterBreadcrumbs`, `ColumnChooser`) plus one convenience widget that composes them.
3. **One request per screen.** Next Experience already loads a form with one GraphQL bootstrap (see §6), and we do the same. TanStack Query caches metadata such as dictionary entries, choices and layouts across forms. We avoid any per-field round trips.
4. **Declarative runtime.** UI policies, mandatory, read-only and visible are derived state, computed in React from form values, never imperative DOM toggling. Client-script side effects become state transitions.
5. **Optimistic and live.** Saves update the cache optimistically and roll back on error. Record-watch (AMB) messages invalidate queries.
6. **Accessibility is built into the base.** `app/field` owns label, hint, message and error wiring once, using `useId` and `aria-describedby`/`aria-invalid`. Lists, comboboxes and dialogs follow WAI-ARIA patterns with full keyboard support, and we test them with a screen reader.
7. **Theme tokens everywhere.** Every primitive uses our Tailwind v4 theme variables and supports light and dark mode out of the box. Hard-coded colours are not allowed. Status colours (highlighted values) map to tokens.
8. **Schema-based validation.** Field metadata compiles to a schema (Zod or Standard Schema) that drives client validation and submit gating. Server validation errors map back onto the same field message channel.
9. **Compatibility lives in a separate layer.** A `g_form`/`g_user`/`g_scratchpad`/`GlideAjax` shim lets existing client scripts and UI policy scripts run unchanged. New code never calls it and uses the typed form API instead.

---

## 2. Methodology (repeatable)

All access went through the logged-in Chrome over CDP (`playwright-core` `chromium.connectOverCDP('http://127.0.0.1:9333')`). Each script opened **its own new tab**, made only GET requests through the page session (`fetch` with header `X-UserToken: window.g_ck`), and closed the tab. Scripts live in the scratchpad `pw/catalog-*.cjs`, and raw output is in `scratchpad/catalog-raw/`.

1. **Get a token-bearing page.** Navigate the new tab to an empty classic list, e.g. `/sys_ux_lib_component_list.do?sysparm_query=sys_id%3D-1`, so `window.g_ck` exists.
2. **Inventory tables** (`/api/now/table/...` and `/api/now/stats/...`):
   - `sys_ux_lib_component`: 2,104 component definitions (`tag`, `source_script_name` = npm package, `deprecated`).
   - `sys_ux_macroponent`: 4,190 macroponents. For the 519 referenced by the UI Builder toolbox we pulled `props` (JSON: name, label, fieldType, choices, default) and `dispatched_events`.
   - `sys_ux_event`: 1,543 event definitions referenced by those macroponents (`event_name`, label, payload props).
   - `sys_uib_toolbox_component`: 521 UI Builder toolbox entries (label, macroponent, internal flag).
   - `sys_ux_lib_asset`: 43,699 assets (JS modules, source maps, icons; `name` = package path such as `@devsnc/sn-catalog-form/index`).
   - `sys_db_object` with `nameSTARTSWITHsys_ux^ORnameSTARTSWITHsys_uib`: 156 related tables (e.g. `sys_ux_lib_component_prop`, `sys_ux_form_action*`, `sys_ux_highlighted_value_config`, `sys_ux_list*`).
   - `sys_choice` with `name=question^element=type`: the 32 catalog variable types.
3. **Discover the bundle and map URL pattern.**
   - Open a workspace record page (`/now/sow/record/incident/-1`) in the new tab with CDP `Debugger.enable` and collect `Debugger.scriptParsed` events (`url`, `sourceMapURL`).
   - Result: 119 scripts. They fall into two families:
     - **Aggregated bundles:** `/uxab/<name>.jsdbx` with maps at `/uxab/<name>.map.jsdbx`. Names: `nds-bundle` (design-system primitives), `list-form-bundle` (record list, form and field controls, scripting environment), `shell-bundle` (shell plus more field controls), `uxf-bundle` (runtime), `ui-core-bundle`. There are also per-page bundles `/uxab/<sys_id>.jsdbx`.
     - **Per-package externals:** `/uxasset/externals/<package>[/<version>]/index.jsdbx?sysparm_replace_imports=true&uxmap=true`. The trailing `//# sourceMappingURL=` points at `.../index.min.js.map.jsdbx`, sometimes with `?sysparm_map_offset=N`.
4. **Fetch maps directly.**
   - From the page context, run `fetch(mapUrl, {headers: {'X-UserToken': g_ck}})` with a concurrency limit of 4. The source-map system property is on, so every map was served.
   - The `/uxab` maps are **index maps** (`{sections:[{offset, map}]}`); each section has `sources` and `sourcesContent`.
   - Fetched: 5 core bundles (12–25 MB each) and 30 externals (catalog, list, empty-state, score, calendar, color picker, and others).
5. **Extract and analyse.**
   - Wrote each `sourcesContent` entry to `catalog-raw/src/<scope>/<package>/...`, deduplicated across bundles: about 5,900 original source files from 251 packages.
   - A heuristic static pass (`catalog-analyze.cjs`) collected for each package: `createCustomElement` tags, property-schema keys, `A#B` action types, REST/GraphQL endpoints, ARIA usage and key handling. Results: `catalog-raw/analysis.json`.
   - Then key files were read by hand: field factory, control wrapper, scripting environment, form/list GraphQL queries, catalog form.
6. **Generate the catalog.**
   - `catalog-gen.cjs` merges the hand-written notes with toolbox metadata (typed props and events) and the static analysis (props for components outside the toolbox).
   - Components not reviewed by hand are included as low-detail inventory rows. Rows whose package had no reachable map are marked `"verified": false`.

To re-run: `node catalog-macro.cjs`, `node catalog-maps.cjs '<json list>'`, `node catalog-ext.cjs <pkg...>`, `node catalog-extract.cjs`, `node catalog-analyze.cjs`, `node catalog-gen.cjs`, `node catalog-gen-vars.cjs`. These scripts live in the scratchpad, not the repo.

---

## 3. Counts

Instance inventory: 2,104 `sys_ux_lib_component` · 4,190 `sys_ux_macroponent` · 521 UIB toolbox entries · 1,543 `sys_ux_event` · 43,699 `sys_ux_lib_asset` · 35 source maps fetched (5 core bundles + 30 externals) · ~5,900 source files read/indexed.

`catalog.json`: **376 entries**. 344 components (210 hand-reviewed, 134 auto-inventoried with low detail, 52 marked `verified: false`) and 32 catalog variable-type mappings. The knowledge wave added 11 entries: the platform's knowledge components (`sn-knowledge-*`, `sn-kb-*`, the article guidance and playbook cards).

| Category | Entries | High | Medium | Low |
|---|---|---|---|---|
| catalog | 29 | 6 | 3 | 20 |
| catalog-variable | 11 | 5 | 5 | 1 |
| data-display | 45 | 5 | 12 | 28 |
| feedback | 15 | 9 | 4 | 2 |
| field | 78 | 21 | 22 | 35 |
| form | 36 | 12 | 7 | 17 |
| layout | 52 | 10 | 11 | 31 |
| list | 48 | 9 | 9 | 30 |
| other | 25 | 0 | 2 | 23 |
| search | 5 | 0 | 4 | 1 |


(The category table above counts components only, as in the first pass; `catalog-variable` there excludes the 32 variable-type mappings.)

### Coverage (recomputed from catalog.json: v1.19.1 + the working tree: design-system wave and the parallel waves)

All 376 entries, including the 32 variable-type mappings (counted under `catalog-variable`):

| Category | Entries | Match | Partial | None |
|---|---|---|---|---|
| catalog | 29 | 11 | 1 | 17 |
| catalog-variable | 43 | 42 | 1 | 0 |
| data-display | 45 | 23 | 6 | 16 |
| feedback | 15 | 12 | 2 | 1 |
| field | 78 | 49 | 1 | 28 |
| form | 36 | 19 | 5 | 12 |
| layout | 52 | 38 | 3 | 11 |
| list | 48 | 29 | 2 | 17 |
| other | 25 | 0 | 1 | 24 |
| search | 5 | 2 | 2 | 1 |
| **Total** | **376** | **225** | **24** | **127** |

| Usefulness | Entries | Match | Partial | None |
|---|---|---|---|---|
| high | 106 | 104 | 2 | 0 |
| medium | 79 | 67 | 10 | 2 |
| low | 191 | 54 | 12 | 125 |

- **High-usefulness with no match (0).**
- **High-usefulness partials (2):** `now-record-form-connected`, `sn-catalog-action`.
- **Design-system wave (Wave 1, 2026-11-20):** the host kit gained `components:accordion`, `alert`, `avatar`, `pill` (+ PillList), `breadcrumb`, `checkbox` (indeterminate), `label-value`, `stepper`, `progress`, `split-button` (+ ButtonGroup), `toggle-group`, `resizable`, `tree`, `heading`, `image`, `date-range-picker` and `code-editor` (CodeMirror 6 in the lazily loaded `portal-code` chunk); record primitives `app/code-field` (script / xml / css / json / html_script, wired into `app/field-control`) and `app/date-range-field`. They move 22 entries to match (7 high: accordion, alert, avatar, pill, breadcrumbs, checkbox, label-value stacked; 13 medium; 2 low: `now-accordion-item`, `now-record-html-script`). Demo: sp **Components ▸ Primitives** (`app/primitives-demo`).
- **Home and search wave:** `components:empty`, `components:skeleton` (host kit) close `now-empty-state`, `now-loader-skeleton` and their low-usefulness templates; `app/search-box`, `app/search-results` close `sn-search-combobox`, `sn-search-results-container` (`sn-search-facets` and the Workspace global search typeahead are partial); `app/quick-links` closes `now-link-set`.
- **Knowledge wave:** `app/kb-article` with `app/kb-article-view`, `app/kb-toc` (on the generic `app/toc`) and `app/kb-feedback` matches `sn-knowledge-detail` and `sn-knowledge-content`, and does more (reading measure, sticky TOC with scroll-spy, print). `app/kb-category-tree` is partial for `sn-kb-category-picker` (navigation, not a picker); `app/kb-article-list` is partial for `sn-guidance-link-kb-card`. The comment thread (`sn-knowledge-discussion-wrapper`), Social Q&A, templates, translation requests and agent article guidance stay open.
- **Work views wave (Wave 4b, 2026-11-20):** `app/calendar-view` (month / week / day / agenda, drag and keyboard reschedule), `app/visual-board` (kanban by a choice or reference field, WIP limits) and `app/sla-timer` (live task_sla timers) match `now-calendar`, `now-visual-board` and `now-sla-timer`; `app/timeline` is partial for `sn-component-timeline` (the vertical list form, not the pan / zoom chart). Moves and reschedules write through `app/record-update` (the record's form save: UI policies, client scripts, BRs, ACLs). The host now ships `utilities:dnd-kit`. Widgets `app/record-calendar`, `app/record-board`, `app/timeline-card`, `app/sla-card`; demos sp **Components ▸ Calendar / Board / Timeline & SLA**.
- **Variable types:** 31 of 32 match. The one partial is UI page (15): it renders an `rp_component` when set, but platform UI pages are classic-only.
- **Low-usefulness:** most are inventory rows that nobody reviewed by hand. A `none` there is expected, not a gap.
- **Cart wave:** Next Experience has no cart UI (§7.1), so the cart closes no entry. `sn-catalog-action` stays partial: Add to cart is done, but a Cancel button and Save as draft are not.

**Our current library** (details in §13):
- **Host UI kit** (`packages/portal-host/src/components/ui`, registered as `components:<name>`): `badge`, `button`, `card`, `collapsible`, `dialog`, `dropdown-menu`, `icon` (any Lucide icon), `calendar` (date grid), `rich-text` (sanitised renderer + `sanitizeHtml`), `rich-text-editor` (TipTap, lazily loaded chunk), `popover`, `separator`, `sheet`, `sidebar`, `skeleton`, `empty` (empty state), `kbd`, `sonner`, `tabs`, `tooltip`; design-system wave: `accordion`, `alert`, `avatar`, `pill`, `breadcrumb`, `checkbox`, `label-value`, `stepper`, `progress`, `split-button`, `toggle-group`, `resizable`, `tree`, `heading`, `image`, `date-range-picker`, `code-editor` (CodeMirror, lazily loaded chunk).
- **Primitives** (`kind = primitive`):
  - `app/field` (useField, FieldShell, form store, policies, registry);
  - 20 field primitives (since the fields pass: `app/time-field`, `app/conditions-field`, `app/table-name-field`, `app/field-name-field`, `app/html-field`), `app/combobox` and `app/field-control`;
  - `app/variable`, `app/variable-container`, `app/mrvs`, `app/attachment-variable`, `app/requested-for-field`, `app/variable-editor`, `app/star-rating-variable` (demo custom variable);
  - `app/condition-builder`, `app/data-table` and `app/form`;
  - related lists: `app/related-list` (one list of any record: reference, m2m and scripted relationships), `app/related-lists` (tabs / stacked / single);
  - form pieces: `app/form-section` (collapsible section), `app/form-tabs` (sections as tabs), `app/form-annotation`;
  - dialogs: `app/confirm-dialog` (confirm / alert, dialog queue, `useDialog` / `useConfirm`), `app/field-dialog` (fields spec → modal form, `showFields`).
  - attachments (A6): `app/attachment-dropzone`, `app/attachment-list` (list / grid / chips, image preview), `app/attachment-panel`, `app/attachment-field` (file_attachment, user_image).
  - activity (A5): `app/activity-stream` (feed, filters, live; RecordActivity), `app/journal-composer`, `app/journal-field`.
  - knowledge (K): `app/kb-article-view`, `app/kb-toc`, `app/kb-feedback`, `app/kb-category-tree`, `app/kb-article-list`; generic `app/toc` (fumadocs-style On this page).
  - docs: `app/docs-content`, `app/docs-search`, `app/docs-toc`, `app/docs-collection-switcher` (the portal's docs collections; `useDocsCollections` in `utilities:app/docs`).
  - work views (4b): `app/calendar-view`, `app/visual-board`, `app/timeline`, `app/sla-timer`, and `app/record-update` (headless form save behind board moves and reschedules).
- **Utilities:** `app/knowledge` (KB data, permissions, TOC, feedback, view counting), `app/graphql`, `app/activity` (activity stream data, putJournal, live), `app/attachments` (attachment data, uploads, validation, live), `app/datetime` (zones, user formats, date/time format and parse), `app/list-data`, `app/catalog`, `app/custom-variables` (custom-variable registry), `app/gform`, `app/header-slots`, `react-query`, `react-table`, `react-virtual`.
- **Runtime:** `useRecordWatch`, `useAmbChannel`, `useAmbStatus`, `Link`/`navigate` with table/sysId/view/query params, `usePortalLocation`, embedded widgets (`$sp.getWidget`, `useEmbeddedWidget`, `<Embed>`, the `lazy` prop, embeds under layouts), `useInViewOnce`.
- **Widgets:**
  - work views: `app/record-calendar`, `app/record-board`, `app/timeline-card`, `app/sla-card`;
  - catalog: `app/catalog-item` (Order now and Add to cart), `app/catalog-picker`, `app/variable-editor-demo`, `app/cart` (cart and checkout), `app/cart-button` (header cart and count);
  - lists and forms: `app/list-view`, `app/list-card`, `app/record-form`, `app/related-lists-card`, `app/attachments-card`;
  - home and search: `app/hero-search`, `app/search-results`, `app/my-items`, `app/kb-articles`, `app/catalog-tiles`, `app/quick-links`, `app/announcements` (on `utilities:app/search`, `app/search-box`, `app/highlighted-value`);
  - knowledge: `app/kb-home`, `app/kb-article`, `app/kb-category`, `app/kb-search` (`app/knowledge` became the `utilities:app/knowledge` utility);
  - app shell: `app/app-header`, `app/app-sidebar`, `app/app-subheader`;
  - site: site-header, nav-sidebar, site-footer;
  - demos: field-demo, embed-demo, incident-list, record-detail, hello-card, server-clock, runtime-tests.
- **Blocks:** section, container, grid, columns, stack, split. **Layouts:** standard, centered, app-shell (plus `app/embed-test-layout`, a test layout for layout-rooted embeds).

---

## 4. Coverage matrix (high and medium usefulness)

Refreshed for v1.13.0. Low-usefulness rows and the 32 variable-type mappings are in `catalog.json` only (see §3 for their counts). `ourComponent` and `coverageNotes` in the JSON give the exact record ids and what is missing.

| Tag | Category | Usefulness | Proposed primitive | Our match |
|---|---|---|---|---|
| `now-checkbox` | field | high | `ui/checkbox` | match: components:checkbox — indeterminate, CheckboxLabel, useCheckboxGroupState |
| `now-date-time` | field | high | `ui/date-picker` | match: components:app/date-field, components:app/datetime-field, components:calendar |
| `now-input` | field | high | `app/string-field` | match: components:app/string-field |
| `now-radio-buttons` | field | high | `ui/radio-group` | match: components:app/choice-field |
| `now-record-checkbox` | field | high | `app/boolean-field` | match: components:app/boolean-field |
| `now-record-date-picker` | field | high | `app/date-field / app/datetime-field` | match: components:app/date-field, components:app/datetime-field, components:calendar |
| `now-record-html-editor` | field | high | `app/html-field` | match: components:app/html-field (on components:rich-text-editor, TipTap) — html/translated_html; record image uploads as attachments; no mentions, no dictionary-driven toolbar config |
| `now-record-number` | field | high | `app/number-field` | match: components:app/number-field |
| `now-record-typeahead` | field | high | `ui/combobox` | match: components:app/combobox |
| `now-record-typeahead-multiple` | field | high | `app/list-field` | match: components:app/list-field |
| `now-select` | field | high | `ui/select` | match: components:app/combobox |
| `now-textarea` | field | high | `app/textarea-field` | match: components:app/textarea-field |
| `now-toggle` | field | high | `ui/switch` | match: components:app/boolean-field |
| `sn-record-choice-connected` | field | high | `app/choice-field` | match: components:app/choice-field |
| `sn-record-control-wrapper` | field | high | `app/field` | match: components:app/field |
| `sn-record-controls-internal-field-messages` | field | high | `app/field (FieldMessages part)` | match: components:app/field |
| `sn-record-duration` | field | high | `app/duration-field` | match: components:app/duration-field |
| `sn-record-file-attachment` | field | high | `app/attachment-field` | match: components:app/attachment-field (file_attachment, user_image), components:app/attachment-variable (catalog type 33) |
| `sn-record-input-connected` | field | high | `app/string-field` | match: components:app/string-field, components:app/field-control |
| `sn-record-journal-input` | field | high | `app/journal-field` | match: components:app/journal-field — journal_input / journal (work notes tinted, internal badge, audience line), journal_list read-only; no mentions |
| `sn-record-reference-connected` | field | high | `app/reference-field` | match: components:app/reference-field, components:app/list-field |
| `now-code-editor` | field | medium | `ui/code-editor` | match: components:code-editor — CodeMirror 6, token theme, lazy chunk |
| `now-currency-input` | field | medium | `app/currency-field` | match: components:app/currency-field |
| `now-date-range-picker` | field | medium | `ui/date-range-picker` | match: components:date-range-picker, components:app/date-range-field — presets; two-field binding |
| `now-input-password` | field | medium | `app/password-field` | match: components:app/password-field |
| `now-input-phone` | field | medium | `app/phone-field` | match: components:app/phone-field |
| `now-input-url` | field | medium | `app/url-field` | match: components:app/url-field |
| `now-radio-group` | field | medium | `app/choice-field (variant=radio)` | match: components:app/choice-field |
| `now-record-time` | field | medium | `app/time-field` | match: components:app/time-field |
| `now-typeahead` | field | medium | `ui/combobox` | match: components:app/combobox |
| `sn-interactive-decoration` | field | medium | `app/field (FieldDecoration slot)` | match: components:app/field, utilities:app/gform, components:app/record-card — adornment slot + g_form decorations; reference preview card (info button) with Open record |
| `sn-list-selector` | field | medium | `ui/transfer-list` | partial: components:app/data-table — column chooser only; no generic transfer-list / slushbucket |
| `sn-record-annotation` | field | medium | `app/form-annotation` | match: components:app/form-annotation, components:app/form |
| `sn-record-choice` | field | medium | `app/choice-field` | match: components:app/choice-field, components:app/combobox |
| `sn-record-code-editor` | field | medium | `app/code-field` | match: components:app/code-field — CodeMirror (lazy chunk) for script / xml / css / json / html_script |
| `sn-record-conditions-connected` | field | medium | `app/condition-field` | match: components:app/conditions-field |
| `sn-record-currency-connected` | field | medium | `app/currency-field` | match: components:app/currency-field |
| `sn-record-email` | field | medium | `app/email-field` | match: components:app/email-field |
| `sn-record-input` | field | medium | `app/string-field` | match: components:app/string-field |
| `sn-record-list-select` | field | medium | `app/slushbucket` | none |
| `sn-record-phone-connected` | field | medium | `app/phone-field` | match: components:app/phone-field |
| `sn-record-tablename-connected` | field | medium | `app/table-name-field` | match: components:app/table-name-field |
| `sn-record-url` | field | medium | `app/url-field` | match: components:app/url-field |
| `sn-catalog-action` | catalog | high | `app/catalog-actions` | partial: components:app/catalog-item — Order now / Submit plus Add to cart (the item's no_cart / no_order_now settings apply); cart and checkout in `app/cart`, `app/cart-button`. Missing: Cancel, Save as draft |
| `sn-catalog-form` | catalog | high | `app/catalog-form` | match: components:app/variable-container |
| `sn-catalog-form-connected` | catalog | high | `app/catalog-item (useCatalogForm)` | match: components:app/catalog-item, components:app/variable, utilities:app/catalog |
| `sn-catalog-form-variable` | catalog | high | `app/variable` | match: components:app/variable, components:app/field-control |
| `sn-catalog-form-variable-section` | catalog | high | `app/variable-container` | match: components:app/variable-container |
| `sn-catalog-request-for` | catalog | high | `app/requested-for-field` | match: components:app/requested-for-field, components:app/catalog-item, utilities:app/catalog |
| `sn-catalog-description` | catalog | medium | `ui/rich-text` | match: components:app/catalog-item |
| `sn-catalog-price` | catalog | medium | `app/catalog-price` | match: components:app/catalog-item, utilities:app/catalog |
| `sn-catalog-quantity` | catalog | medium | `app/catalog-quantity` | match: components:app/catalog-item, components:app/combobox |
| `sn-catalog-form-attachment-variable` | catalog-variable | high | `app/attachment-field` | match: components:app/attachment-variable |
| `sn-catalog-form-checkbox-variable` | catalog-variable | high | `app/boolean-field (via app/variable)` | match: components:app/variable, components:app/boolean-field |
| `sn-catalog-form-container-variable` | catalog-variable | high | `app/variable-container` | match: components:app/variable-container |
| `sn-catalog-form-multi-row-form-modal` | catalog-variable | high | `app/mrvs (row editor)` | match: components:app/mrvs, components:dialog |
| `sn-catalog-form-multi-row-variable` | catalog-variable | high | `app/mrvs` | match: components:app/mrvs |
| `sn-catalog-form-label-variable` | catalog-variable | medium | `app/form-annotation` | match: components:app/variable |
| `sn-catalog-form-macro-variable` | catalog-variable | medium | `app/variable-custom (renders one of our components)` | match: components:app/variable, utilities:app/custom-variables |
| `sn-catalog-form-masked-variable` | catalog-variable | medium | `app/password-field (confirm)` | match: components:app/password-field, components:app/variable |
| `sn-catalog-form-multiple-select` | catalog-variable | medium | `app/list-field` | match: components:app/list-field |
| `sn-catalog-form-rich-text-label-variable` | catalog-variable | medium | `ui/rich-text` | match: components:app/variable |
| `now-condition-builder-connected` | list | high | `app/condition-builder` | match: components:app/condition-builder, utilities:app/list-data |
| `now-condition-builder-preview` | list | high | `app/filter-breadcrumbs` | match: components:app/condition-builder |
| `now-list` | list | high | `app/data-table` | match: components:app/data-table |
| `now-pagination-control` | list | high | `ui/pagination` | match: components:app/data-table |
| `now-predicate-builder` | list | high | `app/condition-builder` | match: components:app/condition-builder |
| `now-record-list` | list | high | `app/data-table` | match: components:app/data-table |
| `now-record-list-connected` | list | high | `app/record-list` | match: components:app/data-table, utilities:app/list-data, components:app/condition-builder |
| `now-record-list-connected-related` | list | high | `app/related-list` | match: components:app/related-list, components:app/data-table, utilities:app/list-data |
| `now-table` | list | high | `ui/table` | match: components:app/data-table |
| `now-data-set` | list | medium | `ui/data-view` | none |
| `now-dot-walk` | list | medium | `app/field-picker` | match: components:app/condition-builder |
| `now-filter-overview` | list | medium | `app/filter-breadcrumbs` | match: components:app/condition-builder |
| `now-grid` | list | medium | `ui/table` | match: components:app/data-table |
| `now-list-cell-editor-content` | list | medium | `app/cell-editor` | partial: components:app/data-table — CellEditor covers string/choice/reference/boolean/number/date/datetime and HTML (rich-text popover, app/html-field); not dot-walked, journal, glide_list, script, conditions |
| `now-record-list-connected-snapshot` | list | medium | `app/record-list (variant=compact)` | match: components:app/data-table, components:app/list-card |
| `now-record-list-filter-panel` | list | medium | `app/record-list (filter panel part)` | match: components:app/data-table |
| `sn-quick-filter` | list | medium | `app/quick-filter` | none |
| `sn-record-list-column-filter-value-input` | list | medium | `app/column-filter` | none |
| `now-activity-stream-compose-connected` | form | high | `app/journal-composer` | match: components:app/journal-composer — journal switch (writable fields via field ACLs), plain text, Ctrl/⌘+Enter, putJournal (as Workspace), bound mode (form value; Post and save when the form is dirty); no mentions, rich text, email mini-composer, pop-out |
| `now-activity-stream-connected` | form | high | `app/activity-stream` | match: components:app/activity-stream, utilities:app/activity — GlideActivity getEvents (journal, audit, attachments, emails, relations), platform filter configuration, filter chips + Fields menu, day groups, Show more, live via AMB /activity/events/<sys_id>, role=feed; no tags, filter sets, edit/delete, new-activity marker |
| `now-record-common-attachments-connected` | form | high | `app/attachments` | match: components:app/attachment-panel, components:app/attachments-card — upload (multi, drag-drop, paste, progress, cancel), rename, delete, download / download all, image preview, live (AMB); no document-viewer preview, encryption modules or multi-select delete |
| `now-record-common-header` | form | high | `app/record-header` | match: components:app/record-header — title, platform-coloured highlighted values, Read only / New badges, presence; fields configured by record header fields (x_312987_portal_record_field) |
| `now-record-common-uiactionbar` | form | high | `app/ui-action-bar` | match: components:app/form |
| `now-record-form-connected` | form | high | `app/form` | partial: components:app/form, components:app/record-form — Missing: related lists, formatters other than activity (placeholders), form personalisation. |
| `now-record-form-section-column-layout` | form | high | `app/form-columns` | match: components:app/form |
| `now-record-form-section-connected` | form | high | `app/form-section` | match: components:app/form-section, components:app/form |
| `now-record-related-list-tab-content` | form | high | `app/related-list-tabs` | match: components:app/related-lists, components:app/form-tabs, components:app/form |
| `sn-form-data-connected` | form | high | `app/form (useForm + FormProvider)` | match: components:app/form, utilities:app/graphql |
| `sn-form-internal-client-scripting-environment` | form | high | `app/form-runtime (g_form compatibility shim)` | match: utilities:app/gform |
| `sn-record-watcher` | form | high | `useRecordWatch (hook)` | match: @portal/runtime useRecordWatch, @portal/runtime useAmbChannel |
| `now-activity-combo` | form | medium | `app/activity-stream` | match: components:app/activity-stream (RecordActivity) — composer above the stream, stacked (no side-by-side by design) |
| `now-record-compact` | form | medium | `app/record-card` | match: components:app/record-card |
| `now-record-form-blob` | form | medium | `app/record-page` | partial: components:app/record-form, components:app/related-lists — record page: form + related-list tabs (merged into the form tabs or below the form); no related-item tabs, no activity side panel |
| `sn-declarative-actions-mediator` | form | medium | `app/actions (useActions)` | match: utilities:app/actions, components:app/action-bar |
| `sn-record-common-quick-form` | form | medium | `app/quick-form` | match: components:app/quick-form |
| `sn-record-ribbon` | form | medium | `app/record-ribbon` | partial: components:app/record-ribbon — key field values (record header fields, ribbon slot); no ribbon components or widths |
| `sn-scripted-modal` | form | medium | `app/scripted-modal` | partial: utilities:app/gform, components:app/confirm-dialog, components:app/field-dialog — alert / confirm / showFields on our dialogs; showFrame still opens a new tab |
| `now-accordion` | layout | high | `ui/accordion` | match: components:accordion — single / multiple, card variant, arrow keys |
| `now-breadcrumbs` | layout | high | `ui/breadcrumbs` | match: components:breadcrumb — shadcn parts + Breadcrumbs with ellipsis collapse (app-header keeps its own trail) |
| `now-button` | layout | high | `ui/button` | match: components:button |
| `now-card` | layout | high | `ui/card` | match: components:card |
| `now-dropdown` | layout | high | `ui/dropdown-menu` | match: components:dropdown-menu |
| `now-modal` | layout | high | `ui/dialog` | match: components:dialog, components:app/confirm-dialog, components:app/field-dialog, components:app/mrvs |
| `now-popover` | layout | high | `ui/popover` | match: components:popover |
| `now-sheet` | layout | high | `ui/sheet` | match: components:sheet |
| `now-tabs` | layout | high | `ui/tabs` | match: components:tabs, components:app/form-tabs |
| `now-tooltip` | layout | high | `ui/tooltip` | match: components:tooltip |
| `now-collapse` | layout | medium | `ui/collapsible` | match: components:collapsible |
| `now-content-tree` | layout | medium | `ui/tree` | match: components:tree — WAI-ARIA tree, lazy children, typeahead |
| `now-contextual-sidebar` | layout | medium | `app/side-panel` | partial: components:sidebar, components:app/app-sidebar, components:app/nav-sidebar — navigation sidebar only; no contextual record side panel |
| `now-flyout-menu` | layout | medium | `ui/dropdown-menu (submenus)` | match: components:dropdown-menu |
| `now-grouped-button` | layout | medium | `ui/toggle-group` | match: components:toggle-group — segmented / outline, single / multiple |
| `now-heading` | layout | medium | `ui/heading` | match: components:heading — level apart from size |
| `now-resizable-panes` | layout | medium | `ui/resizable` | match: components:resizable — keyboard splitter, collapsible, remembered layout |
| `now-split-button` | layout | medium | `ui/split-button` | match: components:split-button — action + menu, ButtonGroup |
| `now-stepper` | layout | medium | `ui/stepper` | match: components:stepper — horizontal / vertical, statuses, clickable, compact narrow mode |
| `now-text-link` | layout | medium | `ui/link` | match: @portal/runtime Link |
| `now-uxf-tab-set` | layout | medium | `app/page-tabs` | none |
| `now-alert` | feedback | high | `ui/alert` | match: components:alert — status variants, icon, action, dismiss, polite / assertive roles |
| `now-alert-list` | feedback | high | `ui/toast` | match: components:sonner |
| `now-avatar` | feedback | high | `ui/avatar` | match: components:avatar — image / initials, sizes, presence, group with +N |
| `now-badge` | feedback | high | `ui/badge` | match: components:badge |
| `now-empty-state` | feedback | high | `ui/empty-state` | match: components:empty |
| `now-highlighted-value` | feedback | high | `app/highlighted-value` | match: components:app/highlighted-value — platform highlighted-value colours (server-evaluated styles) with heuristic fallback; no popover |
| `now-loader` | feedback | high | `ui/spinner` | match: components:app/field |
| `now-loader-skeleton` | feedback | high | `ui/skeleton` | match: components:skeleton |
| `now-pill` | feedback | high | `ui/chip` | match: components:pill — removable, icon / avatar, sizes |
| `now-confirmation-message` | feedback | medium | `ui/confirm-dialog` | match: components:app/confirm-dialog |
| `now-pill-list` | feedback | medium | `ui/chip-list` | match: components:pill — PillList with +N (expand, popover, count) |
| `now-progress-bar` | feedback | medium | `ui/progress` | match: components:progress — determinate / indeterminate, tones, ProgressCircle |
| `now-template-message` | feedback | medium | `ui/empty-state` | partial: components:app/data-table — empty state internal to data-table |
| `now-icon` | data-display | high | `ui/icon` | match: components:icon |
| `now-label-value-stacked` | data-display | high | `ui/label-value` | match: components:label-value — LabelValueList stacked / grid |
| `now-rich-text` | data-display | high | `ui/rich-text` | match: components:rich-text (host kit) — RichText + sanitizeHtml (allow-listed tags/attributes, safe URLs, rel=noopener) |
| `now-calendar` | data-display | medium | `app/calendar` | match: components:app/calendar-view, widget app/record-calendar — month / week / day / agenda, user zone + formats, record-card popovers, drag / keyboard reschedule through the form save with Undo; no timeline views, resize or multi-zone |
| `now-chart-bar` | data-display | medium | `ui/chart` | match: components:chart BarChart — vertical / horizontal, grouped / stacked, gradient / hatched, View as table |
| `now-image` | data-display | medium | `ui/image` | match: components:image — placeholder, fallback, aspect ratio |
| `now-label-value-inline` | data-display | medium | `ui/label-value (layout=inline)` | match: components:label-value — layout="inline" (stacks in narrow containers) |
| `now-score-basic` | data-display | medium | `ui/stat` | match: components:app/score-tile (ScoreTile, DataScore), widget app/score-card — trend, delta %, sparkline, target |
| `now-sla-timer` | data-display | medium | `app/sla-timer` | match: components:app/sla-timer, widget app/sla-card — time left / since breach, elapsed bar, breached / paused / achieved, live ticking + record watch |
| `now-uxf-visualization-connected` | data-display | medium | `app/visualization` | match: components:app/data-chart, utilities:app/analytics, widget app/chart-card — no indicator (PA) sources |
| `now-vis-timeseries` | data-display | medium | `ui/chart` | match: components:chart LineChart / AreaChart, app/data-chart time series (useTimeSeries) — no forecast / annotations |
| `now-visual-board` | data-display | medium | `app/kanban` | match: components:app/visual-board, widget app/record-board — lanes from choices / references, drag / keyboard / Move to through the form save, WIP limits, live; no swimlanes, in-lane ranking or dependency lines |
| `sn-component-timeline` | data-display | medium | `ui/timeline` | partial: components:app/timeline, widget app/timeline-card — vertical day-grouped timeline (history, records by date); not the horizontal pan / zoom chart |
| `sn-contact-card` | data-display | medium | `app/contact-card` | match: components:app/contact-card |
| `sn-component-workspace-global-search-typeahead` | search | medium | `app/search-box` | partial: components:app/search-box — portal sources, not the Workspace global search API / search profiles |
| `sn-search-combobox` | search | medium | `app/search-box` | match: components:app/search-box, utilities:app/search |
| `sn-search-facets` | search | medium | `app/search-facets` | partial: components:app/search-results — source tabs with counts; no field facets / refiners |
| `sn-search-results-container` | search | medium | `app/search-results` | match: components:app/search-results |
| `sn-knowledge-detail` | data-display | high | `app/kb-article-view` | match (better): components:app/kb-article + app/kb-article-view, app/kb-toc, app/kb-feedback |
| `sn-knowledge-content` | data-display | high | `app/kb-article-view` | match (better): KbArticleBody (sanitised, heading ids, table frames, image zoom) |
| `sn-guidance-link-kb-card` | data-display | medium | `app/kb-article-list` | partial: KbArticleRow, featured cards in app/kb-home |
| `sn-kb-category-picker` | other | medium | `app/kb-category-tree` | partial: navigation tree with counts; no picker mode |
| `sn-knowledge-discussion-wrapper` | other | medium | `app/kb-comments` | none (backlog K: comments) |

---

## 5. Field base contract (`app/field`)

### 5.1 How Next Experience structures fields

- **One factory, many controls.**
  - Workspace forms render every field through a single factory, `controlElementFactory.getFormControl(parentId, type, field, onValueChange, onStagedValueChange, formData, fieldLayout)` in `@devsnc/sn-glide-form-controls`.
  - It switches on the glide field type (about 60 cases) to pick a control tag such as `sn-record-input-connected`, `sn-record-reference-connected`, `now-record-date-picker` or `now-record-number`.
  - It also derives type-specific props from dictionary attributes and system properties.
  - Unknown types fall back to a read-only `sn-record-input` labelled "field type not supported". We should copy that fallback.
- **Shared base props.** All record controls extend a common prop schema (`SeismicComponentBase` in `@devsnc/sn-controls-common`): `name`, `label`, `value`, `placeholder`, `description`, `required`, `readonly`, `invalid`, `reversed`, `autofocus`, `aria-*`, `configAria`, `fieldLayout`, `fieldType`, `helperContent`, `messages`, `formData`, `tableName`, `recordSysId`, `fieldName`, `onValueChange`, `onStagedValueChange`. A second set adds DOM callbacks and `showAIIndicator`.
- **Shell.** `sn-record-control-wrapper` renders the label row, required marker, optional marker, hint popover, message list, unsaved tint (`color`), AI highlight and live-region announcements.

### 5.2 Shared props: how often they appear

The table counts **37 field packages**. Props inherited from the base schema are under-counted by static analysis, so treat the numbers as lower bounds. They are inherited by every record control.

| Prop | Packages | Our `app/field` name |
|---|---|---|
| `wrapLabel` | 33 | `labelWrap` (layout prop) |
| `fieldLayout` (vertical/horizontal) | 29 | `layout` |
| `helperContent` | 29 | `hint` |
| `readonly` | 28 | `readOnly` |
| `required` (= mandatory and not read-only) | 28 | `mandatory` |
| `showAIIndicator` / `highlightedValue` | 27 / 22 | `aiState` (later) |
| `color` (unsaved/dirty tint) | 25 | derived from `dirty` |
| `decorations` (icon actions inside field) | 25 | `startAdornment`/`endAdornment` slots |
| `invalid` | 24 | derived from `messages` / `error` |
| `messages` (`{status, content}` list) | 24 | `messages` |
| `configAria` | 24 | (not needed: wired internally) |
| `value` | 18 (inherited by all) | `value` |
| `disabled` | 16 | `disabled` |
| `label` | 16 (inherited by all) | `label` |
| `formData` (whole form blob) | 16 | (removed: context instead) |
| `name` | 14 (inherited by all) | `name` |
| `size` | 13 | `size` |
| `autofocus` | 10 | `autoFocus` |
| `reversed` (RTL) | 10 | from theme `dir` |
| `placeholder` | 9 | `placeholder` |
| `manageValue` / `manageInvalid` (controlled mode) | 5 / 7 | always controlled through the hook |
| `suggestions` (recommendations) | 7 | later |
| `hideRequiredIndicator` / `optional` | 6 / 6 | `showOptional` |
| `maxlength` | 5 (+ dictionary) | `maxLength` |
| `displayValue` | 5 (+ all reference-like) | `displayValue` |
| `liveUpdate` (someone else changed it) | 4 | `remoteChange` |
| `referringTable` / `referringRecordId` | 4 | from form context |
| `dependentValue` / `dependentField` | dictionary-driven | `dependsOn` + `dependentValue` |

**Shared states:** pristine or dirty (`value` vs `originalValue`), staged (typing) vs committed, invalid, read-only, disabled, hidden (`visible=false` → not rendered unless `shouldRenderHiddenElement`), mandatory-unfilled, loading (reference/choice lookups) and remote-changed.

**Shared events:**
- Callbacks: `onValueChange({name, value, displayValue, error})` fires on commit (blur, select or Enter) and can also fire when the control reformats its value. `onStagedValueChange` fires on intermediate input.
- Dispatched actions follow the pattern `<TAG>#VALUE_CHANGED` and `<TAG>#STAGED_VALUE_CHANGED`, e.g. `NOW_RECORD_NUMBER#VALUE_CHANGED` and `NOW_RECORD_DATE_PICKER#VALUE_CHANGED`.
- Design-system primitives use `<TAG>#VALUE_SET` (commit), `<TAG>#INPUT` (keystroke) and `<TAG>#INVALID_SET`.

### 5.3 Where field metadata comes from

- **Forms.** One GraphQL call, `GlideLayout_Query.formLayout(table, view, sysId, query)`, returns:
  - `elementsData[]`: `name`, plus a dictionary block (`type`, `label`, `isMandatory`, `sysReadonly`, `canRead`, `canWrite`, `canCreate`, `dependentField`, `dependentTable`, `internalType`, `isEncrypted`, `attributes[]`), plus type-specific fragments:
    - choice: `choices`;
    - reference: `reference`, `referenceQualifier`, `useReferenceQualifier`, `dependentOnField`, `refAcColumns`, `refAcOrderBy`, `refQualElements`, `isDynamicCreate`;
    - currency: `currencyCodes`;
    - phone: `countryCodes`;
    - value: `maxLength`;
    - and so on.
  - `recordValues[]`: `name`, `value`, `displayValue`, `valuesList`.
  - `fieldStates[]`: `name`, `hidden`, `mandatory`, `readonly`. The server merges dictionary, ACL and policy state here.

  The factory merges these into one `field` object per element.
- **Lookups that need form state.**
  - References: `GlideLayout_Query.referenceDataRetriever(tableName, fieldName, chars, sysId, encodedRecord, serializedChanges, ...)`.
  - Dependent choices: `choiceDataRetriever(tableName, fieldName, sysId, serializedChanges, encodedRecord)`.
  - The client sends the **unsaved form state**, so the server evaluates reference qualifiers and dependent choices against what the user has typed.
- **UI Builder / standalone.** Design-system primitives (`now-input`, `now-select`) take plain props from page data resources. Nothing is fetched inside them.
- **Catalog variables.** AppCatalog GraphQL types carry the same information under catalog names (see §7).

### 5.4 Proposed API

```ts
// app/field: the base primitive every field primitive builds on
type FieldMessage = { kind: 'error' | 'warning' | 'info' | 'success'; text: string; id?: string }

interface FieldMeta {
  name: string; label: string; type: GlideType            // 'string' | 'reference' | 'choice' | ...
  mandatory?: boolean; readOnly?: boolean; visible?: boolean; disabled?: boolean
  hint?: string; maxLength?: number; placeholder?: string
  dependsOn?: string                                      // dictionary dependent field
  attributes?: Record<string, string>                     // parsed dictionary attributes
  // type-specific metadata lives in a discriminated union:
  reference?: { table: string; qualifier?: string; displayColumns?: string[] }
  choices?: { value: string; label: string; dependentValue?: string }[]
}

interface UseFieldResult<V> {
  meta: FieldMeta
  value: V; displayValue: string; originalValue: V
  dirty: boolean; touched: boolean; staged: V | undefined
  state: { mandatory: boolean; readOnly: boolean; visible: boolean; disabled: boolean } // after policies/scripts
  messages: FieldMessage[]; error?: FieldMessage
  setValue(v: V, displayValue?: string): void              // commit
  stage(v: V): void                                        // keystroke (no policies/onChange yet)
  blur(): void
  ids: { input: string; label: string; hint: string; messages: string }  // a11y wiring
  dependentValue?: unknown                                 // value of meta.dependsOn
}

function useField<V = string>(name: string): UseFieldResult<V>   // binds to the nearest FormProvider
function useField<V = string>(props: StandaloneFieldProps<V>): UseFieldResult<V> // no form: controlled props

// Shell (visual contract, used by every field primitive)
<FieldShell field={f} layout="vertical|horizontal" size="sm|md" showOptional startAdornment endAdornment>
  <input id={f.ids.input} aria-describedby={`${f.ids.hint} ${f.ids.messages}`} aria-invalid={!!f.error} ... />
</FieldShell>

// Thin field primitives
<StringField name="short_description" />           // app/string-field
<ReferenceField name="caller_id" />                // app/reference-field
<ChoiceField name="state" variant="select|radio" />
<Field name="any_field" />                         // app/field-auto: picks the primitive from meta.type (the factory)
```

- **Read-only rendering is part of the shell.** Read-only shows a focusable, selectable value with a link for references, never a disabled-looking input.
- **The factory is a typed registry,** `fieldRegistry[type] → Component`, so admins can override how a type renders, e.g. a custom primitive per dictionary attribute.

### 5.5 Form context (`g_form`-like, typed)

```ts
const form = useForm({ table: 'incident', sysId, view })   // one bootstrap query (see §8)
<FormProvider form={form}> ... </FormProvider>

form.getValue(name) / form.getDisplayValue(name) / form.setValue(name, value, displayValue?)
form.setMandatory(name, b) / setReadOnly / setVisible / setDisabled / setLabel / setPlaceholder
form.addOption / removeOption / clearOptions          // option overlay on top of metadata choices
form.showFieldMessage(name, text, kind) / hideFieldMessage / addFormMessage / clearMessages
form.isDirty / form.dirtyFields / form.reset()
form.validate(): Promise<ValidationResult>            // schema + mandatory + onSubmit hooks
form.save() / form.submit(actionName?)                // optimistic; maps server errors to fields
form.subscribe(name, cb)                              // onChange hook for modern code
form.sections / form.relatedLists / form.uiActions
```

Overrides from policies and scripts are stored as **layered state**: dictionary, then ACL, then UI policy, then script override. Removing a policy action therefore restores the previous layer correctly, which the platform's reverse-if-false logic only approximates.

### Improve on it (fields)

- **Pain points in Next Experience:**
  - String booleans (`"true"`) and a mix of `readonly` and `readOnly`.
  - `formData` (the entire form) is passed into every control, so every change re-renders every field.
  - Dictionary attributes are parsed per render from `name=value` strings.
  - System properties are read inside the factory.
  - Two value callbacks plus a dispatched action per component type (dozens of event names for the same idea).
  - Controlled/uncontrolled switches (`manageValue`, `manageInvalid`).
  - Accessibility is wired per component (`configAria`), so behaviour varies.
- **Better:**
  - Typed metadata, parsed once and cached by TanStack Query (keyed by table and view).
  - `useField(name)` subscribes only to its own slice of state (selector-based store), so typing in one field never re-renders the form.
  - One change contract: `setValue` and `stage`.
  - Always controlled through the hook.
  - Shell-owned accessibility.
  - Validation from a schema compiled from metadata.
- **Compatibility to keep:** the value/displayValue split, staged vs committed semantics (client scripts' `onChange` fires only on commit), and `originalValue` for dirty tracking. These are what `g_form` scripts observe.

---

## 6. Form runtime: how Workspace does it (evidence)

Workspace gathers the full form environment in **one** GraphQL request, built from fragments by `sn-form-data-connected` and `@devsnc/sn-scripting-environment`:

- `GlideLayout_Query.formLayout`: sections (`sectionLayout.rows.fields`), `formSettings`, `formTabs`, `recordValues`, `fieldStates`, `elementsData`, `relatedLists` (with counts and filters), `formatters`, `annotations`, `encodedRecord`, `recordMetadata.modCount`, domain info, and variable layout for variable editors.
- `GlideClientScriptingEnvironment_Query`:
  - `ClientScriptingEnvironment_Globals`: `g_scratchpad` (from display business rules), language, date/time format, decimal separator, text direction, accessibility flag.
  - `ClientScriptingEnvironment_Scripts`: `onLoad`, `onChange` (with `fieldName`) and `onSubmit` script bodies, plus pre-translated messages.
  - `ClientScriptingEnvironment_Policies`: UI policies with `reverse`, `onLoad`, `isRunScripts`, `scriptTrue`/`scriptFalse`, `actions[]` (`visible`, `mandatory`, `disabled`, `clearValue`, `relatedList`), and `conditions[]` (field, operator, value, OR/new-query flags). Policies also carry **`preEvaluated` / `preEvaluatedTermResult`** flags: the server marks terms it has already evaluated. Our inference is that these are terms the client cannot evaluate, such as dot-walks; the consuming code is in the shared GlideForm runtime, which is not in the maps.
  - Catalog script and policy fragments.
- `GlideUIAction_Query.uiActions`: form buttons and grouped action nodes, each with `clientScript`/`hasClientScript`, `style`, `hint` and `order`. Server-side conditions are already evaluated.
- `GlideAttachmentQuery_Query` (can the user create attachments), `GlideDataLookupQuery_Query` (data lookup rules) and session notifications.

**Runtime.**
- `sn-form-internal-client-scripting-environment` builds `g_form`, `g_user`, `g_scratchpad`, `GlideAjax` (`/xmlhttp.do`), async `GlideRecord`, `g_modal` (GlideModal → `sn-scripted-modal`), `g_aw` and `g_service_catalog`. The core GlideForm implementation is the shared platform client-script runtime (`/scripts/sn/common/clientScript/js_includes_clientScript.js`, loaded on the page), adapted to Seismic through actions.
- Each script is compiled with `new Function` in a scope where `window`, `document`, `jQuery`, `$`, `$j` and `angular` are **null**. Workspace scripts are therefore effectively isolated, and DOM manipulation simply fails.
- `g_form` calls become `GFORM#*` actions: `SET_VALUE`, `SET_MANDATORY`, `SET_READ_ONLY`, `SET_VISIBLE`, `ADD_OPTION`/`REMOVE_OPTION`/`CLEAR_OPTIONS`, `SHOW_FIELD_MESSAGE`, `ADD_INFO_MESSAGE`, `ADD_DECORATION`, `SET_SECTION_DISPLAY`, `SHOW_RELATED_LIST`, `SAVE`/`SUBMIT`, `VALIDATE`, `SET_LABEL`, `SET_FIELD_PLACEHOLDER`, `ENABLE_ATTACHMENTS`, and others. A reducer applies them to form state.
- **Save:** `/api/now/ui/glideRecord/:table`. **Server UI action:** `POST /api/now/ui/ui_action/:sys_id` (redirect or refresh comes back in the response). **Declarative actions:** `/api/now/ui/declarative_action/:assignmentId`.
- **Lists** use `GlideListLayout_Query.getListLayout(...)` plus `getListDeclarativeActionsLayout`. List client scripts (onCellEdit) run in a list scripting environment (`GlideListEnvironment`, `g_list`).
- **Live updates:** `sn-record-watcher` subscribes to the AMB channel `/rw/default/<table>/<base64(encoded query)>`. The activity stream subscribes to its own AMB channels.

---

## 7. Variable base contract (`app/variable`)

### 7.1 Evidence

- `sn-catalog-form-variable` normalises each variable, then **calls the same record field factory** used by forms (`getFormControl`).
- Only a few types get catalog-specific components: masked, checkbox, label, rich text label, attachment, custom/macro, multiple choice and numeric scale (rendered with `now-radio-buttons`), and multi-select.
- The normalisation does the following:
  - Converts mandatory, read-only and visible to strings. If a variable is read-only with no default, it is not mandatory.
  - Puts the annotation into the field hint.
  - Parses `max_length`, `multi_select`, `hideLinks` and `script` from the variable attributes string.
  - Maps attachment to `file_attachment` and requested_for to `reference`.
  - Maps multiple choice to `choice` when not on `sc_cat_item`.
  - Adds a `no_email` attribute to list collectors.
  - Fetches dependent choices via `choiceDataRetriever` using serialized changes.
- **Custom variables** render a macroponent configured on the variable, not the Jelly macro or SP widget. For us the equivalent is "render one of our components".
- **MRVS** is a grid (`sn-catalog-form-multi-row-variable`) plus a modal row form (`sn-catalog-form-multi-row-form-modal`) that runs its own `g_form` scope for the set's policies and scripts. `maxRows` disables Add, and `hideOnGrid` columns are hidden from the grid.
- **Data** comes from AppCatalog GraphQL fragments:
  - item;
  - variables: per-type element types, with `mandatory`, `readOnly`, `visible`, `defaultValue`, `helpText`, `showHelp`, `instructions`, `order`, `variableSet`, `variableAttributes`, `choices`, `lookupTable`/`lookupValue`/`lookupLabel`, `reference`/`referenceQual`/`useReferenceQualifier`, `dependentField` and `hasPriceImplecations`;
  - variable layout and values; pricing; catalog UI policies; catalog client scripts.
- **Submit** is `POST /api/sn_sc/servicecatalog/items/:sysId/order_now` (catalog item) or `/submit_producer` (record producer). Next Experience has **no cart UI**: the order guide handler exists, and add-to-cart is a portal (Employee Center) concern.

### 7.2 Variable type mapping (`question.type`)

| # | Variable type | Next Experience type | Rendered by | Our primitive (via `app/variable`) | Note |
|---|---|---|---|---|---|
| 1 | Yes / No | `choice (server sends a choice element with Yes/No)` | sn-record-choice-connected | `app/choice-field` | inferred: no dedicated yes/no component in sn-catalog-form |
| 2 | Multi Line Text | `multi_two_lines` | sn-record-input-connected (type=textarea); now-textarea in read-only print mode | `app/textarea-field` |  |
| 3 | Multiple Choice | `multiple_choice` | now-radio-buttons (on sc_cat_item; choiceDirection across/down); falls back to choice elsewhere | `app/choice-field (variant=radio)` |  |
| 4 | Numeric Scale | `numeric_scale` | now-radio-buttons (always horizontal) | `app/choice-field (variant=scale)` |  |
| 5 | Select Box | `choice` | sn-record-choice-connected (includeNone, choiceTable/choiceField, dependent choices) | `app/choice-field` |  |
| 6 | Single Line Text | `string` | sn-record-input-connected (max_length from variable attributes, validation regex) | `app/string-field` |  |
| 7 | CheckBox | `boolean` | sn-catalog-form-checkbox-variable -> now-record-checkbox; adjacent checkboxes grouped (checkbox_container) | `app/boolean-field` |  |
| 8 | Reference | `reference` | sn-record-reference-connected (reference, referenceQual, useReferenceQualifier, refAcOrderBy, ref_ac_columns attrs) | `app/reference-field` |  |
| 9 | Date | `glide_date` | now-record-date-picker | `app/date-field` |  |
| 10 | Date/Time | `glide_date_time` | now-record-date-picker (timePicker) | `app/datetime-field` |  |
| 11 | Label | `label` | sn-catalog-form-label-variable | `app/form-annotation` |  |
| 12 | Break | `break` | layout separator | `app/variable-container (separator)` | unverified: no dedicated component found |
| 14 | Custom | `macro` | sn-catalog-form-macro-variable (renders the macroponent set on the variable) | `app/variable-custom` |  |
| 15 | UI Page | `ui_page` | not rendered natively (classic only) | `none` | unverified |
| 16 | Wide Single Line Text | `string (wide)` | sn-record-input-connected | `app/string-field (fullWidth)` |  |
| 17 | Custom with Label | `macro` | sn-catalog-form-macro-variable with label | `app/variable-custom` |  |
| 18 | Lookup Select Box | `choice (lookup)` | sn-record-choice-connected with lookupTable/lookupValue/lookupLabel/lookupUnique | `app/choice-field (lookup source)` |  |
| 19 | Container Start | `container` | sn-catalog-form-container-variable / -variable-section | `app/variable-container` |  |
| 20 | Container End | `container` | closes container | `app/variable-container` |  |
| 21 | List Collector | `glide_list / multi_select` | sn-record-reference-connected (multiSelection) or sn-catalog-form-multiple-select when attribute multi_select; list table via listTable | `app/list-field` |  |
| 22 | Lookup Multiple Choice | `multiple_choice (lookup)` | now-radio-buttons fed by lookup table | `app/choice-field (variant=radio, lookup source)` |  |
| 23 | HTML | `html` | now-record-html-editor (editable) / now-rich-text inside control wrapper (read-only) | `app/html-field` |  |
| 24 | Container Split | `container` | column split inside container | `app/variable-container` |  |
| 25 | Masked | `masked` | sn-catalog-form-masked-variable (now-input-password, optional confirm) | `app/password-field` |  |
| 26 | Email | `email` | sn-record-email | `app/email-field` |  |
| 27 | URL | `url` | sn-record-url / now-input-url | `app/url-field` |  |
| 28 | IP Address | `ip_address` | now-record-ip-address | `app/string-field (format=ip)` |  |
| 29 | Duration | `glide_duration` | sn-record-duration | `app/duration-field` |  |
| 31 | Requested For | `requested_for -> reference(sys_user)` | sn-record-reference-connected; item-level sn-catalog-request-for adds delegation checks | `app/requested-for-field (over app/reference-field)` |  |
| 32 | Rich Text Label | `rich_text_label` | sn-catalog-form-rich-text-label-variable | `ui/rich-text` |  |
| 33 | Attachment | `attachment -> file_attachment` | sn-catalog-form-attachment-variable (allowed extensions, max size) | `app/attachment-field` |  |
| MRVS | Multi-row variable set | `AppCatalog_MultiRowVariableSetType` | sn-catalog-form-multi-row-variable + sn-catalog-form-multi-row-form-modal | `app/mrvs` |  |


### 7.3 Proposal

- **`app/variable`** is a thin adapter: `item_option_new` metadata → `FieldMeta`, then the same `app/field-auto` registry renders it. Variables are not a parallel set of components.
  - Mapping: `question_text` → `label`; `mandatory` and `read_only` → state; `default_value` → initial value; `help_text`/`instructions`/`tooltip` → `hint` (with an "instructions" popover); `order` → layout order; attributes string → parsed `attributes`; lookup and choice config → `choices` source; `reference_qual` → reference qualifier evaluated server-side.
- **`useCatalogForm(itemSysId)`** wraps the same form store as `useForm`, so `useField` works unchanged inside it. It adds:
  - **variable sets and containers**: layout tree (container start/end/split → `app/variable-container`);
  - **MRVS**: `app/mrvs`, a `DataTable` plus a row editor in a dialog. Each row editor gets a child form store (scoped `g_form` for the set's scripts and policies). The value is serialised as a JSON array of rows, as the platform expects;
  - **pricing**: recompute on change of variables with price implications (debounced, server-calculated);
  - **requested for**: `app/requested-for-field` over `app/reference-field`, plus a delegation check;
  - **quantity, price display, and submit/cancel** (`app/catalog-actions`). Submit runs validation, then onSubmit scripts, then `order_now`/`submit_producer` (or a cart endpoint later).
- **Catalog UI policies and client scripts** use the same policy engine and `g_form` shim as forms, with catalog semantics: `applies_to` (item vs variable set), `va_supported` and UI type, and variable names (optionally `IO:<sys_id>`) accepted by `g_form`.

**Backend APIs needed (React Portal scripted REST, none exist yet):**
- `GET /catalog/item/:id/bootstrap`: item, variables (normalised `FieldMeta`), layout tree, variable sets and MRVS definitions, default values, catalog UI policies, catalog client scripts, pricing.
- `GET /catalog/variable/:id/choices?changes=`: dependent and lookup choices.
- `GET /catalog/variable/:id/reference?q=&changes=`: reference search with the variable's `reference_qual` evaluated against the current values.
- `POST /catalog/item/:id/price`: price for the current values.
- `POST /catalog/item/:id/submit`: order now or submit producer. Later: cart add, checkout, order guide.
- `GET /catalog/delegation/:item/:user`: requested-for check.

### Improve on it (variables)

- **Pain points:** a parallel variable pipeline that re-normalises everything to strings; attributes packed into a comma string; MRVS row forms that are heavy modal forms; macro/UI Page variables that don't port to Workspace; `IO:` prefixed names.
- **Better:** one metadata model shared with dictionary fields; an MRVS inline-editable table with an optional dialog; custom variables that render any React Portal component by reference (typed `component:` attribute); and pricing as a TanStack Query keyed by the price-relevant values.
- **Compatibility to keep:** `g_form` variable names, the `IO:` aliases, and MRVS JSON value format.

---

## 8. Form runtime parity: phased roadmap

> **Status (v1.10.0):** see §12.2. P1 is partial (no view rules, annotations or related lists), P2 is mostly done, P3 is done for forms only, P4 has its lookups done but not related lists, activity or attachments, and P5 is done.

These phases come **after** waves 1–4 (fields, variables, lists, forms; §9). Each one lists what Workspace does, what our runtime needs, whether a `g_form` shim can run existing scripts unchanged, and the backend it needs.

The foundation for every phase is a **form bootstrap endpoint**: `GET /form/:table/:sysId?view=`. It returns, in one response:
- layout (sections, rows, columns, annotations, formatters, related lists);
- field metadata (`FieldMeta` per element);
- values and display values;
- server field states (ACL, dictionary read-only and mandatory);
- UI policies with pre-evaluated server terms;
- client scripts (onLoad, onChange, onSubmit);
- UI actions with server conditions evaluated;
- `g_scratchpad` (display business rules);
- user context (`g_user`);
- attachment permissions;
- `modCount` for optimistic concurrency.

It is cached per table and view for metadata and per record for values.

| Phase | Item | How Workspace does it | Our runtime needs | Legacy scripts unchanged? | Backend |
|---|---|---|---|---|---|
| P1 | **Form layout** (views, `sys_ui_form`/`sys_ui_section`/`sys_ui_element`, workspace layouts) | Server resolves view (incl. workspace view rules) → `formLayout.sectionLayout`, `formTabs` | Layout renderer: sections → rows → 1/2 columns, split, annotations, formatters as components | n/a | bootstrap (layout part); view rules |
| P1 | **Field ACLs + dictionary read-only/mandatory** | Server merges into `fieldStates` + `dictionary.canRead/canWrite` | Base state layer in form store; hidden if `!canRead` | n/a | bootstrap (field states). Save must re-check server side |
| P1 | **Display BRs + `g_scratchpad`** | Server runs display rules while building `Globals.g_scratchpad` | Expose `form.scratchpad` and `g_scratchpad` | Yes | bootstrap runs display BRs (GlideRecord + scratchpad object) |
| P2 | **UI policies + actions** (conditions, reverse-if-false, on-load, run scripts; catalog UI policies) | Policies shipped with conditions; client evaluates on load and change; server pre-evaluates unsupported terms | Declarative policy engine: compile conditions to predicates over form values (encoded-query operator subset), produce a policy state layer; reverse = remove layer; run `scriptTrue`/`scriptFalse` via shim when `isRunScripts` | Yes for conditions and actions (data-driven). Scripts via shim | bootstrap (policies + pre-evaluated terms); re-evaluate endpoint for terms needing server (dot-walk) |
| P2 | **Client scripts** (onLoad, onChange, onSubmit, onCellEdit; `g_form`, `g_user`, `g_scratchpad`, GlideAjax; isolate script; UI type) | Compiled with `new Function` in a scope where `window`/`document`/jQuery are null; `g_form` → actions; filtered by UI type (desktop/all for workspace) | `g_form` shim over form context (same method names and semantics: staged vs committed, `isLoading`, `newValue`/`oldValue`); `g_user` (name, roles, `hasRole`); GlideAjax client to a processor proxy; async GlideRecord; `g_modal`. Sandbox: shadow globals; optional iframe/Worker isolation for untrusted scripts | **Mostly yes.** Scripts that touch the DOM (`gel`, `$j`, `document`) fail just as they do in Workspace. Synchronous GlideRecord/`getXMLWait` can't be supported | bootstrap (scripts filtered by UI type and view); `POST /ajax` → `xmlhttp.do`-compatible processor (GlideAjax); `GET /gr` async GlideRecord proxy (ACL-checked) |
| P2 | **Data policies** | Enforced server-side on save; mandatory/read-only rules also surface client side as UI policies when "use as UI policy" is set | Treat client-visible ones as UI policies; map save errors to fields | n/a | bootstrap includes data policies flagged for client; save returns field-level errors |
| P3 | **UI actions** (form buttons, context menu, list actions; client vs server; conditions; `action.setRedirectURL`) | `GlideUIAction_Query` (conditions already evaluated); client part runs in env; server part `POST /api/now/ui/ui_action/:id` returns redirect/refresh | `app/ui-action-bar` + context menu; client part runs via shim (`gsftSubmit` → server phase); server response drives router redirect/refetch | Yes for typical "client then gsftSubmit" pattern | bootstrap (actions); `POST /form/:table/:id/action/:actionId` (runs server script with current changes, returns redirect/messages/new record) |
| P3 | **Declarative actions / UX form actions** (`sys_declarative_action_assignment`, `sys_ux_form_action*`) | Separate GraphQL + `/api/now/ui/declarative_action/:id` | Typed action model (`useActions(context)`) shared by forms and lists | n/a | actions endpoint (per table/view/workspace config) |
| P4 | **Dependent fields + reference qualifiers** (simple, dynamic, advanced) | Lookups send `encodedRecord` + `serializedChanges`; server evaluates qualifier and dependent choices | Reference and choice primitives pass current dirty values to lookup queries; query keys include dependency values | n/a | `GET /field/:table/:field/reference?q=&changes=`, `GET /field/:table/:field/choices?changes=` |
| P4 | **Related lists, activity stream/journal, attachments** | `formLayout.relatedLists` → `now-record-list-connected-related`; `GlideActivity_Query`; Attachment API | `app/related-list` (record-list with parent context), `app/activity-stream` + journal composer, `app/attachments` | `g_form.showRelatedList`/`hideRelatedList` via shim | list query endpoint with relationship; activity endpoint (journal + audit + attachments merged); attachment upload/delete proxy |
| P5 | **Live record updates** (record watch / AMB) | `sn-record-watcher` subscribes to `/rw/default/<table>/<b64 query>`; form shows live-update field messages | `useRecordWatch(table, query)` → invalidate queries; form merges remote changes into non-dirty fields, flags conflicts on dirty ones (`remoteChange`) | n/a | AMB client in host (or polling fallback); `modCount` in save for conflict detection |

### Improve on it (form runtime)

- **Pain points in Workspace:**
  - Policies are evaluated imperatively, and reverse-if-false can leave the wrong state when policies overlap.
  - Scripts use string field names with no types.
  - GlideAjax round trips per change.
  - Re-rendering the whole form on any change.
  - Script errors are swallowed.
  - Two parallel engines (form vs catalog) with forked `g_form` action handlers.
- **Better:**
  - A single **layered state model** (dictionary → ACL → data policy → UI policy → script → user). Policies are pure functions over values, memoised per dependency set, so order is predictable and fully reversible.
  - A typed `form` API, generated from table metadata (TypeScript types per table, optional).
  - Batching GlideAjax calls.
  - Fine-grained subscriptions.
  - A script-error panel in our diagnostics overlay.
  - One engine for forms, catalog and MRVS rows.
- **Compatibility layer, kept separate:**
  - `@portal/compat-gform` exposes `g_form`, `g_user`, `g_scratchpad`, `GlideAjax`, async `GlideRecord`, `g_modal` and `getMessage`, implemented on top of the typed form API.
  - Only legacy client scripts and policy scripts receive it. New widgets never import it.

---

## 9. Recommended build order (top primitives, grouped in waves)

> **Status (v1.10.0):** waves 1–3 are done, waves 4 and 5 are partial. See §12.1.

### Wave 1: fields

| # | Primitive | Covers (Next Experience) | Backend needed |
|---|---|---|---|
| 1 | `app/field` (`useField`, `FieldShell`, `FormProvider` store, `app/field-auto` registry) | `sn-record-control-wrapper`, field messages, decorations, factory | field metadata model |
| 2 | `app/string-field` | `now-input`, `sn-record-input-connected` | none beyond metadata |
| 3 | `app/textarea-field` | `now-textarea`, textarea mode | none |
| 4 | `app/number-field` | `now-record-number` | locale formats (user context) |
| 5 | `app/boolean-field` (checkbox / switch) | `now-record-checkbox`, `now-checkbox`, `now-toggle` | none |
| 6 | `app/choice-field` (select / radio / scale) | `sn-record-choice-connected`, `now-select`, `now-radio-buttons` | **choices** endpoint (dependent, with changes) |
| 7 | `app/reference-field` (+ `ui/combobox`) | `sn-record-reference-connected`, `now-record-typeahead` | **reference search** endpoint (qualifier with changes, display columns, recents) |
| 8 | `app/list-field` (glide_list / list collector) | `now-record-typeahead-multiple` | reference search (multi) |
| 9 | `app/date-field` / `app/datetime-field` / `app/time-field` | `now-record-date-picker`, `now-record-time` | user date format and timezone |
| 10 | `app/duration-field` | `sn-record-duration` | none |
| 11 | `app/html-field` (+ `ui/rich-text` read-only) | `now-record-html-editor`, `now-rich-text` | attachment upload for inline images (**done**: `app/html-field`, host kit `components:rich-text` / `components:rich-text-editor`) |
| 12 | `app/journal-field` | `sn-record-journal-input` | save journal entry |
| 13 | `app/attachment-field` | `sn-record-file-attachment` | attachment upload/delete |
| 14 | `app/email-field`, `app/url-field`, `app/phone-field`, `app/password-field`, `app/currency-field` | corresponding `sn-record-*` | currency codes in metadata |

**APIs for wave 1:** field metadata (`GET /meta/:table?view=`, i.e. dictionary, choices and attributes, cached), choices (`GET /field/:table/:field/choices?changes=`), reference search (`GET /field/:table/:field/reference?q=&changes=&limit=`), attachments (`POST /attachment`, `DELETE /attachment/:id`), user context (formats, timezone, roles).

### Wave 2: catalog variables

| # | Primitive | Covers | Backend |
|---|---|---|---|
| 15 | `app/variable` + `useCatalogForm` | `sn-catalog-form-variable`, `sn-catalog-form-connected` | catalog item bootstrap |
| 16 | `app/variable-container` | containers, variable sets, sections | (bootstrap) |
| 17 | `app/mrvs` | MRVS grid and row modal | (bootstrap) row metadata |
| 18 | `app/catalog-item` widget (`app/catalog-actions`, price, quantity, requested-for) | `sn-catalog-action`, `-price`, `-quantity`, `-request-for` | price, submit, delegation |

**APIs:** catalog item bootstrap, variable choices, variable reference search, price, submit (order now / submit producer), delegation.

### Wave 3: lists

| # | Primitive | Covers | Backend |
|---|---|---|---|
| 19 | `ui/table` + `app/data-table` (typed cells reuse field read modes) | `now-table`, `now-record-list`, `now-list` | none |
| 20 | `ui/pagination` | `now-pagination-control` | none |
| 21 | `app/record-list` widget (query, sort, columns, selection) + `app/related-list` | `now-record-list-connected(-related)` | **list query** (`GET /list/:table?query=&fields=&order=&limit=&offset=&view=`, values + display values + count); list layout/personalisation |
| 22 | `app/condition-builder` + `app/filter-breadcrumbs` | `now-condition-builder-connected`, `now-condition-builder-preview` | table/field metadata incl. operators; dot-walk metadata |
| 23 | `app/column-chooser` and inline `app/cell-editor` | `sn-list-selector`, `now-list-*-cell-editor-content` | save single field |

### Wave 4: forms

| # | Primitive | Covers | Backend |
|---|---|---|---|
| 24 | `app/form` (`useForm`, sections, columns, annotations) | `sn-form-data-connected`, `now-record-form-section-connected`, column layout, `sn-record-annotation` | **form bootstrap**; **save** (`PATCH /form/:table/:id` with `modCount`, field errors) |
| 25 | `app/ui-action-bar` | `now-record-common-uiactionbar` | UI action execute endpoint |
| 26 | `app/record-header` + `app/related-list-tabs` | `now-record-common-header`, related list tabs | (bootstrap) |
| 27 | `app/activity-stream` + `app/journal-composer` | `now-activity-stream-connected`, compose | activity feed endpoint |
| 28 | `app/attachments` | `now-record-common-attachments-connected` | attachment list/upload |

### Wave 5: the rest

Primitives:
- `ui/dialog`, `ui/sheet`, `ui/tabs`, `ui/accordion`, `ui/tooltip`;
- `ui/alert`, `ui/empty-state`, `ui/skeleton`, `ui/spinner`, `ui/avatar`, `ui/chip`;
- `app/highlighted-value` (with config-driven colours), `ui/label-value`, `ui/stepper`, `ui/breadcrumbs`, `ui/resizable`, `ui/tree`;
- `useRecordWatch`.

Then the form runtime parity phases P1–P5 from §8.

---

## 10. Open questions

1. **GraphQL vs our own REST.**
   - The platform GraphQL schema (`GlideLayout_Query`, `GlideListLayout_Query`, `GlideClientScriptingEnvironment_Query`, AppCatalog) is internal and undocumented, and may change between releases.
   - Do we call it directly from React Portal (fastest parity) or wrap the equivalent server APIs in our own scripted REST bootstrap endpoints (stable contract, our caching)?
   - Recommendation: our own endpoints, possibly implemented by calling GlideForm/GlideRecord APIs server-side.
2. **Scope limits.** Can a scoped app (`x_312987`) run display business rules, evaluate reference qualifiers, and execute UI action server scripts on arbitrary tables? Some of this may require global helpers (see the memory note on scoped script runtime limits).
3. **Client script sandboxing.** Should legacy scripts run in-page (shadowed globals, as Workspace does) or in an iframe or Worker for real isolation? A Worker breaks synchronous `g_form` reads unless we mirror state.
4. **AMB access.** Is the AMB client usable from our host component? Otherwise use polling for record watch.
5. **Cart and order guide.** Next Experience natively supports order now and record producers only. Do we need cart, checkout and order guides (Employee Center parity) in v1?
6. **Highlighted value config** (`sys_ux_highlighted_value_config`) and **list layouts** (`sys_ux_list`, workspace list config): reuse the platform's configuration tables, or define our own?
7. **Unverified rows.** Some toolbox components had no reachable map (`verified: false`). They are low priority, but should be checked if any become relevant.
8. **Version drift.** Several packages exist in multiple versions (e.g. `library-catalog-form` 24.x–30.x). We catalogued the versions that pages actually load.

## 11. Decisions (James, 2026-11-19)

1. **GraphQL: no REST wrapper.** Build a shared GraphQL surface any component can use instead of hiding it behind our
   own scripted REST endpoints.
   - It is a `kind = utility` component record (imported as `utilities:<name>`) holding the client, query helpers and
     typed fragments for the layout, list and form queries, plus hooks on top: e.g. `useGraphQL`, `useFormBootstrap`,
     `useListLayout`.
   - Utilities are the existing mechanism for code shared across components; use it rather than duplicating per
     primitive.
2. **Server-side evaluation:** display business rules, reference qualifiers and UI action scripts have no good runtime
   in our scope other than `GlideScopedEvaluator`. Prefer the platform's own evaluation (e.g. what GraphQL and the UI
   APIs already return, such as pre-evaluated UI policies and server UI actions via `/api/now/ui/ui_action/:id`), and
   use `GlideScopedEvaluator` only where we must run a script ourselves.
3. **Client script sandboxing:** at the implementer's discretion. Default: run in-page with shadowed globals (as
   Workspace does); keep `g_form` reads synchronous.
4. **AMB:** set it up. It is a websocket, and Next Experience has a library for it. Research and mimic that library,
   and expose it as an easy hook (`useRecordWatch(table, query, onChange)` and a lower-level `useAmbChannel(channel)`).
5. **Cart and order guides:** not in v1, but tracked as a backlog item for a later catalog wave. v1 catalog = order
   now and record producers.

---

## 12. Status (v1.13.0)

### 12.1 Waves 1–5 (§9)

| Wave | Status | Done | Missing (see `.plans/backlog.md`) |
|---|---|---|---|
| **1: fields** | **Done** (1 type partial) | `app/field` (useField, FieldShell, form store, layered overrides, registry), `app/combobox`, `app/field-control` (type factory with "not supported" fallback), string, textarea, number, boolean, choice (select/radio/scale), reference, list, date and datetime (typed in the user's format + calendar popover on host kit `components:calendar`), time (`glide_time`), duration, email, url, phone (E.164 with country codes), password, currency, conditions (condition builder), table name, field name; logic in `utilities:app/datetime` | Journal: `app/journal-field` (A5; HTML: `app/html-field` on the host kit's TipTap editor); `file_attachment` / `user_image`: `app/attachment-field` (A6); there are no field decorations |
| **2: catalog variables** | **Done** | `app/variable` (all 32 types), `useCatalogForm`, `app/variable-container`, `app/mrvs`, `app/attachment-variable`, `app/catalog-item`, `app/catalog-picker`, `utilities:app/catalog`. Since 1.10 also catalog UI policies and client scripts (onSubmit can veto). Catalog wave 2: MRVS rows as their own g_form scope (set policies and scripts, onSubmit blocks the row, `g_service_catalog.parent`), inline row editing, row prices, Remove all; `app/requested-for-field` (delegation) for type 31 and the item level; custom variables via `rp_component` / `rp_options` (`utilities:app/custom-variables`); quantity on the combobox Select; `app/variable-editor` (a record's variables, read-only or editable) | Save as draft and order guides (backlog); dependent choices inside MRVS rows untested; the variable editor isn't a form formatter yet. **Cart wave (G2):** Add to cart, `app/cart` (lines, quantity, remove, requested for, Empty cart, one-step checkout and a review step for two-step), `app/cart-button` (header count and popover), cart hooks in `utilities:app/catalog` |
| **3: lists** | **Done** | `app/data-table` (RecordList, DataTable, Pagination, ColumnChooser, CellEditor, PointMenu), `app/condition-builder` (+ breadcrumbs, dot-walk picker), `utilities:app/list-data` (getListLayout, inline/bulk writes, personalization), `app/list-view`, `app/list-card`, related-list mode (`fixedQuery` / `relatedListName`), live refresh | **Wave 3a (2026-11-20) done:** group-by (`^GROUPBY` on getListLayout, collapsible groups with counts, 20 groups per page), column header filters, quick filter chips, saved filters on `sys_filter` (as the user), cards (`CardGrid`, table / cards toggle), inline edit of dot-walked (writes the verified record), glide_list (chips or list collector), conditions and journal (append-only, opt-in) cells, `app/slushbucket`, list extension slots (`toolbarActions` / `selectionActions` / `rowActions` / `contextMenuItems`, `ListController`). **Wave 3b (actions):** platform list actions (declarative list actions in the toolbar, selection bar and row menu; classic server-side list actions opt-in) via `components:app/action-bar` + `utilities:app/actions`, and the `g_list` shim. Still missing: `onCellEdit` list client scripts; Workspace "My lists" (`sys_ux_list`) |
| **4: forms** | **Partial** | #24 `app/form` (useRecordForm, RecordForm, FormLayout, save via the Save UI action, conflict check, unsaved guard, cog settings with view / layout, remembered view), `app/form-section` (collapsible), `app/form-tabs` (tabs mode), `app/form-annotation`, 2–4 column splits, per-field remote-change markers; #25 UI action bar; #26 record header (banner / bar / inline); `app/record-form` widget | #24: formatters (placeholders). **Attachments (A6, #28) done:** `utilities:app/attachments`, `app/attachment-dropzone`, `app/attachment-list`, `app/attachment-panel`, RecordForm `attachments` option (off / below / header), widget `app/attachments-card`. **Activity (A5, #27) done:** `app/activity-stream` (feed, filters, live), `app/journal-composer` (putJournal), `app/journal-field`, `utilities:app/activity`, opt-in RecordForm activity (`notes` / `below`), widget `app/activity-card` (timeline / conversation / compact variants) **Related lists (A4) done:** `app/related-list`, `app/related-lists`, form tabs / stacked sections, `app/related-lists-card` |
| **5: the rest** | **Partial** | `sheet`, `tooltip`, `collapsible`, `icon`, `sidebar`, `tabs`, `dialog`, `skeleton`, `empty`, `kbd` in the host kit; home and search: `utilities:app/search`, `app/search-box`, `app/highlighted-value`, widgets `app/hero-search`, `app/search-results`, `app/my-items`, `app/kb-articles`, `app/catalog-tiles`, `app/quick-links`, `app/announcements`; knowledge (K): `utilities:app/knowledge`, `app/kb-home`, `app/kb-article`, `app/kb-category`, `app/kb-search` on `app/kb-article-view`, `app/kb-toc` / `app/toc`, `app/kb-feedback`, `app/kb-category-tree`, `app/kb-article-list`; `app/confirm-dialog`, `app/field-dialog`; `useRecordWatch` / `useAmbChannel`; Spinner (in `app/field`) | **Design-system wave (2026-11-20) done:** host kit `accordion`, `alert`, `avatar`, `pill`, `breadcrumb`, `checkbox`, `label-value`, `stepper`, `progress`, `split-button`, `toggle-group`, `resizable`, `tree`, `heading`, `image`, `date-range-picker`, `code-editor`; `app/code-field`, `app/date-range-field`. Still private copies to migrate: list-field chips (→ `components:pill`), app-header breadcrumbs (→ `components:breadcrumb`), user-menu and activity avatars (→ `components:avatar`), RecordForm banners (→ `components:alert`) |

### 12.2 Form runtime parity phases P1–P5 (§8)

Our forms use `GlideViewQuery_Query.uiView`, the platform's bootstrap. That's the route Decision 1 implies, instead of a bootstrap endpoint of our own.

| Phase | Item | Status | Notes |
|---|---|---|---|
| P1 | Form layout | **Partial** | Views, sections, rows and 1/2 columns are done, as are the view switcher (`availableViews`) and the forced view (`forcedViewName`). **Portal view rules** (`x_312987_portal_view_rule`: per portal / page, condition, roles, user criteria; they force the view, one request via the `_query` chain, §12.4), then **Workspace view rules** via the portal's `viewRuleConfigId` as a fallback (§12.3); classic `sysrule_view` rules are not evaluated, by design. Also done: annotations (`app/form-annotation`), collapsible sections, sections as tabs, 2–4 column splits, remembered view (`x_312987_portal.form.<table>.view`). Related lists: done (A4). Not yet: formatters (placeholders only), `formTabs` |
| P1 | Field ACLs, dictionary read-only/mandatory | **Done** | `fieldStates` plus dictionary `canRead`/`canWrite`. The form is read-only when the view has no Save action. The server re-checks on save, because Save is a UI action |
| P1 | Display BRs and `g_scratchpad` | **Done** | `ClientScriptingEnvironment_Globals.g_scratchpad` |
| P2 | UI policies and actions | **Done** | Evaluated in the browser with the server's pre-evaluated terms; reverse-if-false, onLoad=false, run-scripts and last-writer-wins with scripts; catalog policies too, and MRVS rows run their set's policies. Not done: the `relatedList` action (`sys_ui_policy_rl_action`) |
| P2 | Client scripts | **Mostly done** | `utilities:app/gform` covers onLoad/onChange/onSubmit, g_form, g_user, g_scratchpad, GlideAjax, async GlideRecord, getMessage, g_modal alert/confirm and g_aw.openRecord. Since 1.12/1.13: `g_modal.alert` / `confirm` / `showFields` on `app/confirm-dialog` / `app/field-dialog`, setSectionDisplay / getSectionNames, addDecoration / removeDecoration, and `createGForm` / `attachGForm` for any form store. Gaps: sync GlideRecord / `getXMLWait`, `onCellEdit`. show/hideRelatedList(s) now work (A4); enable/disableAttachments drive `app/attachment-panel` (A6). MRVS row scripts run in each row's own scope (`g_service_catalog.parent` included) |
| P2 | Data policies | **Partial** | Enforced on save, because Save is the platform UI action (BRs, data policies, ACLs), and the errors map to field messages. Unverified: whether data policies flagged "Use as UI policy on client" come back in `ClientScriptingEnvironment_Policies` |
| P3 | UI actions (form and list) | **Done** | Forms: server-evaluated form buttons and the context menu; client part via the shim (`gsftSubmit` → server); server part via `/api/now/ui/ui_action`; redirects stay in the portal. Lists (actions wave): classic server-side list context-menu / list-choice actions as an opt-in (`classicActions`, James 2026-11-20: option (a); on in the app portal's incident list), filtered per row by the platform's AJAXActionSecurity and run per record via `/api/now/ui/ui_action`. Verified live: Remove Incident hidden (0/2 allowed), Archive Record / Follow on Live Feed shown, Follow ran as the user; a classic duplicate of a declarative action is dropped. Workspace itself shows no classic list actions. DOM-bound list client scripts and `RP.*` banner buttons are not supported |
| P3 | Declarative actions / UX form actions | **Done** (actions wave) | `utilities:app/actions` + `components:app/action-bar`: list / related-list declarative actions (`getListDeclarativeActionsLayout`) in the list toolbar, the selection bar and the row menu; form declarative actions (`GlideUxActionLayout_Query.getActionLayout`) on the form's bar, and with a portal `actionConfigId` (`sys_ux_action_config`, picked in Studio ▸ portal settings ▸ Actions; empty = the platform's actions) the whole UX form action layout as in Workspace. Workspace's client conditions (model conditions, scripted client conditions, `{{…}}` interpolation) ported; server scripts via `/api/now/ui/declarative_action/:id`; client scripts with `g_form` / `g_list`; UXF client actions mapped where the portal has an equivalent (new record, record routes, edit selected, export), others hidden. Not done: related items render Seismic components (listed by `useRelatedItems`, not rendered), `interaction` / `action_component` actions, row-action (`Row Action` model) DAs |
| P4 | Dependent fields and reference qualifiers | **Done** | `referenceDataRetriever` / `choiceDataRetriever` with `serializedChanges` + `encodedRecord` |
| P4 | Related lists, activity stream/journal, attachments | **Related lists and activity done** | `formLayout.relatedLists` in the bootstrap (Workspace's fragment); rows via `getListLayout` with relatedListName + parent + the relationship's resolved filter; reference, m2m (`m2MData`) and scripted (`REL:`) relationships; New, Add / Edit… / Remove; `g_form.show/hideRelatedList(s)`. Platform related-list UI actions wait for E1. Activity (A5): GlideActivity getEvents + putJournal, AMB /activity/events, opt-in in RecordForm. Attachments (A6): GlideAttachmentQuery_Query (permissions) + Attachment API (list, upload with progress / cancel, delete), rename via GlideRecord_Mutation, sys_attachment AMB watch; new records upload to the reserved sys_id; `g_form.enable/disableAttachments` |
| P5 | Live record updates | **Done** | AMB record watch: a clean form refreshes silently, a dirty one shows a banner; `sys_mod_count` conflict check with Reload/Overwrite; live list refresh with row highlights. Per-field markers: a dirty form marks exactly the fields someone else changed (Use theirs / Keep mine, `applyRemoteValues` on any store); clean fields update silently. Non-admin payload filtering is untested |

### 12.3 View rules: what `uiView` actually does (verified read-only, 2026-11-19)

GraphQL from a CDP tab, admin session:
- **Classic view rules (`sysrule_view`) are not applied by `uiView`.**
  - Rule "UI Policy, Advanced view" (`sys_ui_policy`, `global=false` → `advanced`) matches record `0590ac90…`.
  - `uiView` still returned `Default view` with `views: ""`, and also with a view-rule config passed.
- **Workspace view rules (`sysrule_view_workspace`) apply only when `viewRuleConfigId` is passed.**
  - That is the sys_id of a `sys_ux_view_rules_configuration`, e.g. "SOW View Rules Config" `31b5b61c…`.
  - With it, `incident` / `-1` resolves to `sow_new_record` (rule "SOW Incident New Record", `sys_id=-1`).
  - Without it, `Default view`.
- **`views` is an ordered list of candidate view names: the first view that exists wins.**
  - `"nonexistent,sow"` → `sow`; `"ess,sow"` → `ess`; `"nonexistent"` → `Default view`.
  - A view rule (via `viewRuleConfigId`) beats `views`: `views: "sow"` with the SOW config on a new incident gives `sow_new_record`.
- **`forcedViewName` beats everything,** including view rules: `forced: "ess"` with the SOW config gives `ess`.
  - An unknown forced name falls back silently to `Default view`.
  - A name that exists only for another table also falls back (`advanced` on `sys_app` → `Default view`).
- **`isWhitelistedForEdit` came back `false` in every case.** Workspace uses it only for classic-form embedding (`classicForm`), so it doesn't affect us.
- **Our `fetchFormBootstrap`** sends `views: ""` and no `viewRuleConfigId`, and passes the URL/option view as `forcedViewName`. Consequences:
  - no view rule of either kind ever applies;
  - an explicit view always wins;
  - a mistyped view silently becomes Default.

  The recommendation is in `.plans/backlog.md` (item "View rules").

**Done (2026-11-20, backlog B).** Resolution order: URL `view` → widget option `view` (`lockView` puts it first) → remembered view (`x_312987_portal.form.<table>.view`) → Workspace view rules of the portal's `settings.viewRuleConfigId` → the portal's candidate list `settings.formViews` → Default.
- Steps 1–3 are forced, but only after a no-layout existence check (`checkFormViews`: aliased `uiView(views: "<name>", sysId: "-1")`, which also works for new records, where `availableViews` is empty). An unknown URL or option view falls through and shows a "View `x` not found" notice.
- Steps 4–6 are `uiView(viewRuleConfigId, views)`.
- `default` / `Default view` force the Default view over the rules: an unknown forced name resolves to Default and still skips the rules (verified).
- The switcher has an Automatic choice.
- Rules join a configuration through `sys_ux_m2m_workspace_view_rule_ux_view_rule_config`; `experience_restricted=true` limits a rule to its configurations.
- **Lists:** `GlideListLayout_Query.getListLayout` rejects `viewRuleConfigId` ("Unknown field argument"), so there are no Workspace list view rules. An unknown list view silently gives the Default list layout (`incident`: `ess` gives 3 columns, `nope_xyz` gives the 11 Default columns).

---


### 12.4 Portal view rules and the `_query` chain (verified 2026-11-20)

- **`_query` is the root `QueryType`.** It appears on `GlideRecord_Query` rows and on `uiView.glideLayoutItem`. String arguments under it may use `$$parent.<field>$$`, filled from the parent object (a row's column, or `viewName` for `uiView`). One request can therefore chain a row into `uiView`.
- **Scripted types can't take part.** A type from a scripted schema has no `_query` (FieldUndefined), and the built-in `Glide*` types are merged at execution time and aren't introspectable (even with `glide.graphql.glide_record_schema.introspection_enabled`). So scripted schemas can't extend or wrap them.
- **Remote tables are exposed under `GlideRecord_Query`** only with web-service access. In their script, `v_query.getParameter(field)` returns a term's value; `getCondition(field)` returns the whole `field=value` term.
- **An empty `$$parent` value substitutes the string `"null"`.** `uiView` treats `"null"` as a view name: it matches the Default view's empty name and skips Workspace rules. So the chain never sends an empty value. The answer row `x_312987_portal_view_answer` emits `views` (the resolved view, else the portal's default views, else `default`) and `rule_config` (the Workspace configuration, only when nothing was resolved). The chain is `uiView(views: "$$parent.views$$", viewRuleConfigId: "$$parent.rule_config$$")`.
- **Workspace view rules are exact-table.** A `sysrule_view_workspace` rule on `task` doesn't apply to `incident` or `problem` (throwaway rules, removed). Portal view rules match the same way.
- **Latency (admin, warm, medians):** plain form 197 ms; the composed form 208 ms; resolver, then form (two calls) 231 ms.
- **Design and API:** `docs/guide/concepts/view-rules.md`.
## 13. What's built: our components → catalog entries

| Our component | Kind | Catalog entries it covers (match unless marked partial) |
|---|---|---|
| `components:app/field` | primitive | `sn-record-control-wrapper`, `sn-record-controls-internal-field-messages`, `now-loader` (Spinner); `sn-interactive-decoration` (adornment slot + decorations; the reference preview is app/record-card's RecordPreview, wired in app/reference-field); partial `now-label-value-stacked` / `-inline` |
| `components:app/combobox` | primitive | `now-select`, `now-record-typeahead`, `now-typeahead`, `sn-record-choice` |
| `components:app/field-control` | primitive | the factory in `sn-record-input-connected` (type → control, "not supported" fallback) |
| `components:app/string-field` | primitive | `now-input`, `sn-record-input(-connected)`, `now-record-ip-address`, `sn-record-auto-number-connected`; partial `now-color-selector` |
| `components:app/textarea-field` | primitive | `now-textarea` |
| `components:app/code-field` | primitive | `sn-record-code-editor`, `now-record-html-script` (script, script_plain, script_server, xml, css, json, json_translations, html_script, html_template via `app/field-control`; on `components:code-editor`) |
| `components:app/date-range-field` | primitive | `now-date-range-picker` bound to two date / date-time fields (or standalone), on `components:date-range-picker` |
| `components:app/journal-field` | primitive | `sn-record-journal-input` (journal_input, journal; journal_list read-only) |
| `components:app/journal-composer` | primitive | `now-activity-stream-compose-connected` (journal switch, putJournal, form-bound mode) |
| `components:app/activity-stream` | primitive | `now-activity-stream-connected`, `now-activity-combo` (RecordActivity: composer + stream, stacked), the opt-in activity of `now-record-form-connected`, `ActivityConversation` (chat style); partial `now-avatar` (ActivityAvatar) |
| `utilities:app/activity` | utility | the activity data behind `now-activity-stream-connected` (`sn-activity-stream-queries`: getEvents, putJournal, getEmailBodies; AMB /activity/events) |
| Widget `app/activity-card` | widget | Service Portal "Ticket conversations" (no Next Experience counterpart beyond `now-activity-combo`) |
| `components:app/html-field` | primitive | `now-record-html-editor` (html, translated_html; record image uploads), variable type 23; HTML inline cell editor in `app/data-table` |
| `components:app/number-field` | primitive | `now-record-number` |
| `components:app/boolean-field` | primitive | `now-record-checkbox`, `now-toggle` |
| `components:app/choice-field` | primitive | `sn-record-choice-connected`, `now-radio-buttons`, `now-radio-group`, variable types 1, 3, 4, 5, 18, 22 |
| `components:app/reference-field` | primitive | `sn-record-reference-connected`, variable type 8 (31 partial) |
| `components:app/list-field` | primitive | `now-record-typeahead-multiple`, `sn-catalog-form-multiple-select`, variable type 21; partial `now-pill` |
| `components:app/date-field`, `app/datetime-field` | primitive | `now-record-date-picker`, `now-date-time`; variable types 9, 10 |
| `components:app/time-field` | primitive | `now-record-time` |
| `components:app/conditions-field` | primitive | `sn-record-conditions-connected` |
| `components:app/table-name-field`, `app/field-name-field` | primitive | `sn-record-tablename-connected`, `sn-record-fieldname-connected`; catalog variable type 40 (Table Name) |
| `utilities:app/datetime` | utility | date/time logic behind the date, date-time and time fields: zones, the user's formats, format / parse |
| `components:app/duration-field` | primitive | `sn-record-duration`, variable type 29 |
| `components:app/email-field`, `app/url-field` | primitive | `sn-record-email`, `sn-record-url`, `now-input-url`, variable types 26, 27 |
| `components:app/phone-field` | primitive | `now-input-phone`, `sn-record-phone-connected` |
| `components:app/password-field` | primitive | `now-input-password`, `sn-catalog-form-masked-variable`, variable type 25 |
| `components:app/currency-field` | primitive | `sn-record-currency-connected`, `now-currency-input`, `sn-record-price-connected` |
| `components:app/attachment-variable` | primitive | `sn-catalog-form-attachment-variable`, variable type 33 |
| `components:app/attachment-field` | primitive | `sn-record-file-attachment` (file_attachment, user_image) |
| `components:app/attachment-dropzone` | primitive | drop zone part of `now-record-common-attachments-connected` |
| `components:app/attachment-list` | primitive | `sn-form-internal-attachments-list`, `now-record-common-attachment-card`; partial `now-template-card-attachment` |
| `components:app/attachment-panel` | primitive | `now-record-common-attachments-connected`, `sn-form-internal-attachments-header` |
| `components:app/attachments-card` | widget | `now-record-common-attachments-connected` (placeable, Service Portal "Ticket Attachments") |
| `utilities:app/attachments` | utility | data for `now-record-common-attachments-connected` / `sn-record-file-attachment` (GlideAttachmentQuery, Attachment API, validation, AMB, form attachment state) |
| `components:app/variable` | primitive | `sn-catalog-form-variable`, label / rich-text label / checkbox-group variables (sanitised by `components:rich-text`), `sn-catalog-form-macro-variable` and custom variables 14/17 (`rp_component` / `rp_options`); partial 15 (UI page) |
| `components:app/requested-for-field` | primitive | `sn-catalog-request-for` (with `app/catalog-item`), variable type 31 |
| `components:app/variable-editor` | primitive | the variable editor section of `now-record-form-connected` (`sn-catalog-form` on a record) |
| `utilities:app/custom-variables`, `components:app/star-rating-variable` | utility / primitive | the custom-variable registry and its demo component |
| `components:app/variable-container` | primitive | `sn-catalog-form`, `sn-catalog-form-variable-section`, `sn-catalog-form-container-variable`, variable types 19/20/24 |
| `components:app/mrvs` | primitive | `sn-catalog-form-multi-row-variable`, `sn-catalog-form-multi-row-form-modal` (row g_form scope; inline or `components:dialog`), `sc-multi-row-header-action-button`, MRVS |
| `components:app/condition-builder` | primitive | `now-condition-builder(-connected)`, `now-predicate-builder`, `now-condition-builder-preview`, `now-filter-overview`, `now-dot-walk`, `now-filter*` (the conditions field type is `app/conditions-field` on it) |
| `components:app/data-table` | primitive | `now-record-list(-connected)`, `now-list`, `now-table`, `now-grid`, `now-pagination(-control)`, `now-record-list-filter-panel`, `now-record-list-header`, snapshot lists, `now-list-cell-editor-content` (dot-walk, glide_list, conditions, journal append, HTML), `sn-record-list-column-filter-value-input` (ColumnFilter), `sn-quick-filter` (QuickFilterBar), `now-data-set` (CardGrid), group-by; partial `now-record-list-menu-connected` (saved filters on sys_filter, no "My lists"), `sn-list-export-modal` |
| `components:app/slushbucket` | primitive | `sn-record-list-select`, `sn-list-selector` (Slushbucket; RecordSlushbucket = a glide_list field's list collector) |
| `components:app/form` | primitive | `sn-form-data-connected`, `now-record-common-uiactionbar`, `now-record-form-section-column-layout`; partial `now-record-form-connected`, `now-alert`; the header is `app/record-header`, the ribbon `app/record-ribbon` |
| `components:app/form-section` | primitive | `now-record-form-section-connected` (collapsible heading on `components:collapsible`) |
| `components:app/form-tabs` | primitive | sections as tabs on `components:tabs` (`now-tabs` for forms); `extraTabs` (related lists) |
| `components:app/related-list` | primitive | `now-record-list-connected-related`, `now-record-list-related` (one related list: reference, many-to-many, scripted; New / Add / Edit… / Remove) |
| `components:app/related-lists` | primitive | `now-record-related-list-tab-content` (tabs, stacked, single; lazy; counts; omit-if-empty); part of `now-record-form-blob` |
| `components:app/form-annotation` | primitive | `sn-record-annotation` |
| `components:app/confirm-dialog` | primitive | `now-confirmation-message`, the dialog queue (`DialogOutlet`, `openDialog`), part of `sn-scripted-modal` |
| `components:app/field-dialog` | primitive | `g_modal.showFields` modal (part of `sn-scripted-modal`) |
| `utilities:app/graphql` | utility | form bootstrap (`uiView`), metadata, choices, reference search, UI action execute |
| `utilities:app/list-data` | utility | `sn-record-list-data-broker` |
| `utilities:app/gform` | utility | `sn-form-internal-client-scripting-environment` (incl. `g_form.show/hideRelatedList(s)`); partial `sn-scripted-modal` (showFrame), `now-message`; `createGForm` / `attachGForm` attach g_form to any form store; `createGList` / `createListScriptEnvironment` (g_list, actions wave) |
| `utilities:app/actions` | utility | `sn-declarative-actions-mediator` (useActions, runAction, Workspace's client conditions) |
| `components:app/action-bar` | primitive | `now-record-common-uiactionbar` (with `components:app/form`); list actions of `now-record-list-connected` (useListActionSlots) |
| `utilities:app/catalog` | utility | catalog data for `sn-catalog-form-connected`, price, delegation (`canRequestFor`), MRVS row forms with set scripts / policies, the variable editor's data (`fetchVariableEditor`) |
| `@portal/runtime` `useRecordWatch` / `useAmbChannel` | runtime | `sn-record-watcher` |
| `@portal/runtime` `Link` | runtime | `now-text-link`, `sn-record-link` |
| Host kit `components:rich-text`, `components:rich-text-editor` | host | `now-rich-text` (RichText + sanitizeHtml); the TipTap editor behind `now-record-html-editor` (lazily loaded `portal-rte` chunk) |
| Host kit `components:button/card/badge/dropdown-menu/popover/sheet/tooltip/collapsible/icon/sonner/separator/calendar` | host | `now-button*`, `now-card*`, `now-badge`, `now-dropdown`, `now-flyout-menu`, `now-popover`, `now-sheet`, `now-tooltip`, `now-collapse`, `now-icon`, `now-alert-list`, the date grid inside `now-record-date-picker`; partial `now-highlighted-value` (accordion: see the design-system row) |
| Widgets `app/catalog-item`, `app/catalog-picker` | widget | `sn-catalog-form-connected`, `sn-catalog-price`, `sn-catalog-quantity`, `sn-catalog-description`; partial `sn-catalog-action` (Order now + Add to cart; no Cancel, no Save as draft), `sn-search-combobox` |
| Widgets `app/cart`, `app/cart-button`; cart hooks in `utilities:app/catalog` | widget / utility | no Next Experience counterpart (the cart is a portal concern, §7.1): Service Portal's `sc-shopping-cart-v2`, `sc-checkout` and the header cart, on the platform's Service Catalog cart REST API |
| Widgets `app/list-view`, `app/list-card`, `app/record-form` | widget | page-level `now-record-list-connected`, `now-record-form-connected` / partial `now-record-form-blob` |
| Widget `app/related-lists-card` | widget | a record's related lists outside the form (no Next Experience counterpart: Workspace only shows them on the record page) |
| Widgets `app/app-header`, `app/app-sidebar`, `nav-sidebar`, `site-footer` | widget | partial `now-contextual-sidebar`, `now-link-set-group` (their breadcrumbs and avatars predate `components:breadcrumb` / `components:avatar`) |
| Host kit design-system pieces: `components:accordion`, `alert`, `avatar`, `pill`, `breadcrumb`, `checkbox`, `label-value`, `stepper`, `progress`, `split-button`, `toggle-group`, `resizable`, `tree`, `heading`, `image`, `date-range-picker`, `code-editor` | host | `now-accordion` / `-item`, `now-alert`, `now-avatar`, `now-pill`, `now-pill-list`, `now-breadcrumbs`, `now-checkbox`, `now-label-value-stacked` / `-inline`, `now-stepper`, `now-progress-bar`, `now-split-button`, `now-grouped-button`, `now-resizable-panes`, `now-content-tree`, `now-heading`, `now-image`, `now-date-range-picker`, `now-code-editor` (CodeMirror in the lazily loaded `portal-code` chunk). Demo widget `app/primitives-demo` (sp Components ▸ Primitives) |
| Host kit `components:empty`, `components:skeleton`, `components:kbd` | host | `now-empty-state`, `now-template-message-empty-state`, `now-loader-skeleton`, `now-loader-skeleton-custom` (kbd: no catalog entry) |
| `utilities:app/search`, `components:app/search-box` | utility, primitive | `sn-search-combobox`; partial `sn-component-workspace-global-search-typeahead` |
| `components:app/highlighted-value` | primitive | `now-highlighted-value` (platform colours via `toneForPlatform`, heuristic fallback) |
| `components:app/record-header` | primitive | `now-record-common-header` (RecordTitle: banner / bar / inline), `now-record-common-record-presence` (usePresence on `/sn/rp/<table>/<sys_id>`, RecordPresence) |
| `components:app/record-ribbon` | primitive | partial `sn-record-ribbon` (configured key values; no ribbon components) |
| `components:app/record-card` | primitive | `now-record-compact` (RecordCard), the reference preview of `sn-interactive-decoration` (RecordPreview) |
| `components:app/contact-card` | primitive | `sn-contact-card` |
| `components:app/quick-form` | primitive | `sn-record-common-quick-form` (QuickForm, QuickFormDialog) |
| `components:app/calendar-view`, widget `app/record-calendar` | primitive, widget | `now-calendar` (CalendarView, useCalendarEvents, the range / layout model) |
| `components:app/visual-board`, widget `app/record-board` | primitive, widget | `now-visual-board` (VisualBoard, useBoardLanes, useLaneCards) |
| `components:app/timeline`, widget `app/timeline-card` | primitive, widget | partial `sn-component-timeline` (Timeline, useHistoryTimeline, useRecordsTimeline) |
| `components:app/sla-timer`, widget `app/sla-card` | primitive, widget | `now-sla-timer` (SlaTimers, SlaTimer, SlaRibbonValue, useTaskSlas, slaClock) |
| `components:app/record-update` | primitive | no catalog entry: headless form save for a few fields (useRecordUpdate, updateWithUndo), used by the board and the calendar |
| Host `utilities:dnd-kit` | host | no catalog entry: dnd-kit core + sortable on the host's React |
| Widget `app/record-cards-demo` | widget | demo of the record card, contact card, preview and quick form (sp ▸ Fields) |
| Widget `app/search-results` | widget | `sn-search-results-container`; partial `sn-search-facets` (source tabs with counts) |
| Widget `app/quick-links` | widget | `now-link-set`; partial `now-link-set-group` |
| `utilities:app/knowledge`; primitives `app/kb-article-view`, `app/kb-toc`, `app/kb-feedback`, `app/kb-category-tree`, `app/kb-article-list`; widgets `app/kb-home`, `app/kb-article`, `app/kb-category`, `app/kb-search` | utility, primitive, widget | `sn-knowledge-detail`, `sn-knowledge-content` (better: reading layout, scroll-spy TOC, print / share, platform-native views and feedback); partial `sn-kb-category-picker`, `sn-guidance-link-kb-card` |
| `components:app/toc` | primitive | no catalog entry: fumadocs-style On this page (track, sliding active segment, compact bar), shared by the KB and docs pages |
| `utilities:app/docs`; primitives `app/docs-content`, `app/docs-search`, `app/docs-toc`, `app/docs-collection-switcher`; widgets `app/docs-sidebar`, `app/docs-page`, `app/docs-header` | utility, primitive, widget | no catalog entry: the fumadocs docs layout over docs collections (`x_312987_portal_doc_collection` / `_section` / `x_312987_portal_doc`). A portal's `settings.docsCollections`, the URL's `c`, a collection switcher and search across collections; `useDocsCollection` / `useDocsCollections` for custom switchers ([Docs and collections](../guide/studio/docs.md)) |
| Widgets `app/hero-search`, `app/my-items`, `app/kb-articles`, `app/catalog-tiles`, `app/announcements` | widget | Service Portal home widgets (typeahead search, My requests / approvals, knowledge articles and categories, popular items, announcements): no Next Experience catalog entries |
| `components:chart` (host kit; Recharts 3 in the lazy `portal-charts` chunk); `utilities:app/analytics`; primitives `app/data-chart`, `app/score-tile`; widgets `app/chart-card`, `app/score-card` | kit, utility, primitive, widget | `now-chart-bar`, `now-vis-bar`, `now-vis-timeseries`, `now-chart-timeseries`, `now-chart-donut-pie`, `now-vis-pie`, `now-chart-sparkline`, `now-vis-sparkline`, `now-uxf-visualization-connected`, `now-score-basic`, `now-score-advanced`; partial `now-vis-gauge`, `now-vis-dial` (RadialChart gauge, no bands / needle) ([Charts and dashboards](../guide/primitives/charts.md)) |
| Blocks and layouts | block/layout | `now-uxf-page*`, `now-uxf-viewport`, `now-stackable-side-by-side-panel` |
