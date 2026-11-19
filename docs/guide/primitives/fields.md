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

Returns everything a control needs: `value`, `displayValue`, `originalValue`, `staged`, `dirty`, `touched`, `state` (`{ mandatory, readOnly, visible, disabled }`), `missing` (mandatory, writable and empty), `messages`, `error`, `invalid`, `loading`, `bound`, `meta`, `label`, `placeholder`, `hint`, `maxLength`, `setValue(value, displayValue?)`, `stage(value)`, `blur()`, `ids` (`input`, `label`, `hint`, `messages`), `describedBy`, and `lookup` (`{ sysId, encodedRecord, getChanges }` for reference and choice lookups against the unsaved form).

## `<FieldShell field={f}>`

Label, required marker, hint, polite live-region messages, an unsaved-changes marker, a selectable read-only view, horizontal or vertical layout, and a fieldset mode. Use it when building a new field primitive:

```tsx
import { useField, FieldShell, controlA11y, controlClass } from 'components:app/field'

export function SlugField(props) {
    const f = useField(props)
    return (
        <FieldShell field={f}>
            <input {...controlA11y(f)} className={controlClass} value={f.staged ?? f.value}
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
| Lifecycle | `load({ values, server, meta, table, sysId, encodedRecord, replace })`, `mergeMeta`, `reset(name?)`, `commit()` |
| Queries | `isDirty(name?)`, `getDirtyFields()`, `serialize(all?)`, `validate(isRequired?)` |
| Events | `onChange(name \| '*', listener)`, `subscribe`, `registerField`, `registeredFields` |

Hooks: `useForm`, `useFormContext`, `useFormValue(name)`, `useFormMeta`.

## Field registry

`registerFieldType(type, Component)` and `resolveFieldComponent(type)` map dictionary types to components. `app/field-control` registers the built-ins:

| Primitive | Dictionary types |
|---|---|
| `app/string-field` | string, sys_class_name, table_name, field_name, GUID, domain_id, ip_address, color, translated_field, user_input |
| `app/textarea-field` | multi_two_lines, journal, journal_input, journal_list, translated_text, script, script_plain, wiki_text (fallback for journal) |
| `app/html-field` | html, translated_html, catalog variable type 23 (rich-text editor on `components:rich-text-editor`; read-only through `components:rich-text`) |
| `app/number-field` | integer, longint, decimal, float, numeric, percent_complete, order_index (locale-aware, stepping) |
| `app/boolean-field` | boolean (checkbox or switch) |
| `app/choice-field` | choice (select, radio or scale; dependent values) |
| `app/reference-field` | reference, requested_for (recent picks, search, extra columns, server-applied qualifier) |
| `app/date-field`, `app/datetime-field` | glide_date; glide_date_time, due_date, calendar_date_time (user's ServiceNow time zone, DST aware) |
| `app/email-field`, `app/url-field`, `app/phone-field` | email; url; ph_number, phone_number_e164 |
| `app/password-field` | password, password2, masked (show/hide, confirm) |
| `app/currency-field` | currency, price, currency2 |
| `app/duration-field` | glide_duration, timer |
| `app/list-field` | glide_list (chips) |

`<FieldControl name …/>` resolves the type from metadata and renders the matching primitive. `app/combobox` supplies an accessible editable combobox, a select-only `Select` and a `Listbox`, with popups in the top layer so they escape clipped cards.

## HTML fields

`components:app/html-field` (`HtmlField`) puts the host kit's TipTap editor in a `FieldShell`: label, required marker, hint, messages, dirty marker and `g_form` work as on any field, and the contenteditable is the labelled control.

- Keystrokes stage; leaving the editor commits, and only if the user changed something, so a form that just shows an article never writes back the editor's normalised copy of it.
- Read-only (dictionary, ACL, UI policy, `g_form.setReadOnly`) renders the sanitised HTML with `components:rich-text`.
- Formatting the editor can't keep (tables, colours, embedded media…) is named in a notice above the toolbar.
- **Inline images:** on a saved record (bound form, real `sys_id`, not a catalog variable), pasted, dropped or uploaded images become attachments of that record (`POST /api/now/attachment/file`, `src="/sys_attachment.do?sys_id=…"`), as the platform's HTML editor does. New records and catalog variables are URL-only. `imageUpload={false}` turns uploads off; `uploadImage(file)` supplies your own uploader.
- Extra props: `minHeight`, `maxHeight`, `toolbarHide`. Exports: `HtmlField`, `uploadRecordImage({ file, table, sysId })`, `imageUploadTarget(field)`, `MAX_INLINE_IMAGE_BYTES`.

> **Note:** Not built yet: attachment / image fields (`file_attachment`, `user_image`) and a real journal field. HTML fields no longer fall back to a textarea. **In progress:** a time field, and condition, table-name and field-name fields.

## Data behind fields

Fields use [`utilities:app/graphql`](graphql.md): `useTableMeta` / `useFieldMeta` (dictionary, cached 10 minutes), `useFormBootstrap`, `useChoices` (with the unsaved dependent values), `useReferenceSearch` (the server applies the field's reference qualifier against the unsaved form state) and `useReferenceDisplay`.

> **Warning:** Bootstrapping a **new** record (`sysId = -1`) evaluates defaults, which reserves the next number (e.g. INC). It never refetches a new record in the background.

## Related

- [Forms](forms.md)
- [Form runtime](form-runtime.md)
- [GraphQL utility](graphql.md)
