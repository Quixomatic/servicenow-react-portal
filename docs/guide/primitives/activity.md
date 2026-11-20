---
title: Activity and journals
description: utilities:app/activity, app/activity-stream, app/journal-composer, app/journal-field and the app/activity-card widget — a record's activity stream, work notes and comments.
section: Primitives and utilities
order: 7
tags: [activity, journal, work-notes, comments, amb, feed]
---

# Activity and journals

A record's activity (journal entries, field changes, attachments, emails, relationship changes) comes from the same platform calls Workspace's activity stream makes. Posting work notes and comments uses the platform's own journal call. Updates arrive live over the stream's AMB channel.

| Piece | Kind | What |
|---|---|---|
| `utilities:app/activity` | utility | Headless data: fetch, filter, post, live |
| `components:app/activity-stream` | primitive | The feed (`ActivityStream`), composer + feed (`RecordActivity`), chat-style `ActivityConversation`, the opt-in form modes |
| `components:app/journal-composer` | primitive | Work notes / Additional comments switch, plain text, Post |
| `components:app/journal-field` | primitive | The journal field `app/field-control` renders for `journal_input` / `journal` / `journal_list` |
| `app/activity-card` | widget | A placeable conversation card ("Ticket conversations") |

## Platform calls

| Step | Call |
|---|---|
| Stream | GraphQL `GlideActivity_Query.getEvents(documents, view)`: events, the table's filter configuration (`filterFields`), authors (`userReferences`), AMB channels. `glide.activity.api_version = 1` on the instance |
| Post | GraphQL `GlideActivity_Mutation.putJournal(documentTable, documentSysId, field, value)`, as Workspace's compose box |
| Who may write | `GlideRecord_Query.<table> { <journal field> { canWrite } }` (field ACLs) |
| Email body | `GlideActivity_Query.getEmailBodies`, when the user expands an email |
| Truncated entry | `GET /api/now/ui/stream_entry/full_entry?sysparm_sys_id=` (the platform UI API Workspace uses) |
| Live | AMB `/activity/events/<sys_id>`: each new, changed or removed event as data, applied to the cache in place |

There's no REST wrapper of our own, and every call runs with the user's session, so ACLs apply.

## `utilities:app/activity`

```ts
import { useActivity, useActivityFilters, usePostJournal } from 'utilities:app/activity'

const filter = useActivityFilters('incident', sysId)                         // seeded from the platform's configuration
const activity = useActivity('incident', sysId, { filters: filter.filters })  // same request, filtered
const journal = usePostJournal('incident', sysId)
await journal.post('work_notes', 'Rebooted the server')
```

| Hook | Returns |
|---|---|
| `useActivity(table, sysId, { filters?, view?, live?, enabled? })` | `entries` (filtered, newest first), `allEntries`, `filterFields`, `data`, `loading`, `fetching`, `error`, `refetch`, `liveStatus`, `arrived` (keys that arrived live) |
| `useActivityFilters(table, sysId, { view?, initial? })` | `filters`, `kinds` / `journalFields` / `fields` with counts and selection, `toggleKind`, `onlyKind`, `toggleJournalField`, `toggleField`, `search` / `setSearch`, `reset`, `isDefault` |
| `usePostJournal(table, sysId)` | `post(field, value)`, `posting`, `error`, `reset`; refetches the stream after a post |
| `useJournalFields(table, sysId, { only? })` | The table's journal fields with `label`, `writable` (dictionary + ACL), `internal`, `help`, `maxLength` |
| `useEmailBody(sysId, { enabled })`, `useFullJournalEntry(sysId, { enabled })` | On-demand content |
| `useInvalidateActivity()`, `useNow(ms)` | Refetch a stream; a ticking clock for relative times |

Plain functions: `fetchActivity`, `postJournal`, `fetchEmailBody`, `fetchFullJournalEntry`, `fetchJournalAccess`, `normalizeActivity`, `normalizeEvent`, `applyActivityMessage`, `applyActivityFilters`, `defaultFiltersFrom`, `countActivity`, `groupByDay`, `dayLabel`, `relativeTime`, `formatBytes`, `initialsOf`; documents `ACTIVITY_QUERY`, `PUT_JOURNAL_MUTATION`, `EMAIL_BODY_QUERY`; keys `activityKeys`.

`ActivityEntry` has `kind` (`journal`, `audit`, `attachment`, `email`, `relation`, `other`), `author` (display name, initials, avatar), `createdAt` (epoch ms) and `createdAtDisplay` (the user's format and zone). It also carries the data for its kind: `field` + `content` (journal), `changes` (`{ label, oldValue, newValue }`, with `initial` on the creation entry), `attachment`, or `email`.

> **Note:** Only the fields the platform's activity configuration lists for the table appear as field changes (the formatter's field list). That's the server's choice, not ours.

## `<ActivityStream>` and `<RecordActivity>`

```tsx
import { ActivityStream, RecordActivity } from 'components:app/activity-stream'

<RecordActivity table="incident" sysId={sysId} />                       // composer above the stream
<ActivityStream table="incident" sysId={sysId} kinds={['journal']} pageSize={10} />
```

| Prop | Meaning |
|---|---|
| `table`, `sysId`, `view` | The record (the view scopes the filter configuration) |
| `title`, `headingLevel` | Heading (`''` hides it) |
| `showFilters` | Filter chips: one per journal field (Work notes, Additional comments), Field changes, Attachments, Emails…, plus a **Fields** menu for the audited fields and Reset |
| `initialFilters`, `kinds` | Start filtered; never show other kinds |
| `pageSize` | Entries before **Show more** (default 20) |
| `groupByDay`, `compact`, `live`, `emptyText` | |
| `renderAttachment(entry)` | Custom attachment entries |

