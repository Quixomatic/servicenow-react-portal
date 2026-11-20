import type {
    FieldEntry,
    FieldMessage,
    FieldMessageKind,
    FieldOverrides,
    FieldSnapshot,
    FieldMeta,
    PolicyState,
    ServerFieldState,
} from './types';

/**
 * Form store: a small external store with per-field immutable slices, so useField can subscribe
 * to its own field (useSyncExternalStore + a memoised snapshot) and typing in one field never
 * re-renders another.
 *
 * Method names follow g_form where the idea is the same (getValue, setValue(name, value,
 * displayValue), setMandatory, setReadOnly, setDisplay/setVisible, showFieldMessage,
 * hideFieldMessage, addInfoMessage, addErrorMessage, clearMessages, isDirty, serialize), so a
 * g_form compatibility shim can sit on top later without translation.
 *
 * State layers per field: dictionary meta → server state (ACL / data policies) → UI policy layer
 * (setPolicyLayer, recomputed as a whole so a policy turning false restores what was below it)
 * → script overrides.
 * Explicit component props win over all of them (in useField).
 */

export type FormMessage = { kind: FieldMessageKind; text: string; id: string };

export type FormState = {
    fields: Record<string, FieldEntry>;
    server: Record<string, ServerFieldState>;
    meta: Record<string, FieldMeta>;
    submitted: boolean;
    formMessages: FormMessage[];
    /** Section display overrides by section name (g_form.setSectionDisplay): false = hidden. */
    sections: Record<string, boolean>;
    table: string;
    sysId: string;
    encodedRecord: string;
    loaded: boolean;
};

export type ValueInput = string | { value: string; displayValue?: string } | null | undefined;
export type ChangeListener = (name: string, value: string, oldValue: string, displayValue: string) => void;

export type ValidationResult = { valid: boolean; errors: { name: string; label: string; message: string }[] };

export interface FormStore {
    getState(): FormState;
    subscribe(listener: () => void): () => void;
    fieldSnapshot(name: string): FieldSnapshot;

    readonly table: string;
    readonly sysId: string;
    readonly encodedRecord: string;

    // values
    getValue(name: string): string;
    getDisplayValue(name: string): string;
    setValue(name: string, value: ValueInput, displayValue?: string): void;
    stage(name: string, value: string): void;
    touch(name: string): void;
    clearValue(name: string): void;

    // state overrides (script layer)
    setMandatory(name: string, on: boolean): void;
    setReadOnly(name: string, on: boolean): void;
    setVisible(name: string, on: boolean): void;
    setDisplay(name: string, on: boolean): void;
    setDisabled(name: string, on: boolean): void;
    setLabel(name: string, label: string): void;
    setPlaceholder(name: string, text: string): void;
    setHint(name: string, text: string): void;
    /** Option overlay for choice fields (g_form.addOption / removeOption / clearOptions); undefined = metadata choices. */
    setOptions(name: string, choices: { value: string; label: string }[] | undefined): void;
    clearOverrides(name: string, keys?: (keyof FieldOverrides)[]): void;
    /** Replace the UI policy layer of every field ({} entries / missing names = no policy state). */
    setPolicyLayer(layer: Record<string, PolicyState>): void;

    // messages
    showFieldMessage(name: string, text: string, kind?: FieldMessageKind): void;
    hideFieldMessage(name: string, kind?: FieldMessageKind): void;
    addInfoMessage(text: string): void;
    addErrorMessage(text: string): void;
    clearMessages(): void;

    // sections (g_form.setSectionDisplay)
    setSectionDisplay(name: string, on: boolean): void;
    /** Script override for a section: true / false, or undefined (not set). */
    getSectionDisplay(name: string): boolean | undefined;
    /** Drop every section override (a client-script restart). */
    clearSectionDisplay(): void;

    // decorations (g_form.addDecoration / removeDecoration)
    addDecoration(name: string, icon: string, title: string, color?: string): void;
    removeDecoration(name: string, icon?: string, title?: string): void;

    // remote changes (live record watch): mark, take theirs, keep mine
    setRemoteValue(name: string, value: string, displayValue?: string): void;
    acceptRemote(name: string): void;
    dismissRemote(name: string): void;

