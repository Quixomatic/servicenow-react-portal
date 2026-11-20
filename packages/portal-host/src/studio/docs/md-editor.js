// Markdown source mode: Studio's CodeMirror setup with @codemirror/lang-markdown (fenced code in
// js / ts / jsx / css / json is highlighted with the languages Studio already ships), toolbar
// commands (onReady(api)), and lint marks for broken links.
import React, { useEffect, useRef } from 'react';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView, drawSelection, dropCursor, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, indentUnit } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';

function codeLanguage(info) {
	const lang = String(info || '').trim().split(/\s+/)[0].toLowerCase();
	if (lang === 'ts' || lang === 'typescript') return javascript({ typescript: true }).language;
	if (lang === 'tsx') return javascript({ typescript: true, jsx: true }).language;
	if (lang === 'js' || lang === 'javascript' || lang === 'jsx' || lang === 'mjs') return javascript({ jsx: true }).language;
	if (lang === 'css') return css().language;
	if (lang === 'json') return json().language;
	return null;
}

const baseTheme = EditorView.theme({
	'&': { height: '100%', fontSize: '13px' },
	'.cm-scroller': { fontFamily: 'Consolas, "Cascadia Code", "Fira Code", Menlo, monospace', lineHeight: '19px' },
	'.cm-gutters': { borderRight: 'none' },
	'&.cm-focused': { outline: 'none' },
	'.cm-content': { paddingBottom: '40vh' }
});

/** The toolbar API over a view: wrap / prefix / insert, all undoable. */
function apiFor(view) {
	const sel = () => view.state.selection.main;
	return {
		focus: () => view.focus(),
		selectedText: () => view.state.sliceDoc(sel().from, sel().to),
		/** Wrap the selection (or a placeholder) in before / after. */
		wrap(before, after, placeholder) {
			const { from, to } = sel();
			const text = view.state.sliceDoc(from, to) || placeholder || '';
			view.dispatch({ changes: { from, to, insert: before + text + after }, selection: EditorSelection.range(from + before.length, from + before.length + text.length), scrollIntoView: true });
			view.focus();
		},
		/** Toggle a line prefix ('# ', '- ', '> ') on every selected line. */
		prefixLines(prefix, re) {
			const { from, to } = sel();
			const doc = view.state.doc;
			const changes = [];
			const first = doc.lineAt(from).number;
			const last = doc.lineAt(to).number;
			const lines = [];
			for (let n = first; n <= last; n++) lines.push(doc.line(n));
			const strip = re || new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
			const all = lines.every((l) => strip.test(l.text));
			lines.forEach((l) => {
				const m = l.text.match(strip);
				if (all && m) changes.push({ from: l.from, to: l.from + m[0].length, insert: '' });
				else {
					const old = re && l.text.match(re);
					changes.push({ from: l.from, to: l.from + (old ? old[0].length : 0), insert: prefix });
				}
			});
			view.dispatch({ changes, scrollIntoView: true });
			view.focus();
		},
		/** Insert a block (own paragraph) at the cursor line. */
		insertBlock(text, cursorOffset) {
			const { from, to } = sel();
			const doc = view.state.doc;
			const line = doc.lineAt(from);
			const before = line.text.trim() ? '\n\n' : from > 0 && doc.lineAt(from).number > 1 && doc.line(line.number - 1).text.trim() ? '\n' : '';
			const insert = before + text + '\n';
			const at = line.text.trim() ? doc.lineAt(to).to : line.from;
			view.dispatch({ changes: { from: at, to: at, insert }, selection: EditorSelection.cursor(at + before.length + (cursorOffset == null ? text.length : cursorOffset)), scrollIntoView: true });
			view.focus();
		},
		insert(text) {
			const { from, to } = sel();
			view.dispatch({ changes: { from, to, insert: text }, selection: EditorSelection.cursor(from + text.length), scrollIntoView: true });
			view.focus();
		},
		/** Scroll to a 1-based line (problems list). */
		reveal(lineNo) {
			const d = view.state.doc;
			const line = d.line(Math.min(Math.max(1, lineNo || 1), d.lines));
			view.dispatch({ selection: EditorSelection.cursor(line.from), effects: EditorView.scrollIntoView(line.from, { y: 'center' }) });
			view.focus();
		}
	};
}

export default function MarkdownEditor({ value, onChange, dark, root, readOnly, problems, onReady, onLink }) {
	const hostRef = useRef(null);
	const viewRef = useRef(null);
	const theme = useRef(new Compartment());
	const editable = useRef(new Compartment());
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const onLinkRef = useRef(onLink);
	onLinkRef.current = onLink;

	useEffect(() => {
		if (!hostRef.current) return undefined;
		const view = new EditorView({
			parent: hostRef.current,
			root: root || undefined,
			state: EditorState.create({
				doc: value || '',
				extensions: [
					lineNumbers(),
					highlightActiveLineGutter(),
					highlightSpecialChars(),
					history(),
					drawSelection(),
					dropCursor(),
					indentUnit.of('  '),
					syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
					highlightActiveLine(),
					highlightSelectionMatches(),
					lintGutter(),
					EditorView.lineWrapping,
					markdown({ base: markdownLanguage, codeLanguages: codeLanguage }),
					keymap.of([
						{ key: 'Mod-b', run: (v) => (apiFor(v).wrap('**', '**', 'bold'), true) },
						{ key: 'Mod-i', run: (v) => (apiFor(v).wrap('*', '*', 'italic'), true) },
						{ key: 'Mod-e', run: (v) => (apiFor(v).wrap('`', '`', 'code'), true) },
						{ key: 'Mod-k', run: () => (onLinkRef.current && onLinkRef.current(), true) },
						...defaultKeymap,
						...searchKeymap,
						...historyKeymap,
						indentWithTab
					]),
					baseTheme,
					theme.current.of(dark ? vscodeDark : vscodeLight),
					editable.current.of(EditorState.readOnly.of(!!readOnly)),
					EditorView.updateListener.of((u) => {
						if (u.docChanged) onChangeRef.current && onChangeRef.current(u.state.doc.toString());
					})
				]
			})
		});
		viewRef.current = view;
		if (onReady) onReady(apiFor(view));
		return () => {
			if (onReady) onReady(null);
			view.destroy();
			viewRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// External value changes (page switch, visual-mode edits, revert): replace the doc.
	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;
		const cur = view.state.doc.toString();
		if (cur !== (value || '')) view.dispatch({ changes: { from: 0, to: cur.length, insert: value || '' } });
	}, [value]);

	useEffect(() => {
		const view = viewRef.current;
		if (view) view.dispatch({ effects: theme.current.reconfigure(dark ? vscodeDark : vscodeLight) });
	}, [dark]);

	useEffect(() => {
		const view = viewRef.current;
		if (view) view.dispatch({ effects: editable.current.reconfigure(EditorState.readOnly.of(!!readOnly)) });
	}, [readOnly]);

	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;
		const len = view.state.doc.length;
		const diags = (problems || [])
			.filter((p) => typeof p.from === 'number' && p.to <= len)
			.map((p) => ({ from: p.from, to: Math.max(p.to, p.from), severity: p.severity === 'error' ? 'error' : 'warning', message: p.message, source: 'Docs' }));
		view.dispatch(setDiagnostics(view.state, diags));
	}, [problems, value]);

	return <div ref={hostRef} className="rpd-docs-cm" data-rpd-docs-markdown="" />;
}
