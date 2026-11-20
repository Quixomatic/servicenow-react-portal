/**
 * components:app/highlighted-value: a status-like value (state, stage, approval, priority) as a
 * coloured pill or dot, Next Experience's now-highlighted-value.
 *
 *   <HighlightedValue label="In Progress" />                      tone from the label
 *   <HighlightedValue label="1 - Critical" field="priority" value="1" />
 *   <HighlightedValue label="Approved" tone="success" variant="dot" />
 *
 * toneFor(label, { field?, value? }) derives the tone: priority / urgency / impact / severity by
 * value (1 critical … 5 planning), anything else by keywords in the label (rejected → danger,
 * closed / cancelled → neutral, resolved / approved / complete → success, on hold / waiting /
 * pending / requested → warning, in progress / work / assess → progress, new / open → info).
 *
 * Platform colours: the platform evaluates its own highlighted-value rules (sys_highlighted_value
 * + conditions, grouped by sys_ux_highlighted_value_config) on the server, as the user, and returns
 * a style per field (formLayout.highlightedValueStyle, GlideHeaderQuery_Query.headerItems). Pass
 * that style's colorName / status as `color` / `status`, or call toneForPlatform(colorName, status):
 *   critical, red, magenta → danger · high, orange → high · moderate, warning, yellow → warning ·
 *   info, blue, teal → progress · positive, green → success · low, gray → neutral · pink, purple → info
 * A matched platform colour beats the heuristic; with none, toneFor() decides.
 *
 * Colours: theme tokens for info (primary), danger (destructive) and neutral (muted); emerald,
 * amber, orange and sky for success, warning, high and progress, each with a dark variant.
 */
import { cx } from 'components:app/field';

export type HighlightTone = 'neutral' | 'info' | 'progress' | 'warning' | 'high' | 'success' | 'danger';

/** A platform highlighted-value style (formLayout.highlightedValueStyle / headerItems), as returned. */
export type PlatformHighlight = {
    field?: string;
    /** The label the platform shows (the display value, or the rule's value override). */
    value?: string | null;
    status?: string | null;
    colorName?: string | null;
    showIcon?: boolean | null;
    iconName?: string | null;
    variantName?: string | null;
    /** The matching sys_highlighted_value_condition (null = no rule matched: no platform colour). */
    matchingConditionSysId?: string | null;
};

const PLATFORM_TONES: Record<string, HighlightTone> = {
    critical: 'danger',
    red: 'danger',
    magenta: 'danger',
    high: 'high',
    orange: 'high',
    moderate: 'warning',
    warning: 'warning',
    yellow: 'warning',
    'green-yellow': 'warning',
    info: 'progress',
    blue: 'progress',
    teal: 'progress',
    cyan: 'progress',
    positive: 'success',
    green: 'success',
    low: 'neutral',
    gray: 'neutral',
    grey: 'neutral',
    pink: 'info',
    purple: 'info',
};

/** A platform colour name (or status) → our tone; undefined when neither is known. */
export function toneForPlatform(color?: string | null, status?: string | null): HighlightTone | undefined {
    const c = String(color || '')
        .toLowerCase()
        .trim();
    const s = String(status || '')
        .toLowerCase()
        .trim();
    return PLATFORM_TONES[c] || PLATFORM_TONES[s] || undefined;
}

const PRIORITY_FIELDS = ['priority', 'urgency', 'impact', 'severity'];

export function toneFor(label: string, opts: { field?: string; value?: string | number } = {}): HighlightTone {
    const field = String(opts.field || '').toLowerCase();
    const raw = String(opts.value === undefined || opts.value === null ? '' : opts.value);
    const text = String(label || '').toLowerCase();
    const num = PRIORITY_FIELDS.indexOf(field) >= 0 ? parseInt(raw || text, 10) : NaN;
    if (!isNaN(num)) return num <= 1 ? 'danger' : num === 2 ? 'warning' : num === 3 ? 'info' : 'neutral';
    if (/reject|denied|fail|breach|error|incomplete|critical/.test(text)) return 'danger';
    if (/cancel|closed|skipped|retired|inactive|withdrawn|not required|no longer/.test(text)) return 'neutral';
    if (/resolved|complete|approved|fulfilled|delivered|done|success|published|accepted/.test(text)) return 'success';
    if (/hold|waiting|pending|requested|approval|awaiting|review|paused/.test(text)) return 'warning';
    if (/progress|work|assess|scope|assigned|active|fulfil|implement|scheduled/.test(text)) return 'progress';
    if (/new|open|draft|submitted|created/.test(text)) return 'info';
    return 'neutral';
}

export const TONE_PILL: Record<HighlightTone, string> = {
    neutral: 'border-border bg-muted text-muted-foreground',
    info: 'border-primary/20 bg-primary/10 text-primary',
    progress: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    warning: 'border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300',
    high: 'border-orange-500/30 bg-orange-500/12 text-orange-700 dark:text-orange-300',
    success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    danger: 'border-destructive/25 bg-destructive/10 text-destructive',
};

export const TONE_DOT: Record<HighlightTone, string> = {
    neutral: 'bg-muted-foreground/50',
    info: 'bg-primary',
    progress: 'bg-sky-500',
    warning: 'bg-amber-500',
    high: 'bg-orange-500',
    success: 'bg-emerald-500',
    danger: 'bg-destructive',
};

export type HighlightedValueProps = {
    label: string;
    value?: string | number;
    field?: string;
    tone?: HighlightTone;
    /** Platform colour name / status (a highlighted-value style): beats the heuristic, loses to `tone`. */
    color?: string | null;
    status?: string | null;
    /** pill (default): tinted rounded badge with a dot; dot: coloured dot + plain text. */
    variant?: 'pill' | 'dot';
    size?: 'sm' | 'default';
    className?: string;
    title?: string;
};

export function HighlightedValue({
    label,
    value,
    field,
    tone,
    color,
    status,
    variant = 'pill',
    size = 'default',
    className,
    title,
}: HighlightedValueProps) {
    if (!label) return null;
    const t = tone || toneForPlatform(color, status) || toneFor(label, { field, value });
    if (variant === 'dot') {
        return (
            <span
                data-slot="highlighted-value"
                data-tone={t}
                title={title}
                className={cx('inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground', className)}
            >
                <span aria-hidden className={cx('size-1.5 shrink-0 rounded-full', TONE_DOT[t])} />
                <span className="truncate">{label}</span>
            </span>
        );
    }
    return (
        <span
            data-slot="highlighted-value"
            data-tone={t}
            title={title}
            className={cx(
                'inline-flex max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
                size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs',
                TONE_PILL[t],
                className
            )}
        >
            <span aria-hidden className={cx('size-1.5 shrink-0 rounded-full', TONE_DOT[t])} />
            <span className="truncate">{label}</span>
        </span>
    );
}

/** Preview (Studio). */
export default function HighlightedValuePreview() {
    const samples = ['New', 'In Progress', 'On Hold', 'Waiting for Approval', 'Resolved', 'Closed', 'Rejected'];
    return (
        <div className="flex flex-wrap gap-2 p-4">
            {samples.map((s) => (
                <HighlightedValue key={s} label={s} />
            ))}
            <HighlightedValue label="1 - Critical" field="priority" value="1" />
            <HighlightedValue label="High" color="high" />
            <HighlightedValue label="5 - Planning" field="priority" color="green" />
            <HighlightedValue label="Approved" variant="dot" />
        </div>
    );
}
