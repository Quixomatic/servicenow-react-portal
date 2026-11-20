---
title: Record header, ribbon and cards
description: app/record-header (highlighted values, presence), app/record-ribbon, app/record-card (reference preview), app/contact-card and app/quick-form — record summaries with no configuration.
section: Primitives and utilities
order: 4
tags: [forms, header, ribbon, presence, highlighted-value, record-card, contact-card, quick-form]
---

# Record header, ribbon and cards

Five record primitives summarise a record. All of them work **with no configuration**: field choices are built-in defaults, and colours and header fields come from the platform's own Workspace configuration. Everything is read as the current user. `app/record-form` uses the header and the ribbon automatically.

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

- **Title:** number, else name, else short description (the record's *saved* values, not unsaved edits). The subtitle is the short description; when the view doesn't have it, the platform header's primary field fills in.
- **Highlighted values** (at most 3, in this order): the record's status fields that have a value (`state`, `stage`, `request_state`, `approval`, `workflow_state`); the platform header's secondary fields whose highlight rule matched (e.g. incident Priority, change Risk); then priority-like fields with a matched platform rule.
- **Colours:** the platform evaluates its own highlighted-value rules (`sys_highlighted_value` and its conditions) on the server, as the user. The form bootstrap now carries `formLayout.highlightedValueStyle` as `bootstrap.highlights`, and the header reads `GlideHeaderQuery_Query.headerItems`. A field with no matching rule uses `app/highlighted-value`'s heuristics (`toneFor`). Platform colour names map to tones in `toneForPlatform`: critical → danger, high → high (orange), moderate / warning → warning, info / blue → progress, positive / green → success, low / gray → neutral.
- **Badges:** Read only (the view has no Save action) and New. A new record shows no highlighted values, because its defaults aren't saved yet.
- **Presence:** the avatars of the other users on the record, described below.

Hooks:

| Export | Returns |
|---|---|
| `useRecordHeaderData(table, sysId)` | The platform header (`headerItems`: `sys_aw_form_header` primary and secondary fields, with highlight styles), cached under the record's key so the record watch refreshes it |
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

The ribbon sits above the form in `app/record-form` (option `ribbon`, default on; never on new records). Default fields by table:

| Table | Fields |
|---|---|
| incident | caller, priority, state, assigned to, updated |
| sc_req_item | requested for, item, stage, due date |
| sc_request | requested for, request state, price, due date |
| sc_task | requested item, assigned to, state, due date |
| problem | priority, state, assigned to, updated |
| change_request | type, risk, state, planned start, assigned to |
| change_task, kb_knowledge, sys_user_group | their own short lists |
| other tables | the platform header's secondary fields (`sys_aw_form_header`) if it has a header config; else assigned to, priority, state, updated (tables with a number), else updated by, updated |

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
- Hooks: `useRecordSummary(table, sysId, { fields? })`, `summaryFieldsFor(table, meta, platformFields?)` (the defaults table above), `titleFieldFor(meta)`.

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

## Configuration (not built)

A minimal configuration (one table of ordered header / ribbon fields per portal and table) is proposed in `.plans/record-header-config.md`, pending a decision.
