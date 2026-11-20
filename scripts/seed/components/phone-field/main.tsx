/**
 * components:app/phone-field: phone numbers.
 *
 * - ph_number (and anything without country codes): a tel input (phone keypad on mobile),
 *   validated loosely (digits, spaces, + ( ) . - and an optional extension, at least 3 digits).
 * - phone_number_e164 (or `e164`): a country picker (app/combobox Select, inline; typeahead on
 *   country name or calling code) plus the national number. The value is E.164 ('+18588649999');
 *   the display value is formatted ('+1 (858) 864-9999'). Country codes come from the form
 *   layout's countryCodes (GlideLayout PhoneNumberElementType), else the platform's default list;
 *   the default country from `defaultCountry`, else the browser's region. Typing '+44…' in the
 *   number picks the country; a national trunk '0' is dropped.
 *
 * Read-only renders a tel: link.
 */
import { useMemo, useState } from 'react';
import { useField, FieldShell, controlA11y, controlClass, bareInputClass, IconPhone } from 'components:app/field';
import { StringInput } from 'components:app/string-field';
import type { StringFieldProps } from 'components:app/string-field';
import { Select } from 'components:app/combobox';
import type { ComboItem } from 'components:app/combobox';

export type CountryCode = { code: string; name?: string };

export type PhoneFieldProps = StringFieldProps & {
    /** E.164 mode without dictionary metadata. */
    e164?: boolean;
    /** Calling codes offered (default: the layout's countryCodes, else DEFAULT_COUNTRY_CODES). */
    countryCodes?: CountryCode[];
    /** Calling code for a new number ('44'); default: the browser's region. */
    defaultCountry?: string;
};

/** The calling codes the platform offers for phone_number_e164 fields (same list as GlideLayout's). */
export const DEFAULT_COUNTRY_CODES: CountryCode[] = [
    { code: '61', name: 'Australia' },
    { code: '55', name: 'Brazil' },
    { code: '86', name: 'China' },
    { code: '57', name: 'Colombia' },
    { code: '420', name: 'Czech Republic' },
    { code: '33', name: 'France' },
    { code: '49', name: 'Germany' },
    { code: '353', name: 'Ireland' },
    { code: '39', name: 'Italy' },
    { code: '81', name: 'Japan' },
    { code: '52', name: 'Mexico' },
    { code: '31', name: 'Netherlands' },
    { code: '1', name: 'North America' },
    { code: '27', name: 'South Africa' },
    { code: '41', name: 'Switzerland' },
    { code: '44', name: 'United Kingdom' },
];

const REGION_CODES: Record<string, string> = {
    US: '1',
    CA: '1',
    GB: '44',
    AU: '61',
    DE: '49',
    FR: '33',
    IE: '353',
    IT: '39',
    JP: '81',
    MX: '52',
    NL: '31',
    ZA: '27',
    CH: '41',
    BR: '55',
    CN: '86',
    CO: '57',
    CZ: '420',
};

function browserCountry(): string | undefined {
    try {
        const loc = new (Intl as any).Locale(navigator.language || 'en-US');
        const region = loc.region || (typeof loc.maximize === 'function' ? loc.maximize().region : '');
        return region ? REGION_CODES[region] : undefined;
    } catch (e) {
        return undefined;
    }
}

export function validatePhone(v: string): string | undefined {
    const t = String(v).trim();
    const digits = t.replace(/\D/g, '');
    return /^[+]?[\d\s().-]+(\s*(x|ext\.?)\s*\d+)?$/i.test(t) && digits.length >= 3
        ? undefined
        : 'Enter a phone number, e.g. +1 555 0100';
}

/** '+<digits>' → the calling code it starts with (longest match) and the national number. */
export function splitE164(value: string, codes: CountryCode[]): { code: string; national: string } | null {
    const v = String(value || '').trim();
    if (!v.startsWith('+')) return null;
    const digits = v.replace(/\D/g, '');
    const hit = codes
        .map((c) => c.code)
        .filter((c) => digits.startsWith(c))
        .sort((a, b) => b.length - a.length)[0];
    if (hit) return { code: hit, national: digits.slice(hit.length) };
    // Unknown code: guess the shortest plausible prefix (1–3 digits) so the number still shows.
    const guess = digits.length > 10 ? digits.slice(0, digits.length - 10) : digits.slice(0, 1);
    return { code: guess.slice(0, 3), national: digits.slice(guess.slice(0, 3).length) };
}

