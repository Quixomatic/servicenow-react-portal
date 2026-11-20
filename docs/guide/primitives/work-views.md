---
title: Work views
description: app/calendar-view, app/visual-board, app/timeline and app/sla-timer — records on a calendar, a kanban board, a timeline and live SLA timers — plus app/record-update, the headless form save they write through.
section: Primitives and utilities
order: 15
tags: [calendar, kanban, board, timeline, sla, drag-and-drop, record-update, dnd-kit]
---

# Work views

Four record primitives show work in other shapes than a list or a form, and one primitive writes their changes back. Each has a placeable widget for pages. Everything is read **as the current user** (ACLs apply) and stays live through the record watch.

| Primitive | Widget | Next Experience counterpart | What it is |
|---|---|---|---|
| `components:app/calendar-view` | `app/record-calendar` | `now-calendar` | Month, week, day and agenda views of any table's records; event cards; drag to reschedule |
| `components:app/visual-board` | `app/record-board` | `now-visual-board` | A kanban board: one lane per value of a choice or reference field; drag cards between lanes |
| `components:app/timeline` | `app/timeline-card` | `sn-component-timeline` | A vertical timeline grouped by day: a record's history, or records placed by a date field |
| `components:app/sla-timer` | `app/sla-card` | `now-sla-timer` | A task's SLAs as live timers: time left, elapsed bar, breached / paused / achieved |
| `components:app/record-update` | — | — | Change a few fields of a record through the platform's form save, headless |

Demos (sp portal, **Components** menu): **Calendar**, **Board**, **Timeline & SLA**.

## Writing changes: `app/record-update`

Board moves and calendar reschedules don't call the Table API. They run the record's own form save, so every rule applies as it would on the form:

```tsx
import { useRecordUpdate, updateWithUndo } from 'components:app/record-update';

const updater = useRecordUpdate();
const outcome = await updater.update({ table: 'incident', sysId, values: { state: '6' }, label: 'INC0010001' });
// or: save, then a toast with Undo (which writes the previous values back the same way)
await updateWithUndo(updater, request, { state: '2' }, { success: 'INC0010001 moved to Resolved' });

return <>{…}{updater.element}</>;   // render once: it hosts the hidden forms and the dialog
```

How it works:

1. Each request mounts an invisible `app/form` record form (`useRecordForm`): the record's form view, UI policies, client scripts and field ACLs.
2. If the form is read-only for the user, or a field is read-only (dictionary, ACL, UI policy), it stops with `reason: 'readonly'`.
3. It sets the values, lets `onChange` scripts and UI policies react, then runs the form's **Save UI action**. Business rules, data policies and ACLs run on the server; their messages come back as toasts.
4. **When the form needs more**, a dialog shows the missing fields with the new values filled in. For example, moving an incident to Resolved makes the resolution code and notes mandatory. Cancel rolls back.
5. A field that isn't on the record's form view is written through the list edit path instead (`utilities:app/list-data` `writeCells`), where business rules and ACLs still apply.

Values are glide internal values (sys_ids, choice values, UTC date-times). **Date and date-time fields also need `displayValue`** in the user's format and zone (`{ value: '2024-05-20 16:00:00', displayValue: '2024-05-20 09:00:00' }`): the form holds them as the user sees them, so the form path sends the display value and the list path the UTC value. Each request reads a fresh form bootstrap, and a save that hits a `sys_mod_count` conflict reads again and retries once.

Outcome: `{ ok: true, path: 'form' | 'list' }` or `{ ok: false, reason: 'cancelled' | 'readonly' | 'invalid' | 'server' | 'blocked' | 'conflict' | 'error', message }`. The caller rolls its optimistic state back on failure. `listPath: true` skips the form.

## Calendar (`app/calendar-view`)

```tsx
import { CalendarView } from 'components:app/calendar-view';

<CalendarView
    table="change_request"
    startField="start_date"
    endField="end_date"
    titleField="short_description"
    colorField="type"
    reschedule
    onOpen={(table, sysId) => navigate('form', { table, sysId })}
/>
```

