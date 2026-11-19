# Next Experience component catalog: a primitive plan for React Portal

First pass, compiled 2026-11-19 from instance `dev189813` (read-only). The machine-readable data is in [`catalog.json`](./catalog.json).

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

`catalog.json`: **365 entries**. 333 components (199 hand-reviewed, 134 auto-inventoried with low detail, 52 marked `verified: false`) and 32 catalog variable-type mappings.

| Category | Entries | High | Medium | Low |
|---|---|---|---|---|
| catalog | 29 | 6 | 3 | 20 |
| catalog-variable | 11 | 5 | 5 | 1 |
| data-display | 42 | 3 | 11 | 28 |
| feedback | 15 | 9 | 4 | 2 |
| field | 78 | 21 | 22 | 35 |
| form | 36 | 12 | 7 | 17 |
| layout | 52 | 10 | 11 | 31 |
| list | 48 | 9 | 9 | 30 |
| other | 17 | 0 | 0 | 17 |
| search | 5 | 0 | 4 | 1 |


**Our current library.**
- The host UI kit (`packages/portal-host/src/components/ui`) has `badge`, `button`, `card`, `dropdown-menu`, `popover`, `separator` and `sonner`.
- The widgets are site-header, nav-sidebar, site-footer, hello-card, server-clock, record-detail, incident-list and runtime-tests.
- We have **no form, field or input primitives yet**. Even a plain `Input` is missing from the kit, so every field row is `ourMatch: none`.

---

## 4. Coverage matrix (high and medium usefulness)

Low-usefulness and auto-inventoried rows are in `catalog.json` only.

