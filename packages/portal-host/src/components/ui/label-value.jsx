import * as React from 'react';
import { cn } from 'cn';

// components:label-value: read-only label + value pairs (Next Experience's now-label-value-stacked
// / -inline), as a description list.
//
//   <LabelValueList layout="grid" minColumnWidth="14rem">
//       <LabelValue label="Number">INC0010001</LabelValue>
//       <LabelValue label="Caller" value="Beth Anglin" />
//       <LabelValue label="Assigned to" />                      → "—" (emptyText)
//   </LabelValueList>
//   <LabelValueList layout="inline" items={[{ label: 'State', value: <HighlightedValue … /> }]} />
//   <LabelValue label="Opened" value="2026-11-20" />           standalone (outside a list)
//
// Layouts: stacked (label above value), inline (label column + value column, collapses to
// stacked in narrow containers), grid (stacked pairs flowing into as many columns as fit:
// minColumnWidth, or a fixed `columns`). Inside a LabelValueList pairs render <dt>/<dd> in a
// <dl>; standalone they render a group with the value labelled by the label.

const ListContext = React.createContext(null);

function isEmptyValue(v) {
    return v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && v.length === 0);
}

/**
 * LabelValue props: label, value (or children), layout (overrides the list's), emptyText ('—'),
 * hint (small text under the value), wrap (default true; false truncates with a title),
 * span (grid columns to span; 'full' for the whole row), labelClassName, valueClassName.
 */
function LabelValue({
    className,
    label,
    value,
    children,
    layout: layoutProp,
    emptyText = '—',
    hint,
    wrap = true,
    span,
    labelClassName,
    valueClassName,
    ...props
}) {
    const ctx = React.useContext(ListContext);
    const id = React.useId();
    const layout = layoutProp || (ctx ? ctx.layout : 'stacked');
    const content = children !== undefined ? children : value;
    const empty = isEmptyValue(content);
    const titleText =
        !wrap && (typeof content === 'string' || typeof content === 'number') ? String(content) : undefined;
    const inline = layout === 'inline';
    const Label = ctx ? 'dt' : 'span';
    const Value = ctx ? 'dd' : 'span';
    const style = span ? { gridColumn: span === 'full' ? '1 / -1' : `span ${span} / span ${span}` } : undefined;
    const pair = (
        <div
            data-slot="label-value"
            data-layout={layout}
            role={ctx ? undefined : 'group'}
            aria-labelledby={ctx ? undefined : id + '-l'}
            style={style}
            className={cn(
                'min-w-0',
                inline
                    ? 'grid grid-cols-1 gap-0.5 @md/label-value:grid-cols-[minmax(7rem,var(--lv-label-width,30%))_minmax(0,1fr)] @md/label-value:gap-4'
                    : 'flex flex-col gap-0.5',
                className
            )}
            {...props}
        >
            <Label
                id={id + '-l'}
                className={cn(
                    'min-w-0 text-xs font-medium text-muted-foreground',
                    inline && '@md/label-value:pt-px @md/label-value:text-sm',
                    labelClassName
                )}
            >
                {label}
            </Label>
            <Value
                className={cn(
                    'm-0 min-w-0 text-sm text-foreground',
                    wrap ? 'wrap-break-word' : 'truncate',
                    empty && 'text-muted-foreground',
                    valueClassName
                )}
                title={titleText}
            >
                {empty ? (
                    <>
                        <span aria-hidden="true">{emptyText}</span>
                        <span className="sr-only">Empty</span>
                    </>
                ) : (
                    content
                )}
                {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
            </Value>
        </div>
    );
    // Standalone inline pairs need their own container for the narrow-width fallback.
    return !ctx && inline ? <div className="@container/label-value min-w-0">{pair}</div> : pair;
}

/**
 * LabelValueList props: layout ('stacked' | 'inline' | 'grid'), items ([{ label, value, key?,
 * hint?, span? }]) or LabelValue children, columns (fixed grid columns), minColumnWidth (grid:
 * '12rem'), labelWidth (inline: the label column, '30%'), divided (rules between inline rows),
 * gap.
 */
function LabelValueList({
    className,
    layout = 'stacked',
    items,
    columns,
    minColumnWidth = '12rem',
    labelWidth,
    divided = false,
    children,
    style,
    ...props
}) {
    const grid = layout === 'grid';
    const vars = {};
    if (grid) {
        vars.gridTemplateColumns = columns
            ? `repeat(${columns}, minmax(0, 1fr))`
            : `repeat(auto-fill, minmax(min(${minColumnWidth}, 100%), 1fr))`;
    }
    if (labelWidth) vars['--lv-label-width'] = labelWidth;
    const body = items
        ? items
              .filter(Boolean)
              .map((item, i) => (
                  <LabelValue
                      key={item.key || item.label || i}
                      label={item.label}
                      value={item.value}
                      hint={item.hint}
                      span={item.span}
                  />
              ))
        : children;
    return (
        <ListContext.Provider value={{ layout: grid ? 'stacked' : layout }}>
            <div data-slot="label-value-list-container" className="@container/label-value min-w-0">
                <dl
                    data-slot="label-value-list"
                    data-layout={layout}
                    style={Object.assign(vars, style || {})}
                    className={cn(
                        'm-0 min-w-0',
                        grid ? 'grid gap-x-6 gap-y-4' : 'flex flex-col',
                        layout === 'stacked' && 'gap-3',
                        layout === 'inline' && (divided ? 'divide-y [&>*]:py-2' : 'gap-2'),
                        className
                    )}
                    {...props}
                >
                    {body}
                </dl>
            </div>
        </ListContext.Provider>
    );
}

export { LabelValue, LabelValueList, isEmptyValue };
