// Code editor engine chunk (CodeMirror 6), loaded with import() only when a components:code-editor
// mounts, so portal pages without a code field never download it.
//
// Like portal-rte.js, the CLI deploys this dynamic import as a standalone ES module
// (".../portal-host/portal-code.jsdbx") that shares nothing with the main bundle: no React and no
// host modules, only CodeMirror. The React wrapper (components/ui/code-editor.jsx) drives the
// handle this returns. Studio ships its own CodeMirror copy in the Studio chunk; the two never
// load together on a portal page.
//
// It sits at the src root for the same reason as portal-studio.js: the CLI names chunk assets after
// the module path, and a nested path gives an unresolvable /uxasset URL on Windows.
import { Compartment, EditorState } from '@codemirror/state';
import {
    EditorView,
    drawSelection,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    placeholder as placeholderExt,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
    HighlightStyle,
    bracketMatching,
    foldGutter,
    foldKeymap,
    indentOnInput,
    indentUnit,
    syntaxHighlighting,
} from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { tags as t } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';

export const ENGINE = 'codemirror';

/** Language extension for a language name ('javascript', 'typescript', 'json', 'css', 'html', 'xml', 'text'). */
function languageExtension(name) {
    switch (String(name || '').toLowerCase()) {
        case 'javascript':
        case 'js':
            return javascript();
        case 'jsx':
            return javascript({ jsx: true });
        case 'typescript':
        case 'ts':
            return javascript({ typescript: true });
        case 'tsx':
            return javascript({ typescript: true, jsx: true });
        case 'json':
            return json();
        case 'css':
        case 'scss':
            return css();
        // No lang-xml in the tree: the HTML parser reads XML-ish markup well enough for highlighting.
        case 'html':
        case 'xml':
            return html({ matchClosingTags: true, autoCloseTags: true });
        default:
            return [];
    }
}

export const LANGUAGES = ['javascript', 'jsx', 'typescript', 'tsx', 'json', 'css', 'html', 'xml', 'text'];

// Chrome from the theme tokens (resolved on the shadow host, so light / dark / theme swaps apply
// without reconfiguring). Syntax colours use light-dark(), which follows the host's color-scheme.
const tokenTheme = EditorView.theme({
    '&': {
        color: 'var(--foreground)',
        backgroundColor: 'transparent',
        fontSize: '13px',
        height: '100%',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Cascadia Code", Menlo, monospace',
        lineHeight: '1.55',
    },
    '.cm-content': { caretColor: 'var(--foreground)', padding: '6px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--foreground)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'color-mix(in oklch, var(--ring) 35%, transparent)',
    },
    '.cm-gutters': {
        backgroundColor: 'color-mix(in oklch, var(--muted) 60%, transparent)',
        color: 'var(--muted-foreground)',
        borderRight: '1px solid var(--border)',
    },
    // Cursor-line and bracket highlights only while the editor has focus (a resting editor, and
    // read-only code, show plain code).
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '&.cm-focused .cm-activeLineGutter': { backgroundColor: 'var(--muted)', color: 'var(--foreground)' },
    '&.cm-focused .cm-activeLine': { backgroundColor: 'color-mix(in oklch, var(--muted) 45%, transparent)' },
    '&:not(.cm-focused) .cm-matchingBracket, &:not(.cm-focused) .cm-nonmatchingBracket': {
        backgroundColor: 'transparent',
    },
    '&.cm-focused .cm-matchingBracket': {
        backgroundColor: 'color-mix(in oklch, var(--ring) 30%, transparent)',
        outline: 'none',
    },
    '.cm-selectionMatch': { backgroundColor: 'color-mix(in oklch, var(--ring) 20%, transparent)' },
    '.cm-placeholder': { color: 'var(--muted-foreground)' },
    '.cm-foldPlaceholder': {
        backgroundColor: 'var(--muted)',
        border: '1px solid var(--border)',
        color: 'var(--muted-foreground)',
    },
    '.cm-tooltip': {
        backgroundColor: 'var(--popover)',
        color: 'var(--popover-foreground)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-foreground)',
    },
    '.cm-panels': { backgroundColor: 'var(--muted)', color: 'var(--foreground)' },
    '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border)' },
    '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--border)' },
    '.cm-search input, .cm-search button': { fontSize: '12px' },
    '.cm-textfield': {
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        border: '1px solid var(--input)',
        borderRadius: '4px',
    },
    '.cm-button': {
        backgroundImage: 'none',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        border: '1px solid var(--input)',
        borderRadius: '4px',
    },
});

const ld = (light, dark) => `light-dark(${light}, ${dark})`;

