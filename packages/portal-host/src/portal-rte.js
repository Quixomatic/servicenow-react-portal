// Rich-text engine chunk (TipTap 3 / ProseMirror), loaded with import() only when a
// components:rich-text-editor mounts, so portal pages without an editor never download it.
//
// Like the Studio chunk, the CLI deploys this dynamic import as a standalone ES module
// (".../portal-host/portal-rte.jsdbx") that shares nothing with the main bundle. So it holds no
// React and no host modules: only TipTap's framework-agnostic core. The React toolbar, dialogs and
// the useRichTextEditor hook live in the main bundle (components/ui/rich-text-editor.jsx) and drive
// the Editor instance this returns. The sanitiser is passed in, so there is one copy of it.
//
// It sits at the src root for the same reason as portal-studio.js: the CLI names chunk assets after
// the module path, and a nested path gives an unresolvable /uxasset URL on Windows.
//
// TipTap comes pre-bundled (src/vendor/tiptap.js, `pnpm run vendor:rte`): its dist files carry
// @jsxImportSource pragmas that the CLI's classic-runtime babel rejects.
import { Editor, Extension, Mark, Node, getSchema, StarterKit, Image, Placeholder, Table, TableRow, TableHeader, TableCell, CodeBlock, Plugin, PluginKey, Decoration, DecorationSet, TIPTAP_VERSION } from './vendor/tiptap';

export const ENGINE = 'tiptap';
export const ENGINE_VERSION = TIPTAP_VERSION;

const EVENTS = ['onUpdate', 'onSelectionUpdate', 'onTransaction', 'onFocus', 'onBlur'];

function handlers(o) {
	const out = {};
	EVENTS.forEach((name) => {
		if (typeof o[name] === 'function') out[name] = o[name];
	});
	return out;
}

function imageFiles(list) {
	return Array.from(list || []).filter((f) => f && /^image\//.test(f.type));
}

/**
 * Create a TipTap editor mounted in `element`.
 *
 * options: {
 *   element, content (HTML), editable, placeholder, autofocus,
 *   attributes: attributes for the contenteditable (role, aria-*, id, class),
 *   sanitize(html): string        applied to pasted HTML,
 *   isAllowedUri(url): boolean    extra link URL check,
 *   onImageFiles(files, { pos }): handle pasted / dropped image files (return true when handled),
 *   onShortcut(name): 'link' (Mod-K) | 'toolbar' (Alt-F10),
 *   onUpdate, onSelectionUpdate, onTransaction, onFocus, onBlur: TipTap event callbacks
 * }
 */
export function createEditor(options) {
	const o = options || {};
	const sanitize = typeof o.sanitize === 'function' ? o.sanitize : (html) => html;
	const Shortcuts = Extension.create({
		name: 'rpShortcuts',
		addKeyboardShortcuts() {
			return {
				'Mod-k': () => {
					if (o.onShortcut) o.onShortcut('link');
					return true;
				},
				'Alt-F10': () => {
					if (o.onShortcut) o.onShortcut('toolbar');
					return true;
				}
			};
		}
	});
	const filesHandled = (files, pos) => {
		const images = imageFiles(files);
		if (!images.length || typeof o.onImageFiles !== 'function') return false;
		return o.onImageFiles(images, { pos }) !== false;
	};
	return new Editor({
		element: o.element,
		content: o.content || '',
		editable: o.editable !== false,
		autofocus: o.autofocus || false,
		// TipTap would inject its base CSS into document.head, which never reaches the shadow root;
		// the host's stylesheet ships the editor styles instead.
		injectCSS: false,
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3, 4] },
				link: {
					openOnClick: false,
					autolink: true,
					linkOnPaste: true,
					defaultProtocol: 'https',
					protocols: ['http', 'https', 'mailto', 'tel'],
					HTMLAttributes: { rel: 'noopener noreferrer', target: null, class: null },
					isAllowedUri: (url, ctx) => !!ctx.defaultValidate(url) && (typeof o.isAllowedUri !== 'function' || o.isAllowedUri(url))
				}
			}),
			Image.configure({ inline: false, allowBase64: false }),
			Placeholder.configure({ placeholder: o.placeholder || '' }),
			Shortcuts
		],
		editorProps: {
			attributes: o.attributes || {},
			transformPastedHTML: (html) => sanitize(html),
			handlePaste: (view, event) => filesHandled(event.clipboardData && event.clipboardData.files, view.state.selection.from),
			handleDrop: (view, event, slice, moved) => {
				if (moved) return false;
				const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
				const handled = filesHandled(event.dataTransfer && event.dataTransfer.files, coords ? coords.pos : view.state.selection.from);
				if (handled) event.preventDefault();
				return handled;
			}
		},
		// Only the handlers given: TipTap registers every on* option as a listener, and an explicit
		// undefined replaces its no-op default (emit() then throws in the middle of a dispatch).
		...handlers(o)
	});
}

