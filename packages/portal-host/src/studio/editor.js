// CodeMirror 6 editor bound to a shared document (store.docs). Mounted into the host's shadow
// root via EditorView's `root` option, so selection, focus and CodeMirror's style modules all
// target the shadow root.
import React, { useEffect, useRef } from 'react';
import { Annotation, Compartment, EditorSelection, EditorState, Transaction } from '@codemirror/state';
import {
	EditorView,
	crosshairCursor,
	drawSelection,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	rectangularSelection
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, completeFromList } from '@codemirror/autocomplete';
import { lintGutter, lintKeymap, setDiagnostics } from '@codemirror/lint';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { useStudio } from './store';

const Sync = Annotation.define();

function languageFor(path) {
	if (/\.tsx$/.test(path)) return javascript({ typescript: true, jsx: true });
	if (/\.ts$/.test(path)) return javascript({ typescript: true });
	if (/\.(jsx|js|mjs)$/.test(path)) return javascript({ jsx: true });
	if (/\.css$/.test(path)) return css();
	if (/\.json$/.test(path)) return json();
	return [];
}

/** Registry specifiers inside import strings: 'react', '@portal/runtime', 'components:button', … */
function registryCompletions(context) {
	const word = context.matchBefore(/['"][@\w:/.-]*$/);
	if (!word) return null;
	const line = context.state.doc.lineAt(context.pos).text;
	if (!/\b(from|import)\s*\(?\s*['"][@\w:/.-]*$/.test(line.slice(0, context.pos - context.state.doc.lineAt(context.pos).from))) return null;
	const modules = (globalThis.__REACT_PORTAL__ && globalThis.__REACT_PORTAL__.modules) || {};
	return {
		from: word.from + 1,
		options: Object.keys(modules).map((name) => ({ label: name, type: 'namespace', detail: 'host registry' })),
		validFor: /^[@\w:/.-]*$/
	};
}

const RUNTIME_FALLBACK = ['usePortal', 'useComponent', 'useNavigate', 'usePortalLocation', 'Region', 'RegionPortal', 'Link', 'useTheme', 'useUser', 'useProperty', 'useProperties', 'useMessage', 'useMessages', 'usePortalUtils', 'useServer', 'useRecord', 'useTableQuery', 'toast', 'format'];

/** @portal/runtime names, read from the host registry (so new runtime exports show up). */
function RUNTIME_SNIPPETS(context) {
	const runtime = globalThis.__REACT_PORTAL__ && globalThis.__REACT_PORTAL__.modules && globalThis.__REACT_PORTAL__.modules['@portal/runtime'];
	const names = (runtime && runtime.RUNTIME_EXPORTS) || RUNTIME_FALLBACK;
	return completeFromList(names.map((label) => ({ label, type: /^[A-Z]/.test(label) ? 'class' : 'function', detail: '@portal/runtime' })))(context);
}

/** VS Code-ish chrome on top of the VS Code theme: fills its container, compact gutters. */
const baseTheme = EditorView.theme({
	'&': { height: '100%', fontSize: '13px' },
	'.cm-scroller': { fontFamily: 'Consolas, "Cascadia Code", "Fira Code", Menlo, monospace', lineHeight: '19px' },
	'.cm-gutters': { borderRight: 'none' },
	'.cm-lintRange-error': { backgroundSize: 'auto' },
	'&.cm-focused': { outline: 'none' }
});

function toDiagnostics(doc, problems) {
	const out = [];
	problems.forEach((p) => {
		const lineNo = Math.min(Math.max(1, p.line || 1), doc.lines);
		const line = doc.line(lineNo);
		let from = line.from + Math.min(Math.max(0, (p.column || 1) - 1), line.length);
		let to = from;
		const rest = line.text.slice(from - line.from);
		const word = /^[\w$]+/.exec(rest);
		if (!p.hasPosition) {
			from = line.from;
			to = line.to;
		} else if (word) to = from + word[0].length;
		else if (from < line.to) to = from + 1;
		else if (from > line.from) from -= 1;
		out.push({ from, to: Math.max(to, from), severity: p.severity === 'warning' ? 'warning' : 'error', message: p.message, source: 'React Portal' });
	});
	return out;
}

export default function CodeEditor({ studio, path, groupId, active, root, dark, onFocus }) {
	const hostRef = useRef(null);
	const viewRef = useRef(null);
	const themeCompartment = useRef(new Compartment());
	const problems = useStudio(studio, (s) => s.problems);

	// Create the view once per (group, path).
	useEffect(() => {
		const doc = studio.docs.get(path);
		if (!doc || !hostRef.current) return undefined;
		const state = EditorState.create({
			doc: doc.text,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightSpecialChars(),
				history(),
				foldGutter(),
				drawSelection(),
				dropCursor(),
				EditorState.allowMultipleSelections.of(true),
				indentOnInput(),
				indentUnit.of('    '),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
				bracketMatching(),
				closeBrackets(),
				autocompletion(),
				javascriptLanguage.data.of({ autocomplete: registryCompletions }),
				javascriptLanguage.data.of({ autocomplete: RUNTIME_SNIPPETS }),
				rectangularSelection(),
				crosshairCursor(),
				highlightActiveLine(),
				highlightSelectionMatches(),
				lintGutter(),
				keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...lintKeymap, indentWithTab]),
				languageFor(path),
				baseTheme,
				themeCompartment.current.of(dark ? vscodeDark : vscodeLight),
				EditorView.updateListener.of((update) => {
					if ((update.selectionSet || update.docChanged || update.focusChanged) && update.view.hasFocus) {
						const head = update.state.selection.main.head;
						const line = update.state.doc.lineAt(head);
						studio.set({ cursor: { line: line.number, col: head - line.from + 1, path } });
					}
					if (update.focusChanged && update.view.hasFocus && onFocus) onFocus();
				})
			]
		});
		const view = new EditorView({
			state,
			parent: hostRef.current,
			root: root || undefined,
			dispatchTransactions(trs, v) {
				v.update(trs);
				trs.forEach((tr) => {
					if (tr.docChanged && !tr.annotation(Sync)) studio.docs.changed(path, v, tr, Sync, Transaction.userEvent);
				});
			}
		});
		viewRef.current = view;
		studio.docs.attach(path, view);
		const unregister = studio.registerRevealer(groupId, path, (lineNo, column) => {
			const d = view.state.doc;
			const line = d.line(Math.min(Math.max(1, lineNo || 1), d.lines));
			const pos = line.from + Math.min(Math.max(0, (column || 1) - 1), line.length);
			view.dispatch({ selection: EditorSelection.cursor(pos), effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
			view.focus();
		});
		return () => {
			unregister();
			studio.docs.detach(path, view);
			view.destroy();
			viewRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [path, groupId]);

	// Light/dark follows the studio theme.
	useEffect(() => {
		const view = viewRef.current;
		if (view) view.dispatch({ effects: themeCompartment.current.reconfigure(dark ? vscodeDark : vscodeLight) });
	}, [dark]);

	// Diagnostics for this file, positioned against the current buffer.
	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;
		const mine = problems.list.filter((p) => p.file === path || (!p.file && path === 'main.tsx'));
		view.dispatch(setDiagnostics(view.state, toDiagnostics(view.state.doc, mine)));
	}, [problems, path]);

	// A hidden editor that becomes visible re-measures (it kept its state, scroll and undo history).
	useEffect(() => {
		const view = viewRef.current;
		if (view && active) view.requestMeasure();
	}, [active]);

	return <div ref={hostRef} className="rps-editor" style={{ display: active ? 'block' : 'none' }} data-rps-editor={path} />;
}
