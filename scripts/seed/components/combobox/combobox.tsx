import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    cx,
    controlClass,
    bareInputClass,
    adornmentButtonClass,
    optionClass,
    IconCheck,
    IconChevronDown,
    Spinner,
} from 'components:app/field';
import { Popup } from './popup';

export type ComboItem = {
    value: string;
    label: string;
    /** Secondary text (e.g. an email under a name). */
    description?: string;
    /** Group heading; consecutive items with the same group are grouped. */
    group?: string;
    disabled?: boolean;
    data?: any;
};

function optionId(listId: string, index: number) {
    return `${listId}-opt-${index}`;
}

function groupsOf(items: ComboItem[]) {
    const out: { label?: string; items: { item: ComboItem; index: number }[] }[] = [];
    items.forEach((item, index) => {
        const last = out[out.length - 1];
        if (!last || last.label !== item.group) out.push({ label: item.group, items: [{ item, index }] });
        else last.items.push({ item, index });
    });
    return out;
}

function nextEnabled(items: ComboItem[], from: number, step: number): number {
    if (!items.length) return -1;
    let i = from;
    for (let n = 0; n < items.length; n++) {
        i = (i + step + items.length) % items.length;
        if (!items[i].disabled) return i;
    }
    return -1;
}

/** The options list (role=listbox). Pointer-down never steals focus from the control. */
export function Listbox(props: {
    id: string;
    items: ComboItem[];
    activeIndex: number;
    selected: (item: ComboItem) => boolean;
    onPick: (item: ComboItem) => void;
    onHover?: (index: number) => void;
    renderItem?: (item: ComboItem, state: { active: boolean; selected: boolean }) => any;
    emptyText?: any;
    loading?: boolean;
}) {
    const { id, items, activeIndex, selected, onPick, onHover, renderItem } = props;
    // Keep the active option in view.
    const box = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (activeIndex < 0 || !box.current) return;
        const el = box.current.querySelector(`[id="${optionId(id, activeIndex)}"]`) as HTMLElement | null;
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, id]);
    if (!items.length)
        return (
            <div className="px-2 py-1.5 text-sm text-muted-foreground" role="presentation">
                {props.loading ? <Spinner label="Searching" /> : props.emptyText || 'No results'}
            </div>
        );
    return (
        <div ref={box} role="presentation">
            {groupsOf(items).map((g, gi) => {
                const labelId = `${id}-g${gi}`;
                const rows = g.items.map(({ item, index }) => {
                    const active = index === activeIndex;
                    const isSelected = selected(item);
                    return (
                        <div
                            key={`${item.value}-${index}`}
                            id={optionId(id, index)}
                            role="option"
                            aria-selected={isSelected}
                            aria-disabled={item.disabled || undefined}
                            data-active={active ? '' : undefined}
                            className={cx(optionClass(active, isSelected), item.disabled ? 'opacity-50' : '')}
                            onPointerDown={(e: any) => e.preventDefault()}
                            onClick={() => !item.disabled && onPick(item)}
                            onPointerMove={() => onHover && onHover(index)}
                        >
                            {renderItem ? (
                                renderItem(item, { active, selected: isSelected })
                            ) : (
                                <span className="flex min-w-0 flex-col">
                                    <span className="truncate">{item.label}</span>
                                    {item.description ? (
                                        <span
                                            className={cx(
                                                'truncate text-xs',
                                                active ? 'text-accent-foreground/80' : 'text-muted-foreground'
                                            )}
                                        >
                                            {item.description}
                                        </span>
                                    ) : null}
                                </span>
                            )}
                            {isSelected ? (
                                <span className="absolute right-2 flex items-center">
                                    <IconCheck size={14} />
                                </span>
                            ) : null}
                        </div>
                    );
                });
                return g.label ? (
                    <div key={`g${gi}`} role="group" aria-labelledby={labelId}>
                        <div
                            id={labelId}
                            role="presentation"
                            className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground"
                        >
                            {g.label}
                        </div>
                        {rows}
                    </div>
                ) : (
                    <div key={`g${gi}`} role="presentation">
                        {rows}
                    </div>
                );
            })}
        </div>
    );
}

