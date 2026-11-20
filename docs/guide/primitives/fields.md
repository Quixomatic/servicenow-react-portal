---
title: Fields
description: The app/field base (useField, FieldShell, form store, registry), field-control and the field primitives.
section: Primitives and utilities
order: 2
tags: [fields, useField, form-store, accessibility]
---

# Fields

Every field primitive builds on **`components:app/field`**, which owns the field model, accessibility wiring and the form store. **`components:app/field-control`** picks the right primitive from a dictionary type.

## Standalone or bound

A field is **bound** when it sits inside a `<FormProvider>` (or a record/catalog form) and has no `value` prop: it reads and writes the form store by `name`. Give it `value` (or `standalone`) and it's a controlled standalone input.

```tsx
import { FormProvider } from 'components:app/field'
import { FieldControl } from 'components:app/field-control'
import { StringField } from 'components:app/string-field'

// Bound to a real record: one GraphQL bootstrap, metadata from the dictionary
<FormProvider table="incident" sysId={sysId}>
    <FieldControl name="short_description" />
    <FieldControl name="assignment_group" />
    <FieldControl name="assigned_to" />   {/* reference search scoped to the unsaved group */}
</FormProvider>

// Standalone, controlled
<StringField name="nickname" label="Nickname" value={nick} onChange={(v) => setNick(v)} />
```

## `FieldProps`

Every field primitive accepts these (explicit props win over form state and dictionary):