export default createEditor;

/* ---------------- Docs editor (Portal Studio's Docs activity, visual mode) ---------------- */

// Markdown-shaped schema: everything the docs renderer supports, plus two nodes of ours. The
// Markdown ⇄ JSON conversion lives in Studio (studio/docs/md-convert.js); this only builds the
// editor. Attributes Markdown needs but HTML doesn't (list bullet / tightness, code meta, cell
// alignment) are kept off the DOM (rendered: false), so they round-trip through getJSON().

const MarkdownAttributes = Extension.create({
	name: 'rpMarkdownAttributes',
	addGlobalAttributes() {
		return [
			{ types: ['bulletList'], attributes: { bullet: { default: '-', rendered: false }, tight: { default: true, rendered: false } } },
			{ types: ['orderedList'], attributes: { delimiter: { default: '.', rendered: false }, tight: { default: true, rendered: false } } },
			{
				types: ['tableHeader', 'tableCell'],
				attributes: {
					align: {
						default: null,
						parseHTML: (el) => el.style.textAlign || null,
						renderHTML: (a) => (a.align ? { style: 'text-align:' + a.align } : {})
					}
				}
			}
		];
	}
});

const DocCodeBlock = CodeBlock.extend({
	addAttributes() {
		return {
			...this.parent(),
			// The rest of the fence's info string, e.g. title="a.ts".
			meta: { default: null, rendered: false }
		};
	}
});

/** > **Note:** … / > [!TIP] … : kind (note, tip, warning…), label as written, form 'bold' | 'gfm'. */
const Callout = Node.create({
	name: 'callout',
	group: 'block',
	content: 'block+',
	defining: true,
	addAttributes() {
		return {
			kind: { default: 'note', rendered: false },
			label: { default: 'Note', rendered: false },
			form: { default: 'bold', rendered: false }
		};
	},
	parseHTML() {
		return [{ tag: 'div[data-rp-callout]' }];
	},
	renderHTML({ node }) {
		return ['div', { 'data-rp-callout': '', 'data-kind': node.attrs.kind, class: 'rpe-callout' }, ['div', { class: 'rpe-callout-label', contenteditable: 'false' }, node.attrs.label], ['div', { class: 'rpe-callout-body' }, 0]];
	}
});

/**
 * Inline code that combines with other marks. TipTap's Code mark excludes every other mark, but
 * Markdown allows [`code`](link) and **`code`**, which the docs use a lot.
 */
const DocCode = Mark.create({
	name: 'code',
	excludes: '',
	code: true,
	parseHTML() {
		return [{ tag: 'code' }];
	},
	renderHTML() {
		return ['code', 0];
	},
	addCommands() {
		return {
			toggleCode:
				() =>
				({ commands }) =>
					commands.toggleMark(this.name)
		};
	},
	addKeyboardShortcuts() {
		return { 'Mod-e': () => this.editor.commands.toggleCode() };
	}
});

/**
 * Line-break opportunities after '.' and '/' in inline code (<wbr> widgets, view only: never in the
 * document or the Markdown), so dotted names wrap at a dot like the docs renderer's InlineCode.
 */
const codeBreakKey = new PluginKey('rpCodeBreaks');
function codeBreaks(doc) {
	const decos = [];
	doc.descendants((node, pos) => {
		if (!node.isText || !node.marks.some((m) => m.type.name === 'code')) return;
		const text = node.text || '';
		for (let i = 0; i < text.length - 1; i++) {
			if ((text[i] === '.' || text[i] === '/') && text[i + 1] !== '.' && text[i + 1] !== '/') {
				decos.push(Decoration.widget(pos + i + 1, () => document.createElement('wbr'), { side: -1, ignoreSelection: true, key: 'wbr' }));
			}
		}
	});
	return DecorationSet.create(doc, decos);
}
const CodeBreaks = Extension.create({
	name: 'rpCodeBreaks',
	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: codeBreakKey,
				state: {
					init: (_, state) => codeBreaks(state.doc),
					apply: (tr, old) => (tr.docChanged ? codeBreaks(tr.doc) : old)
				},
				props: {
					decorations(state) {
						return codeBreakKey.getState(state);
					}
				}
			})
		];
	}
});

