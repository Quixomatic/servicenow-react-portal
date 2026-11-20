/**
 * components:app/code-field: script and markup fields (script, script_plain, xml, css, json, …)
 * as a code editor, Next Experience's sn-record-code-editor, on the host kit's
 * components:code-editor (CodeMirror 6 in the lazily loaded portal-code chunk).
 *
 *   <CodeField name="script" table="sys_script_include" />          bound to the form
 *   <CodeField name="payload" label="Payload" language="json" value={json} onChange={setJson} />
 *
 * Field behaviour on top of the generic editor:
 * - the language comes from the glide type (codeLanguageForType: script → javascript, xml, css,
 *   json, html_script → html), else `language`;
 * - keystrokes stage, blur or Ctrl/⌘+Enter commits (one onChange per edit, like the textarea);
 * - read-only shows the code highlighted (still focusable and selectable); an empty read-only
 *   value is the shell's em dash, so no editor chunk loads for it;
 * - label, hint, messages, mandatory and invalid wiring come from app/field (aria-labelledby and
 *   aria-describedby on the editor's role="textbox").
 */
import { useField, FieldShell } from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';
import { CodeEditor, codeLanguageForType } from 'components:code-editor';

export { codeLanguageForType };

/** Glide types this primitive renders (app/field-control registers them). */
export const CODE_FIELD_TYPES = [
    'script',
    'script_plain',
    'script_server',
    'xml',
    'css',
    'json',
    'json_translations',
    'html_script',
    'html_template',
];

export type CodeFieldProps = FieldProps & {
    /** Editor language; defaults from the glide type. */
    language?: string;
    minLines?: number;
    maxHeight?: string;
    lineNumbers?: boolean;
    tabSize?: number;
    layout?: FieldLayout;
    size?: FieldSize;
    showOptional?: boolean;
    className?: string;
};

export function CodeField(props: CodeFieldProps) {
    const field = useField(props);
    const type = props.type || (field.meta && field.meta.type) || '';
    const language = props.language || codeLanguageForType(type);
    const current = field.staged ?? field.value;
    const readOnly = field.state.readOnly;
    const commit = (text: string) => {
        if (text !== field.value || field.staged !== undefined) field.setValue(text);
    };
    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            keepControlWhenReadOnly={!!current}
        >
            <CodeEditor
                id={field.ids.input}
                value={current || ''}
                language={language}
                readOnly={readOnly}
                disabled={field.state.disabled}
                invalid={field.invalid}
                required={field.state.mandatory}
                placeholder={field.placeholder}
                minLines={props.minLines ?? (readOnly ? 1 : 6)}
                maxHeight={props.maxHeight}
                lineNumbers={props.lineNumbers}
                tabSize={props.tabSize}
                aria-labelledby={field.ids.label}
                aria-describedby={field.describedBy}
                onChange={(text: string) => field.stage(text)}
                onSubmit={(text: string) => commit(text)}
                onBlur={(text: string) => {
                    commit(text);
                    field.blur();
                }}
            />
        </FieldShell>
    );
}

export default function CodeFieldPreview() {
    return (
        <div className="flex max-w-2xl flex-col gap-4 p-4">
            <CodeField
                name="script"
                label="Script"
                type="script"
                hint="Tab indents; Escape then Tab moves on"
                defaultValue={
                    "(function executeRule(current, previous) {\n    gs.info('Hello ' + current.getDisplayValue());\n})(current, previous);"
                }
            />
            <CodeField name="payload" label="Payload" type="json" readOnly defaultValue={'{\n    "active": true\n}'} />
        </div>
    );
}