`RecordActivity` also takes `composer`, `journalFields`, `defaultJournalField` and `form`. It stacks the composer above the stream; there is no side-by-side layout.

- **Journal entries:** work notes have the platform's yellow tint and an "internal" lock; comments stay plain. HTML is sanitised by `components:rich-text`, and line breaks are kept. A truncated entry offers **Show the full entry**.
- **Field changes:** label, old value (struck through) → new value. The record's creation entry lists the initial values.
- **Attachments:** name, size, type icon, an image thumbnail and a download link. A removed file is struck through. `registerActivityAttachmentRenderer(fn)` is the seam for `utilities:app/attachments`.
- **Emails:** subject, from / to / cc, and the body on demand.
- **Times:** relative ("5 minutes ago"), with the exact time on hover. Entries are grouped under Today, Yesterday, a weekday, or a date, in the user's ServiceNow time zone.
- **Live:** new entries appear without a reload. Others' entries are announced politely, and fresh entries are highlighted for a few seconds.

### Accessibility

The stream is a WAI-ARIA **feed**: `role="feed"` with `article` entries (`aria-posinset`, `aria-setsize`, labelled "Work notes by Beth Anglin, 5 minutes ago (…)").

| Key | Action |
|---|---|
| Page Down / Page Up | Next / previous entry (Page Down on the last one shows more) |
| ↓ / ↑, Home / End (on an entry) | Next / previous, first / last |
| Ctrl+End / Ctrl+Home | Leave the feed (after / before) |

Filter chips are toggle buttons (`aria-pressed`). The day headings are decorative, because each entry's label carries its date.

## `<JournalComposer>`

```tsx
<JournalComposer table="incident" sysId={sysId} />                         // posts at once
<JournalComposer table="incident" sysId={sysId} form={recordForm} />       // bound to a form
```

- **Switch:** a radio group (arrow keys, Home / End) of the journal fields the user may write on this record. A dot marks a field with unsent text. With one writable field it shows just a label; with none, a short notice.
- **Plain text,** as the platform stores journals. Ctrl/⌘+Enter posts. The box clears and the stream refreshes.
- **Bound to a form:** the text is the form's journal value. `g_form.getValue('work_notes')` sees it, `g_form.setMandatory` / UI policies apply, and a form Save posts it with the rest. When other fields are unsaved, **Post** becomes **Post and save** and runs the form's Save, so the edits and the entry land in one platform save, with no false "changed by someone else" from our own post.

Props: `table`, `sysId`, `form`, `fields`, `defaultField` (else work notes when writable), `placeholder`, `rows`, `autoFocus`, `onPosted`, `label`. Also exported: `JournalSwitch`, `useComposerFields`.

## `<JournalField>`

`app/field-control` renders `journal_input` and `journal` with `components:app/journal-field`. `journal_list` (e.g. `comments_and_work_notes`) renders read-only, as the combined history.

It's a field like any other: label, required marker, messages, dirty marker, and `g_form`. The value is the **new** entry, and a form save posts it. Work notes are tinted and badged "Internal", and a line says who can see the entry.

Exports: `JournalField`, `useAutoGrow(ref, value, { rows, maxRows })`, `journalTone(name)`, `isInternalJournalField(name)`, `JOURNAL_HELP`.

## In record forms (opt-in)

James hasn't chosen how the activity should sit next to a form, so `RecordForm` shows it only on request. The prop is `activity` (widget option `activity`):

| Value | What |
|---|---|
| `off` (default) | Nothing changes: journal fields render as `app/journal-field`, and a form save posts them |
| `notes` | The composer and stream take the place of the view's first journal input, as in the classic Notes section (the platform lists formatters without a position, so `activity.xml` never appears in the rows). The other journal inputs move into the composer. With no journal input on the view, the activity goes below the sections |
| `below` | Under the sections; the journal inputs move into the composer |

Both modes are stacked; there is no side-by-side layout. New records keep plain journal fields. Helpers: `activityElementRenderer({ form, mode, renderElement })`, `ActivityBelowForm`, `activityAnchor(bootstrap)`, `formActivityMode(value)`.

## Presentations

The pieces compose into any presentation. The sp **Activity** page shows four, for comparison:

- **A · Timeline:** `RecordActivity`, with the composer on top, filter chips and day headings.
- **B · Side panel:** `RecordActivity compact groupByDay={false} composerRows={2}`, without filters.
- **C · Conversation:** `ActivityConversation`, with chat bubbles, oldest first, your own messages on the right, field changes as quiet system lines and the composer at the bottom (comments + attachments by default; `role=log`).
- **D · In the form:** `app/record-form` with `activity: notes`.

## `app/activity-card` widget

| Option | Meaning |
|---|---|
| `variant` | `timeline` (default), `conversation`, `compact` |
| `table`, `sysId` | The record; each falls back to the route params, then the URL params |
| `title`, `showRecord` | Title; number and short description, linking to `recordPage` |
| `composer`, `journalFields`, `defaultJournalField` | The composer (`journalFields: 'comments'` gives a requester-style conversation) |
| `kinds` | Comma list of entry kinds (`journal,attachment`) |
| `showFilters`, `pageSize`, `recordPage` | |

Demo: sp ▸ Components ▸ **Activity** (the presentation variants above, on one test incident).

## Not built yet

@mentions, rich-text journals (`glide.ui.journal.use_html`), editing and deleting entries, saved filter sets, remembering the user's filters, email reply actions, and the "new since your last visit" marker.

## Related

- [Forms](forms.md)
- [Fields](fields.md)
- [Live updates](../runtime-api/live-updates.md)