| Prop | Meaning |
|---|---|
| `name` | Column name; binds to the nearest form unless `value` is given |
| `table` | Table for dictionary metadata (default: the form's) |
| `type`, `label`, `hint`, `placeholder`, `maxLength` | Overrides |
| `value`, `displayValue` | Controlled value (glide string): makes the field standalone |
| `defaultValue`, `defaultDisplayValue` | Initial value when standalone and uncontrolled |
| `onChange(value, displayValue)` | Commit (blur, select, Enter) |
| `onStage(value)` | Keystrokes (staged, not committed) |
| `readOnly`, `mandatory`, `visible`, `disabled` | State overrides |
| `messages`, `error` | Field messages (`error` = one error message) |
| `validate(value)` | Return a message to show an error |
| `dependsOn`, `dependentValue` | Dependent choices |
| `meta` | Metadata overrides merged over the dictionary |
| `standalone` | Ignore any surrounding form |
| `id`, `autoFocus` | |

State precedence: explicit props → script overrides (`g_form.setMandatory`…) → UI policy layer → server field state → dictionary.

## `useField(name | props)`

Returns everything a control needs: `value`, `displayValue`, `originalValue`, `staged`, `dirty`, `touched`, `state` (`{ mandatory, readOnly, visible, disabled }`), `missing` (mandatory, writable and empty), `messages`, `error`, `invalid`, `loading`, `bound`, `meta`, `label`, `placeholder`, `hint`, `maxLength`, `dependentValue`, `autoFocus`, `setValue(value, displayValue?)`, `stage(value)`, `blur()`, `ids` (`input`, `label`, `hint`, `messages`), `describedBy`, `lookup` (`{ sysId, encodedRecord, getChanges }` for reference and choice lookups against the unsaved form), `decorations` (from `g_form.addDecoration`), and `remote` with `acceptRemote()` / `dismissRemote()` (someone else saved a different value while this field was being edited).

## `<FieldShell field={f}>`

Label, required marker, hint, polite live-region messages, an unsaved-changes marker, a selectable read-only view, horizontal or vertical layout, and a fieldset mode. Use it when building a new field primitive:

```tsx
import { useField, FieldShell, controlA11y, controlClass } from 'components:app/field'

export function SlugField(props) {
    const f = useField(props)
    return (
        <FieldShell field={f}>
            <input {...controlA11y(f)} className={controlClass({ invalid: f.invalid })} value={f.staged ?? f.value}
                onChange={(e) => f.stage(e.target.value)} onBlur={() => f.setValue(f.staged ?? f.value)} />
        </FieldShell>
    )
}
```

Required-field errors appear after Validate/Submit, or after the user clears a value they changed, never just from tabbing through an empty field.

## The form store

`createFormStore()` / `<FormProvider table sysId>` / `useForm()` give a `g_form`-style API over plain state. Values are **glide strings** (what the platform stores).

| Group | Methods |
|---|---|
| Values | `getValue`, `getDisplayValue`, `setValue(name, value, displayValue?)`, `stage`, `touch`, `clearValue` |
| Field state | `setMandatory`, `setReadOnly`, `setVisible`, `setDisplay`, `setDisabled`, `setLabel`, `setPlaceholder`, `setHint`, `setOptions`, `clearOverrides` |
| Policies | `setPolicyLayer(layer)` |
| Messages | `showFieldMessage(name, text, kind?)`, `hideFieldMessage`, `addInfoMessage`, `addErrorMessage`, `clearMessages` |
| Sections | `setSectionDisplay`, `getSectionDisplay`, `clearSectionDisplay` |
| Decorations | `addDecoration(name, icon, title, color?)`, `removeDecoration(name, icon?, title?)` |
| Remote changes | `setRemoteValue(name, value, displayValue?)`, `acceptRemote(name)`, `dismissRemote(name)`; `applyRemoteValues(store, values)` merges a re-read (untouched fields take the new value, edited fields get the marker) |
| Lifecycle | `load({ values, server, meta, table, sysId, encodedRecord, replace })`, `mergeMeta`, `reset(name?)`, `commit()` |
| Queries | `isDirty(name?)`, `getDirtyFields()`, `serialize(all?)`, `validate(isRequired?)` |
| Events | `onChange(name \| '*', listener)`, `subscribe`, `registerField`, `registeredFields` |

Hooks: `useForm({ table, sysId, view, query, values, bootstrap })`, `useFormContext`, `useFormValue(name)`, `useFormMeta`. The form `useForm` returns is the store plus `status` (`{ isLoading, error, isFetching, loaded }`) and `refetch()` (re-reads the record and keeps unsaved edits).

## Field registry

`registerFieldType(type, Component)` and `resolveFieldComponent(type)` map dictionary types to components. `app/field-control` registers the built-ins:

| Primitive | Dictionary types |
|---|---|
| `app/string-field` | string, sys_class_name, GUID, domain_id, ip_address, color, translated_field, user_input |
| `app/textarea-field` | multi_two_lines, translated_text, wiki_text |
| `app/code-field` | script, script_plain, script_server, xml, css, json, json_translations, html_script, html_template (code editor on `components:code-editor`, below) |
| `app/journal-field` | journal_input, journal (work notes tinted and badged internal; the value is the new entry, posted by the form save); journal_list read-only. See [Activity and journals](activity.md) |
| `app/html-field` | html, translated_html, catalog variable type 23 (rich-text editor on `components:rich-text-editor`; read-only through `components:rich-text`) |
| `app/number-field` | integer, longint, decimal, float, numeric, percent_complete, order_index (locale-aware, stepping) |
| `app/boolean-field` | boolean (checkbox or switch) |
| `app/choice-field` | choice (select, radio or scale; dependent values) |
| `app/reference-field` | reference, requested_for (recent picks, search, extra columns, server-applied qualifier) |
| `app/date-field`, `app/datetime-field` | glide_date; glide_date_time, due_date, calendar_date_time (user's ServiceNow time zone, DST aware) |
| `app/time-field` | glide_time |
| `app/email-field`, `app/url-field`, `app/phone-field` | email; url; ph_number, phone_number_e164 |
| `app/password-field` | password, password2, masked (show/hide, confirm) |
| `app/currency-field` | currency, price, currency2 |
| `app/duration-field` | glide_duration, timer |
| `app/list-field` | glide_list (chips) |
| `app/conditions-field` | conditions (the condition builder) |
| `app/table-name-field` | table_name |
| `app/field-name-field` | field_name |
| `app/attachment-field` | file_attachment, user_image (single file on `ZZ_YY<table>`; see [Attachments](attachments.md)) |

`<FieldControl name …/>` resolves the type from metadata and renders the matching primitive. Portals can override a type or a dictionary attribute with `registerFieldType` / `registerFieldAttribute`. An unknown type renders read-only, labelled "field type not supported", as Workspace does. `app/combobox` supplies an accessible editable combobox, a select-only `Select` and a `Listbox`, with popups in the top layer so they escape clipped cards.

## HTML fields

`components:app/html-field` (`HtmlField`) puts the host kit's TipTap editor in a `FieldShell`: label, required marker, hint, messages, dirty marker and `g_form` work as on any field, and the contenteditable is the labelled control.

- Keystrokes stage; leaving the editor commits, and only if the user changed something, so a form that just shows an article never writes back the editor's normalised copy of it.
- Read-only (dictionary, ACL, UI policy, `g_form.setReadOnly`) renders the sanitised HTML with `components:rich-text`.
- Formatting the editor can't keep (tables, colours, embedded media…) is named in a notice above the toolbar.
- **Inline images:** in a bound record form (not a catalog variable), pasted, dropped or uploaded images become attachments of that record (`uploadAttachment` from [`utilities:app/attachments`](attachments.md), `src="/sys_attachment.do?sys_id=…"`), as the platform's HTML editor does. New records use the sys_id the form reserved. Catalog variables are URL-only. `imageUpload={false}` turns uploads off; `uploadImage(file)` supplies your own uploader.
- Extra props: `minHeight`, `maxHeight`, `toolbarHide`. Exports: `HtmlField`, `uploadRecordImage({ file, table, sysId })`, `imageUploadTarget(field)`, `MAX_INLINE_IMAGE_BYTES`.

## Dates and times

`app/date-field` (`glide_date`, value `'YYYY-MM-DD'`) and `app/datetime-field` take typed entry in the user's ServiceNow format, parsed leniently (any separator, two-digit years, month names, ISO, "today" / "tomorrow" / "yesterday"), plus a calendar popover on the host kit's [`components:calendar`](../runtime-api/host-kit.md#dialog-and-calendar). Alt+↓ or the button opens it; Escape closes it and focus returns to the button. The date-time popover adds Today, a time box, the zone and Done.

- `min` / `max` come from props, else the dictionary attributes `min` / `max` (`'YYYY-MM-DD'` or `'today'`). `format` overrides the user's pattern.
- `app/time-field` (`glide_time`) accepts `'9'`, `'930'`, `'9:30 pm'`, `'noon'` and the like, with a suggestion list every `step` minutes (default 30). It keeps the value shape it was given: `'HH:mm:ss'` wall time, or the platform's stored `'1970-01-01 HH:mm:ss'` UTC value.
- **`utilities:app/datetime`** holds the logic with no UI, for any widget: zones (`zonedParts`, `parseGlideDateTime`, `formatGlideDateTime`, `useUserTimeZone`), the user's formats (`useUserFormats`, `useLocale`), dates (`formatDate`, `parseDate`, `addDays`, `addMonths`, `weekStartFor`, `isValidYmd`), times (`parseTime`, `formatTime`, `timeValueToSeconds`, `secondsToTimeValue`) and date-times (`parseDateTime`, `wallOf`).

## Date range and code fields

**`app/date-range-field`** (`DateRangeField`) is a start / end pair as one control, on the host kit's [`components:date-range-picker`](../runtime-api/host-kit.md#date-range-picker).

```tsx
<DateRangeField startName="start_date" endName="end_date" label="Planned dates" />          {/* bound to the form */}
<DateRangeField name="period" label="Period" value={range} onRangeChange={setRange} />    {/* standalone */}
```

- **Bound mode** writes each end into its own field, and only once both ends are picked:
  - `glide_date` gets `'YYYY-MM-DD'`;
  - date-time fields keep their current time of day, else 00:00:00 for the start day and 23:59:59 for the end day, in the user's time zone (stored in UTC).
- **Presets** are relative to today in the user's zone (`presets={false}` hides them).
- **Read-only** shows the range in the user's date format.
- **Shell:** label, hint, mandatory and messages come from the start field's shell, and an error on the end field shows there too. `min` / `max` come from props, else the start field's dictionary attributes.
- **Exports:** `toRangeValue(value, type, tz)` and `fromRangeValue(ymd, type, edge, current, tz)` hold the value logic.

**`app/code-field`** (`CodeField`) renders script and markup types with the host kit's [`components:code-editor`](../runtime-api/host-kit.md#code-editor) (CodeMirror 6, in a lazily loaded chunk). Before, these types were a plain textarea.

- **Language:** follows the type (script → JavaScript, xml, css, json, html_script → HTML), or the `language` prop.
- **Saving:** keystrokes stage; blur or Ctrl/⌘+Enter commits.
- **Read-only:** shows highlighted code, still focusable and selectable. An empty read-only value is the usual em dash, and no editor chunk loads for it.
- **Props:** `minLines` (6 when editable), `maxHeight` (`24rem`), `lineNumbers`, `tabSize`.
- **Exports:** `CODE_FIELD_TYPES` and `codeLanguageForType`.

## Conditions, tables and fields

- **`app/conditions-field`** renders `app/condition-builder` live and commits the encoded query on every complete edit. The table comes from `conditionsTable`, else the dictionary attributes `table` / `staticDependent`, else the dependent field's value (as `sys_ui_policy.conditions` depends on `table`). Props: `dotWalk`, `allowOr`, `allowNewQuery`.
- **`app/table-name-field`** searches `sys_db_object` by label and name. `baseTable` (or the attribute `base_table`) limits it to a table and its children. Also exports `searchTables`, `useTableSearch`, `useTableInfo`, `extendsQuery`.
- **`app/field-name-field`** picks a column with the condition builder's field picker. The table comes from `fieldTable`, the attribute `table` or the dependent value; `dotWalk` (or `tree_picker=true`) allows paths such as `caller_id.email`, and `types` limits the columns.

## Phone and currency

- **Phone:** `ph_number` is a tel input with loose validation. `phone_number_e164` (or `e164`) adds a country picker (typeahead on name or calling code): the value is E.164 (`'+18588649999'`), the display value is formatted. Typing `+44…` picks the country. Read-only renders a `tel:` link.
- **Currency:** the currency code picker is the combobox `Select`.

## Data behind fields

Fields use [`utilities:app/graphql`](graphql.md): `useTableMeta` / `useFieldMeta` (dictionary, cached 10 minutes), `useFormBootstrap`, `useChoices` (with the unsaved dependent values), `useReferenceSearch` (the server applies the field's reference qualifier against the unsaved form state) and `useReferenceDisplay`.

> **Warning:** Bootstrapping a **new** record (`sysId = -1`) evaluates defaults, which reserves the next number (e.g. INC). It never refetches a new record in the background.

## Related

- [Forms](forms.md)
- [Form runtime](form-runtime.md)
- [GraphQL utility](graphql.md)
