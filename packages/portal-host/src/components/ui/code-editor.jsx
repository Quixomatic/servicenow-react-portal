import * as React from 'react';
import { cn } from 'cn';

// components:code-editor: a CodeMirror 6 editor with a string value, themed from the portal's
// tokens (light and dark follow the host), for script / JSON / CSS / XML / HTML values.
//
//   <CodeEditor value={code} onChange={setCode} language="javascript" aria-label="Script" />
//   <CodeEditor value={json} language="json" readOnly />
//   useCodeEditor(options)   the editor without the frame
//   loadCodeEngine()         the lazily loaded CodeMirror chunk (portal-code.jsdbx)
//
// CodeMirror is NOT in the main host bundle: it lives in the portal-code chunk, fetched with
// import() the first time an editor mounts (cached for the page). Until it arrives the value shows
// in a same-sized monospace block, so nothing jumps; if the chunk fails, a plain textarea takes
// over (with Retry), so the value stays editable. Tab indents; Escape then Tab leaves the editor.
// Generic: no record or field logic (app/code-field adds that).

let enginePromise = null;
let engineModule = null;

/** Load the CodeMirror chunk once per page (retries after a failure). Resolves with { createCodeEditor }. */
function loadCodeEngine() {
    if (engineModule) return Promise.resolve(engineModule);
    if (!enginePromise) {
        enginePromise = import(/* webpackChunkName: "portal-code" */ '../../portal-code')
            .then((mod) => {
                engineModule = mod;
                return mod;
            })
            .catch((error) => {
                enginePromise = null;
                throw error;
            });
    }
    return enginePromise;
}

/** True once the CodeMirror chunk has loaded on this page. */
function isCodeEngineLoaded() {
    return !!engineModule;
}

/** Editor language for a glide field type ('script' → javascript, 'xml', 'css', 'json', …). */
function codeLanguageForType(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'script' || t === 'script_plain' || t === 'script_server' || t === 'condition_string')
        return 'javascript';
    if (t === 'json' || t === 'json_translations') return 'json';
    if (t === 'css') return 'css';
    if (t === 'xml') return 'xml';
    if (t === 'html_script' || t === 'html_template') return 'html';
    return 'text';
}

function useLatest(value) {
    const ref = React.useRef(value);
    ref.current = value;
    return ref;
}

/**
 * The editor, headless. Mount it with `ref={editor.mountRef}` on an empty element.
 * options: { value, onChange(text), onFocus(), onBlur(text, { changed }), onSubmit(text),
 *   language, readOnly, placeholder, lineNumbers, tabSize, minLines, attributes }
 * returns { mountRef, status: 'loading'|'ready'|'error', error, retry(), focus(), getValue(), changed }
 *
 * `value` is controlled loosely: a value that differs from what the editor last emitted replaces
 * the content (without firing onChange).
 */
