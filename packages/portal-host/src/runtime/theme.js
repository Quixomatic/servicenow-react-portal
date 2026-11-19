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
 * The selector :host(:not(.rp-no-theme)) outranks the framework's default :root/:host tokens
 * regardless of sheet order, and also matches the renderer's overlay host.
 */
export function buildTokenCss(tokens) {
	const lines = [];
	Object.keys(tokens || {}).forEach((rawName) => {
		const name = String(rawName).replace(/^--/, '').replace(/[^a-zA-Z0-9_-]/g, '');
		const value = String(tokens[rawName]).replace(/[;{}<>]/g, '');
		if (!name || !value) return;
		lines.push(`\t--${name}: ${value};`);
		if (name.indexOf('rp-') !== 0) lines.push(`\t--rp-${name}: ${value};`);
	});
	return `:host(:not(.rp-no-theme)), [data-rp-root] {\n${lines.join('\n')}\n}\n`;
}

function themeKeyOf(theme) {
	return theme
		? `${theme.id}|${theme.cssText != null ? 'inline:' + theme.cssText : (theme.css || []).join(',')}|${JSON.stringify(theme.tokens || {})}`
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
	ensureStyle(target, 'theme-tokens', `/* theme tokens ${theme.key || theme.id} */\n${buildTokenCss(theme.tokens)}`, 'tokens');
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