    // lifecycle
    load(input: {
        values?: Record<string, ValueInput>;
        server?: Record<string, ServerFieldState>;
        meta?: Record<string, FieldMeta>;
        table?: string;
        sysId?: string;
        encodedRecord?: string;
        replace?: boolean;
    }): void;
    mergeMeta(meta: Record<string, FieldMeta>, overwrite?: boolean): void;
    reset(name?: string): void;
    /** After a save: current values become the originals (nothing dirty, nothing lost). */
    commit(): void;
    isDirty(name?: string): boolean;
    getDirtyFields(): string[];
    /** Unsaved values { field: value }, as lookups send them (serializedChanges). */
    serialize(all?: boolean): Record<string, string>;
    validate(isRequired?: (name: string) => boolean): ValidationResult;
    onChange(name: string | '*', listener: ChangeListener): () => void;
    registerField(name: string): () => void;
    registeredFields(): string[];
}

const EMPTY: FieldEntry = Object.freeze({
    value: '',
    displayValue: '',
    originalValue: '',
    originalDisplayValue: '',
    touched: false,
    messages: [],
    overrides: {},
}) as FieldEntry;

function norm(v: ValueInput, dv?: string): { value: string; displayValue: string } {
    if (v && typeof v === 'object')
        return {
            value: v.value == null ? '' : String(v.value),
            displayValue: v.displayValue == null ? String(v.value ?? '') : String(v.displayValue),
        };
    const value = v == null ? '' : String(v);
    return { value, displayValue: dv == null ? value : String(dv) };
}

let seq = 0;

/**
 * Merge values someone else saved (live record watch, a re-read) into a form store: fields with no
 * unsaved edit take the new value silently; fields being edited get a remote marker (the field shows
 * "Changed by someone else" with Use theirs / Keep mine). Returns { applied, marked } field names.
 */
export function applyRemoteValues(
    store: FormStore,
    values: Record<string, { value: string; displayValue?: string }>
): { applied: string[]; marked: string[] } {
    const applied: string[] = [];
    const marked: string[] = [];
    const clean: Record<string, { value: string; displayValue: string }> = {};
    for (const n of Object.keys(values)) {
        const v = values[n];
        const e = store.getState().fields[n];
        if (!v || !e || v.value === e.originalValue) continue;
        if (e.value !== e.originalValue) {
            store.setRemoteValue(n, v.value, v.displayValue);
            marked.push(n);
        } else {
            clean[n] = { value: v.value, displayValue: v.displayValue == null ? v.value : v.displayValue };
            applied.push(n);
        }
    }
    if (applied.length) store.load({ values: clean });
    return { applied, marked };
}

/** Mandatory, writable, visible and empty: what a save would reject (same layers as useField). */
export function isFieldMissing(state: FormState, name: string): boolean {
    if (!isFieldVisible(state, name)) return false;
    const e = state.fields[name];
    const m = state.meta[name];
    const ov = (e && e.overrides) || {};
    const p = (e && e.policy) || {};
    const s = state.server[name];
    const readOnly = !!(ov.readOnly ?? p.readOnly ?? (s && s.readonly) ?? (m && (m.readOnly || m.canWrite === false)));
    const mandatory = !!(ov.mandatory ?? p.mandatory ?? (s && s.mandatory) ?? (m && m.mandatory));
    const value = e ? (e.staged !== undefined ? e.staged : e.value) : '';
    return mandatory && !readOnly && String(value || '').trim() === '';
}

/** Is a field visible, by the same layers useField resolves (script → policy → server → dictionary)? */
export function isFieldVisible(state: FormState, name: string): boolean {
    const e = state.fields[name];
    const m = state.meta[name];
    if (m && m.canRead === false) return false;
    const ov = (e && e.overrides) || {};
    const p = (e && e.policy) || {};
    const s = state.server[name];
    const v = ov.visible ?? p.visible ?? (s ? !s.hidden : undefined);
    return v === undefined ? true : !!v;
}

function samePolicy(a: PolicyState | undefined, b: PolicyState | undefined): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
        a.mandatory === b.mandatory &&
        a.readOnly === b.readOnly &&
        a.visible === b.visible &&
        (a.message ? a.message.kind + a.message.text : '') === (b.message ? b.message.kind + b.message.text : '')
    );
}

