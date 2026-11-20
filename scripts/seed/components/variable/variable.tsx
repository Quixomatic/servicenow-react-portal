import { useEffect, useRef } from 'react';
import { useField, cx } from 'components:app/field';
import type { FieldLayout } from 'components:app/field';
import { FieldControl } from 'components:app/field-control';
import { validateVariableRegex } from 'utilities:app/catalog';
import { AttachmentVariable } from 'components:app/attachment-variable';
import { RequestedForField } from 'components:app/requested-for-field';
import { useCatalogFormContext, catalogItemIdOf } from './catalog-form';
import { CustomVariableHost, CustomVariableNotice } from './custom';
import type { VariableSpec } from './meta';
import { sanitizeHtml as sanitizeRichText } from 'components:rich-text';

/**
 * One catalog variable. Field-like variables render through app/field-control with metadata
 * from the catalog (the same field primitives as record forms); the rest render here:
 * label, rich text label, break, attachment (app/attachment-variable), requested for
 * (app/requested-for-field: delegation-checked) and custom (macro / UI page) variables, which
 * render the component their rp_component attribute names (see custom.tsx). Containers, variable
 * sets and MRVS are rendered by app/variable-container.
 */
export type VariableProps = {
    spec: VariableSpec;
    layout?: FieldLayout;
    /** Render custom (macro / UI page) variables yourself: return a node, or undefined for the default
     *  (the rp_component attribute's component, else a notice). */
    renderCustom?: (spec: VariableSpec) => any;
};

export function Variable({ spec, layout, renderCustom }: VariableProps) {
    switch (spec.kind) {
        case 'field':
            return <FieldVariable spec={spec} layout={layout} />;
        case 'label':
            return <VariableLabel spec={spec} />;
        case 'rich_text_label':
            return <RichTextLabel html={spec.variable.label} />;
        case 'break':
            return <VariableBreak />;
        case 'attachment':
            return <AttachmentFor spec={spec} layout={layout} />;
        case 'custom':
            return <CustomVariableHost spec={spec} layout={layout} renderCustom={renderCustom} />;
        default:
            return null;
    }
}

function AttachmentFor({ spec, layout }: { spec: VariableSpec; layout?: FieldLayout }) {
    const form = useCatalogFormContext();
    return (
        <AttachmentVariable
            name={spec.name}
            layout={layout}
            draftTable={form ? form.item.targetRecordTable : ''}
            draftSysId={form ? form.item.targetRecordSysId : ''}
            allowedExtensions={spec.variable.allowedFileExtensions || ''}
            maxBytes={parseSize(spec.meta && spec.meta.attributes ? spec.meta.attributes.max_file_size : '')}
        />
    );
}

/** '2MB' / '500KB' / '1GB' → bytes (undefined when absent). */
function parseSize(text: string): number | undefined {
    const m = /^\s*(\d+(?:\.\d+)?)\s*(KB|MB|GB)?\s*$/i.exec(String(text || ''));
    if (!m) return undefined;
    const unit = (m[2] || 'MB').toUpperCase();
    return Number(m[1]) * (unit === 'KB' ? 1024 : unit === 'GB' ? 1024 ** 3 : 1024 ** 2);
}

function FieldVariable({ spec, layout }: { spec: VariableSpec; layout?: FieldLayout }) {
    const form = useCatalogFormContext();
    if (spec.meta && spec.meta.internalType === 'requested_for')
        return <RequestedForField name={spec.name} itemId={catalogItemIdOf(form)} layout={layout} />;
    return <RegexFieldVariable spec={spec} layout={layout} form={form} />;
}

function RegexFieldVariable({
    spec,
    layout,
    form,
}: {
    spec: VariableSpec;
    layout?: FieldLayout;
    form: ReturnType<typeof useCatalogFormContext>;
}) {
    const regExp = spec.variable.regExp;
    // Question regex: validated by the platform when the value is committed.
    const last = useRef('');
    useEffect(() => {
        if (!form || !regExp) return undefined;
        return form.onChange(spec.name, (_n, value) => {
            last.current = value;
            form.hideFieldMessage(spec.name, 'error');
            if (!value) return;
            validateVariableRegex(spec.variable.id, value)
                .then((msg) => {
                    if (msg && last.current === value) form.showFieldMessage(spec.name, msg, 'error');
                })
                .catch(() => {});
        });
    }, [form, regExp, spec.name, spec.variable.id]);
    return <FieldControl name={spec.name} type={spec.fieldType} layout={layout} {...(spec.fieldProps || {})} />;
}

/** Label variable: a heading for the variables after it (announced as a heading). */
export function VariableLabel({ spec }: { spec: VariableSpec }) {
    const field = useField({ name: spec.name, standalone: true, label: spec.variable.label });
    if (spec.variable.visible === false) return null;
    return (
        <div className="rpv-label flex flex-col gap-1 pt-2" data-rpv-kind="label">
            <h3 className="text-sm font-semibold text-foreground">{field.label}</h3>
            {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
        </div>
    );
}

/**
 * Rich text label: the variable's HTML, sanitised (no scripts, event handlers, styles that
 * fight the theme, or javascript: URLs). Theme colours replace inline colours.
 */
export function RichTextLabel({ html, className }: { html: string; className?: string }) {
    return (
        <div
            className={cx('rpv-rich text-sm text-foreground', className)}
            data-rpv-kind="rich_text_label"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
        />
    );
}

/** The host kit's sanitiser (components:rich-text): allow-listed tags/attributes, safe URLs and links. */
export function sanitizeHtml(html: string): string {
    return sanitizeRichText(html);
}

export function VariableBreak() {
    return <hr className="rpv-break my-2 border-border" data-rpv-kind="break" />;
}

/** The "not available here" notice for a custom variable (kept under its old name). */
export const CustomVariable = CustomVariableNotice;
