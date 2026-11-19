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
import { Editor, Extension, StarterKit, Image, Placeholder, TIPTAP_VERSION } from './vendor/tiptap';

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
