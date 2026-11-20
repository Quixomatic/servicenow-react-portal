/**
 * components:app/boolean-field: true/false as a checkbox (native input, fully accessible) or a
 * switch (button role="switch"). The value is the glide string 'true' | 'false'; typed props give
 * `checked` and onCheckedChange. Space toggles; read-only shows "Yes"/"No" as text.
 */
import { useField, FieldShell, cx, IconCheck } from 'components:app/field';
import type { FieldProps, FieldLayout, FieldSize } from 'components:app/field';

export type BooleanFieldProps = FieldProps & {
    variant?: 'checkbox' | 'switch';
    /** Controlled checked state (alternative to value 'true'/'false'). */
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    /** Text shown next to the control (defaults to the label). */
    description?: string;
    layout?: FieldLayout;
    size?: FieldSize;
    className?: string;
};

export function isTrue(v: unknown): boolean {
    return v === true || v === 'true' || v === '1' || v === 1;
}

export function BooleanField(props: BooleanFieldProps) {
    const { checked: checkedProp, onCheckedChange, variant = 'checkbox', ...rest } = props;
    const field = useField({
        ...rest,
        value: checkedProp === undefined ? rest.value : checkedProp ? 'true' : 'false',
        defaultValue:
            rest.defaultValue ?? (rest.value === undefined && checkedProp === undefined ? 'false' : undefined),
    });
    const checked = isTrue(field.value);
    const toggle = () => {
        if (field.state.disabled || field.state.readOnly) return;
        const next = !checked;
        field.setValue(next ? 'true' : 'false', next ? 'true' : 'false');
        field.blur();
        if (onCheckedChange) onCheckedChange(next);
    };
    const labelId = field.ids.label + '-inline';
    const inlineLabel = (
        <span id={labelId} className="text-sm leading-tight font-medium text-foreground">
            {field.label}
            {field.state.mandatory ? (
                <>
                    <span aria-hidden="true" className="ml-0.5 text-destructive">
                        *
                    </span>
                    <span className="sr-only"> (required)</span>
                </>
            ) : null}
        </span>
    );
    const descId = field.ids.input + '-desc';
    const describedBy =
        [props.description ? descId : '', field.describedBy || ''].filter(Boolean).join(' ') || undefined;
    const labelBlock = (
        <span className="flex flex-col">
            {inlineLabel}
            {props.description ? (
                <span id={descId} className="text-xs font-normal text-muted-foreground">
                    {props.description}
                </span>
            ) : null}
        </span>
    );
    const common = {
        id: field.ids.input,
        'aria-labelledby': labelId,
        'aria-describedby': describedBy,
        'aria-invalid': field.invalid || undefined,
        'aria-required': field.state.mandatory || undefined,
        disabled: field.state.disabled,
        autoFocus: field.autoFocus,
    };

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            className={props.className}
            noLabel
            readOnlyValue={checked ? 'Yes' : 'No'}
        >
            {variant === 'switch' ? (
                <label
                    className={cx(
                        'inline-flex w-fit items-start gap-3',
                        field.state.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    )}
                >
                    <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        {...common}
                        onClick={toggle}
                        className={cx(
                            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none',
                            'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                            checked ? 'bg-primary' : 'bg-input',
                            field.invalid ? 'ring-2 ring-destructive/40' : ''
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={cx(
                                'pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform',
                                checked ? 'translate-x-4' : 'translate-x-0.5'
                            )}
                        />
                    </button>
                    {labelBlock}
                </label>
            ) : (
                <label
                    className={cx(
                        'inline-flex w-fit items-start gap-2.5',
                        field.state.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    )}
                >
                    <span className="relative mt-px inline-flex size-4 shrink-0">
                        <input
                            type="checkbox"
                            name={field.name}
                            checked={checked}
                            {...common}
                            onChange={toggle}
                            className={cx(
                                'peer size-4 shrink-0 cursor-[inherit] appearance-none rounded-[4px] border border-input bg-background shadow-xs outline-none transition-colors',
                                'checked:border-primary checked:bg-primary focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                field.invalid ? 'border-destructive' : ''
                            )}
                        />
                        <IconCheck
                            size={12}
                            className="pointer-events-none absolute top-0.5 left-0.5 hidden text-primary-foreground peer-checked:block"
                        />
                    </span>
                    {labelBlock}
                </label>
            )}
        </FieldShell>
    );
}

export default function BooleanFieldPreview() {
    return (
        <div className="flex flex-col gap-4 p-4">
            <BooleanField name="active" label="Active" defaultValue="true" />
            <BooleanField name="notify" label="Notify me" variant="switch" description="Email when this changes" />
        </div>
    );
}
