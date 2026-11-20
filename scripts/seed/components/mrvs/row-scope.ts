import { useEffect, useMemo } from 'react';
import { useUser } from '@portal/runtime';
import { createFormStore, attachPolicies } from 'components:app/field';
import type { FormStore, ValidationResult } from 'components:app/field';
import { attachGForm, catalogParent, scriptUserFrom } from 'utilities:app/gform';
import type { ScriptEnvironment, ScriptError, ScriptUser } from 'utilities:app/gform';
import { variableSpec, catalogResolver } from 'components:app/variable';
import type { VariableSpec, CatalogForm } from 'components:app/variable';
import type { CatalogVariable, MrvsRowField, MrvsRowForm } from 'utilities:app/catalog';

/**
 * The g_form scope of ONE multi-row variable set row (Workspace's row form modal does the same):
 *
 * - a form store of its own, loaded with the platform's row form metadata and the row's values;
 * - the set's catalog UI policies on it (attachPolicies, names resolved like g_form: variable name,
 *   IO:<sys_id>, sys_id);
 * - the set's catalog client scripts through the g_form layer (onLoad now, onChange on commits,
 *   onSubmit on save: false blocks the row save);
 * - g_service_catalog.parent: the item form the row belongs to (getValue / setValue …).
 *
 * Used by the row dialog and by inline row editing; any widget can use it for its own row editor.
 */
export type Row = { value: Record<string, string>; display: Record<string, string> };

export type RowScope = {
    /** The row's form (bind field primitives with <FormProvider form>). */
    form: FormStore & { status: any; refetch: () => void; resolve: (n: string) => string; specs: VariableSpec[] };
    specs: VariableSpec[];
    env: ScriptEnvironment;
    errors: ScriptError[];
    /** Field validation, then the row's onSubmit scripts. `ok: false` → stay in the editor. */
    submit: () => { ok: boolean; validation: ValidationResult; blockedByScript: boolean };
    /** The row's values (value + display) in the platform's MRVS shape. */
    collect: () => Row;
    stop: () => void;
};

/** Row form field → a catalog variable for app/variable's mapping. */
export function rowVariable(f: MrvsRowField, itemId: string, setId: string): CatalogVariable {
    const isChoice = !!(f.choices && f.choices.length);
    return {
        __typename: isChoice
            ? 'AppCatalog_ChoiceQuestionElementType'
            : f.reference
              ? 'AppCatalog_ReferenceQuestionElementType'
              : 'AppCatalog_StandardQuestionElementType',
        type: f.type,
        id: f.sysId,
        name: `variables.${f.name}`,
        variableName: f.name,
        label: f.label,
        mandatory: f.mandatory,
        readOnly: f.readOnly,
        visible: f.visible,
        variableAttributes: f.attributes,
        defaultValue: f.value,
        showHelp: !!f.helpText,
        helpText: f.helpText,
        exampleText: f.placeholder,
        choices: isChoice ? (f.choices || []).map((c) => ({ value: c.value, displayValue: c.label })) : undefined,
        includeNone: isChoice && (f.choices || []).some((c) => c.value === ''),
        reference: f.reference,
        referenceQual: f.referenceQual,
        referringTable: 'sc_cat_item',
        referringRecordId: `${itemId}$${setId}`,
    };
}

