// Per-instance styling in the designer's inspector: Styling (style tokens), Grid (layout in the
// parent block), Classes, and the device switch. Base edits the base keys; Tablet / Mobile edit
// the `tablet` / `mobile` sub-objects (the server compiles them into container queries).
import React, { useEffect, useState } from 'react';
import { Laptop, Smartphone, Tablet } from 'lucide-react';

const THEME_COLORS = [
    'background',
    'foreground',
    'card',
    'muted',
    'muted-foreground',
    'accent',
    'primary',
    'primary-foreground',
    'secondary',
    'border',
    'destructive',
];

const TOKENS = [
    { key: 'padding', label: 'Padding', hint: '1rem · 1rem 2rem' },
    { key: 'paddingX', label: 'Padding X' },
    { key: 'paddingY', label: 'Padding Y' },
    { key: 'margin', label: 'Margin' },
    { key: 'background', label: 'Background', colors: true, hint: 'muted · #f5f5f5 · linear-gradient(…)' },
    { key: 'color', label: 'Text color', colors: true },
    { key: 'border', label: 'Border', hint: '1px solid var(--border)' },
    { key: 'borderColor', label: 'Border color', colors: true },
    { key: 'radius', label: 'Radius', hint: '0.75rem' },
    { key: 'shadow', label: 'Shadow', hint: '0 1px 3px rgb(0 0 0 / 0.1)' },
    { key: 'gap', label: 'Gap' },
    { key: 'minHeight', label: 'Min height' },
    { key: 'maxWidth', label: 'Max width' },
    { key: 'width', label: 'Width' },
    { key: 'opacity', label: 'Opacity', hint: '0–1' },
    { key: 'textAlign', label: 'Text align', options: ['', 'start', 'center', 'end', 'justify'] },
    { key: 'overflow', label: 'Overflow', options: ['', 'visible', 'hidden', 'auto', 'clip'] },
];

const SELF = ['', 'auto', 'start', 'center', 'end', 'stretch'];

/** The values a device edits: the base keys, or the tablet / mobile sub-object. */
function slice(obj, device) {
    const o = obj || {};
    if (device === 'base') {
        const base = { ...o };
        delete base.tablet;
        delete base.mobile;
        return base;
    }
    return o[device] && typeof o[device] === 'object' ? o[device] : {};
}

/** Put a device's edited values back into the whole object (empty values dropped). */
function merge(obj, device, values) {
    const clean = {};
    Object.keys(values).forEach((k) => {
        const v = values[k];
        if (v !== undefined && v !== null && v !== '') clean[k] = v;
    });
    const o = obj || {};
    if (device === 'base') {
        const out = { ...clean };
        if (o.tablet) out.tablet = o.tablet;
        if (o.mobile) out.mobile = o.mobile;
        return out;
    }
    const out = { ...o };
    if (Object.keys(clean).length) out[device] = clean;
    else delete out[device];
    return out;
}

export function DeviceSwitch({ value, onChange }) {
    const items = [
        ['base', Laptop, 'Base (all sizes)'],
        ['tablet', Tablet, 'Tablet (≤ 1023px)'],
        ['mobile', Smartphone, 'Mobile (≤ 639px)'],
    ];
    return (
        <div className="rpd-device" role="radiogroup" aria-label="Edit for device" data-rpd-device-switch="">
            {items.map(([id, Icon, label]) => (
                <button
                    key={id}
                    role="radio"
                    aria-checked={value === id}
                    className="rps-tbtn"
                    aria-pressed={value === id}
                    title={label}
                    onClick={() => onChange(id)}
                    data-rpd-edit-device={id}
                >
                    <Icon size={13} /> {id === 'base' ? 'Base' : id === 'tablet' ? 'Tablet' : 'Mobile'}
                </button>
            ))}
        </div>
    );
}

/** Text input applied on blur / Enter. */
function Field({ label, value, onCommit, disabled, placeholder, list, type, name }) {
    const [draft, setDraft] = useState(value);
    useEffect(() => setDraft(value), [value]);
    const commit = () => draft !== value && onCommit(draft);
    return (
        <label className="rpd-field" data-rpd-style-field={name}>
            <span className="rpd-label">{label}</span>
            <input
                type={type || 'text'}
                value={draft}
                placeholder={placeholder}
                list={list}
                disabled={disabled}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === 'Enter' && commit()}
            />
        </label>
    );
}