export function createFormStore(
    init: { table?: string; sysId?: string; values?: Record<string, ValueInput> } = {}
): FormStore {
    let state: FormState = {
        fields: {},
        server: {},
        meta: {},
        submitted: false,
        formMessages: [],
        table: init.table || '',
        sysId: init.sysId || '',
        encodedRecord: '',
        loaded: false,
        sections: {},
    };
    const listeners = new Set<() => void>();
    const changeListeners = new Map<string, Set<ChangeListener>>();
    const snapshots = new Map<string, FieldSnapshot>();
    const registered = new Map<string, number>();

    const emit = () => listeners.forEach((l) => l());
    const set = (next: FormState) => {
        state = next;
        emit();
    };
    const entry = (name: string) => state.fields[name] || EMPTY;
    const patchField = (name: string, patch: Partial<FieldEntry>) => {
        set({ ...state, fields: { ...state.fields, [name]: { ...entry(name), ...patch } } });
    };
    const override = (name: string, patch: FieldOverrides) =>
        patchField(name, { overrides: { ...entry(name).overrides, ...patch } });
    const fire = (name: string, value: string, old: string, dv: string) => {
        const call = (set?: Set<ChangeListener>) =>
            set &&
            set.forEach((l) => {
                try {
                    l(name, value, old, dv);
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('[app/field] onChange listener failed', e);
                }
            });
        call(changeListeners.get(name));
        call(changeListeners.get('*'));
    };

    const store: FormStore = {
        getState: () => state,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        fieldSnapshot(name) {
            const e = state.fields[name];
            const s = state.server[name];
            const m = state.meta[name];
            const prev = snapshots.get(name);
            if (prev && prev.entry === e && prev.server === s && prev.meta === m && prev.submitted === state.submitted)
                return prev;
            const snap = { entry: e, server: s, meta: m, submitted: state.submitted };
            snapshots.set(name, snap);
            return snap;
        },
        get table() {
            return state.table;
        },
        get sysId() {
            return state.sysId;
        },
        get encodedRecord() {
            return state.encodedRecord;
        },

        getValue: (name) => entry(name).value,
        getDisplayValue: (name) => entry(name).displayValue,
        setValue(name, v, dv) {
            const next = norm(v, dv);
            const cur = entry(name);
            if (cur.value === next.value && cur.displayValue === next.displayValue && cur.staged === undefined) return;
            patchField(name, { value: next.value, displayValue: next.displayValue, staged: undefined });
            if (cur.value !== next.value) fire(name, next.value, cur.value, next.displayValue);
        },
        stage(name, value) {
            if (entry(name).staged === value) return;
            patchField(name, { staged: value });
        },
        touch(name) {
            if (!entry(name).touched) patchField(name, { touched: true });
        },
        clearValue(name) {
            store.setValue(name, '', '');
        },

        setMandatory: (name, on) => override(name, { mandatory: !!on }),
        setReadOnly: (name, on) => override(name, { readOnly: !!on }),
        setVisible: (name, on) => override(name, { visible: !!on }),
        setDisplay: (name, on) => override(name, { visible: !!on }),
        setDisabled: (name, on) => override(name, { disabled: !!on }),
        setLabel: (name, label) => override(name, { label }),
        setPlaceholder: (name, text) => override(name, { placeholder: text }),
        setHint: (name, text) => override(name, { hint: text }),
        setOptions: (name, choices) => override(name, { choices: choices ? choices.slice() : undefined }),
        clearOverrides(name, keys) {
            if (!keys) return patchField(name, { overrides: {} });
            const o = { ...entry(name).overrides };
            keys.forEach((k) => delete o[k]);
            patchField(name, { overrides: o });
        },
        setPolicyLayer(layer) {
            const names = new Set(
                Object.keys(layer).concat(Object.keys(state.fields).filter((n) => state.fields[n].policy))
            );
            let fields: Record<string, FieldEntry> | null = null;
            names.forEach((n) => {
                const next = layer[n] && Object.keys(layer[n]).length ? layer[n] : undefined;
                const cur = state.fields[n];
                const prev = cur ? cur.policy : undefined;
                if (samePolicy(prev, next)) return;
                if (!fields) fields = { ...state.fields };
                // Last writer wins (as on the platform): a policy that changes a property drops a
                // script override of that property set earlier (g_form.setMandatory on load, …).
                const overrides = { ...(cur || EMPTY).overrides };
                (['mandatory', 'readOnly', 'visible'] as const).forEach((k) => {
                    const was = prev ? prev[k] : undefined;
                    const now = next ? next[k] : undefined;
                    if (now !== undefined && now !== was) delete overrides[k];
                });
                fields[n] = { ...(cur || EMPTY), policy: next, overrides };
            });
            if (fields) set({ ...state, fields });
        },

        showFieldMessage(name, text, kind = 'info') {
            const list = entry(name).messages.filter((m) => !(m.kind === kind && m.text === text));
            patchField(name, { messages: list.concat({ kind, text, id: `m${++seq}` } as FieldMessage) });
        },
        hideFieldMessage(name, kind) {
            patchField(name, { messages: kind ? entry(name).messages.filter((m) => m.kind !== kind) : [] });
        },
        addInfoMessage(text) {
            set({ ...state, formMessages: state.formMessages.concat({ kind: 'info', text, id: `f${++seq}` }) });
        },
        addErrorMessage(text) {
            set({ ...state, formMessages: state.formMessages.concat({ kind: 'error', text, id: `f${++seq}` }) });
        },
        setSectionDisplay(name, on) {
            const key = String(name || '').toLowerCase();
            if (state.sections[key] === !!on) return;
            set({ ...state, sections: { ...state.sections, [key]: !!on } });
        },
        getSectionDisplay: (name) => state.sections[String(name || '').toLowerCase()],
        addDecoration(name, icon, title, color) {
            const list = (entry(name).decorations || []).filter((d) => !(d.icon === icon && d.title === title));
            patchField(name, {
                decorations: list.concat({
                    icon: String(icon || ''),
                    title: String(title || ''),
                    color: color || undefined,
                }),
            });
        },
        removeDecoration(name, icon, title) {
            const list = entry(name).decorations || [];
            const next =
                icon === undefined
                    ? []
                    : list.filter((d) => !(d.icon === icon && (title === undefined || d.title === title)));
            if (next.length !== list.length) patchField(name, { decorations: next });
        },
        setRemoteValue(name, value, displayValue) {
            const e = entry(name);
            const v = value == null ? '' : String(value);
            const dv = displayValue == null ? v : String(displayValue);
            // The remote value is the new original; mark it only while the user's edit differs from it.
            if (e.value === v) {
                patchField(name, { originalValue: v, originalDisplayValue: dv, remote: undefined });
                return;
            }
            patchField(name, { originalValue: v, originalDisplayValue: dv, remote: { value: v, displayValue: dv } });
        },
        acceptRemote(name) {
            const r = entry(name).remote;
            if (!r) return;
            patchField(name, { remote: undefined });
            store.setValue(name, r.value, r.displayValue);
        },
        dismissRemote(name) {
            if (entry(name).remote) patchField(name, { remote: undefined });
        },
        clearSectionDisplay() {
            if (Object.keys(state.sections).length) set({ ...state, sections: {} });
        },
        clearMessages() {
            set({ ...state, formMessages: [] });
        },

        load(input) {
            const fields = input.replace ? {} : { ...state.fields };
            const values = input.values || {};
            for (const name of Object.keys(values)) {
                const v = norm(values[name]);
                const cur = fields[name] || EMPTY;
                const wasDirty = cur !== EMPTY && cur.value !== cur.originalValue;
                // Fresh server values replace originals; a dirty field keeps the user's edit.
                fields[name] = wasDirty
                    ? { ...cur, originalValue: v.value, originalDisplayValue: v.displayValue }
                    : {
                          ...cur,
                          value: v.value,
                          displayValue: v.displayValue,
                          originalValue: v.value,
                          originalDisplayValue: v.displayValue,
                      };
            }
            set({
                ...state,
                fields,
                server: input.server
                    ? input.replace
                        ? input.server
                        : { ...state.server, ...input.server }
                    : state.server,
                meta: input.meta ? { ...state.meta, ...input.meta } : state.meta,
                table: input.table || state.table,
                sysId: input.sysId || state.sysId,
                encodedRecord: input.encodedRecord !== undefined ? input.encodedRecord : state.encodedRecord,
                loaded: true,
            });
        },
        mergeMeta(meta, overwrite = false) {
            const next = { ...state.meta };
            let changed = false;
            for (const name of Object.keys(meta)) {
                const cur = next[name];
                if (!cur) {
                    next[name] = meta[name];
                    changed = true;
                } else if (overwrite) {
                    next[name] = { ...cur, ...meta[name] };
                    changed = true;
                } else if (cur.source === 'layout' && meta[name].source === 'meta') {
                    // The form layout lacks hints, defaults and choice dependencies: fill them in.
                    const m = meta[name];
                    const displayField = m.reference && m.reference.displayField;
                    const needsRef = !!(cur.reference && displayField && !cur.reference.displayField);
                    if ((!cur.hint && m.hint) || (!cur.defaultValue && m.defaultValue) || needsRef) {
                        next[name] = {
                            ...cur,
                            hint: cur.hint || m.hint,
                            defaultValue: cur.defaultValue || m.defaultValue,
                            reference: cur.reference
                                ? { ...cur.reference, displayField: cur.reference.displayField || displayField }
                                : cur.reference,
                        };
                        changed = true;
                    }
                }
            }
            if (changed) set({ ...state, meta: next });
        },
        reset(name) {
            if (name) {
                const e = entry(name);
                patchField(name, {
                    value: e.originalValue,
                    displayValue: e.originalDisplayValue,
                    staged: undefined,
                    touched: false,
                    messages: [],
                });
                return;
            }
            const fields: Record<string, FieldEntry> = {};
            for (const n of Object.keys(state.fields)) {
                const e = state.fields[n];
                fields[n] = {
                    ...e,
                    value: e.originalValue,
                    displayValue: e.originalDisplayValue,
                    staged: undefined,
                    touched: false,
                    messages: [],
                };
            }
            set({ ...state, fields, submitted: false, formMessages: [] });
        },
        commit() {
            const fields: Record<string, FieldEntry> = {};
            for (const n of Object.keys(state.fields)) {
                const e = state.fields[n];
                fields[n] = {
                    ...e,
                    originalValue: e.value,
                    originalDisplayValue: e.displayValue,
                    staged: undefined,
                    touched: false,
                };
            }
            set({ ...state, fields, submitted: false });
        },
        isDirty(name) {
            if (name) {
                const e = entry(name);
                return e.value !== e.originalValue;
            }
            return store.getDirtyFields().length > 0;
        },
        getDirtyFields: () =>
            Object.keys(state.fields).filter((n) => state.fields[n].value !== state.fields[n].originalValue),
        serialize(all = false) {
            const out: Record<string, string> = {};
            for (const n of Object.keys(state.fields)) {
                const e = state.fields[n];
                if (all || e.value !== e.originalValue) out[n] = e.value;
            }
            return out;
        },
        validate(isRequired) {
            const errors: ValidationResult['errors'] = [];
            const names = new Set(Object.keys(state.fields).concat(Array.from(registered.keys())));
            names.forEach((n) => {
                const e = entry(n);
                const m = state.meta[n];
                const s = state.server[n];
                const p = e.policy || {};
                const required = isRequired
                    ? isRequired(n)
                    : !!(e.overrides.mandatory ?? p.mandatory ?? (s && s.mandatory) ?? (m && m.mandatory));
                const readOnly = !!(
                    e.overrides.readOnly ??
                    p.readOnly ??
                    (s && s.readonly) ??
                    (m && (m.readOnly || m.canWrite === false))
                );
                const visible = (e.overrides.visible ?? p.visible ?? !(s && s.hidden)) && !(m && m.canRead === false);
                const label = e.overrides.label || (m && m.label) || n;
                if (required && !readOnly && visible && !String(e.value || '').trim())
                    errors.push({ name: n, label, message: `${label} is required` });
                e.messages
                    .filter((x) => x.kind === 'error')
                    .forEach((x) => errors.push({ name: n, label, message: x.text }));
            });
            set({ ...state, submitted: true });
            return { valid: errors.length === 0, errors };
        },
        onChange(name, listener) {
            if (!changeListeners.has(name)) changeListeners.set(name, new Set());
            changeListeners.get(name)!.add(listener);
            return () => changeListeners.get(name)!.delete(listener);
        },
        registerField(name) {
            registered.set(name, (registered.get(name) || 0) + 1);
            emit();
            return () => {
                const n = (registered.get(name) || 1) - 1;
                if (n <= 0) registered.delete(name);
                else registered.set(name, n);
            };
        },
        registeredFields: () => Array.from(registered.keys()),
    };

    if (init.values) store.load({ values: init.values });
    return store;
}
