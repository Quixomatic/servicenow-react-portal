import { parseAttributes } from 'utilities:app/graphql';
import type { FieldMeta } from 'utilities:app/graphql';
import type { CatalogVariable } from 'utilities:app/catalog';

/** How a variable renders. */
export type VariableKind =
    | 'field' // through app/field-control (fieldType + fieldProps)
    | 'label'
    | 'rich_text_label'
    | 'break'
    | 'container'
    | 'variable_set'
    | 'mrvs'
    | 'attachment'
    | 'custom';

export type VariableSpec = {
    variable: CatalogVariable;
    kind: VariableKind;
    /** Store field name ('variables.<name>'). */
    name: string;
    /** Name the platform submits (variable name; containers have none). */
    submitName: string | null;
    /** Glide type for app/field-control (kind 'field'). */
    fieldType?: string;
    /** Extra props for the chosen field primitive (variant, confirm, choices, validate…). */
    fieldProps?: Record<string, unknown>;
    meta?: FieldMeta;
    /** Custom (macro / UI page) variables: the component named by the rp_component attribute. */
    custom?: CustomVariableConfig;
};

/**
 * The custom-variable contract on the variable's attributes (item_option_new.attributes):
 *   rp_component=app/<key>          the component record that renders the variable
 *   rp_options={…json…}             optional props for it (JSON; may contain commas)
 */
export type CustomVariableConfig = {
    /** 'app/<key>' (from rp_component), '' when none is set. */
    component: string;
    options: Record<string, unknown>;
    /** Type 17 (custom with label) and UI page variables show the variable's label; type 14 doesn't. */
    showLabel: boolean;
    /** rp_options that didn't parse (shown to developers). */
    error?: string;
};

/**
 * Variable attributes, JSON-aware: `rp_options={…}` keeps its commas; everything else is the
 * platform's `name=value,name=value` list (parseAttributes).
 */
export function parseVariableAttributes(raw: string): { attributes: Record<string, string>; rpOptions?: string } {
    const text = String(raw || '');
    const at = text.search(/(^|,)\s*rp_options\s*=/);
    if (at < 0) return { attributes: parseAttributes(text) };
    const start = text.indexOf('=', at) + 1;
    let i = start;
    while (i < text.length && /\s/.test(text[i])) i++;
    let end = i;
    if (text[i] === '{' || text[i] === '[') {
        // Balanced braces / brackets, strings respected.
        let depth = 0;
        let inString = false;
        for (end = i; end < text.length; end++) {
            const ch = text[end];
            if (inString) {
                if (ch === '\\') end++;
                else if (ch === '"') inString = false;
                continue;
            }
            if (ch === '"') inString = true;
            else if (ch === '{' || ch === '[') depth++;
            else if (ch === '}' || ch === ']') {
                depth--;
                if (depth === 0) {
                    end++;
                    break;
                }
            }
        }
    } else {
        end = text.indexOf(',', i);
        if (end < 0) end = text.length;
    }
    const rpOptions = text.slice(i, end).trim();
    const rest = (text.slice(0, at) + ',' + text.slice(end)).replace(/^[\s,]+|[\s,]+$/g, '');
    return { attributes: parseAttributes(rest), rpOptions };
}

/** rp_component / rp_options of a variable's attributes (see CustomVariableConfig). */
export function customVariableConfig(raw: string, showLabel: boolean): CustomVariableConfig {
    const { attributes, rpOptions } = parseVariableAttributes(raw);
    const component = String(attributes.rp_component || '')
        .trim()
        .replace(/^components:/, '');
    let options: Record<string, unknown> = {};
    let error: string | undefined;
    if (rpOptions) {
        try {
            const parsed = JSON.parse(rpOptions);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) options = parsed;
            else error = 'rp_options must be a JSON object';
        } catch (e) {
            error = `rp_options is not valid JSON: ${(e as Error).message}`;
        }
    }
    return { component, options, showLabel, error };
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;
export function validateIp(v: string): string | undefined {
    const t = String(v).trim();
    return IPV4.test(t) || (t.includes(':') && IPV6.test(t)) ? undefined : 'Enter an IPv4 or IPv6 address';
}

