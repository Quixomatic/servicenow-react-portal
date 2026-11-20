// Visual mode: TipTap (the host's lazily loaded portal-rte chunk, createMarkdownEditor) over the
// JSON md-convert.js builds from the renderer's own lexer. Every change is turned back into
// Markdown with source preservation (unchanged blocks keep their exact bytes) and reported through
// onMarkdown(markdown, warnings). Styled with the docs' own prose CSS, so it looks like the page.
import React, { useEffect, useRef, useState } from 'react';
import { useHostTextStyle } from '../host-text';
import { markdownToDoc, createSourceMap, docToMarkdown } from './md-convert';
import { loadEditorEngine } from './host-modules';

/** The command API the toolbar drives (null until the editor exists). */
function apiFor(editor) {
	const chain = () => editor.chain().focus();
	return {
		editor,
		isActive: (name, attrs) => editor.isActive(name, attrs),
		attrs: (name) => editor.getAttributes(name),
		can: () => editor.can(),
		undo: () => chain().undo().run(),
		redo: () => chain().redo().run(),
		bold: () => chain().toggleBold().run(),
		italic: () => chain().toggleItalic().run(),
		strike: () => chain().toggleStrike().run(),
		code: () => chain().toggleCode().run(),
		heading: (level) => (level ? chain().toggleHeading({ level }).run() : chain().setParagraph().run()),
		bulletList: () => chain().toggleBulletList().run(),
		orderedList: () => chain().toggleOrderedList().run(),
		blockquote: () => chain().toggleBlockquote().run(),
		codeBlock: (language) => chain().toggleCodeBlock({ language: language || null }).run(),
		setCodeLanguage: (language) => chain().updateAttributes('codeBlock', { language: language || null }).run(),
		hr: () => chain().setHorizontalRule().run(),
		callout: (kind, label) => {
			if (editor.isActive('callout')) return chain().lift('callout').run();
			return chain().wrapIn('callout', { kind: kind || 'note', label: label || 'Note', form: 'bold' }).run();
		},
		setCallout: (kind, label) => chain().updateAttributes('callout', { kind, label }).run(),
		table: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
		addRow: () => chain().addRowAfter().run(),
		addColumn: () => chain().addColumnAfter().run(),
		deleteRow: () => chain().deleteRow().run(),
		deleteColumn: () => chain().deleteColumn().run(),
		deleteTable: () => chain().deleteTable().run(),
		setAlign: (align) => chain().setCellAttribute('align', align || null).run(),
		/** Link the selection (or insert `text` linked when nothing is selected). */
		link: (href, text) => {
			const { empty } = editor.state.selection;
			if (!href) return chain().extendMarkRange('link').unsetLink().run();
			if (empty && !editor.isActive('link')) return chain().insertContent({ type: 'text', text: text || href, marks: [{ type: 'link', attrs: { href } }] }).run();
			return chain().extendMarkRange('link').setLink({ href }).run();
		},
		image: (src, alt) => chain().setImage({ src, alt: alt || '' }).run(),
		selectedText: () => {
			const { from, to } = editor.state.selection;
			return editor.state.doc.textBetween(from, to, ' ');
		},
		focus: () => editor.commands.focus()
	};
}

export default function VisualEditor({ markdown, lex, readOnly, root, onMarkdown, onReady, onLink, onInfo }) {
	const hostText = useHostTextStyle(root);
	const elRef = useRef(null);
	const [status, setStatus] = useState({ state: 'loading' });
	const cb = useRef({});
	cb.current = { onMarkdown, onReady, onLink, onInfo };

	useEffect(() => {
		let alive = true;
		let editor = null;
		let timer = null;
		(async () => {
			const engine = await loadEditorEngine();
			if (!alive || !elRef.current) return;
			const parsed = markdownToDoc(markdown || '', lex);
			if (!parsed.mappable) {
				setStatus({ state: 'refused', message: "This page's Markdown can't be mapped block by block, so visual mode is off for it (nothing was changed). Edit it in Markdown mode." });
				return;
			}
			editor = engine.createMarkdownEditor({
				element: elRef.current,
				content: parsed.doc,
				editable: !readOnly,
				attributes: { class: 'rp-docs-prose rpd-docs-visual-content', 'aria-label': 'Page content (visual editor)', spellcheck: 'true' },
				onShortcut: (name) => name === 'link' && cb.current.onLink && cb.current.onLink(),
				onUpdate: () => {
					clearTimeout(timer);
					timer = setTimeout(flush, 250);
				},
				onSelectionUpdate: () => cb.current.onReady && cb.current.onReady(apiFor(editor), true)
			});
			const normalized = editor.getJSON().content || [];
			if (normalized.length !== parsed.doc.content.length) {
				editor.destroy();
				editor = null;
				setStatus({ state: 'refused', message: 'The visual editor could not load this page without changing its structure, so visual mode is off for it (nothing was changed). Edit it in Markdown mode.' });
				return;
			}
			const map = createSourceMap(parsed, normalized);
			function flush() {
				if (!editor) return;
				const res = docToMarkdown(editor.getJSON(), map, lex);
				if (cb.current.onMarkdown) cb.current.onMarkdown(res.markdown, res.warnings);
			}
			editor.__rpFlush = flush;
			setStatus({ state: 'ready', rawCount: parsed.rawCount, reasons: parsed.reasons });
			if (cb.current.onInfo) cb.current.onInfo({ rawCount: parsed.rawCount, reasons: parsed.reasons });
			if (cb.current.onReady) cb.current.onReady(apiFor(editor), false);
		})().catch((error) => alive && setStatus({ state: 'error', message: (error && error.message) || String(error) }));
		return () => {
			alive = false;
			clearTimeout(timer);
			if (editor) {
				// Pending edits are flushed before the editor goes (mode switch, save).
				if (editor.__rpFlush) editor.__rpFlush();
				editor.destroy();
			}
			if (cb.current.onReady) cb.current.onReady(null, false);
		};
		// Remounted by the parent (key) for a new page or a re-entry into visual mode.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="rpd-docs-visual" data-rpd-docs-visual="">
			{status.state === 'loading' ? <div className="rps-preview-msg">Loading the visual editor…</div> : null}
			{status.state === 'refused' || status.state === 'error' ? (
				<div className="rps-preview-msg" style={{ color: status.state === 'error' ? 'var(--rps-error)' : undefined }} data-rpd-docs-visual-refused="">
					{status.message}
				</div>
			) : null}
			<div className="rps-host-content rpd-docs-visual-host" style={{ ...hostText, display: status.state === 'ready' ? 'block' : 'none' }} data-rp-root="">
				<div ref={elRef} />
			</div>
		</div>
	);
}
