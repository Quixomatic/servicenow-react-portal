/**
 * components:app/variable: catalog variables on the shared field model.
 *
 *   variableSpec(variable)            AppCatalog variable → render kind + FieldMeta (+ field-control type/props)
 *   createCatalogForm(item) / useCatalogForm(item)   FormStore with catalog names and aliases
 *   <CatalogFormProvider form>        provides it to variables and field primitives
 *   <Variable spec />                 one variable (fields via app/field-control; label, rich text,
 *                                     break, attachment, requested for, custom here)
 *   catalogResolver(specs) / catalogItemIdOf(form)   g_form name aliases; the form's catalog item
 *   Custom variables (rp_component=app/<key>, rp_options={…}): registerCustomVariable,
 *     resolveCustomVariable, customVariableConfig, parseVariableAttributes, CustomVariableProps
 *   sanitizeHtml, QUESTION_TYPES, validateIp
 */
import { Variable } from './variable';
import { variableSpec } from './meta';
import { CatalogFormProvider, createCatalogForm } from './catalog-form';

export { variableSpec, QUESTION_TYPES, validateIp, customVariableConfig, parseVariableAttributes } from './meta';
export type { VariableSpec, VariableKind, CustomVariableConfig } from './meta';
export {
    createCatalogForm,
    useCatalogForm,
    CatalogFormProvider,
    useCatalogFormContext,
    catalogResolver,
    catalogItemIdOf,
} from './catalog-form';
export {
    registerCustomVariable,
    resolveCustomVariable,
    customVariableKeys,
    CustomVariableHost,
    CustomVariableNotice,
} from './custom';
export type { CustomVariableProps } from './custom';
export type { CatalogForm } from './catalog-form';
export { Variable, VariableLabel, RichTextLabel, VariableBreak, CustomVariable, sanitizeHtml } from './variable';
export type { VariableProps } from './variable';

/** Preview (Studio): a few variables of different kinds on a local catalog form. */
export default function VariablePreview() {
    const item: any = {
        sysId: 'preview',
        name: 'Preview',
        shortDescription: '',
        description: '',
        picture: '',
        type: 'catalog_item',
        requestMethod: 'order',
        mandatoryAttachment: false,
        hideQuantity: true,
        hideAttachment: true,
        quantity: [],
        targetRecordTable: '',
        targetRecordSysId: '',
        pricing: null,
        layout: [],
        values: {},
        variables: [
            {
                __typename: 'AppCatalog_StandardQuestionElementType',
                type: 'label',
                id: 'l1',
                name: 'variables.l1',
                variableName: 'l1',
                label: 'About you',
            },
            {
                __typename: 'AppCatalog_StandardQuestionElementType',
                type: 'string',
                id: 'v1',
                name: 'variables.topic',
                variableName: 'topic',
                label: 'Topic',
                mandatory: true,
            },
            {
                __typename: 'AppCatalog_ChoiceQuestionElementType',
                type: 'yes_no',
                id: 'v2',
                name: 'variables.urgent',
                variableName: 'urgent',
                label: 'Urgent?',
                includeNone: true,
            },
            {
                __typename: 'AppCatalog_ChoiceQuestionElementType',
                type: 'numeric_scale',
                id: 'v3',
                name: 'variables.rating',
                variableName: 'rating',
                label: 'Rating',
                choices: ['1', '2', '3', '4', '5'].map((n) => ({ value: n, displayValue: n })),
            },
            {
                __typename: 'AppCatalog_StandardQuestionElementType',
                type: 'rich_text_label',
                id: 'v4',
                name: 'variables.note',
                variableName: 'note',
                label: '<p><strong>Note:</strong> rich text label</p>',
            },
        ],
    };
    const form = createCatalogForm(item);
    return (
        <CatalogFormProvider form={form}>
            <div className="flex max-w-md flex-col gap-4 p-4">
                {item.variables.map((v: any) => (
                    <Variable key={v.id} spec={variableSpec(v, { table: 'sc_cat_item' })} />
                ))}
            </div>
        </CatalogFormProvider>
    );
}