/** Variable type (AppCatalog UI type, or the numeric question.type) → field-control type and props. */
const TYPE_MAP: Record<string, { type: string; props?: Record<string, unknown> }> = {
    string: { type: 'string' },
    single_line_text: { type: 'string' },
    wide_single_line_text: { type: 'string' },
    multi_two_lines: { type: 'multi_two_lines' },
    multi_line_text: { type: 'multi_two_lines' },
    html: { type: 'html' },
    choice: { type: 'choice' },
    select_box: { type: 'choice' },
    lookup_select_box: { type: 'choice' },
    multiple_choice: { type: 'choice', props: { variant: 'radio' } },
    lookup_multiple_choice: { type: 'choice', props: { variant: 'radio' } },
    numeric_scale: { type: 'choice', props: { variant: 'scale' } },
    yes_no: { type: 'choice' },
    reference: { type: 'reference' },
    requested_for: { type: 'reference' },
    glide_list: { type: 'glide_list' },
    list_collector: { type: 'glide_list' },
    boolean: { type: 'boolean' },
    checkbox: { type: 'boolean' },
    glide_date: { type: 'glide_date' },
    date: { type: 'glide_date' },
    glide_date_time: { type: 'glide_date_time' },
    date_time: { type: 'glide_date_time' },
    masked: { type: 'masked' },
    email: { type: 'email' },
    url: { type: 'url' },
    ip_address: { type: 'string', props: { validate: validateIp } },
    glide_duration: { type: 'glide_duration' },
    duration: { type: 'glide_duration' },
    integer: { type: 'integer' },
};

/** question.type numbers (sys_choice question/type) → AppCatalog UI type names. */
export const QUESTION_TYPES: Record<string, string> = {
    '1': 'yes_no',
    '2': 'multi_two_lines',
    '3': 'multiple_choice',
    '4': 'numeric_scale',
    '5': 'choice',
    '6': 'string',
    '7': 'boolean',
    '8': 'reference',
    '9': 'glide_date',
    '10': 'glide_date_time',
    '11': 'label',
    '12': 'break',
    '14': 'macro',
    '15': 'ui_page',
    '16': 'string',
    '17': 'macro_with_label',
    '18': 'lookup_select_box',
    '19': 'container_start',
    '20': 'container_end',
    '21': 'glide_list',
    '22': 'lookup_multiple_choice',
    '23': 'html',
    '24': 'container_split',
    '25': 'masked',
    '26': 'email',
    '27': 'url',
    '28': 'ip_address',
    '29': 'glide_duration',
    '31': 'requested_for',
    '32': 'rich_text_label',
    '33': 'attachment',
    '40': 'table_name',
};

const YES_NO = [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
];

function hintOf(v: CatalogVariable): string | undefined {
    const parts = [v.showHelp && v.helpText ? v.helpText : '', v.instructions || '']
        .map((s) =>
            String(s || '')
                .replace(/<[^>]+>/g, '')
                .trim()
        )
        .filter(Boolean);
    return parts.length ? parts.join(' ') : undefined;
}