/** National digits grouped the way the country writes them (the common case; others in 3s). */
export function formatNational(code: string, n: string): string {
    const d = n.replace(/\D/g, '');
    if (!d) return '';
    const groups = (sizes: number[]) => {
        const out: string[] = [];
        let at = 0;
        for (const s of sizes) {
            if (at >= d.length) break;
            out.push(d.slice(at, at + s));
            at += s;
        }
        if (at < d.length) out.push(d.slice(at));
        return out.join(' ');
    };
    if (code === '1' && d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    if (code === '44') return d.startsWith('2') ? groups([2, 4, 4]) : groups([4, 6]);
    if (code === '33' && d.length === 9) return groups([1, 2, 2, 2, 2]);
    if (code === '61' && d.length === 9) return d.startsWith('4') ? groups([3, 3, 3]) : groups([1, 4, 4]);
    if (d.length <= 4) return d;
    return d.length % 3 === 1
        ? groups(
              Array(Math.floor(d.length / 3) - 1)
                  .fill(3)
                  .concat([4])
          )
        : groups(Array(Math.ceil(d.length / 3)).fill(3));
}

/** E.164 value → '+1 (858) 864-9999'. */
export function formatE164(value: string, codes: CountryCode[]): string {
    const s = splitE164(value, codes);
    if (!s) return value || '';
    return `+${s.code} ${formatNational(s.code, s.national)}`.trim();
}

/** Calling code + typed national number → E.164 ('' when there are no digits). */
export function toE164(code: string, national: string): string {
    const t = String(national || '').trim();
    if (t.startsWith('+')) return '+' + t.replace(/\D/g, '');
    let d = t.replace(/\D/g, '');
    if (!d) return '';
    if (code !== '1' && code !== '39' && d.startsWith('0')) d = d.replace(/^0+/, '');
    return `+${code}${d}`;
}

export function validateE164(v: string): string | undefined {
    const t = String(v || '').trim();
    if (!t) return undefined;
    if (!/^\+\d+$/.test(t)) return 'Enter digits only';
    const digits = t.length - 1;
    if (digits > 15) return 'A phone number has at most 15 digits';
    if (digits < 7) return 'Enter the full number';
    return undefined;
}

function telHref(v: string) {
    return `tel:${String(v).replace(/[^\d+]/g, '')}`;
}

export function PhoneField(props: PhoneFieldProps) {
    const probe = useField({ ...props, standalone: props.standalone });
    const e164 =
        !!props.e164 || probe.meta.type === 'phone_number_e164' || !!(props.countryCodes && props.countryCodes.length);
    return e164 ? <E164Field {...props} /> : <PlainPhoneField {...props} />;
}

function PlainPhoneField(props: PhoneFieldProps) {
    const field = useField({ ...props, validate: props.validate || validatePhone });
    return (
        <StringInput
            {...props}
            field={field}
            inputType="tel"
            inputMode="tel"
            autoComplete={props.autoComplete || 'tel'}
            startAdornment={props.startAdornment ?? <IconPhone size={14} />}
            readOnlyValue={(f) =>
                f.value ? (
                    <a href={telHref(f.value)} className="text-primary underline-offset-4 hover:underline">
                        {f.value}
                    </a>
                ) : undefined
            }
        />
    );
}

function E164Field(props: PhoneFieldProps) {
    const field = useField({ ...props, validate: props.validate || validateE164 });
    const codes = useMemo<CountryCode[]>(() => {
        const list = (
            props.countryCodes && props.countryCodes.length
                ? props.countryCodes
                : field.meta.countryCodes && field.meta.countryCodes.length
                  ? field.meta.countryCodes
                  : DEFAULT_COUNTRY_CODES
        ) as CountryCode[];
        return list.slice().sort((a, b) => String(a.name || a.code).localeCompare(String(b.name || b.code)));
    }, [props.countryCodes, field.meta.countryCodes]);
    const split = splitE164(field.value, codes);
    const fallback = props.defaultCountry || browserCountry() || '1';
    const [picked, setPicked] = useState<string | null>(null);
    const country =
        picked ||
        (split && split.code) ||
        (codes.some((c) => c.code === fallback) ? fallback : codes[0] ? codes[0].code : '1');
    const [text, setText] = useState<string | null>(null);
    const national = split
        ? formatNational(split.code, split.national)
        : field.value && !field.value.startsWith('+')
          ? field.value
          : '';
    const shown = text !== null ? text : national;
    const items = useMemo<ComboItem[]>(() => {
        const list: ComboItem[] = codes.map((c) => ({ value: c.code, label: `${c.name || c.code} (+${c.code})` }));
        if (!codes.some((c) => c.code === country)) list.unshift({ value: country, label: `+${country}` });
        return list;
    }, [codes, country]);

    const commit = (code: string, raw: string) => {
        setText(null);
        const v0 = toE164(code, raw);
        // Once there's a number its own code decides the country again.
        if (v0) setPicked(null);
        const v = v0;
        if (v !== field.value) field.setValue(v, v ? formatE164(v, codes) : '');
    };

    return (
        <FieldShell
            field={field}
            layout={props.layout}
            size={props.size}
            showOptional={props.showOptional}
            className={props.className}
            readOnlyValue={
                field.value ? (
                    <a href={telHref(field.value)} className="text-primary underline-offset-4 hover:underline">
                        {formatE164(field.value, codes)}
                    </a>
                ) : undefined
            }
        >
            <div className={controlClass({ size: props.size, invalid: field.invalid, className: 'gap-2 pl-1' })}>
                <Select
                    variant="inline"
                    aria-label={`${field.label}, country code`}
                    value={country}
                    items={items}
                    disabled={field.state.disabled}
                    popupMinWidth={240}
                    renderValue={(i) => <span className="font-medium tabular-nums">+{i.value}</span>}
                    renderItem={(i) => (
                        <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                            <span className="truncate">{i.label.replace(/\s*\(\+\d+\)$/, '')}</span>
                            <span className="shrink-0 text-muted-foreground tabular-nums">+{i.value}</span>
                        </span>
                    )}
                    onChange={(i) => {
                        setPicked(i.value);
                        const digits = split ? split.national : (text !== null ? text : national).replace(/\D/g, '');
                        if (digits) commit(i.value, digits);
                    }}
                />
                <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
                <input
                    {...controlA11y(field)}
                    type="tel"
                    inputMode="tel"
                    autoComplete={props.autoComplete || 'tel-national'}
                    placeholder={field.placeholder || (country === '1' ? '(555) 010-0100' : 'Phone number')}
                    value={shown}
                    className={bareInputClass + ' tabular-nums'}
                    onChange={(e: any) => {
                        const t = e.target.value;
                        // '+44 20…' typed or pasted: switch the country, keep the national part.
                        if (/^\s*\+/.test(t)) {
                            const s = splitE164('+' + t.replace(/\D/g, ''), codes);
                            if (s && codes.some((c) => c.code === s.code) && s.national.length >= 4) {
                                setPicked(s.code);
                                setText(formatNational(s.code, s.national));
                                return;
                            }
                        }
                        setText(t);
                    }}
                    onBlur={(e: any) => {
                        if (text !== null) commit(country, e.target.value);
                        field.blur();
                    }}
                    onKeyDown={(e: any) => {
                        if (e.key === 'Enter' && text !== null) commit(country, e.currentTarget.value);
                        if (e.key === 'Escape' && text !== null) {
                            e.preventDefault();
                            setText(null);
                        }
                    }}
                />
            </div>
        </FieldShell>
    );
}

export default function PhoneFieldPreview() {
    return (
        <div className="flex max-w-md flex-col gap-4 p-4">
            <PhoneField name="phone" label="Business phone" defaultValue="+1 555 0100" />
            <PhoneField name="work" label="Work phone (E.164)" e164 defaultValue="+18588649999" />
        </div>
    );
}
