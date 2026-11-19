import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "cn"

// shadcn-style Calendar with no date library: dates are 'YYYY-MM-DD' strings and all math is in UTC,
// so the user's time zone never shifts a day. Month and weekday names come from Intl in `locale`,
// and the first day of the week from Intl.Locale weekInfo unless `weekStartsOn` says otherwise.
//
//   <Calendar value="2026-11-19" onSelect={(ymd) => …} min max isDisabled locale weekStartsOn today
//             defaultMonth="2026-11" onMonthChange={(ym) => …} autoFocus footer={…} />
//
// Keyboard (WAI-ARIA date grid, roving tabindex): arrows move a day or a week, Home / End go to the
// start / end of the week, PageUp / PageDown change the month (Shift: the year), Enter / Space pick.
// The caption button switches to a month grid, then a year grid (12 years a page); Escape in those
// views goes back one level. Pure UI: no time zones, no glide values.

const pad = (n) => String(n).padStart(2, "0")
const DAY = 86400000

function parseYmd(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ""))
  if (!m) return null
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3])
  return Number.isNaN(t) ? null : t
}
function toYmd(t) {
  const d = new Date(t)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
function monthStart(t) {
  const d = new Date(t)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
}
function addMonths(t, n) {
  const d = new Date(t)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + n
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return Date.UTC(y, m, Math.min(d.getUTCDate(), last))
}
function localToday() {
  const d = new Date()
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

/** First day of the week for a locale: 0 = Sunday … 6 = Saturday. */
export function weekStartFor(locale) {
  try {
    const l = new Intl.Locale(locale || navigator.language || "en-US")
    const info = typeof l.getWeekInfo === "function" ? l.getWeekInfo() : l.weekInfo
    if (info && info.firstDay) return info.firstDay % 7
  } catch (e) {
    /* older engines: fall through */
  }
  return 0
}

function clamp(t, min, max) {
  if (min != null && t < min) return min
  if (max != null && t > max) return max
  return t
}

function Calendar({
  value,
  onSelect,
  defaultMonth,
  onMonthChange,
  min,
  max,
  isDisabled,
  locale,
  weekStartsOn,
  today,
  autoFocus,
  className,
  footer,
  ...props
}) {
  const minT = parseYmd(min)
  const maxT = parseYmd(max)
  const todayT = parseYmd(today) ?? localToday()
  const selectedT = parseYmd(value)
  const startDay = weekStartsOn ?? weekStartFor(locale)

  // The focused day drives the visible month (roving tabindex).
  const [focusT, setFocusT] = React.useState(() => clamp(selectedT ?? parseYmd(defaultMonth && `${String(defaultMonth).slice(0, 7)}-01`) ?? todayT, minT, maxT))
  const [view, setView] = React.useState("days")
  const [yearPage, setYearPage] = React.useState(() => new Date(focusT).getUTCFullYear())
  const monthT = monthStart(focusT)
  const grid = React.useRef(null)
  const wantFocus = React.useRef(!!autoFocus)
  const captionId = React.useId()

  // Follow an outside value change (typed entry) without stealing focus.
  const lastValue = React.useRef(value)
  if (lastValue.current !== value) {
    lastValue.current = value
    if (selectedT != null && selectedT !== focusT) setFocusT(selectedT)
  }

  const disabled = (t) => (minT != null && t < minT) || (maxT != null && t > maxT) || (isDisabled ? !!isDisabled(toYmd(t)) : false)

  const moveTo = (t) => {
    const next = clamp(t, minT, maxT)
    wantFocus.current = true
    setFocusT(next)
    if (onMonthChange && monthStart(next) !== monthStart(focusT)) onMonthChange(toYmd(monthStart(next)).slice(0, 7))
  }

  React.useEffect(() => {
    if (!wantFocus.current || !grid.current) return
    wantFocus.current = false
    const el = grid.current.querySelector('[data-focus-target="true"]')
    if (el) el.focus({ preventScroll: true })
  })

  const fmt = (opts) => new Intl.DateTimeFormat(locale || undefined, { timeZone: "UTC", ...opts })
  const caption = fmt({ month: "long", year: "numeric" }).format(new Date(monthT))
  const fullDate = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const weekdayShort = fmt({ weekday: "short" })
  const weekdayLong = fmt({ weekday: "long" })
  const monthShort = fmt({ month: "short" })
  const monthLong = fmt({ month: "long", year: "numeric" })

  // 6 rows × 7 days starting on the locale's first weekday.
  const lead = (new Date(monthT).getUTCDay() - startDay + 7) % 7
  const first = monthT - lead * DAY
  const weeks = []
  for (let w = 0; w < 6; w++) {
    const row = []
    for (let i = 0; i < 7; i++) row.push(first + (w * 7 + i) * DAY)
    weeks.push(row)
  }
  const weekdays = weeks[0].map((t) => ({ short: weekdayShort.format(new Date(t)), long: weekdayLong.format(new Date(t)) }))

  const onDayKey = (e, t) => {
    const d = new Date(t)
    let next = null
    switch (e.key) {
      case "ArrowLeft": next = t - DAY; break
      case "ArrowRight": next = t + DAY; break
      case "ArrowUp": next = t - 7 * DAY; break
      case "ArrowDown": next = t + 7 * DAY; break
      case "Home": next = t - ((d.getUTCDay() - startDay + 7) % 7) * DAY; break
      case "End": next = t + (6 - ((d.getUTCDay() - startDay + 7) % 7)) * DAY; break
      case "PageUp": next = addMonths(t, e.shiftKey ? -12 : -1); break
      case "PageDown": next = addMonths(t, e.shiftKey ? 12 : 1); break
      case "Enter":
      case " ":
        e.preventDefault()
        if (!disabled(t) && onSelect) onSelect(toYmd(t))
        return
      default:
        return
    }
    e.preventDefault()
    moveTo(next)
  }

  const navButton = "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
  const cellButton = "inline-flex items-center justify-center rounded-md text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"

  const prevDisabled = minT != null && monthT <= monthStart(minT)
  const nextDisabled = maxT != null && monthT >= monthStart(maxT)
  const year = new Date(focusT).getUTCFullYear()

  const header = (label, onPrev, onNext, prevOff, nextOff, prevLabel, nextLabel, onCaption, captionLabel) => (
    <div className="flex items-center justify-between gap-1">
      <button type="button" className={navButton} onClick={onPrev} disabled={prevOff} aria-label={prevLabel}>
        <ChevronLeftIcon className="size-4" aria-hidden="true" />
      </button>
      {onCaption ? (
        <button
          type="button"
          id={captionId}
          className="inline-flex h-8 items-center rounded-md px-2 text-sm font-medium outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onClick={onCaption}
          aria-label={captionLabel}
          aria-live="polite"
        >
          {label}
        </button>
      ) : (
        <span id={captionId} className="px-2 text-sm font-medium" aria-live="polite">
          {label}
        </span>
      )}
      <button type="button" className={navButton} onClick={onNext} disabled={nextOff} aria-label={nextLabel}>
        <ChevronRightIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )

  let body
  if (view === "months") {
    const months = []
    for (let m = 0; m < 12; m++) months.push(Date.UTC(year, m, 1))
    const pick = (t) => {
      setView("days")
      moveTo(Date.UTC(year, new Date(t).getUTCMonth(), Math.min(new Date(focusT).getUTCDate(), new Date(Date.UTC(year, new Date(t).getUTCMonth() + 1, 0)).getUTCDate())))
    }
    body = (
      <>
        {header(
          String(year),
          () => setFocusT((t) => addMonths(t, -12)),
          () => setFocusT((t) => addMonths(t, 12)),
          minT != null && year <= new Date(minT).getUTCFullYear(),
          maxT != null && year >= new Date(maxT).getUTCFullYear(),
          "Previous year",
          "Next year",
          () => {
            setYearPage(year)
            setView("years")
          },
          `${year}, choose a year`
        )}
        <div ref={grid} role="group" aria-labelledby={captionId} className="grid grid-cols-3 gap-1" onKeyDown={(e) => e.key === "Escape" && (e.preventDefault(), e.stopPropagation(), setView("days"))}>
          {months.map((t) => {
            const off = (minT != null && Date.UTC(year, new Date(t).getUTCMonth() + 1, 0) < minT) || (maxT != null && t > maxT)
            const current = new Date(t).getUTCMonth() === new Date(focusT).getUTCMonth()
            return (
              <button
                key={t}
                type="button"
                disabled={off}
                data-focus-target={current ? "true" : undefined}
                aria-pressed={current}
                aria-label={monthLong.format(new Date(t))}
                className={cn(cellButton, "h-9 px-2 disabled:opacity-40", current ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent hover:text-accent-foreground")}
                onClick={() => pick(t)}
              >
                {monthShort.format(new Date(t))}
              </button>
            )
          })}
        </div>
      </>
    )
  } else if (view === "years") {
    const start = yearPage - (((yearPage % 12) + 12) % 12)
    const years = []
    for (let y = start; y < start + 12; y++) years.push(y)
    body = (
      <>
        {header(
          `${start} – ${start + 11}`,
          () => setYearPage((y) => y - 12),
          () => setYearPage((y) => y + 12),
          minT != null && start <= new Date(minT).getUTCFullYear(),
          maxT != null && start + 11 >= new Date(maxT).getUTCFullYear(),
          "Previous 12 years",
          "Next 12 years"
        )}
        <div ref={grid} role="group" aria-labelledby={captionId} className="grid grid-cols-3 gap-1" onKeyDown={(e) => e.key === "Escape" && (e.preventDefault(), e.stopPropagation(), setView("months"))}>
          {years.map((y) => {
            const off = (minT != null && y < new Date(minT).getUTCFullYear()) || (maxT != null && y > new Date(maxT).getUTCFullYear())
            const current = y === year
            return (
              <button
                key={y}
                type="button"
                disabled={off}
                data-focus-target={current ? "true" : undefined}
                aria-pressed={current}
                className={cn(cellButton, "h-9 px-2 tabular-nums disabled:opacity-40", current ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent hover:text-accent-foreground")}
                onClick={() => {
                  wantFocus.current = true
                  setFocusT((t) => clamp(addMonths(t, (y - year) * 12), minT, maxT))
                  setView("months")
                }}
              >
                {y}
              </button>
            )
          })}
        </div>
      </>
    )
  } else {
    body = (
      <>
        {header(
          caption,
          () => moveTo(addMonths(focusT, -1)),
          () => moveTo(addMonths(focusT, 1)),
          prevDisabled,
          nextDisabled,
          "Previous month",
          "Next month",
          () => {
            wantFocus.current = true
            setView("months")
          },
          `${caption}, choose a month`
        )}
        <table ref={grid} role="grid" aria-labelledby={captionId} className="w-full border-collapse">
          <thead>
            <tr>
              {weekdays.map((w, i) => (
                <th key={i} scope="col" abbr={w.long} className="size-9 p-0 text-center text-xs font-normal text-muted-foreground">
                  {w.short.slice(0, 2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((row, wi) => (
              <tr key={wi}>
                {row.map((t) => {
                  const outside = monthStart(t) !== monthT
                  const isSelected = selectedT === t
                  const isToday = todayT === t
                  const off = disabled(t)
                  const focus = t === focusT
                  return (
                    <td key={t} role="gridcell" aria-selected={isSelected || undefined} className="p-0 text-center">
                      <button
                        type="button"
                        tabIndex={focus ? 0 : -1}
                        data-focus-target={focus ? "true" : undefined}
                        data-selected={isSelected || undefined}
                        data-today={isToday || undefined}
                        data-outside={outside || undefined}
                        aria-disabled={off || undefined}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={fullDate.format(new Date(t))}
                        className={cn(
                          cellButton,
                          "size-9 tabular-nums",
                          off ? "cursor-not-allowed text-muted-foreground/40 line-through" : isSelected ? "bg-primary font-medium text-primary-foreground hover:bg-primary/90" : "hover:bg-accent hover:text-accent-foreground",
                          !off && !isSelected && isToday ? "bg-accent font-semibold text-accent-foreground" : "",
                          !off && !isSelected && outside ? "text-muted-foreground/70" : ""
                        )}
                        onClick={() => {
                          setFocusT(t)
                          if (!off && onSelect) onSelect(toYmd(t))
                        }}
                        onKeyDown={(e) => onDayKey(e, t)}
                      >
                        {new Date(t).getUTCDate()}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )
  }

  return (
    <div data-slot="calendar" className={cn("flex w-fit flex-col gap-2 text-popover-foreground", className)} {...props}>
      {body}
      {footer ? <div className="flex items-center justify-between gap-2 border-t border-border pt-2">{footer}</div> : null}
    </div>
  )
}

export { Calendar, parseYmd, toYmd }