export type ComboboxProps = {
    id?: string;
    inputValue: string;
    onInputChange: (text: string) => void;
    items: ComboItem[];
    onSelect: (item: ComboItem) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    selectedValues?: string[];
    loading?: boolean;
    emptyText?: any;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    invalid?: boolean;
    required?: boolean;
    'aria-describedby'?: string;
    'aria-labelledby'?: string;
    'aria-label'?: string;
    name?: string;
    autoFocus?: boolean;
    size?: 'sm' | 'md';
    /** Inside the frame, before the input (chips for multi-select). */
    startAdornment?: any;
    /** Inside the frame, after the input (clear button). */
    endAdornment?: any;
    renderItem?: (item: ComboItem, state: { active: boolean; selected: boolean }) => any;
    onBlur?: () => void;
    onFocus?: () => void;
    onKeyDown?: (e: any) => void;
    /** Status text for screen readers (defaults to the result count). */
    status?: string;
    className?: string;
    footer?: any;
    /** Option to make active when the list opens or its items change (e.g. the current time), else the first. */
    activeValue?: string;
};

/**
 * Editable combobox (WAI-ARIA combobox with listbox popup): focus stays in the input, the active
 * option is announced through aria-activedescendant, result counts through a polite live region.
 * Keys: ↓/↑ open and move, Alt+↓ open, Enter pick, Escape close, Tab leave.
 */
export function Combobox(props: ComboboxProps) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const inputId = props.id || `rpc-${uid}`;
    const listId = `${inputId}-listbox`;
    const frame = useRef<HTMLDivElement | null>(null);
    const input = useRef<HTMLInputElement | null>(null);
    const [openState, setOpenState] = useState(false);
    const open = props.open ?? openState;
    const setOpen = (v: boolean) => {
        if (props.open === undefined) setOpenState(v);
        if (props.onOpenChange) props.onOpenChange(v);
    };
    const [active, setActive] = useState(-1);
    const items = props.items;
    const selectedSet = useMemo(() => new Set(props.selectedValues || []), [props.selectedValues]);

    // Reset the active option when results change.
    useEffect(() => {
        const preferred =
            props.activeValue !== undefined ? items.findIndex((i) => i.value === props.activeValue && !i.disabled) : -1;
        setActive(open && items.length ? (preferred >= 0 ? preferred : nextEnabled(items, -1, 1)) : -1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, open]);

    const pick = (item: ComboItem) => {
        props.onSelect(item);
    };
    const onKeyDown = (e: any) => {
        if (props.onKeyDown) props.onKeyDown(e);
        if (e.defaultPrevented || props.readOnly || props.disabled) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) setOpen(true);
            else setActive((i) => nextEnabled(items, i, 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) setOpen(true);
            else setActive((i) => nextEnabled(items, i < 0 ? 0 : i, -1));
        } else if (e.key === 'Enter') {
            if (open && active >= 0 && items[active]) {
                e.preventDefault();
                pick(items[active]);
            }
        } else if (e.key === 'Escape') {
            if (open) {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
            }
        } else if (e.key === 'PageDown' && open) {
            e.preventDefault();
            setActive((i) => Math.min(items.length - 1, (i < 0 ? 0 : i) + 8));
        } else if (e.key === 'PageUp' && open) {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 8));
        }
    };

    const status =
        props.status ??
        (open
            ? props.loading && !items.length
                ? 'Searching…'
                : `${items.length} result${items.length === 1 ? '' : 's'} available`
            : '');

    return (
        <div className={cx('relative w-full', props.className)}>
            <div
                ref={frame}
                className={cx(
                    controlClass({ size: props.size, invalid: props.invalid }),
                    'h-auto min-h-9 flex-wrap gap-1 py-1 pr-1',
                    props.disabled ? 'opacity-50' : ''
                )}
                onClick={() => input.current && input.current.focus()}
            >
                {props.startAdornment}
                <input
                    ref={input}
                    id={inputId}
                    name={props.name}
                    type="text"
                    role="combobox"
                    autoComplete="off"
                    spellCheck={false}
                    aria-autocomplete="list"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-haspopup="listbox"
                    aria-activedescendant={open && active >= 0 ? optionId(listId, active) : undefined}
                    aria-describedby={props['aria-describedby']}
                    aria-labelledby={props['aria-labelledby']}
                    aria-label={props['aria-label']}
                    aria-invalid={props.invalid || undefined}
                    aria-required={props.required || undefined}
                    disabled={props.disabled}
                    readOnly={props.readOnly}
                    autoFocus={props.autoFocus}
                    placeholder={props.placeholder}
                    value={props.inputValue}
                    className={cx(bareInputClass, 'h-7 min-w-24')}
                    onChange={(e: any) => {
                        props.onInputChange(e.target.value);
                        if (!open) setOpen(true);
                    }}
                    onKeyDown={onKeyDown}
                    onClick={() => {
                        // Pointer users open the list by clicking the input (keyboard: ↓ / Alt+↓).
                        if (!open && !props.readOnly && !props.disabled) setOpen(true);
                    }}
                    onFocus={props.onFocus}
                    onBlur={() => {
                        setOpen(false);
                        if (props.onBlur) props.onBlur();
                    }}
                />
                {props.loading ? <Spinner className="px-1 text-muted-foreground" label="Searching" /> : null}
                {props.endAdornment}
                <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    className={adornmentButtonClass}
                    disabled={props.disabled || props.readOnly}
                    onPointerDown={(e: any) => e.preventDefault()}
                    onClick={(e: any) => {
                        e.stopPropagation();
                        if (input.current) input.current.focus();
                        setOpen(!open);
                    }}
                >
                    <IconChevronDown size={14} />
                </button>
            </div>
            <span className="sr-only" aria-live="polite" role="status">
                {status}
            </span>
            <Popup
                anchor={frame}
                open={open}
                onDismiss={() => setOpen(false)}
                id={listId}
                role="listbox"
                aria-labelledby={props['aria-labelledby']}
                aria-multiselectable={props.selectedValues && props.selectedValues.length > 1 ? true : undefined}
            >
                <Listbox
                    id={listId}
                    items={items}
                    activeIndex={active}
                    selected={(item) => selectedSet.has(item.value)}
                    onPick={pick}
                    onHover={setActive}
                    renderItem={props.renderItem}
                    emptyText={props.emptyText}
                    loading={props.loading}
                />
                {props.footer}
            </Popup>
        </div>
    );
}

