// The host's own CSS (Tailwind + shadcn, pnpm build:css) as text, so it can be injected as a
// <style data-rp-slot="framework"> BEFORE the widget sheets. Handing it to ui-core as component
// `styles` makes it an adopted stylesheet, and adopted sheets always sort after every <style> in
// the shadow root: within the shared `utilities` layer the host's `.hidden` then beat a widget's
// `sm:block`. As a <style> in the framework slot, widget utilities win ties, as documented.
// Being first, it also fixes the layer order for the whole shadow root: build:css moves variant
// rules into `@layer rp-variants` right after `utilities` (scripts/variant-layer.mjs, the same
// pass the server compiler runs on every component build), so variants from any sheet beat base
// utilities from any sheet.
import styles from '../styles/tailwind.generated.css';

function asText(value) {
	if (typeof value === 'string') return value;
	if (value && typeof value.toString === 'function') {
		const text = value.toString();
		if (text && text !== '[object Object]') return text;
	}
	if (value && typeof value.default === 'string') return value.default;
	return null;
}

/** The CSS text, or null if the build hands us something else (then ui-core adopts it as before). */
export const frameworkCssText = asText(styles);
export const frameworkStyles = styles;