- **Data.** One request per visible range: records that start in it, or (with an end field) started before it and end in or after it. `query` is ANDed into the range query; don't put `^NQ` in it. At most `limit` records (default 500); a note says when more exist.
- **Time zone and formats.** Days, the time grid and the agenda use the user's ServiceNow time zone (shown in the toolbar) and time format. The first day of the week follows the user's locale (or `weekStart`).
- **Events.** A date field, or a span of 24 hours or more, goes in the all-day row. Without an end field, events last an hour. Overlapping timed events sit side by side.
- **Colours.** `colorField` colours events. Status-like fields (state, priority, risk…) use the highlighted-value tones; any other field gets a categorical palette, with a legend.
- **Event cards.** Click or Enter opens a popover with the time and an `app/record-card` (with Open record). Double click opens the record.
- **Reschedule** (`reschedule`). Drag an event to another day (keeps its time and duration) or to a 30-minute slot in week / day view. From the keyboard: focus the event, press Space, move with the arrow keys (left / right a day; up / down a week in month view, 30 minutes in the time grid) and press Space to drop (Escape cancels). The write goes through `app/record-update` with an Undo toast; on failure the event goes back. The table must give the user write access to the start field.
- **Keyboard shortcuts** (focus inside the calendar, not in a field): `t` today, `j` / `n` next, `k` / `p` previous, `m` / `w` / `d` / `a` views.
- **Responsive.** Under 640 px of width (phones, narrow columns) the calendar offers only Agenda and Day, and starts on the agenda.

Exports:

| Export | What |
|---|---|
| `CalendarView` | The component (props above, plus `view` / `defaultView` / `onViewChange`, `views`, `date` / `defaultDate` / `onDateChange`, `agendaDays`, `height`, `cardFields`, `live`) |
| `useCalendarEvents(options)` | `{ events, count, truncated, isLoading, error, meta, canWrite }` for a range |
| `rangeFor(view, anchor, weekStart)`, `stepAnchor` | The days a view shows; Previous / Next |
| `overlapQuery`, `andInto` | The range query; AND a base query into every `^NQ` set |
| `toEvents(rows, fields, tz)`, `eventsOnDay`, `layoutDay` | List rows → events; per day; overlap columns |
| `movedTimes(event, target, tz)` | Where a dropped event lands |
| `dayOf`, `dayStart`, `instantAt`, `secondsOf`, `glideValueOf` | Zone-aware date math on instants and glide values |
| `PALETTE`, `colorIndex`, `rangeTitle` | Colours and the toolbar title |

**Widget** `app/record-calendar` options: `title`, `description`, `table`, `query`, `startField`, `endField`, `titleField`, `colorField`, `view`, `views` (comma list), `date` (`YYYY-MM-DD`, empty = today), `reschedule`, `recordPage`, `limit`, `height`, `agendaDays`, `cardFields`.

## Board (`app/visual-board`)

```tsx
import { VisualBoard } from 'components:app/visual-board';

<VisualBoard table="incident" field="state" query="active=true" lanes={['1', '2', '3', '6']} wip="2:25" onOpen={open} />
<VisualBoard table="incident" field="assignment_group" laneQuery="type=..." />
```

- **Lanes.** For a choice field, the field's choices in order (empty lanes too, unless `hideEmpty`). For a reference field, the values that have records (the platform's group-by), or the referenced records matching `laneQuery`. `lanes` restricts and orders them by value (`''` is the empty lane, labelled `emptyLabel`, default "None").
- **Cards.** Each lane loads its own cards with a server count and **Show more** (`perLane`, default 20). The search box searches every lane. A card shows the title, subtitle and up to four key fields, rendered like `app/record-card` (references preview, statuses highlight). The title opens the full record card; double click opens the record.
- **Moving.** Drag a card to another lane, or use its **Move to** menu. From the keyboard: focus the card's title, press Space, use the arrow keys and press Space again. The card moves at once and the write goes through `app/record-update`. When the form needs more (Resolved needs resolution notes), a dialog asks. Failure or Cancel puts the card back with a toast; success toasts with Undo. Needs write access to the field (`movable={false}` turns it off).
- **WIP limits** (`wip`, `'value:limit,…'` or an object): the lane header shows count / limit and turns red over the limit. Moving into a full lane still works, with a warning.

