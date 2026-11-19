import { useEffect, useLayoutEffect, useState } from 'react';
import { loadCss, peekCss } from './loader';
import { ensureStyle } from './styles';
import { recordEvent } from './diagnostics';

/**
 * Token CSS from a theme's tokens object: each key K becomes --K on :host (a leading "--" is
 * stripped), so shadcn token names (background, primary, radius, …) drive the shipped
 * components directly. Also emits an --rp-K alias for authored CSS (keys already starting with
 * "rp-" are emitted once).
 *
 * Light tokens go on :host(:not(.rp-no-theme)), which outranks the framework's default
 * :root/:host tokens regardless of sheet order and also matches the renderer's overlay host.
 * Dark tokens (theme.tokensDark) go on :host(.dark:not(.rp-no-theme)), which outranks the light
 * block. A theme without tokensDark gets the framework's default dark colours there instead, so
 * its light colours never leak into dark mode; its non-colour tokens (radius, fonts) still apply.
 */
export function buildTokenCss(tokens, tokensDark) {
	const light = declarations(tokens);
	const darkTokens = tokensDark && Object.keys(tokensDark).length ? { 'rp-canvas': 'var(--background)', ...tokensDark } : DEFAULT_DARK;
	const dark = declarations(darkTokens);
	return (
		`:host(:not(.rp-no-theme)), [data-rp-root] {\n${light}\n}\n` +
		`:host(.dark:not(.rp-no-theme)), :host(.dark:not(.rp-no-theme)) [data-rp-root], .dark [data-rp-root] {\n${dark}\n}\n`
	);
}

function declarations(tokens) {
	const lines = [];
	Object.keys(tokens || {}).forEach((rawName) => {
		const name = String(rawName).replace(/^--/, '').replace(/[^a-zA-Z0-9_-]/g, '');
		const value = String(tokens[rawName]).replace(/[;{}<>]/g, '');
		if (!name || !value) return;
		lines.push(`\t--${name}: ${value};`);
		if (name.indexOf('rp-') !== 0) lines.push(`\t--rp-${name}: ${value};`);
	});
	return lines.join('\n');
}

/** The framework's dark defaults (tailwind.css :host(.dark)), for themes without tokensDark. */
const DEFAULT_DARK = {
	background: 'oklch(0.145 0 0)',
	foreground: 'oklch(0.985 0 0)',
	card: 'oklch(0.205 0 0)',
	'card-foreground': 'oklch(0.985 0 0)',
	popover: 'oklch(0.205 0 0)',
	'popover-foreground': 'oklch(0.985 0 0)',
	primary: 'oklch(0.922 0 0)',
	'primary-foreground': 'oklch(0.205 0 0)',
	secondary: 'oklch(0.269 0 0)',
	'secondary-foreground': 'oklch(0.985 0 0)',
	muted: 'oklch(0.269 0 0)',
	'muted-foreground': 'oklch(0.708 0 0)',
	accent: 'oklch(0.269 0 0)',
	'accent-foreground': 'oklch(0.985 0 0)',
	destructive: 'oklch(0.704 0.191 22.216)',
	border: 'oklch(1 0 0 / 10%)',
	input: 'oklch(1 0 0 / 15%)',
	ring: 'oklch(0.556 0 0)',
	'rp-canvas': 'var(--background)'
};

function themeKeyOf(theme) {
	return theme
		? `${theme.id}|${theme.cssText != null ? 'inline:' + theme.cssText : (theme.css || []).join(',')}|${JSON.stringify(theme.tokens || {})}|${JSON.stringify(theme.tokensDark || {})}`
		: '';
}

/** The theme's sheets if they're available synchronously (inline, or cached this page load). */
function syncSheets(theme) {
	if (!theme) return null;
	if (theme.cssText != null) return [String(theme.cssText)];
	const urls = theme.css || [];
	const texts = urls.map((url) => peekCss(url));
	return texts.every((t) => t !== undefined) ? texts : null;
}

function apply(target, theme, sheets) {
	ensureStyle(target, 'theme', `/* theme ${theme.key || theme.id} */\n${sheets.join('\n')}`, 'theme');
	ensureStyle(target, 'theme-tokens', `/* theme tokens ${theme.key || theme.id} */\n${buildTokenCss(theme.tokens, theme.tokensDark)}`, 'tokens');
}

/**
 * Injects the theme stylesheet(s) and token variables into `target` (the host's shadow root).
 * Returns true once the current theme is in place. Swapping the theme replaces both sheets.
 *
 * No flash on remount: when the sheets are already cached (any earlier host instance in this
 * page load fetched them) the theme counts as ready on the first render and is injected in a
 * layout effect, i.e. before the browser paints. Only a cold load waits for the fetch.
 */
export function useThemeStyles(target, theme) {
	const themeKey = themeKeyOf(theme);
	const [readyKey, setReadyKey] = useState('');
	const cached = syncSheets(theme);

	useLayoutEffect(() => {
		if (!target || !theme || !cached) return;
		apply(target, theme, cached);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target, themeKey, !!cached]);

	useEffect(() => {
		if (!target || !theme || cached) return undefined;
		let alive = true;
		const sources = (theme.css || []).map((url) => loadCss(url).catch((error) => `/* theme css ${url} failed: ${error.message} */`));
		Promise.all(sources).then((sheets) => {
			if (!alive) return;
			apply(target, theme, sheets);
			recordEvent(`theme ${theme.key || theme.id} applied`);
			setReadyKey(themeKey);
		});
		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target, themeKey, !!cached]);

	return !!theme && (!!cached || readyKey === themeKey);
}