const tokenHighlight = HighlightStyle.define([
    { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: ld('#a626a4', '#c678dd') },
    { tag: [t.string, t.special(t.string), t.regexp], color: ld('#50a14f', '#98c379') },
    { tag: [t.number, t.bool, t.null, t.atom], color: ld('#986801', '#d19a66') },
    { tag: [t.comment, t.lineComment, t.blockComment], color: ld('#7c7f8a', '#7f848e'), fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: ld('#4078f2', '#61afef') },
    { tag: [t.typeName, t.className, t.namespace], color: ld('#c18401', '#e5c07b') },
    { tag: [t.propertyName, t.attributeName], color: ld('#986801', '#d19a66') },
    { tag: [t.tagName, t.angleBracket], color: ld('#e45649', '#e06c75') },
    { tag: [t.definition(t.variableName), t.variableName], color: ld('#383a42', '#abb2bf') },
    { tag: [t.operator, t.punctuation, t.bracket], color: ld('#4b5563', '#9ca3af') },
    { tag: t.invalid, color: ld('#e45649', '#e06c75'), textDecoration: 'underline wavy' },
    { tag: t.heading, fontWeight: 'bold' },
    { tag: t.link, textDecoration: 'underline' },
]);

/**
 * Create an editor in `parent`.
 *
 * options: {
 *   parent, value, language, readOnly, placeholder, lineNumbers (true), tabSize (4), minLines,
 *   attributes: attributes for the contenteditable (id, aria-label, aria-labelledby,
 *     aria-describedby, aria-invalid, aria-required),
 *   onChange(text), onFocus(), onBlur(text), onSubmit(text) (Ctrl/Cmd+Enter)
 * }
 * returns { view, getValue(), setValue(text), setReadOnly(bool), setLanguage(name),
 *   setAttributes(attrs), focus(), destroy() }
 */
export function createCodeEditor(options) {
    const o = options || {};
    const language = new Compartment();
    const editable = new Compartment();
    const attrs = new Compartment();
    const tabSize = o.tabSize || 4;
    let silent = false;
    const rootNode = o.parent && o.parent.getRootNode ? o.parent.getRootNode() : null;
    const root =
        rootNode && rootNode !== o.parent && typeof rootNode.getSelection === 'function' ? rootNode : undefined;
    // Read-only code stays focusable (Tab stop, keyboard selection and copy), like a read-only field.
    const editableExt = (readOnly) => [
        EditorState.readOnly.of(!!readOnly),
        EditorView.editable.of(!readOnly),
        readOnly ? EditorView.contentAttributes.of({ tabindex: '0' }) : [],
    ];
    const attrExt = (a) =>
        EditorView.contentAttributes.of(Object.assign({ spellcheck: 'false', autocorrect: 'off' }, a || {}));
    const extensions = [
        o.lineNumbers === false ? [] : [lineNumbers(), highlightActiveLineGutter(), foldGutter()],
        highlightSpecialChars(),
        history(),
        drawSelection(),
        indentOnInput(),
        indentUnit.of(' '.repeat(tabSize)),
        EditorState.tabSize.of(tabSize),
        syntaxHighlighting(tokenHighlight),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ activateOnTyping: true }),
        highlightActiveLine(),
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        keymap.of([
            {
                key: 'Mod-Enter',
                run: (view) => {
                    if (o.onSubmit) o.onSubmit(view.state.doc.toString());
                    return !!o.onSubmit;
                },
            },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            // Tab indents; Escape then Tab (or Ctrl+M / Shift+Alt+M) moves focus on, as CodeMirror documents.
            indentWithTab,
        ]),
        o.placeholder ? placeholderExt(o.placeholder) : [],
        tokenTheme,
        o.minLines
            ? EditorView.theme({ '.cm-content, .cm-gutter': { minHeight: `calc(${o.minLines} * 1.55em + 12px)` } })
            : [],
        language.of(languageExtension(o.language)),
        editable.of(editableExt(o.readOnly)),
        attrs.of(attrExt(o.attributes)),
        EditorView.updateListener.of((update) => {
            if (update.docChanged && !silent && o.onChange) o.onChange(update.state.doc.toString());
            if (update.focusChanged) {
                if (update.view.hasFocus) {
                    if (o.onFocus) o.onFocus();
                } else if (o.onBlur) o.onBlur(update.state.doc.toString());
            }
        }),
    ];
    const view = new EditorView({
        state: EditorState.create({ doc: o.value || '', extensions }),
        parent: o.parent,
        root,
    });
    return {
        view,
        getValue: () => view.state.doc.toString(),
        setValue(text) {
            const next = text || '';
            if (next === view.state.doc.toString()) return;
            silent = true;
            try {
                view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
            } finally {
                silent = false;
            }
        },
        setReadOnly(readOnly) {
            view.dispatch({ effects: editable.reconfigure(editableExt(readOnly)) });
        },
        setLanguage(name) {
            view.dispatch({ effects: language.reconfigure(languageExtension(name)) });
        },
        setAttributes(a) {
            view.dispatch({ effects: attrs.reconfigure(attrExt(a)) });
        },
        focus: () => view.focus(),
        destroy: () => view.destroy(),
    };
}

export default createCodeEditor;