/** One variable → how to render it and its FieldMeta (shared field model, no parallel pipeline). */
export function variableSpec(v: CatalogVariable, ctx: { table: string }): VariableSpec {
    const rawType = QUESTION_TYPES[String(v.type)] || String(v.type || 'string');
    const name = v.name || `variables.${v.variableName || v.id}`;
    const submitName = v.variableName || null;
    const base = { variable: v, name, submitName };
    if (v.__typename === 'AppCatalog_MultiRowVariableSetType' || v.containerType === 'one_to_many')
        return { ...base, kind: 'mrvs' };
    if (v.__typename === 'AppCatalog_SingleRowVariableSetType' || v.containerType === 'one_to_one')
        return { ...base, kind: 'variable_set', submitName: null };
    if (
        rawType === 'container' ||
        rawType.indexOf('container_') === 0 ||
        v.__typename === 'AppCatalog_ContainerQuestionElementType'
    )
        return { ...base, kind: 'container', submitName: null };
    if (rawType === 'label') return { ...base, kind: 'label', submitName: null };
    if (rawType === 'rich_text_label') return { ...base, kind: 'rich_text_label', submitName: null };
    if (rawType === 'break') return { ...base, kind: 'break', submitName: null };
    if (
        rawType === 'macro' ||
        rawType === 'macro_with_label' ||
        rawType === 'ui_page' ||
        rawType === 'custom' ||
        rawType === 'custom_with_label'
    ) {
        const showLabel = rawType !== 'macro' && rawType !== 'custom';
        const custom = customVariableConfig(v.variableAttributes || '', showLabel);
        // A FieldMeta too, so the store validates it (mandatory) and g_form / policies reach it.
        const meta: FieldMeta = {
            table: v.referringTable || ctx.table,
            name,
            label: String(v.label || v.variableName || '').trim(),
            type: 'string',
            internalType: rawType,
            mandatory: !!v.mandatory,
            readOnly: !!v.readOnly,
            hint: hintOf(v),
            defaultValue: v.defaultValue || undefined,
            attributes: parseVariableAttributes(v.variableAttributes || '').attributes,
            source: 'layout',
        };
        return { ...base, kind: 'custom', custom, meta };
    }

    // HTML (type 23): fieldType 'html' goes through app/field-control's registry, so the rich-text
    // field (components:app/html-field) takes over there once it registers for 'html'.
    const attributes = parseAttributes(v.variableAttributes || '');
    const map = TYPE_MAP[rawType] || { type: rawType };
    const choices =
        rawType === 'yes_no' && !(v.choices && v.choices.length)
            ? YES_NO
            : v.choices
              ? v.choices.map((c) => ({ value: String(c.value ?? ''), label: String(c.displayValue ?? c.value ?? '') }))
              : undefined;
    const meta: FieldMeta = {
        table: v.referringTable || ctx.table,
        name,
        label: String(v.label || v.variableName || '').trim(),
        type: map.type,
        internalType: rawType,
        mandatory: !!v.mandatory,
        // A read-only variable without a default isn't mandatory (platform rule; useField also applies it).
        readOnly: !!v.readOnly,
        hint: hintOf(v),
        maxLength: attributes.max_length ? Number(attributes.max_length) : undefined,
        defaultValue: v.defaultValue || undefined,
        dependsOn: v.dependentField
            ? v.dependentField.indexOf('variables.') === 0
                ? v.dependentField
                : `variables.${v.dependentField}`
            : undefined,
        attributes,
        choices,
        choiceType: choices ? (v.includeNone ? 1 : 3) : undefined,
        reference:
            map.type === 'reference' || map.type === 'glide_list'
                ? {
                      table: v.reference || v.listTable || (rawType === 'requested_for' ? 'sys_user' : ''),
                      qualifier: v.referenceQual || undefined,
                      useQualifier: v.useReferenceQualifier || undefined,
                      orderBy: v.refAcOrderBy || undefined,
                      displayColumns: attributes.ref_ac_columns
                          ? attributes.ref_ac_columns.split(';').filter(Boolean)
                          : undefined,
                  }
                : undefined,
        source: 'layout',
    };
    if (v.exampleText) meta.attributes = { ...meta.attributes, placeholder: v.exampleText };
    if (rawType === 'attachment') return { ...base, kind: 'attachment', meta };

    const fieldProps: Record<string, unknown> = { ...(map.props || {}) };
    if (choices && !meta.dependsOn) fieldProps.choices = choices;
    if ((rawType === 'multiple_choice' || rawType === 'lookup_multiple_choice') && v.choiceDirection === 'across')
        fieldProps.direction = 'horizontal';
    if (rawType === 'masked' && v.useConfirmation) fieldProps.confirm = true;
    if (rawType === 'yes_no' || (rawType === 'choice' && v.includeNone)) fieldProps.includeNone = !!v.includeNone;
    return { ...base, kind: 'field', fieldType: map.type, fieldProps, meta };
}