export function createRowScope(o: {
    rowForm: MrvsRowForm;
    /** The row to edit (omit for a new row: the row form's defaults). */
    row?: Row;
    itemId: string;
    setId: string;
    /** The item form (g_service_catalog.parent); null when there is none. */
    parent?: CatalogForm | null;
    user: ScriptUser;
    onError?: (e: ScriptError) => void;
}): RowScope {
    // Lookups (reference search, dependent choices) run against '<item>$<set>': the platform resolves
    // a row variable's qualifier through the variable set only with that record id (verified live).
    const lookupId = o.itemId + '$' + o.setId;
    const store = createFormStore({ table: 'sc_cat_item', sysId: lookupId });
    const specs = o.rowForm.fields.map((f) =>
        variableSpec(rowVariable(f, o.itemId, o.setId), { table: 'sc_cat_item' })
    );
    const values: Record<string, { value: string; displayValue: string }> = {};
    const metas: Record<string, any> = {};
    const server: Record<string, { hidden?: boolean }> = {};
    specs.forEach((s, i) => {
        const f = o.rowForm.fields[i];
        const col = s.variable.variableName as string;
        const v = o.row ? o.row.value[col] : undefined;
        values[s.name] =
            v !== undefined
                ? { value: v, displayValue: (o.row && o.row.display[col]) || v }
                : { value: f.value, displayValue: f.displayValue || f.value };
        if (s.meta) metas[s.name] = s.meta;
        // Server layer, so the set's UI policies (above it) can still show the variable.
        if (s.variable.visible === false) server[s.name] = { hidden: true };
    });
    store.load({ values, meta: metas, server, table: 'sc_cat_item', sysId: lookupId });
    const resolve = catalogResolver(specs);
    const form = Object.create(store);
    form.status = { isLoading: false, isFetching: false, error: null, loaded: true };
    form.refetch = () => {};
    form.resolve = resolve;
    form.specs = specs;
    const policies = attachPolicies(store, o.rowForm.policies || [], { resolve });
    const errors: ScriptError[] = [];
    const started = attachGForm(store, {
        table: 'sc_cat_item',
        sysId: o.itemId,
        isNew: true,
        user: o.user,
        resolve,
        scripts: o.rowForm.scripts,
        policies,
        catalog: true,
        serviceCatalog: { parent: o.parent ? catalogParent(o.parent, o.parent.resolve) : undefined },
        onError: (e) => {
            errors.push(e);
            if (o.onError) o.onError(e);
        },
    });
    const collect = (): Row => {
        const row: Row = { value: {}, display: {} };
        for (const s of specs) {
            const col = s.variable.variableName as string;
            row.value[col] = store.getValue(s.name);
            row.display[col] = store.getDisplayValue(s.name) || row.value[col];
        }
        return row;
    };
    return {
        form,
        specs,
        env: started.env,
        errors,
        collect,
        submit: () => {
            const validation = store.validate();
            if (!validation.valid) return { ok: false, validation, blockedByScript: false };
            store.clearMessages();
            const passed = started.env.runOnSubmit('submit');
            return { ok: passed, validation, blockedByScript: !passed };
        },
        stop: () => {
            started.stop();
            policies.detach();
        },
    };
}

/** createRowScope as a hook: created once per (row form, row), stopped on unmount. */
export function useRowScope(o: {
    rowForm: MrvsRowForm | undefined;
    row?: Row;
    itemId: string;
    setId: string;
    parent?: CatalogForm | null;
    onError?: (e: ScriptError) => void;
}): RowScope | null {
    const user = useUser() as any;
    const scope = useMemo(
        () =>
            o.rowForm
                ? createRowScope({
                      rowForm: o.rowForm,
                      row: o.row,
                      itemId: o.itemId,
                      setId: o.setId,
                      parent: o.parent,
                      user: scriptUserFrom(user),
                      onError: o.onError,
                  })
                : null,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [o.rowForm, o.row, o.itemId, o.setId]
    );
    useEffect(() => (scope ? () => scope.stop() : undefined), [scope]);
    return scope;
}

/** A row's price from the row form's per-choice prices (what the platform adds to the item price). */
export function rowPrice(rowForm: MrvsRowForm | undefined, row: Row): { price: number; recurring: number } {
    let price = 0;
    let recurring = 0;
    if (!rowForm) return { price, recurring };
    for (const f of rowForm.fields) {
        if (!f.pricing || !f.choices) continue;
        const c = f.choices.find((x) => x.value === row.value[f.name]);
        if (c) {
            price += c.price || 0;
            recurring += c.recurringPrice || 0;
        }
    }
    return { price, recurring };
}
