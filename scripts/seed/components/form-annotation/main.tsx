/**
 * components:app/form-annotation: a form annotation (sys_ui_annotation) as the form layout ships it.
 *
 *   <FormAnnotation type="Info Box Blue" text="…" isPlainText={false} />
 *
 * Kinds, from the annotation type's display value:
 * - info box (blue / default)  → info callout          - info box red / warning → warning callout
 * - info box green / success   → success callout       - plain text / section details → muted text
 * - line separator             → <hr>                  - line break → vertical space
 *
 * HTML is sanitised (allow-listed tags, links open in a new tab) unless isPlainText, which renders
 * text as-is with line breaks kept. Unevaluated `${…}` expressions (server-side Jelly) are dropped
 * from links rather than shown.
 */
import { cx, IconInfo, IconAlert, IconCheck } from 'components:app/field';
import { sanitizeHtml } from 'components:app/variable';

export type AnnotationKind = 'info' | 'warning' | 'success' | 'text' | 'separator' | 'break';

/** The annotation kind from its type's display value (falls back to an info callout). */
export function annotationKind(type: string): AnnotationKind {
    const t = String(type || '').toLowerCase();
    if (t.indexOf('separator') >= 0) return 'separator';
    if (t.indexOf('break') >= 0) return 'break';
    if (t.indexOf('red') >= 0 || t.indexOf('warn') >= 0 || t.indexOf('error') >= 0) return 'warning';
    if (t.indexOf('green') >= 0 || t.indexOf('success') >= 0) return 'success';
    if (t.indexOf('plain') >= 0 || t.indexOf('text') >= 0 || t.indexOf('detail') >= 0) return 'text';
    return 'info';
}

/** Strip unevaluated Jelly expressions (`${gs.getProperty(…)}`) the platform leaves in annotation HTML. */
function stripJelly(html: string): string {
    return String(html || '').replace(/\$\{[^}]*\}/g, '');
}

export type FormAnnotationProps = {
    type: string;
    text: string;
    isPlainText?: boolean;
    className?: string;
    id?: string;
};

export function FormAnnotation(props: FormAnnotationProps) {
    const kind = annotationKind(props.type);
    if (kind === 'separator')
        return (
            <hr
                className={cx('my-1 border-0 border-t border-border', props.className)}
                data-rp-annotation="separator"
            />
        );
    if (kind === 'break')
        return <div aria-hidden="true" className={cx('h-2', props.className)} data-rp-annotation="break" />;
    const body = props.isPlainText ? (
        <span className="whitespace-pre-line">{props.text}</span>
    ) : (
        <span
            className="rpv-rich [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(stripJelly(props.text)) }}
        />
    );
    if (kind === 'text')
        return (
            <div className={cx('text-sm text-muted-foreground', props.className)} data-rp-annotation="text">
                {body}
            </div>
        );
    const Icon = kind === 'warning' ? IconAlert : kind === 'success' ? IconCheck : IconInfo;
    return (
        <div
            role="note"
            className={cx(
                'flex items-start gap-2 rounded-md border p-3 text-sm',
                kind === 'warning'
                    ? 'border-amber-500/40 bg-amber-500/10 text-foreground'
                    : kind === 'success'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground'
                      : 'border-primary/30 bg-primary/5 text-foreground',
                props.className
            )}
            data-rp-annotation={kind}
        >
            <Icon
                size={16}
                aria-hidden="true"
                className={cx(
                    'mt-0.5 shrink-0',
                    kind === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : kind === 'success'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-primary'
                )}
            />
            <div className="min-w-0 flex-1">{body}</div>
        </div>
    );
}

/** Preview (Studio). */
export default function FormAnnotationPreview() {
    return (
        <div className="flex max-w-xl flex-col gap-3 p-4">
            <FormAnnotation
                type="Info Box Blue"
                text="An <strong>info</strong> annotation with a <a href='#'>link</a>."
            />
            <FormAnnotation type="Info Box Red" text="A warning annotation." />
            <FormAnnotation type="Info Box Green" text="A success annotation." />
            <FormAnnotation type="Plain Text" text={'Plain text,\nline breaks kept.'} isPlainText />
            <FormAnnotation type="Line Separator" text="" />
        </div>
    );
}
