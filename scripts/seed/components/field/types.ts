import type { FieldMeta, GlideType, ServerFieldState } from 'utilities:app/graphql';

export type { FieldMeta, GlideType, ServerFieldState };

export type FieldMessageKind = 'error' | 'warning' | 'info' | 'success';
export type FieldMessage = { kind: FieldMessageKind; text: string; id?: string };

/** Script-layer overrides (g_form.setMandatory etc.), on top of server state and dictionary. */
export type FieldOverrides = {
    mandatory?: boolean;
    readOnly?: boolean;
    visible?: boolean;
    disabled?: boolean;
    label?: string;
    placeholder?: string;
    hint?: string;
    /** Option overlay (g_form.addOption / removeOption / clearOptions): replaces the field's choices. */
    choices?: { value: string; label: string }[];
};

/** UI policy layer (between server state and script overrides); recomputed as a whole. */
export type PolicyState = {
    mandatory?: boolean;
    readOnly?: boolean;
    visible?: boolean;
    /** Field message a catalog UI policy shows while its condition is true. */
    message?: FieldMessage;
};

/** One field's slice of the form store. Values are glide strings (what the platform stores). */
export type FieldEntry = {
    value: string;
    displayValue: string;
    originalValue: string;
    originalDisplayValue: string;
    /** Intermediate (typing) value; committed by setValue. */
    staged?: string;
    touched: boolean;
    messages: FieldMessage[];
    overrides: FieldOverrides;
    /** UI policy layer (setPolicyLayer). */
    policy?: PolicyState;
    /** Decorations next to the label (g_form.addDecoration). */
    decorations?: FieldDecoration[];
    /** A newer value saved by someone else while this field had unsaved edits (live record watch). */
    remote?: { value: string; displayValue: string };
};

/** A label decoration: a Lucide icon name (or a platform 'icon-*' name), its title, an optional colour. */
export type FieldDecoration = { icon: string; title: string; color?: string };

export type FieldState = { mandatory: boolean; readOnly: boolean; visible: boolean; disabled: boolean };

/** Everything a field needs from the form, memoised per field (one subscription per field). */
export type FieldSnapshot = {
    entry: FieldEntry | undefined;
    server: ServerFieldState | undefined;
    meta: FieldMeta | undefined;
    submitted: boolean;
};

/** Props every field primitive accepts (explicit props win over form state and dictionary). */
export interface FieldProps {
    /** Field (column) name; binds to the nearest <FormProvider> unless `value` is given. */
    name: string;
    /** Table for dictionary metadata (defaults to the form's table). */
    table?: string;
    type?: GlideType;
    label?: string;
    /** Controlled value (glide string). Giving it makes the field standalone (unbound). */
    value?: string;
    displayValue?: string;
    /** Initial value when standalone and uncontrolled. */
    defaultValue?: string;
    defaultDisplayValue?: string;
    /** Commit: blur, select or Enter. */
    onChange?: (value: string, displayValue: string) => void;
    /** Keystrokes (staged, not committed). */
    onStage?: (value: string) => void;
    readOnly?: boolean;
    mandatory?: boolean;
    visible?: boolean;
    disabled?: boolean;
    hint?: string;
    placeholder?: string;
    maxLength?: number;
    messages?: FieldMessage[];
    /** Shorthand for one error message. */
    error?: string;
    dependsOn?: string;
    dependentValue?: string;
    /** Metadata overrides (merged over dictionary metadata). */
    meta?: Partial<FieldMeta>;
    /** Extra validation: return a message to show an error. */
    validate?: (value: string) => string | null | undefined;
    /** Ignore any surrounding form. */
    standalone?: boolean;
    id?: string;
    autoFocus?: boolean;
}

export type FieldLayout = 'vertical' | 'horizontal';
export type FieldSize = 'sm' | 'md';

export interface UseFieldResult {
    name: string;
    table: string | undefined;
    meta: FieldMeta;
    label: string;
    placeholder: string | undefined;
    hint: string | undefined;
    maxLength: number | undefined;
    value: string;
    displayValue: string;
    originalValue: string;
    staged: string | undefined;
    dirty: boolean;
    touched: boolean;
    state: FieldState;
    /** Mandatory, writable and empty. */
    missing: boolean;
    messages: FieldMessage[];
    error: FieldMessage | undefined;
    invalid: boolean;
    loading: boolean;
    bound: boolean;
    dependentValue: string | undefined;
    /** Commit a value (glide string) and its display value. */
    setValue: (value: string, displayValue?: string) => void;
    stage: (value: string) => void;
    blur: () => void;
    ids: { input: string; label: string; hint: string; messages: string };
    /** aria-describedby for the control (hint + messages that exist). */
    describedBy: string | undefined;
    /** For lookups: the form's record, encoded snapshot and unsaved values. */
    lookup: { sysId: string; encodedRecord: string; getChanges: () => Record<string, string> };
    autoFocus: boolean | undefined;
    /** Label decorations (g_form.addDecoration). */
    decorations: FieldDecoration[];
    /** Someone else saved a different value while this field was being edited. */
    remote: { value: string; displayValue: string } | undefined;
    /** Take the other person's value / keep mine (clears the marker). */
    acceptRemote: () => void;
    dismissRemote: () => void;
}