function Choice({ label, value, options, onCommit, disabled, name }) {
    return (
        <label className="rpd-field" data-rpd-style-field={name}>
            <span className="rpd-label">{label}</span>
            <select value={value || ''} onChange={(e) => onCommit(e.target.value)} disabled={disabled}>
                {options.map((o) => (
                    <option key={o} value={o}>
                        {o || '(default)'}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function StyleSection({ placement, device, onApply, disabled }) {
    const all = placement.styleTokens || {};
    const values = slice(all, device);
    const set = (key, v) => onApply(merge(all, device, { ...values, [key]: v }));
    const count = Object.keys(values).length;
    return (
        <details className="rpd-section" open={count > 0 || undefined} data-rpd-styling="">
            <summary className="rpd-section-title">
                Styling{device !== 'base' ? ` · ${device}` : ''}
                {count ? <span className="rps-count">{count}</span> : null}
            </summary>
            <datalist id="rpd-theme-colors">
                {THEME_COLORS.map((c) => (
                    <option key={c} value={c} />
                ))}
            </datalist>
            <div className="rpd-grid2">
                {TOKENS.map((t) =>
                    t.options ? (
                        <Choice
                            key={t.key}
                            name={t.key}
                            label={t.label}
                            value={values[t.key]}
                            options={t.options}
                            disabled={disabled}
                            onCommit={(v) => set(t.key, v)}
                        />
                    ) : (
                        <Field
                            key={t.key}
                            name={t.key}
                            label={t.label}
                            value={values[t.key] === undefined ? '' : String(values[t.key])}
                            placeholder={
                                device !== 'base' && all[t.key] !== undefined ? String(all[t.key]) : t.hint || ''
                            }
                            list={t.colors ? 'rpd-theme-colors' : undefined}
                            disabled={disabled}
                            onCommit={(v) =>
                                set(t.key, t.key === 'opacity' && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v)
                            }
                        />
                    )
                )}
            </div>
            <div className="rpd-hint">
                Theme colour names (muted, primary, …) follow the portal theme and dark mode.
            </div>
        </details>
    );
}

export function LayoutSection({ placement, device, onApply, inBlock, disabled }) {
    const all = placement.layout || {};
    const values = slice(all, device);
    const set = (key, v) => onApply(merge(all, device, { ...values, [key]: v }));
    const num = (v) => (v === '' ? '' : Number.isNaN(parseInt(v, 10)) ? '' : parseInt(v, 10));
    const full = values.colSpan === 'full';
    const count = Object.keys(values).length;
    return (
        <details className="rpd-section" open={(inBlock && count > 0) || undefined} data-rpd-grid-section="">
            <summary className="rpd-section-title">
                Grid{device !== 'base' ? ` · ${device}` : ''}
                {count ? <span className="rps-count">{count}</span> : null}
            </summary>
            {!inBlock ? <div className="rpd-hint">Applies when this sits in a grid or flex block.</div> : null}
            <div className="rpd-grid2">
                <label className="rpd-field" data-rpd-style-field="colSpan">
                    <span className="rpd-label">Column span</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <SpanInput
                            value={full ? '' : values.colSpan === undefined ? '' : String(values.colSpan)}
                            disabled={disabled || full}
                            onCommit={(v) => set('colSpan', num(v))}
                        />
                        <label className="rpd-check" title="Span the whole row">
                            <input
                                type="checkbox"
                                checked={full}
                                disabled={disabled}
                                onChange={(e) => set('colSpan', e.target.checked ? 'full' : '')}
                                data-rpd-span-full=""
                            />{' '}
                            full
                        </label>
                    </div>
                </label>
                <Field
                    name="rowSpan"
                    label="Row span"
                    type="number"
                    value={values.rowSpan === undefined ? '' : String(values.rowSpan)}
                    disabled={disabled}
                    onCommit={(v) => set('rowSpan', num(v))}
                />
                <Field
                    name="colStart"
                    label="Column start"
                    type="number"
                    value={values.colStart === undefined ? '' : String(values.colStart)}
                    disabled={disabled}
                    onCommit={(v) => set('colStart', num(v))}
                />
                <Field
                    name="rowStart"
                    label="Row start"
                    type="number"
                    value={values.rowStart === undefined ? '' : String(values.rowStart)}
                    disabled={disabled}
                    onCommit={(v) => set('rowStart', num(v))}
                />
                <Field
                    name="order"
                    label="Order"
                    type="number"
                    value={values.order === undefined ? '' : String(values.order)}
                    disabled={disabled}
                    onCommit={(v) => set('order', v === '' ? '' : Number(v))}
                />
                <Choice
                    name="alignSelf"
                    label="Align self"
                    value={values.alignSelf}
                    options={SELF}
                    disabled={disabled}
                    onCommit={(v) => set('alignSelf', v)}
                />
                <Choice
                    name="justifySelf"
                    label="Justify self"
                    value={values.justifySelf}
                    options={SELF}
                    disabled={disabled}
                    onCommit={(v) => set('justifySelf', v)}
                />
            </div>
        </details>
    );
}

function SpanInput({ value, onCommit, disabled }) {
    const [draft, setDraft] = useState(value);
    useEffect(() => setDraft(value), [value]);
    const commit = () => draft !== value && onCommit(draft);
    return (
        <input
            type="number"
            min="1"
            max="48"
            style={{ width: 70 }}
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            data-rpd-col-span=""
        />
    );
}

export function ClassesField({ placement, onApply, disabled }) {
    return (
        <div className="rpd-section" data-rpd-classes="">
            <Field
                name="classes"
                label="Classes (Tailwind, compiled per instance)"
                value={placement.classes || ''}
                placeholder="rounded-xl border p-4 shadow-sm"
                disabled={disabled}
                onCommit={(v) => onApply(String(v || '').trim())}
            />
        </div>
    );
}
