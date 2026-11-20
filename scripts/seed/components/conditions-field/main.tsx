/**
 * components:app/conditions-field: the `conditions` dictionary type (an encoded query).
 *
 *   <ConditionsField name="conditions" />                          bound: the table is the dependent field's value
 *   <ConditionsField name="filter" conditionsTable="incident" />   standalone
 *
 * Renders app/condition-builder live (AND/OR, new criteria, dot-walking, per-type operators and
 * value editors), committing the encoded query on every complete edit. The table comes from
 * `conditionsTable`, else the dictionary attributes `table` / `staticDependent`, else the value of
 * the dictionary dependent field (e.g. sys_ui_policy.conditions depends on `table`); with none
 * yet, the field asks for it. Read-only shows the platform's own condition labels.
 */
import { useRef, useState } from 'react';
import { useField, FieldShell, Spinner } from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';
import { ConditionBuilder } from 'components:app/condition-builder';
import { useCrumbs } from 'utilities:app/list-data';
import type { Crumb } from 'utilities:app/list-data';

export type ConditionsFieldProps = FieldProps & {
    /** Table the conditions are on (overrides the dictionary). */
    conditionsTable?: string;
    dotWalk?: boolean;
    allowOr?: boolean;
    allowNewQuery?: boolean;
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    className?: string;
};

const TABLE_NAME = /^[a-z0-9_]+$/i;

/** The table a conditions field filters (explicit, attributes, then the dependent value). */
export function conditionsTableOf(opts: {
    explicit?: string;
    attributes?: Record<string, string>;
    dependentValue?: string;
}): string | undefined {
    const a = opts.attributes || {};
    const candidates = [opts.explicit, a.table, a.staticDependent, opts.dependentValue];
    for (const c of candidates) if (c && TABLE_NAME.test(String(c).trim())) return String(c).trim();
    return undefined;
}

/** "Active is true and Priority is 1 - Critical" from the platform's parsed crumbs. */
export function describeCrumbs(crumbs: Crumb[]): string {
    return crumbs
        .map((c, i) => {
            const text = [c.fieldLabel, c.opLabel, c.valueLabel].filter(Boolean).join(' ');
            if (i === 0) return text;
            return `${c.join === 'NQ' ? 'or (new criteria)' : c.join === 'OR' ? 'or' : 'and'} ${text}`;
        })
        .join(' ');
}

export function ConditionsField(props: ConditionsFieldProps) {
    const field = useField(props);
    const table = conditionsTableOf({
        explicit: props.conditionsTable,
        attributes: field.meta.attributes,
        dependentValue: field.dependentValue,
    });
    // Labels only for the read-only view (editing shows the builder itself).
    const crumbs = useCrumbs(field.state.readOnly ? table : undefined, field.value || '');
    const summary = field.value && crumbs.data ? describeCrumbs(crumbs.data) : '';

    // Feed the builder only values that came from outside: echoing our own commits back would
    // re-parse the query and drop rows the user is still filling in.
    const emitted = useRef<string | null>(null);
    const lastSeen = useRef(field.value);
    const [seed, setSeed] = useState(field.value || '');
    const [generation, setGeneration] = useState(0);
    if (lastSeen.current !== field.value) {
        const external = field.value !== emitted.current;
        lastSeen.current = field.value;
        if (external) {
            // Reset, undo, a script's setValue: start the builder over from the new value.
            setSeed(field.value || '');
            setGeneration((g) => g + 1);
        }
    }

    const readOnly = !table ? (
        <span className="text-muted-foreground">{field.value || 'No conditions'}</span>
    ) : field.value ? (
        crumbs.isLoading ? (
            <Spinner label="Reading conditions" />
        ) : (
            <span>{summary || field.value}</span>
        )
    ) : (
        <span className="text-muted-foreground">No conditions (always true)</span>
    );

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            group
            readOnlyValue={readOnly}
        >
            {table ? (
                <div className="rpf-conditions min-w-0" id={field.ids.input} aria-describedby={field.describedBy}>
                    <ConditionBuilder
                        key={`${table}:${generation}`}
                        table={table}
                        value={seed}
                        dotWalk={props.dotWalk !== false}
                        allowOr={props.allowOr}
                        allowNewQuery={props.allowNewQuery}
                        onChange={(encoded: string) => {
                            if (encoded === (field.value || '')) return;
                            emitted.current = encoded;
                            field.setValue(encoded, encoded);
                        }}
                    />
                </div>
            ) : (
                <p
                    id={field.ids.input}
                    className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground"
                >
                    {field.meta.dependsOn
                        ? 'Choose a table first; the conditions apply to its records.'
                        : 'No table to build conditions on.'}
                </p>
            )}
        </FieldShell>
    );
}

export default function ConditionsFieldPreview() {
    return (
        <div className="max-w-3xl p-4">
            <ConditionsField
                name="conditions"
                label="Conditions"
                conditionsTable="incident"
                defaultValue="active=true^priority=1"
            />
        </div>
    );
}