function useCodeEditor(options = {}) {
    const { value = '', language = 'text', readOnly = false, attributes } = options;
    const [state, setState] = React.useState(() => ({ status: engineModule ? 'ready' : 'loading', error: null }));
    const [node, setNode] = React.useState(null);
    const [attempt, setAttempt] = React.useState(0);
    const handle = React.useRef(null);
    const last = React.useRef(value || '');
    const changed = React.useRef(false);
    const opts = useLatest(options);

    React.useEffect(() => {
        if (!node) return undefined;
        let alive = true;
        let instance = null;
        loadCodeEngine()
            .then((mod) => {
                if (!alive) return;
                instance = mod.createCodeEditor({
                    parent: node,
                    value: last.current,
                    language,
                    readOnly,
                    placeholder: opts.current.placeholder,
                    lineNumbers: opts.current.lineNumbers,
                    tabSize: opts.current.tabSize,
                    minLines: opts.current.minLines,
                    attributes: opts.current.attributes || {},
                    onChange: (text) => {
                        changed.current = true;
                        last.current = text;
                        if (opts.current.onChange) opts.current.onChange(text);
                    },
                    onFocus: () => opts.current.onFocus && opts.current.onFocus(),
                    onBlur: (text) => opts.current.onBlur && opts.current.onBlur(text, { changed: changed.current }),
                    onSubmit: opts.current.onSubmit ? (text) => opts.current.onSubmit(text) : undefined,
                });
                handle.current = instance;
                setState({ status: 'ready', error: null });
            })
            .catch((error) => alive && setState({ status: 'error', error }));
        return () => {
            alive = false;
            if (instance) instance.destroy();
            handle.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [node, attempt]);

    // External value changes replace the document.
    React.useEffect(() => {
        const next = value || '';
        if (next === last.current) return;
        last.current = next;
        changed.current = false;
        if (handle.current) handle.current.setValue(next);
    }, [value]);
    React.useEffect(() => {
        if (handle.current) handle.current.setReadOnly(readOnly);
    }, [readOnly, state.status]);
    React.useEffect(() => {
        if (handle.current) handle.current.setLanguage(language);
    }, [language, state.status]);
    const attrKey = JSON.stringify(attributes || {});
    React.useEffect(() => {
        if (handle.current) handle.current.setAttributes(attributes || {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attrKey, state.status]);

    return {
        mountRef: setNode,
        status: state.status,
        error: state.error,
        retry: () => {
            setState({ status: 'loading', error: null });
            setAttempt((a) => a + 1);
        },
        focus: () => handle.current && handle.current.focus(),
        getValue: () => (handle.current ? handle.current.getValue() : last.current),
        get changed() {
            return changed.current;
        },
    };
}

/**
 * CodeEditor props: value, onChange(text), onBlur(text, { changed }), onFocus, onSubmit (Ctrl/⌘+Enter),
 * language ('javascript' | 'typescript' | 'jsx' | 'tsx' | 'json' | 'css' | 'html' | 'xml' | 'text'),
 * readOnly, disabled, invalid, required, placeholder, lineNumbers (true), tabSize (4),
 * minLines (3), maxHeight (CSS, default '24rem'; the editor scrolls inside), id, aria-label /
 * aria-labelledby / aria-describedby (on the role="textbox" content), className.
 */
function CodeEditor({
    className,
    value = '',
    onChange,
    onBlur,
    onFocus,
    onSubmit,
    language = 'javascript',
    readOnly = false,
    disabled = false,
    invalid = false,
    required = false,
    placeholder,
    lineNumbers = true,
    tabSize = 4,
    minLines = 3,
    maxHeight = '24rem',
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    ...props
}) {
    const attributes = {};
    if (id) attributes.id = id;
    if (ariaLabel) attributes['aria-label'] = ariaLabel;
    if (ariaLabelledby) attributes['aria-labelledby'] = ariaLabelledby;
    if (ariaDescribedby) attributes['aria-describedby'] = ariaDescribedby;
    if (invalid) attributes['aria-invalid'] = 'true';
    if (required) attributes['aria-required'] = 'true';
    if (readOnly || disabled) attributes['aria-readonly'] = 'true';
    const editor = useCodeEditor({
        value,
        onChange,
        onBlur,
        onFocus,
        onSubmit,
        language,
        readOnly: readOnly || disabled,
        placeholder,
        lineNumbers,
        tabSize,
        minLines,
        attributes,
    });
    const frame = cn(
        'relative w-full min-w-0 overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] dark:bg-input/30',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        invalid && 'border-destructive ring-destructive/20 focus-within:border-destructive',
        (readOnly || disabled) && 'bg-muted/40 shadow-none dark:bg-muted/30',
        disabled && 'opacity-60',
        className
    );
    const minHeight = `calc(${minLines} * 1.55em + 14px)`;
    if (editor.status === 'error') {
        return (
            <div data-slot="code-editor" data-status="error" className={cn(frame, 'flex flex-col')} {...props}>
                <textarea
                    id={id}
                    aria-label={ariaLabel}
                    aria-labelledby={ariaLabelledby}
                    aria-describedby={ariaDescribedby}
                    aria-invalid={invalid || undefined}
                    readOnly={readOnly}
                    disabled={disabled}
                    spellCheck={false}
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    onBlur={(e) => onBlur && onBlur(e.target.value, { changed: e.target.value !== value })}
                    style={{ minHeight, maxHeight }}
                    className="w-full resize-y bg-transparent p-2 font-mono text-[13px] leading-[1.55] outline-none"
                />
                <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1 text-xs text-muted-foreground">
                    <span>The code editor didn't load; editing as plain text.</span>
                    <button
                        type="button"
                        onClick={editor.retry}
                        className="rounded px-1.5 py-0.5 font-medium hover:bg-muted"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }
    return (
        <div data-slot="code-editor" data-status={editor.status} data-language={language} className={frame} {...props}>
            <div
                ref={editor.mountRef}
                style={{ minHeight, maxHeight }}
                className={cn(
                    'flex flex-col overflow-auto [&>.cm-editor]:min-h-[inherit] [&>.cm-editor]:flex-1',
                    editor.status !== 'ready' && 'hidden'
                )}
            />
            {editor.status !== 'ready' ? (
                <pre
                    aria-busy="true"
                    style={{ minHeight, maxHeight }}
                    className={cn(
                        'm-0 overflow-auto py-1.5 font-mono text-[13px] leading-[1.55] whitespace-pre-wrap text-muted-foreground',
                        lineNumbers ? 'pl-11' : 'pl-2'
                    )}
                >
                    {value || placeholder || ' '}
                </pre>
            ) : null}
        </div>
    );
}

export { CodeEditor, useCodeEditor, loadCodeEngine, isCodeEngineLoaded, codeLanguageForType };
