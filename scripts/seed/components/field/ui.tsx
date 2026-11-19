/**
 * Shared visual pieces for field primitives: class names (theme tokens only), icons and small
 * helpers. Other primitives import these from components:app/field so every control looks and
 * focuses the same way, in light and dark.
 */

export function cx(...parts: (string | false | null | undefined)[]): string {
    return parts.filter(Boolean).join(' ')
}

const sizes = { sm: 'h-8 text-sm', md: 'h-9 text-sm' }

/** Text-like control frame (input, select trigger, combobox). */
export function controlClass(opts: { size?: 'sm' | 'md'; invalid?: boolean; className?: string } = {}): string {
    return cx(
        'rpf-control flex w-full min-w-0 items-center rounded-md border border-input bg-background px-3 text-foreground shadow-xs transition-[color,box-shadow,border-color]',
        'placeholder:text-muted-foreground outline-none',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
        opts.invalid ? 'border-destructive ring-destructive/20 focus-visible:border-destructive focus-visible:ring-destructive/30 focus-within:border-destructive focus-within:ring-destructive/30' : '',
        sizes[opts.size || 'md'],
        opts.className,
    )
}

/** A bare input inside a controlClass frame (when the frame holds adornments). */
export const bareInputClass = 'rpf-bare h-full w-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed'

export function textareaClass(opts: { invalid?: boolean; className?: string } = {}): string {
    return cx(
        'rpf-control flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow,border-color]',
        'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        opts.invalid ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30' : '',
        opts.className,
    )
}

/** Small square icon button inside a control (clear, toggle, open). */
export const adornmentButtonClass =
    'inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50'

/** Popup surface (listbox, calendar). */
export const popupClass = 'rpf-popup rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md'

/** One option row in a listbox. */
export function optionClass(active: boolean, selected: boolean): string {
    return cx(
        'relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none',
        active ? 'bg-accent text-accent-foreground' : '',
        selected ? 'font-medium' : '',
    )
}

type IconProps = { className?: string; size?: number }
function svg(path: any, { className, size = 16 }: IconProps, viewBox = '0 0 24 24') {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox={viewBox}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            className={cx('shrink-0', className)}
        >
            {path}
        </svg>
    )
}

export const IconChevronDown = (p: IconProps) => svg(<path d="m6 9 6 6 6-6" />, p)
export const IconChevronLeft = (p: IconProps) => svg(<path d="m15 18-6-6 6-6" />, p)
export const IconChevronRight = (p: IconProps) => svg(<path d="m9 18 6-6-6-6" />, p)
export const IconCheck = (p: IconProps) => svg(<path d="M20 6 9 17l-5-5" />, p)
export const IconX = (p: IconProps) => svg(<path d="M18 6 6 18M6 6l12 12" />, p)
export const IconSearch = (p: IconProps) => svg(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>, p)
export const IconCalendar = (p: IconProps) => svg(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>, p)
export const IconClock = (p: IconProps) => svg(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>, p)
export const IconExternal = (p: IconProps) => svg(<><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>, p)
export const IconEye = (p: IconProps) => svg(<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>, p)
export const IconEyeOff = (p: IconProps) => svg(<><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><path d="m2 2 20 20" /></>, p)
export const IconMail = (p: IconProps) => svg(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></>, p)
export const IconPhone = (p: IconProps) => svg(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />, p)
export const IconLink = (p: IconProps) => svg(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>, p)
export const IconMinus = (p: IconProps) => svg(<path d="M5 12h14" />, p)
export const IconPlus = (p: IconProps) => svg(<path d="M12 5v14M5 12h14" />, p)
export const IconAlert = (p: IconProps) => svg(<><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>, p)
export const IconInfo = (p: IconProps) => svg(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>, p)

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
    return (
        <span role="status" className={cx('inline-flex', className)}>
            {svg(<path d="M21 12a9 9 0 1 1-6.219-8.56" />, { className: 'rpf-spin', size: 14 })}
            <span className="sr-only">{label}</span>
        </span>
    )
}

/** Visually hidden text for screen readers. */
export function VisuallyHidden({ children }: { children?: any }) {
    return <span className="sr-only">{children}</span>
}
