/**
 * utilities:app/datetime: date and time logic shared by the date / time field primitives and any
 * widget (no UI). Glide values in, glide values out; the user's zone and formats.
 *
 * Zones and glide date-times
 *   zonedParts(utcMs, tz), parseGlideDateTime, formatGlideDateTime, utcToLocalInput, localInputToUtc,
 *   todayIn(tz), validZone, zoneLabel, useUserTimeZone(override?)
 * The user's formats
 *   useUserFormats() → { date, time, dateTime }, splitDateTimeFormat, useLocale()
 * Dates ('YYYY-MM-DD')
 *   formatDate(ymd, pattern, locale), parseDate(text, pattern, locale, today), patternHint,
 *   formatDateForUser, formatDateTimeForUser, resolveBound('today' | ymd), rangeError,
 *   addDays, addMonths, weekdayOf, weekStartFor(locale), isValidYmd
 * Times (seconds since midnight)
 *   parseTime(text), formatTime(sec, pattern, { seconds, locale }), timeValueToSeconds(value, tz),
 *   secondsToTimeValue(sec, 'local' | 'utc', tz), isUtcTimeValue, hms
 * Date-times
 *   parseDateTime(text, datePattern, locale, today) → { ymd, sec | null }, wallOf(utcValue, tz) → { ymd, sec }
 */
export {
    zonedParts,
    parseGlideDateTime,
    formatGlideDateTime,
    utcToLocalInput,
    localInputToUtc,
    todayIn,
    validZone,
    zoneLabel,
    useUserTimeZone,
    useUserFormats,
    splitDateTimeFormat,
    useLocale,
    formatDate,
    parseDate,
    patternHint,
    formatDateForUser,
    formatDateTimeForUser,
    resolveBound,
    rangeError,
    addDays,
    addMonths,
    weekdayOf,
    weekStartFor,
    isValidYmd,
} from './dates'
export type { UserFormats } from './dates'
export { parseTime, formatTime, timeValueToSeconds, secondsToTimeValue, isUtcTimeValue, hms, parseDateTime, wallOf } from './times'
export type { TimeOfDay } from './times'