Exports: `VisualBoard`, `useBoardLanes(options)` → `{ lanes, meta, fieldMeta, isLoading, error }`, `useLaneCards(options)` (one lane's infinite list), `laneCondition(field, value)`, `parseWip(text)`.

**Widget** `app/record-board` options: `title`, `description`, `table`, `field`, `query`, `lanes` (comma list, `(empty)` for the empty lane), `laneQuery`, `hideEmpty`, `emptyLabel`, `wip`, `cardFields`, `orderBy` (`-field` = descending), `perLane`, `movable`, `search`, `recordPage`.

## Timeline (`app/timeline`)

```tsx
import { Timeline, useHistoryTimeline, useRecordsTimeline } from 'components:app/timeline';

const h = useHistoryTimeline('incident', sysId);            // journal, field changes, attachments, emails
<Timeline items={h.items} isLoading={h.isLoading} label="History" />

const m = useRecordsTimeline({ table: 'change_request', dateField: 'start_date', titleField: 'short_description', toneField: 'state' });
<Timeline items={m.items} order="desc" />
```

`TimelineItem`: `{ id, at (epoch ms), title, description?, icon? (lucide name), tone? (highlighted-value tone), meta?, actions?, onSelect? }`. Items group under day headings (Today, Yesterday, a weekday, then dates) in the user's zone; times use the user's time format. Props: `groupBy` (`'day'` | `'none'`), `order`, `dense`, `relative` ("3 hours ago"), `isLoading`, `error`, `emptyText`, `label`.

Other exports: `groupTimeline(items, { order, timeZone, locale })`, `activityToTimelineItem(entry)` (one `utilities:app/activity` entry: field changes as old → new, journal text, attachment and email lines).

**Widget** `app/timeline-card`: `mode: 'history'` (a record's history; the record comes from the options, else the route / URL params) or `mode: 'records'` (`table`, `query`, `dateField`, `titleField`, `descriptionField`, `toneField`, `icon`, `order`, `limit`, `recordPage`).

## SLA timers (`app/sla-timer`)

```tsx
import { SlaTimers, SlaTimer, useTaskSlas, slaClock, SlaRibbonValue } from 'components:app/sla-timer';

<SlaTimers sysId={incidentId} />                // every task_sla of the task, active first
<SlaRibbonValue sysId={incidentId} />           // the most urgent active SLA, as one ribbon value
```

- **Data.** `task_sla` rows of the task, read as the user, refreshed by the record watch on `task_sla` for that task.
- **Ticking.** Client-side, once a second, only while an SLA runs. Time left = planned end − now; the planned end already follows the SLA's schedule. The bar starts from the server's business elapsed percentage and runs on to 100 % at the planned end.
- **States.** Running; warning from 75 % (amber); breached (red, "Breached 2h ago"); paused (the stored business time left, no ticking); achieved (green); cancelled (muted).
- **Accessibility.** The time is `role="timer"` with a spoken label ("3 hours 12 minutes left"), so it isn't announced every second. A state change, such as the breach, is announced once.

Exports: `SlaTimers`, `SlaTimer` (`variant`: `card` | `compact` | `ribbon`), `SlaRibbonValue`, `useTaskSlas(sysId, { activeOnly })`, `slaClock(sla, now)` → `{ state, remainingMs, percent, label, tone, ticking }`, `formatDuration(ms)`.

**Widget** `app/sla-card` options: `title`, `sysId` (empty = the route / URL `sys_id`), `activeOnly`, `variant`.

## Drag and drop: `utilities:dnd-kit`

The host ships dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable` and `CSS` from `@dnd-kit/utilities`) as one module on the host's React:

```tsx
import { DndContext, useDraggable, useDroppable, KeyboardSensor, PointerSensor, useSensor, useSensors, sortableKeyboardCoordinates } from 'utilities:dnd-kit';
```

Portal pages render in a shadow root, so pass `accessibility={{ container }}` with an element inside your widget. dnd-kit's screen-reader instructions and live region must sit in the same root as the draggables, or their `aria-describedby` ids don't resolve. The board and calendar use a 5 px pointer activation distance (so clicks still open cards), Space to pick up and drop, and their own keyboard coordinate getters, which step between drop targets by id (next day, slot or lane). dnd-kit's geometric `sortableKeyboardCoordinates` skipped or stuck on grids of plain droppables.

## Reusable exports

- `components:app/record-update`: `useRecordUpdate`, `updateWithUndo`, the `RecordUpdateRequest` / `RecordUpdateOutcome` types.
- `components:app/calendar-view`: `CalendarView`, `useCalendarEvents`, and the model helpers (`rangeFor`, `stepAnchor`, `overlapQuery`, `andInto`, `toEvents`, `eventsOnDay`, `layoutDay`, `movedTimes`, `dayOf`, `dayStart`, `instantAt`, `secondsOf`, `glideValueOf`, `PALETTE`, `colorIndex`, `rangeTitle`).
- `components:app/visual-board`: `VisualBoard`, `useBoardLanes`, `useLaneCards`, `laneCondition`, `parseWip`.
- `components:app/timeline`: `Timeline`, `useRecordsTimeline`, `useHistoryTimeline`, `activityToTimelineItem`, `groupTimeline`.
- `components:app/sla-timer`: `SlaTimers`, `SlaTimer`, `SlaRibbonValue`, `useTaskSlas`, `slaClock`, `formatDuration`.
- `utilities:dnd-kit`: dnd-kit for any widget.