export type SelectProps = {
    id?: string;
    value: string;
    items: ComboItem[];
    onChange: (item: ComboItem) => void;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    required?: boolean;
    'aria-describedby'?: string;
    'aria-labelledby'?: string;
    'aria-label'?: string;
    autoFocus?: boolean;
    size?: 'sm' | 'md';
    loading?: boolean;
    className?: string;
    onBlur?: () => void;
    /** Label for the selected value when it isn't among the items (e.g. a retired choice). */
    fallbackLabel?: string;
    /** 'inline': a borderless compact trigger for use inside another control's frame (currency code, phone country). */
    variant?: 'default' | 'inline';
    /** What the trigger shows for the selected item (default: its label), e.g. just the code. */
    renderValue?: (item: ComboItem) => any;
    renderItem?: (item: ComboItem, state: { active: boolean; selected: boolean }) => any;
    /** Minimum popup width in px (inline triggers are narrower than their options). */
    popupMinWidth?: number;
};

/**
 * Select-only combobox (WAI-ARIA pattern): a focusable trigger with a listbox popup.
 * Keys: ↓/↑/Home/End move (and open), Enter/Space pick or open, Escape close, printable
 * characters jump to the next matching option (typeahead), Tab picks the active option.
 */
export function Select(props: SelectProps) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const id = props.id || `rps-${uid}`;
    const listId = `${id}-listbox`;
    const trigger = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const items = props.items;
    const selectedIndex = items.findIndex((i) => i.value === props.value);
    const [active, setActive] = useState(selectedIndex);
    const typed = useRef({ text: '', at: 0 });

    useEffect(() => {
        if (open) setActive(selectedIndex >= 0 ? selectedIndex : nextEnabled(items, -1, 1));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const selected = selectedIndex >= 0 ? items[selectedIndex] : null;
    const label = selected ? selected.label : props.value ? props.fallbackLabel || props.value : '';

    const commit = (index: number) => {
        const item = items[index];
        if (item && !item.disabled) props.onChange(item);
        setOpen(false);
    };
    const typeahead = (ch: string) => {
        const now = Date.now();
        const t = typed.current;
        t.text = now - t.at > 600 ? ch : t.text + ch;
        t.at = now;
        const q = t.text.toLowerCase();
        const start = open ? active : selectedIndex;
        const order = items.map((_, i) => (start + 1 + i) % items.length);
        // Prefix of the label, of a later word in it, or of the description (codes and names both work).
        const matches = (it: ComboItem) => {
            const l = it.label.toLowerCase();
            return (
                l.startsWith(q) ||
                l.split(/[\s·()+-]+/).some((w) => !!w && w.startsWith(q)) ||
                (!!it.description && it.description.toLowerCase().startsWith(q))
            );
        };
        const hit = order.find((i) => !items[i].disabled && matches(items[i]));
        if (hit === undefined) return;
        if (open) setActive(hit);
        else commit(hit);
    };
    const onKeyDown = (e: any) => {
        if (props.disabled) return;
        const k = e.key;
        if (k === 'ArrowDown' || k === 'ArrowUp') {
            e.preventDefault();
            if (!open) return setOpen(true);
            setActive((i) => nextEnabled(items, i < 0 && k === 'ArrowUp' ? 0 : i, k === 'ArrowDown' ? 1 : -1));
        } else if (k === 'Home' || k === 'End') {
            e.preventDefault();
            if (!open) setOpen(true);
            setActive(k === 'Home' ? nextEnabled(items, -1, 1) : nextEnabled(items, 0, -1));
        } else if (k === 'Enter' || k === ' ') {
            e.preventDefault();
            if (open && active >= 0) commit(active);
            else setOpen(true);
        } else if (k === 'Escape') {
            if (open) {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
            }
        } else if (k === 'Tab') {
            if (open && active >= 0) commit(active);
        } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            typeahead(k);
        }
    };

    return (
        <div className={cx(props.variant === 'inline' ? 'relative shrink-0' : 'relative w-full', props.className)}>
            <div
                ref={trigger}
                id={id}
                role="combobox"
                tabIndex={props.disabled ? -1 : 0}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={open && active >= 0 ? optionId(listId, active) : undefined}
                aria-describedby={props['aria-describedby']}
                aria-labelledby={props['aria-labelledby']}
                aria-label={props['aria-label']}
                aria-invalid={props.invalid || undefined}
                aria-required={props.required || undefined}
                aria-disabled={props.disabled || undefined}
                autoFocus={props.autoFocus}
                className={
                    props.variant === 'inline'
                        ? cx(
                              'rpf-inline-select flex h-7 shrink-0 cursor-default items-center gap-1 rounded-sm px-1.5 text-sm text-foreground outline-none select-none hover:bg-accent focus-visible:bg-accent',
                              props.disabled ? 'opacity-50' : ''
                          )
                        : cx(
                              controlClass({ size: props.size, invalid: props.invalid }),
                              'cursor-default justify-between gap-2 pr-2 select-none'
                          )
                }
                onClick={() => !props.disabled && setOpen(!open)}
                onKeyDown={onKeyDown}
                onBlur={() => {
                    setOpen(false);
                    if (props.onBlur) props.onBlur();
                }}
            >
                <span className={cx('truncate', label ? '' : 'text-muted-foreground')}>
                    {selected && props.renderValue
                        ? props.renderValue(selected)
                        : label || props.placeholder || 'Select…'}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                    {props.loading ? <Spinner label="Loading choices" /> : null}
                    <IconChevronDown size={14} />
                </span>
            </div>
            <Popup
                anchor={trigger}
                open={open}
                onDismiss={() => setOpen(false)}
                id={listId}
                role="listbox"
                aria-labelledby={props['aria-labelledby']}
                aria-label={props['aria-labelledby'] ? undefined : props['aria-label']}
                minWidth={props.popupMinWidth}
            >
                <Listbox
                    id={listId}
                    items={items}
                    activeIndex={active}
                    selected={(item) => item.value === props.value}
                    onPick={(item) => commit(items.indexOf(item))}
                    onHover={setActive}
                    renderItem={props.renderItem}
                />
            </Popup>
        </div>
    );
}