/**
 * Markdown the visual editor doesn't model (raw HTML, reference definitions, task lists…), kept
 * byte for byte and edited as source in a textarea.
 */
const RawMarkdown = Node.create({
	name: 'rawMarkdown',
	group: 'block',
	atom: true,
	selectable: true,
	draggable: false,
	addAttributes() {
		return { source: { default: '', rendered: false } };
	},
	parseHTML() {
		return [{ tag: 'div[data-rp-raw-md]' }];
	},
	renderHTML() {
		return ['div', { 'data-rp-raw-md': '' }];
	},
	addNodeView() {
		return ({ node, getPos, editor }) => {
			const dom = document.createElement('div');
			dom.className = 'rpe-raw';
			dom.setAttribute('data-rp-raw-md', '');
			const head = document.createElement('div');
			head.className = 'rpe-raw-label';
			head.textContent = 'Markdown block (kept as source)';
			const area = document.createElement('textarea');
			area.className = 'rpe-raw-source';
			area.spellcheck = false;
			area.value = node.attrs.source;
			const fit = () => {
				area.style.height = 'auto';
				area.style.height = area.scrollHeight + 2 + 'px';
			};
			area.rows = Math.max(1, String(node.attrs.source).split('\n').length);
			area.readOnly = !editor.isEditable;
			area.addEventListener('input', () => {
				fit();
				const pos = typeof getPos === 'function' ? getPos() : null;
				if (pos == null) return;
				editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, source: area.value }));
			});
			dom.appendChild(head);
			dom.appendChild(area);
			setTimeout(fit, 0);
			return {
				dom,
				update(next) {
					if (next.type.name !== 'rawMarkdown') return false;
					node = next;
					if (area.value !== next.attrs.source) area.value = next.attrs.source;
					area.readOnly = !editor.isEditable;
					return true;
				},
				stopEvent: (event) => event.target === area,
				ignoreMutation: () => true
			};
		};
	}
});

/**
 * The Docs editor: TipTap with a Markdown-shaped schema. content is ProseMirror JSON (built by
 * Studio's md-convert.js from the docs renderer's own lexer).
 *
 * options: { element, content (JSON), editable, attributes, onShortcut(name): 'link' (Mod-K),
 *   onUpdate, onSelectionUpdate, onTransaction, onFocus, onBlur }
 */
/** The Docs editor's extensions (the schema md-convert.js targets). */
function markdownExtensions(extra) {
	return [
		StarterKit.configure({
			heading: { levels: [1, 2, 3, 4, 5, 6] },
			code: false,
			codeBlock: false,
			underline: false,
			trailingNode: false,
			link: { openOnClick: false, autolink: false, linkOnPaste: true, HTMLAttributes: { rel: null, target: null, class: null }, isAllowedUri: (url) => !/^\s*(javascript|data|vbscript):/i.test(String(url || '')) }
		}),
		DocCode,
		DocCodeBlock,
		Image.configure({ inline: false, allowBase64: false }),
		Table.configure({ resizable: false }),
		TableRow,
		TableHeader,
		TableCell,
		Callout,
		RawMarkdown,
		MarkdownAttributes,
		CodeBreaks
	].concat(extra || []);
}

/** The Docs editor's ProseMirror schema (tests: schema.nodeFromJSON(doc).check()). */
export function markdownSchema() {
	return getSchema(markdownExtensions());
}

export function createMarkdownEditor(options) {
	const o = options || {};
	const Shortcuts = Extension.create({
		name: 'rpDocsShortcuts',
		addKeyboardShortcuts() {
			return {
				'Mod-k': () => {
					if (o.onShortcut) o.onShortcut('link');
					return true;
				}
			};
		}
	});
	return new Editor({
		element: o.element,
		content: o.content || { type: 'doc', content: [{ type: 'paragraph' }] },
		editable: o.editable !== false,
		autofocus: false,
		injectCSS: false,
		// Content comes from our own converter: never drop what the schema doesn't know silently.
		enableContentCheck: true,
		extensions: markdownExtensions([Shortcuts]),
		editorProps: { attributes: o.attributes || {} },
		...handlers(o)
	});
}
