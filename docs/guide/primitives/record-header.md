---
title: Record header, ribbon and cards
description: app/record-header (title, subtitle, highlighted values, presence), app/record-ribbon, app/record-card (reference preview), app/contact-card and app/quick-form — record summaries, with the header and ribbon fields configured as Record Header Field rows.
section: Primitives and utilities
order: 4
tags: [forms, header, ribbon, presence, highlighted-value, record-card, contact-card, quick-form, record-header-field, configuration]
---

# Record header, ribbon and cards

Five record primitives summarise a record. **Which fields** the header and ribbon show is configuration: rows of the **Record Header Field** table (`x_312987_portal_record_field`, see [Configuring the header and ribbon](#configuring-the-header-and-ribbon)), shipped with defaults for the common tables. A slot with no rows falls back to built-in choices in code. **Colours** stay the platform's own highlighted-value rules. Everything is read as the current user. `app/record-form` uses the header and the ribbon automatically.

| Component | Next Experience counterpart | What it is |
|---|---|---|
| `components:app/record-header` | `now-record-common-header`, `now-record-common-record-presence` | The record's title block: table label, title, highlighted values, Read only / New badges, presence avatars, short description |
| `components:app/record-ribbon` | `sn-record-ribbon` (fields only) | A strip of the record's key values above the form |
| `components:app/record-card` | `now-record-compact`, `sn-interactive-decoration` (reference preview) | A compact record card, and the reference preview popover |
| `components:app/contact-card` | `sn-contact-card` | A person: photo, name, title, email / phone, Open record |
| `components:app/quick-form` | `sn-record-common-quick-form` | A small create / edit form for a few fields, inline or in a dialog |

## Record header (`app/record-header`)

```tsx
import { RecordTitle } from 'components:app/record-header';

<RecordTitle form={form} variant="banner" />   // 'banner' | 'bar' | 'inline'
```

`app/record-form` renders it in every header placement (banner sub-header, bar sub-header, the card's own header). Its parts:

- **Title** and **subtitle:** the `title` and `subtitle` rows (shipped: `number` and `short_description` on task, so every task table). The record's *saved* values, not unsaved edits; a field the view doesn't have comes from the server with the configuration. With no rows: number, else name, else short description, and the short description under a number (else the platform header's primary field).
- **Highlighted values (pills):** the `pill` rows, in order, each shown when it has a value. With no rows (at most 3, in this order): the record's status fields that have a value (`state`, `stage`, `request_state`, `approval`, `workflow_state`); the platform header's secondary fields whose highlight rule matched (e.g. incident Priority, change Risk); then priority-like fields with a matched platform rule. A pill shows the field's display value, or the platform rule's value override.
- **Colours:** the platform evaluates its own highlighted-value rules (`sys_highlighted_value` and its conditions) on the server, as the user. The form bootstrap now carries `formLayout.highlightedValueStyle` as `bootstrap.highlights`, and the header reads `GlideHeaderQuery_Query.headerItems`. A field with no matching rule uses `app/highlighted-value`'s heuristics (`toneFor`). Platform colour names map to tones in `toneForPlatform`: critical → danger, high → high (orange), moderate / warning → warning, info / blue → progress, positive / green → success, low / gray → neutral.
- **Badges:** Read only (the view has no Save action) and New. A new record shows no highlighted values, because its defaults aren't saved yet.
- **Presence:** the avatars of the other users on the record, described below.

Hooks:

| Export | Returns |
|---|---|
| `useRecordHeaderData(table, sysId)` | One request: the platform header (`headerItems`: `sys_aw_form_header` primary and secondary fields, with highlight styles) and the resolved Record Header Fields with their values (`data.config`); cached under the record's key so the record watch refreshes it |
| `configuredSlot(data, slot)` | A slot's configured fields (`{ field, label, type, refTable, value, displayValue, sourceTable, scope }[]`), or `null` when the slot has no rows (use the default) |
| `useHighlightedValueConfig(form, header?)` | `{ field: style }`: the bootstrap's platform styles merged with the header's |
| `useRecordHeaderModel(form)` | `{ title, subtitle, tableLabel, highlights, header }`: everything the title block shows |
| `pickHeaderHighlights({ values, meta, header, highlights })` | The highlight selection above, as a pure function |
| `useSavedValue(form, field)` | A field's saved display value |

### Presence

```tsx
import { usePresence, RecordPresence } from 'components:app/record-header';

const { users } = usePresence({ table, sysId, status: dirty ? 'typing' : 'viewing' });
<RecordPresence users={users} />
```

Presence uses the platform's AMB channel `/sn/rp/<table>/<sys_id>`, the one Workspace uses, with the same message shape, so portal users and Workspace agents see each other.

**How the channel behaves** (checked on dev189813): the server only relays messages. It sends nothing when a client subscribes or leaves, and nobody gets a list of current viewers. Only `ext.from_user` (the sender's user name) is set by the server. So each client:

- announces itself when its subscription opens, again when it sees someone new, and every 60 seconds;
- says `exited` when it leaves (unmount or page hide);
- forgets anyone it hasn't heard from in 150 seconds;
- ignores its own entries and any entry whose `user_name` isn't the server-stamped sender (no spoofed avatars).

Status is `viewing`, or `typing` while the form has unsaved changes (shown as **Editing**, amber dot). Workspace clients publish only while typing in a journal field, so they appear then and fade out afterwards. `RecordPresence` is a button that lists everyone with their status.

The `app/record-form` option `presence: false` hides it.

## Record ribbon (`app/record-ribbon`)

```tsx
<RecordRibbon table="incident" sysId={id} onOpen={openRecord} />
<RecordRibbon table sysId fields={['caller_id', 'state']} highlights={bootstrap.highlights} />
```

The ribbon sits above the form in `app/record-form` (option `ribbon`, default on; never on new records; a field list overrides the configuration). Its fields are the `ribbon` rows (shipped rows below); they arrive with their values in the header's request, so a configured ribbon makes no request of its own. Ribbon rows may dot-walk (`caller_id.department`).

With no ribbon rows for the table, the built-in defaults (`SUMMARY_DEFAULTS` in `app/record-card`) apply: incident caller, priority, state, assigned to, updated; RITM requested for, item, stage, due date; and so on. Other tables use the platform header's secondary fields (`sys_aw_form_header`) if it has a header config, else assigned to, priority, state, updated (tables with a number), else updated by, updated.

Values render in their read modes (`SummaryValue` from `app/record-card`):

- references show as a preview link;
- statuses and levels show as highlighted values;
- booleans show as Yes / No;
- empty values show as "—".

On a phone the ribbon has two columns; from `sm` it is one wrapping row. `useRecordRibbon(options)` returns the items without the markup.

## Record card and reference preview (`app/record-card`)

```tsx
<RecordCard table="incident" sysId={id} onOpen={openRecord} />
<RecordPreview table="sys_user" sysId={callerId} label="Abel Tuter" onOpen={openRecord} />
```

- `RecordCard` shows a title, a subtitle and the key fields as label / value rows, with an **Open record** button. Leave `onOpen` out to open the classic form in a new tab, or pass `null` to hide the button.
- `RecordPreview` is the display value as a button that opens a popover with the card. Users get `app/contact-card` instead. `trigger="icon"` gives an info button.
- **Reference fields** (`app/reference-field`) show the preview when they have a value: an info button in the control, or in the label row when read-only (FieldShell's adornment slot). **Open record** uses the surrounding form's `openRecord`, which guards unsaved changes and navigates in the portal. `preview={false}` turns it off.
- The card follows the configuration too: title and subtitle rows, and as key fields the pill rows then the ribbon rows (when the table has ribbon rows). Otherwise the built-in defaults.
- Hooks: `useRecordSummary(table, sysId, { fields? })`, `summaryFieldsFor(table, meta, platformFields?)` (the built-in defaults), `titleFieldFor(meta)`.

## Contact card (`app/contact-card`)

```tsx
<ContactCard userId={sysId} onOpen={openRecord} />
const { contact } = useContact(sysId);
```

It shows the photo (host kit `components:avatar`, initials when there's no photo), name, VIP and inactive markers, title, department, location, an email link and a phone link. The sys_user ACLs apply: a field the user can't read comes back empty and isn't shown, so roleless users typically see only the name. `userPhotoUrl(avatar)` turns `sys_user.avatar` into an image URL.

## Quick form (`app/quick-form`)

```tsx
<QuickForm table="incident" sysId={id} fields={['short_description', 'urgency']} onSaved={…} />
<QuickFormDialog open={open} onOpenChange={setOpen} table="incident" title="New incident"
    fields={['caller_id', 'short_description', 'urgency']} query="parent=…" onSaved={(id) => …} />
```

The quick form runs on the full form runtime (`useRecordForm`): UI policies, client scripts, ACLs, and the platform's Save / Submit UI action. It uses the default view, without portal view rules.

- Loading a **new** record reserves a number, as on any platform form. The dialog mounts the form only while it is open.
- Mandatory fields that aren't in `fields` still block the save; their messages are listed above the buttons.
- `useQuickForm(options)` returns the form model for your own layout.

## Demo

- sp ▸ **Record form** (`form` page): the header and ribbon on incidents, RITMs and every other table.
- sp ▸ **Fields** (`record-cards-demo`): a record card, a contact card, reference previews, an inline quick edit and a **New incident** quick-form dialog.

## Configuring the header and ribbon

The header and ribbon fields are rows of **Record Header Fields** (`x_312987_portal_record_field`; React Portal ▸ Record Header Fields, or the portal form's related list). One row is one field in one slot:

| Column | Meaning |
|---|---|
| Table | The table the row applies to. Child tables inherit it: a row on `task` applies to incident, problem, … unless they have rows of their own for that slot |
| Slot | `title`, `subtitle`, `pill` (highlighted value next to the title) or `ribbon` |
| Field | A field of the table. Ribbon rows may dot-walk (`caller_id.department`) |
| Label | Optional; empty = the field's label |
| Order | Lower first |
| Portals | Empty = every portal; else only the listed portals |
| Roles | Empty = everyone; else only users with any of these roles |
| Active | Inactive rows are ignored |

### How a slot is resolved

For a record, each slot is resolved on its own, for the current user and portal:

1. **Candidates:** active rows on the record's table or one of its parents, whose Portals is empty or lists the portal, and whose Roles the user has (rows you lack the roles for don't exist for you).
2. **The most specific group wins**, ranked:
   1. the record's exact table beats its parent, the parent beats the grandparent (incident beats task);
   2. then rows that list the portal beat all-portal rows.
3. **Inside the winning group**, rows go by Order:
   - `pill` and `ribbon` show every row of the group;
   - `title` and `subtitle` take the first row only.
4. The winning rows **replace** the slot's built-in default; nothing is merged. A slot with no candidate rows keeps the default.

So adding one incident `ribbon` row replaces the whole incident ribbon. Incident still inherits task's title, subtitle and pills, because those slots have no incident rows. Deactivating every row of a slot brings the built-in default back.

Values are read as the user: a field they can't read is left out. Colours come from the platform's highlighted-value rules (`sys_highlighted_value`), as before. Edit those to change a colour; Workspace shares them.

### Shipped rows

All-portal rows, installed with the application as demo data, so you can edit or deactivate them:

| Table | Title / subtitle | Pills | Ribbon |
|---|---|---|---|
| task (every task table) | number / short description | state, priority | (built-in default) |
| incident | (task's) | (task's) | caller, assigned to, updated |
| problem | (task's) | (task's) | assigned to, updated |
| sc_req_item | (task's) | state, stage | requested for, item, due date |
| sc_request | (task's) | request state, approval | requested for, price, due date |
| sc_task | (task's) | state, approval | requested item, assigned to, due date |
| change_request | (task's) | state, approval, risk | type, planned start, assigned to |
| change_task | (task's) | state | change request, assigned to, planned end |
| kb_knowledge | (built-in) | workflow | knowledge base, author, updated |
| sys_user_group | (built-in) | (built-in) | manager, email, type |

The ribbons leave out the fields the pills already show (incident's priority and state, RITM's stage, …).

### Examples

- **Description under incident numbers:** an incident `subtitle` row, field `description`. Every other task table keeps task's short description.
- **Add the caller's department to the incident ribbon:** add an incident `ribbon` row `caller_id.department`, order 400 (after the three shipped rows).
- **A different ribbon on one portal:** rows with Portals = that portal. On that portal they beat the all-portal rows for the same table; other portals are unaffected.
- **A field only agents see:** a row with Roles `itil`. Other users get the next most specific group for that slot.

### How it is read

`useRecordHeaderData` asks for the configuration in the **same GraphQL request** as the platform header (`x312987Portal { recordFields { resolve(table, portal, sysId) } }` next to `GlideHeaderQuery_Query.headerItems`), so a form load makes no extra request. The server resolves the rows (one query on the table and its parents) and reads the configured fields' values as the user. Nothing is cached: an edited row shows on the next load.