| Tag | Category | Usefulness | Proposed primitive | Our match |
|---|---|---|---|---|
| `now-checkbox` | field | high | `ui/checkbox` (primitive) | none |
| `now-date-time` | field | high | `ui/date-picker` (primitive) | none |
| `now-input` | field | high | `app/string-field` (primitive) | none (host kit has no Input yet) |
| `now-radio-buttons` | field | high | `ui/radio-group` (primitive) | none |
| `now-record-checkbox` | field | high | `app/boolean-field` (primitive) | none |
| `now-record-date-picker` | field | high | `app/date-field / app/datetime-field` (primitive) | none |
| `now-record-html-editor` | field | high | `app/html-field` (primitive) | none |
| `now-record-number` | field | high | `app/number-field` (primitive) | none |
| `now-record-typeahead` | field | high | `ui/combobox` (primitive) | none |
| `now-record-typeahead-multiple` | field | high | `app/list-field` (primitive) | none |
| `now-select` | field | high | `ui/select` (primitive) | none |
| `now-textarea` | field | high | `app/textarea-field` (primitive) | none |
| `now-toggle` | field | high | `ui/switch` (primitive) | none |
| `sn-record-choice-connected` | field | high | `app/choice-field` (primitive) | none |
| `sn-record-control-wrapper` | field | high | `app/field` (primitive) | none |
| `sn-record-controls-internal-field-messages` | field | high | `app/field (FieldMessages part)` (primitive) | none |
| `sn-record-duration` | field | high | `app/duration-field` (primitive) | none |
| `sn-record-file-attachment` | field | high | `app/attachment-field` (primitive) | none |
| `sn-record-input-connected` | field | high | `app/string-field` (primitive) | none |
| `sn-record-journal-input` | field | high | `app/journal-field` (primitive) | none |
| `sn-record-reference-connected` | field | high | `app/reference-field` (primitive) | none |
| `now-code-editor` | field | medium | `ui/code-editor` (primitive) | partial: Portal Studio uses Monaco/CodeMirror internally |
| `now-currency-input` | field | medium | `app/currency-field` (primitive) | none |
| `now-date-range-picker` | field | medium | `ui/date-range-picker` (primitive) | none |
| `now-input-password` | field | medium | `app/password-field` (primitive) | none |
| `now-input-phone` | field | medium | `app/phone-field` (primitive) | none |
| `now-input-url` | field | medium | `app/url-field` (primitive) | none |
| `now-radio-group` | field | medium | `app/choice-field (variant=radio)` (primitive) | none |
| `now-record-time` | field | medium | `app/time-field` (primitive) | none |
| `now-typeahead` | field | medium | `ui/combobox` (primitive) | none |
| `sn-interactive-decoration` | field | medium | `app/field (FieldDecoration slot)` (primitive) | none |
| `sn-list-selector` | field | medium | `ui/transfer-list` (primitive) | none |
| `sn-record-annotation` | field | medium | `app/form-annotation` (primitive) | none |
| `sn-record-choice` | field | medium | `app/choice-field` (primitive) | none |
| `sn-record-code-editor` | field | medium | `app/code-field` (primitive) | none |
| `sn-record-conditions-connected` | field | medium | `app/condition-field` (primitive) | none |
| `sn-record-currency-connected` | field | medium | `app/currency-field` (primitive) | none |
| `sn-record-email` | field | medium | `app/email-field` (primitive) | none |
| `sn-record-input` | field | medium | `app/string-field` (primitive) | none |
| `sn-record-list-select` | field | medium | `app/slushbucket` (primitive) | none |
| `sn-record-phone-connected` | field | medium | `app/phone-field` (primitive) | none |
| `sn-record-tablename-connected` | field | medium | `app/table-name-field` (primitive) | none |
| `sn-record-url` | field | medium | `app/url-field` (primitive) | none |
| `sn-catalog-action` | catalog | high | `app/catalog-actions` (primitive) | none |
| `sn-catalog-form` | catalog | high | `app/catalog-form` (primitive) | none |
| `sn-catalog-form-connected` | catalog | high | `app/catalog-item (useCatalogForm)` (widget) | none |
| `sn-catalog-form-variable` | catalog | high | `app/variable` (primitive) | none |
| `sn-catalog-form-variable-section` | catalog | high | `app/variable-container` (primitive) | none |
| `sn-catalog-request-for` | catalog | high | `app/requested-for-field` (primitive) | none |
| `sn-catalog-description` | catalog | medium | `ui/rich-text` (primitive) | none |
| `sn-catalog-price` | catalog | medium | `app/catalog-price` (primitive) | none |
| `sn-catalog-quantity` | catalog | medium | `app/catalog-quantity` (primitive) | none |
| `sn-catalog-form-attachment-variable` | catalog-variable | high | `app/attachment-field` (primitive) | none |
| `sn-catalog-form-checkbox-variable` | catalog-variable | high | `app/boolean-field (via app/variable)` (primitive) | none |
| `sn-catalog-form-container-variable` | catalog-variable | high | `app/variable-container` (primitive) | none |
| `sn-catalog-form-multi-row-form-modal` | catalog-variable | high | `app/mrvs (row editor)` (primitive) | none |
| `sn-catalog-form-multi-row-variable` | catalog-variable | high | `app/mrvs` (primitive) | none |
| `sn-catalog-form-label-variable` | catalog-variable | medium | `app/form-annotation` (primitive) | none |
| `sn-catalog-form-macro-variable` | catalog-variable | medium | `app/variable-custom (renders one of our components)` (primitive) | none |
| `sn-catalog-form-masked-variable` | catalog-variable | medium | `app/password-field (confirm)` (primitive) | none |
| `sn-catalog-form-multiple-select` | catalog-variable | medium | `app/list-field` (primitive) | none |
| `sn-catalog-form-rich-text-label-variable` | catalog-variable | medium | `ui/rich-text` (primitive) | none |
| `now-condition-builder-connected` | list | high | `app/condition-builder` (primitive) | none |
| `now-condition-builder-preview` | list | high | `app/filter-breadcrumbs` (primitive) | none |
| `now-list` | list | high | `app/data-table` (primitive) | none |
| `now-pagination-control` | list | high | `ui/pagination` (primitive) | none |
| `now-predicate-builder` | list | high | `app/condition-builder` (primitive) | none |
| `now-record-list` | list | high | `app/data-table` (primitive) | partial: IncidentRow part in incident-list |
| `now-record-list-connected` | list | high | `app/record-list` (widget) | partial: incident-list widget (hard-coded table/columns) |
| `now-record-list-connected-related` | list | high | `app/related-list` (widget) | none |
| `now-table` | list | high | `ui/table` (primitive) | none |
| `now-data-set` | list | medium | `ui/data-view` (primitive) | none |
| `now-dot-walk` | list | medium | `app/field-picker` (primitive) | none |
| `now-filter-overview` | list | medium | `app/filter-breadcrumbs` (primitive) | none |
| `now-grid` | list | medium | `ui/table` (primitive) | none |
| `now-list-cell-editor-content` | list | medium | `app/cell-editor` (primitive) | none |
| `now-record-list-connected-snapshot` | list | medium | `app/record-list (variant=compact)` (primitive) | none |
| `now-record-list-filter-panel` | list | medium | `app/record-list (filter panel part)` (primitive) | none |
| `sn-quick-filter` | list | medium | `app/quick-filter` (primitive) | none |
| `sn-record-list-column-filter-value-input` | list | medium | `app/column-filter` (primitive) | none |
| `now-activity-stream-compose-connected` | form | high | `app/journal-composer` (primitive) | none |
| `now-activity-stream-connected` | form | high | `app/activity-stream` (widget) | none |
| `now-record-common-attachments-connected` | form | high | `app/attachments` (widget) | none |
| `now-record-common-header` | form | high | `app/record-header` (primitive) | none |
| `now-record-common-uiactionbar` | form | high | `app/ui-action-bar` (primitive) | none |
| `now-record-form-connected` | form | high | `app/form` (widget) | partial: record-detail widget (shows route params only) |
| `now-record-form-section-column-layout` | form | high | `app/form-columns` (primitive) | none |
| `now-record-form-section-connected` | form | high | `app/form-section` (primitive) | none |
| `now-record-related-list-tab-content` | form | high | `app/related-list-tabs` (primitive) | none |
| `sn-form-data-connected` | form | high | `app/form (useForm + FormProvider)` (primitive) | none |
| `sn-form-internal-client-scripting-environment` | form | high | `app/form-runtime (g_form compatibility shim)` (primitive) | none |
| `sn-record-watcher` | form | high | `useRecordWatch (hook)` (primitive) | none |
| `now-activity-combo` | form | medium | `app/activity-stream` (primitive) | none |
| `now-record-compact` | form | medium | `app/record-card` (primitive) | none |
| `now-record-form-blob` | form | medium | `app/record-page` (widget) | none |
| `sn-declarative-actions-mediator` | form | medium | `app/actions (useActions)` (primitive) | none |
| `sn-record-common-quick-form` | form | medium | `app/quick-form` (primitive) | none |
| `sn-record-ribbon` | form | medium | `app/record-ribbon` (primitive) | none |
| `sn-scripted-modal` | form | medium | `app/scripted-modal` (primitive) | none |
| `now-accordion` | layout | high | `ui/accordion` (primitive) | none |
| `now-breadcrumbs` | layout | high | `ui/breadcrumbs` (primitive) | partial: site-header shows route breadcrumbs via RegionPortal |
| `now-button` | layout | high | `ui/button` (primitive) | match: components:button |
| `now-card` | layout | high | `ui/card` (primitive) | match: components:card (shadcn Card) |
| `now-dropdown` | layout | high | `ui/dropdown-menu` (primitive) | match: components:dropdown-menu |
| `now-modal` | layout | high | `ui/dialog` (primitive) | none |
| `now-popover` | layout | high | `ui/popover` (primitive) | match: components:popover |
| `now-sheet` | layout | high | `ui/sheet` (primitive) | none |
| `now-tabs` | layout | high | `ui/tabs` (primitive) | none |
| `now-tooltip` | layout | high | `ui/tooltip` (primitive) | none |
| `now-collapse` | layout | medium | `ui/collapsible` (primitive) | none |
| `now-content-tree` | layout | medium | `ui/tree` (primitive) | none |
| `now-contextual-sidebar` | layout | medium | `app/side-panel` (primitive) | partial: nav-sidebar widget |
| `now-flyout-menu` | layout | medium | `ui/dropdown-menu (submenus)` (primitive) | partial: components:dropdown-menu |
| `now-grouped-button` | layout | medium | `ui/toggle-group` (primitive) | none |
| `now-heading` | layout | medium | `ui/heading` (primitive) | none |
| `now-resizable-panes` | layout | medium | `ui/resizable` (primitive) | none |
| `now-split-button` | layout | medium | `ui/split-button` (primitive) | none |
| `now-stepper` | layout | medium | `ui/stepper` (primitive) | none |
| `now-text-link` | layout | medium | `ui/link` (primitive) | match: @portal/runtime Link |
| `now-uxf-tab-set` | layout | medium | `app/page-tabs` (primitive) | none |
| `now-alert` | feedback | high | `ui/alert` (primitive) | none |
| `now-alert-list` | feedback | high | `ui/toast` (primitive) | match: components:sonner (toasts) |
| `now-avatar` | feedback | high | `ui/avatar` (primitive) | none |
| `now-badge` | feedback | high | `ui/badge` (primitive) | match: components:badge |
| `now-empty-state` | feedback | high | `ui/empty-state` (primitive) | none |
| `now-highlighted-value` | feedback | high | `app/highlighted-value` (primitive) | partial: components:badge (no config-driven colours) |
| `now-loader` | feedback | high | `ui/spinner` (primitive) | none |
| `now-loader-skeleton` | feedback | high | `ui/skeleton` (primitive) | none |
| `now-pill` | feedback | high | `ui/chip` (primitive) | none |
| `now-confirmation-message` | feedback | medium | `ui/confirm-dialog` (primitive) | none |
| `now-pill-list` | feedback | medium | `ui/chip-list` (primitive) | none |
| `now-progress-bar` | feedback | medium | `ui/progress` (primitive) | none |
| `now-template-message` | feedback | medium | `ui/empty-state` (primitive) | none |
| `now-icon` | data-display | high | `ui/icon` (primitive) | partial: lucide icons in shadcn |
| `now-label-value-stacked` | data-display | high | `ui/label-value` (primitive) | none |
| `now-rich-text` | data-display | high | `ui/rich-text` (primitive) | none |
| `now-calendar` | data-display | medium | `app/calendar` (widget) | none |
| `now-chart-bar` | data-display | medium | `ui/chart` (primitive) | none |
| `now-image` | data-display | medium | `ui/image` (primitive) | none |
| `now-label-value-inline` | data-display | medium | `ui/label-value (layout=inline)` (primitive) | none |
| `now-score-basic` | data-display | medium | `ui/stat` (primitive) | none |
| `now-sla-timer` | data-display | medium | `app/sla-timer` (primitive) | none |
| `now-uxf-visualization-connected` | data-display | medium | `app/visualization` (widget) | none |
| `now-vis-timeseries` | data-display | medium | `ui/chart` (primitive) | none |
| `now-visual-board` | data-display | medium | `app/kanban` (widget) | none |
| `sn-component-timeline` | data-display | medium | `ui/timeline` (primitive) | none |
| `sn-contact-card` | data-display | medium | `app/user-card` (primitive) | none |
| `sn-component-workspace-global-search-typeahead` | search | medium | `app/search-box` (primitive) | none |
| `sn-search-combobox` | search | medium | `app/search-box` (primitive) | none |
| `sn-search-facets` | search | medium | `app/search-facets` (primitive) | none |
| `sn-search-results-container` | search | medium | `app/search-results` (widget) | none |


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
| 11 | `app/html-field` (+ `ui/rich-text` read-only) | `now-record-html-editor`, `now-rich-text` | attachment upload for inline images |
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
