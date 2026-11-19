import * as React from "react"
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  CodeIcon,
  ListIcon,
  ListOrderedIcon,
  TextQuoteIcon,
  LinkIcon,
  ImageIcon,
  Undo2Icon,
  Redo2Icon,
  ChevronDownIcon,
  UploadIcon,
} from "lucide-react"
import { cn } from "cn"
import { Button } from "./button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "./dropdown-menu"
import { RichText, sanitizeHtml, safeUrl, isHtmlEmpty, findUnsupportedHtml } from "./rich-text"

// components:rich-text-editor: a shadcn-styled TipTap editor with an HTML value.
//
//   <RichTextEditor value={html} onChange={(html) => …} onBlur={(html, { changed }) => …} />
//   useRichTextEditor(options)     the editor without the frame (build your own toolbar)
//   <RichTextToolbar editor />     the toolbar on its own
//   loadRichTextEngine()           the lazily loaded TipTap chunk (portal-rte.jsdbx)
//
// TipTap / ProseMirror are NOT in the main host bundle: they live in the portal-rte chunk, fetched
// with import() the first time an editor mounts (cached for the page). Until it arrives the editor
// shows its value read-only under a disabled toolbar, so nothing jumps when it becomes editable.
// Generic: no record or field logic (app/html-field adds that).

let enginePromise = null
let engineModule = null

/** Load the TipTap chunk once per page (retries after a failure). Resolves with { createEditor }. */
export function loadRichTextEngine() {
  if (engineModule) return Promise.resolve(engineModule)
  if (!enginePromise) {
    enginePromise = import(/* webpackChunkName: "portal-rte" */ "../../portal-rte")
      .then((mod) => {
        engineModule = mod
        return mod
      })
      .catch((error) => {
        enginePromise = null
        throw error
      })
  }
  return enginePromise
}

/** True once the TipTap chunk has loaded on this page. */
export function isRichTextEngineLoaded() {
  return !!engineModule
}

const EMPTY_DOC = /^<p>(<br\s*\/?>)?<\/p>$/i

/** The editor's HTML as a field value: sanitised, '' when empty. */
function outputHtml(editor) {
  if (!editor || editor.isEmpty) return ""
  const html = editor.getHTML()
  return EMPTY_DOC.test(html) ? "" : sanitizeHtml(html)
}

function useLatest(value) {
  const ref = React.useRef(value)
  ref.current = value
  return ref
}

/**
 * The editor, headless. Mount it with `ref={editor.mountRef}` on an empty element.
 *
 * options: { value, onChange(html), onFocus(), onBlur(html, { changed }), editable = true,
 *   placeholder, autofocus, attributes (for the contenteditable: id, aria-*), onImageFiles(files, { pos }),
 *   onShortcut(name) }
 * returns: { mountRef, editor, status: 'loading'|'ready'|'error', error, retry(), changed, focus() }
 *
 * `value` is controlled loosely: a value that differs from what the editor last emitted replaces the
 * content (without firing onChange). `changed` is true once the user edited since the last external
 * value, so callers can avoid writing back a merely normalised copy of the original HTML.
 */
export function useRichTextEditor(options = {}) {
  const { value = "", editable = true, placeholder, autofocus, attributes } = options
  const [state, setState] = React.useState(() => ({ status: engineModule ? "ready" : "loading", error: null }))
  const [editor, setEditor] = React.useState(null)
  const [, setTick] = React.useState(0)
  const [node, setNode] = React.useState(null)
  const [attempt, setAttempt] = React.useState(0)
  const lastHtml = React.useRef(value || "")
  const changed = React.useRef(false)
  const opts = useLatest(options)

  // Create the editor once the chunk and the mount node are there; destroy it on unmount.
  React.useEffect(() => {
    if (!node) return undefined
    let alive = true
    let instance = null
    loadRichTextEngine()
      .then((mod) => {
        if (!alive) return
        instance = mod.createEditor({
          element: node,
          content: lastHtml.current,
          editable,
          placeholder,
          autofocus,
          attributes: opts.current.attributes || {},
          sanitize: (html) => sanitizeHtml(html),
          isAllowedUri: (url) => safeUrl(url, "href") !== null,
          onImageFiles: (files, at) => (opts.current.onImageFiles ? opts.current.onImageFiles(files, at) : false),
          onShortcut: (name) => opts.current.onShortcut && opts.current.onShortcut(name),
          onUpdate: ({ editor: ed }) => {
            changed.current = true
            const html = outputHtml(ed)
            lastHtml.current = html
            if (opts.current.onChange) opts.current.onChange(html)
          },
          onTransaction: () => setTick((t) => (t + 1) % 1e9),
          onFocus: () => opts.current.onFocus && opts.current.onFocus(),
        })
        setEditor(instance)
        setState({ status: "ready", error: null })
      })
      .catch((error) => alive && setState({ status: "error", error }))
    return () => {
      alive = false
      if (instance) instance.destroy()
      setEditor(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, attempt])

  // External value changes replace the content (no onChange echo).
  React.useEffect(() => {
    const next = value || ""
    if (next === lastHtml.current) return
    lastHtml.current = next
    changed.current = false
    if (editor && !editor.isDestroyed) editor.commands.setContent(next, { emitUpdate: false })
  }, [value, editor])

  React.useEffect(() => {
    if (editor && !editor.isDestroyed && editor.isEditable !== editable) editor.setEditable(editable, false)
  }, [editor, editable])

  const attrKey = JSON.stringify(attributes || {})
  React.useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setOptions({ editorProps: { ...editor.options.editorProps, attributes: attributes || {} } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, attrKey])

  const retry = React.useCallback(() => {
    setState({ status: "loading", error: null })
    setAttempt((n) => n + 1)
  }, [])

  return {
    mountRef: setNode,
    editor,
    status: state.status === "ready" && !editor ? "loading" : state.status,
    error: state.error,
    retry,
    get changed() {
      return changed.current
    },
    markSaved() {
      changed.current = false
    },
    getHtml: () => (editor ? outputHtml(editor) : lastHtml.current),
    focus: () => editor && editor.commands.focus(),
  }
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "")
const MOD = isMac ? "⌘" : "Ctrl+"
const keys = (k) => k.replace(/Mod\+/g, MOD).replace(/Shift\+/g, isMac ? "⇧" : "Shift+").replace(/Alt\+/g, isMac ? "⌥" : "Alt+")
const ariaKeys = (k) => k.replace(/Mod\+/g, isMac ? "Meta+" : "Control+")

/** Block types in the "Paragraph / Heading" menu. */
const BLOCKS = [
  { value: "paragraph", label: "Paragraph", run: (c) => c.setParagraph(), active: (e) => e.isActive("paragraph"), shortcut: "Mod+Alt+0", className: "" },
  { value: "h1", label: "Heading 1", run: (c) => c.toggleHeading({ level: 1 }), active: (e) => e.isActive("heading", { level: 1 }), shortcut: "Mod+Alt+1", className: "text-lg font-semibold" },
  { value: "h2", label: "Heading 2", run: (c) => c.toggleHeading({ level: 2 }), active: (e) => e.isActive("heading", { level: 2 }), shortcut: "Mod+Alt+2", className: "text-base font-semibold" },
  { value: "h3", label: "Heading 3", run: (c) => c.toggleHeading({ level: 3 }), active: (e) => e.isActive("heading", { level: 3 }), shortcut: "Mod+Alt+3", className: "font-semibold" },
  { value: "h4", label: "Heading 4", run: (c) => c.toggleHeading({ level: 4 }), active: (e) => e.isActive("heading", { level: 4 }), shortcut: "Mod+Alt+4", className: "text-sm font-semibold" },
  { value: "codeBlock", label: "Code block", run: (c) => c.toggleCodeBlock(), active: (e) => e.isActive("codeBlock"), shortcut: "Mod+Alt+C", className: "font-mono text-xs" },
]

/** Toolbar buttons, in groups. `toggle` items show aria-pressed. */
const GROUPS = [
  [
    { key: "bold", label: "Bold", icon: BoldIcon, shortcut: "Mod+B", toggle: true, run: (c) => c.toggleBold(), active: (e) => e.isActive("bold"), can: (c) => c.toggleBold() },
    { key: "italic", label: "Italic", icon: ItalicIcon, shortcut: "Mod+I", toggle: true, run: (c) => c.toggleItalic(), active: (e) => e.isActive("italic"), can: (c) => c.toggleItalic() },
    { key: "underline", label: "Underline", icon: UnderlineIcon, shortcut: "Mod+U", toggle: true, run: (c) => c.toggleUnderline(), active: (e) => e.isActive("underline"), can: (c) => c.toggleUnderline() },
    { key: "strike", label: "Strikethrough", icon: StrikethroughIcon, shortcut: "Mod+Shift+S", toggle: true, run: (c) => c.toggleStrike(), active: (e) => e.isActive("strike"), can: (c) => c.toggleStrike() },
    { key: "code", label: "Inline code", icon: CodeIcon, shortcut: "Mod+E", toggle: true, run: (c) => c.toggleCode(), active: (e) => e.isActive("code"), can: (c) => c.toggleCode() },
  ],
  [
    { key: "bulletList", label: "Bulleted list", icon: ListIcon, shortcut: "Mod+Shift+8", toggle: true, run: (c) => c.toggleBulletList(), active: (e) => e.isActive("bulletList") },
    { key: "orderedList", label: "Numbered list", icon: ListOrderedIcon, shortcut: "Mod+Shift+7", toggle: true, run: (c) => c.toggleOrderedList(), active: (e) => e.isActive("orderedList") },
    { key: "blockquote", label: "Quote", icon: TextQuoteIcon, shortcut: "Mod+Shift+B", toggle: true, run: (c) => c.toggleBlockquote(), active: (e) => e.isActive("blockquote") },
  ],
  [
    { key: "link", label: "Link", icon: LinkIcon, shortcut: "Mod+K", toggle: true, dialog: "link", active: (e) => e.isActive("link") },
    { key: "image", label: "Image", icon: ImageIcon, dialog: "image" },
  ],
  [
    { key: "undo", label: "Undo", icon: Undo2Icon, shortcut: "Mod+Z", run: (c) => c.undo(), can: (c) => c.undo() },
    { key: "redo", label: "Redo", icon: Redo2Icon, shortcut: isMac ? "Mod+Shift+Z" : "Mod+Y", run: (c) => c.redo(), can: (c) => c.redo() },
  ],
]

const toolButton =
  "text-muted-foreground hover:text-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground data-[pressed]:bg-accent data-[pressed]:text-accent-foreground"

/**
 * The formatting toolbar (role=toolbar, one Tab stop, arrow keys / Home / End between items).
 * `onDialog(name)` opens the link or image dialog; `disabled` renders it inert (while loading).
 */
export const RichTextToolbar = React.forwardRef(function RichTextToolbar({ editor, disabled, onDialog, label = "Formatting", hide = [], className }, ref) {
  const [current, setCurrent] = React.useState(0)
  const rootRef = React.useRef(null)
  React.useImperativeHandle(ref, () => ({
    focus() {
      const items = rootRef.current ? Array.from(rootRef.current.querySelectorAll("[data-rte-item]:not([disabled])")) : []
      const el = items[Math.min(current, items.length - 1)] || items[0]
      if (el) el.focus()
    },
  }))
  const off = disabled || !editor
  const chain = () => editor.chain().focus()
  const can = (fn) => {
    if (off) return false
    if (!fn) return editor.isEditable
    try {
      return fn(editor.can().chain().focus()).run()
    } catch (e) {
      return false
    }
  }
  const block = !off ? BLOCKS.find((b) => b.active(editor)) || BLOCKS[0] : BLOCKS[0]

  const onKeyDown = (e) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(e.key) < 0) return
    const items = Array.from(rootRef.current.querySelectorAll("[data-rte-item]:not([disabled])"))
    const i = items.indexOf(e.target.closest("[data-rte-item]"))
    if (i < 0) return
    e.preventDefault()
    const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length
    items[next].focus()
  }
  // Roving tab index: the last focused item keeps the Tab stop.
  let index = -1
  const stop = () => {
    index += 1
    return index
  }
  const itemProps = (i) => ({
    "data-rte-item": "",
    tabIndex: i === current ? 0 : -1,
    onFocus: () => setCurrent(i),
  })

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label={label}
      aria-disabled={off || undefined}
      onKeyDown={onKeyDown}
      className={cn("flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/40 p-1", className)}
      data-slot="rich-text-toolbar"
    >
      {hide.indexOf("block") < 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="ghost" size="sm" className={cn(toolButton, "w-[7.5rem] justify-between px-2 font-normal")} disabled={off} aria-label={`Text style: ${block.label}`} title="Text style" {...itemProps(stop())} />}
          >
            <span className="truncate">{block.label}</span>
            <ChevronDownIcon aria-hidden="true" className="size-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-44">
            <DropdownMenuRadioGroup value={block.value} onValueChange={(v) => {
              const b = BLOCKS.find((x) => x.value === v)
              if (b && editor) b.run(chain()).run()
            }}>
              {BLOCKS.map((b) => (
                <DropdownMenuRadioItem key={b.value} value={b.value} className={b.className}>
                  {b.label}
                  <span className="ml-auto pl-4 text-xs font-normal text-muted-foreground">{keys(b.shortcut)}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {GROUPS.map((group, g) => {
        const items = group.filter((it) => hide.indexOf(it.key) < 0)
        if (!items.length) return null
        return (
          <React.Fragment key={g}>
            <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
            {items.map((it) => {
              const Icon = it.icon
              const pressed = it.toggle && !off && it.active ? !!it.active(editor) : undefined
              const enabled = !off && (it.dialog ? editor.isEditable : can(it.can))
              const title = it.shortcut ? `${it.label} (${keys(it.shortcut)})` : it.label
              return (
                <Button
                  key={it.key}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={toolButton}
                  aria-label={it.label}
                  aria-pressed={it.toggle ? !!pressed : undefined}
                  aria-haspopup={it.dialog ? "dialog" : undefined}
                  aria-keyshortcuts={it.shortcut ? ariaKeys(it.shortcut) : undefined}
                  title={title}
                  disabled={!enabled}
                  data-rte-action={it.key}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (it.dialog) onDialog && onDialog(it.dialog)
                    else it.run(chain()).run()
                  }}
                  {...itemProps(stop())}
                >
                  <Icon aria-hidden="true" />
                </Button>
              )
            })}
          </React.Fragment>
        )
      })}
    </div>
  )
})

const inputClass =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"

/** "example.com" → "https://example.com"; null when the URL isn't allowed. */
function normalizeHref(text) {
  const t = String(text || "").trim()
  if (!t) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) || /^[/#?.]/.test(t) ? t : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? `mailto:${t}` : `https://${t}`
  return safeUrl(withScheme, "href")
}

function LinkDialog({ editor, open, onOpenChange }) {
  const [href, setHref] = React.useState("")
  const [text, setText] = React.useState("")
  const [error, setError] = React.useState("")
  const [hasSelection, setHasSelection] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const id = React.useId()
  React.useEffect(() => {
    if (!open || !editor) return
    const current = editor.getAttributes("link").href || ""
    setHref(current)
    setEditing(!!current)
    setText("")
    setError("")
    setHasSelection(!editor.state.selection.empty || editor.isActive("link"))
  }, [open, editor])
  const close = () => onOpenChange(false)
  const save = (e) => {
    e.preventDefault()
    const url = normalizeHref(href)
    if (!url) {
      setError(href.trim() ? "Use a web, mail or phone link (http, https, mailto, tel) or a relative URL." : "Enter a URL.")
      return
    }
    const c = editor.chain().focus()
    if (hasSelection) c.extendMarkRange("link").setLink({ href: url }).run()
    else c.insertContent({ type: "text", text: text.trim() || url, marks: [{ type: "link", attrs: { href: url } }] }).run()
    close()
  }
  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
    close()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-rte-dialog="link">
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit link" : "Insert link"}</DialogTitle>
            <DialogDescription>Links open in a new tab when they point to another site.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-href`} className="text-sm font-medium">URL</label>
            <input
              id={`${id}-href`}
              className={inputClass}
              value={href}
              autoFocus
              inputMode="url"
              placeholder="https://example.com"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-err` : undefined}
              onChange={(e) => {
                setHref(e.target.value)
                setError("")
              }}
            />
            {error ? <p id={`${id}-err`} role="alert" className="text-xs text-destructive">{error}</p> : null}
          </div>
          {!hasSelection ? (
            <div className="grid gap-1.5">
              <label htmlFor={`${id}-text`} className="text-sm font-medium">Text <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id={`${id}-text`} className={inputClass} value={text} placeholder="Shown instead of the URL" onChange={(e) => setText(e.target.value)} />
            </div>
          ) : null}
          <DialogFooter>
            {editing ? (
              <Button type="button" variant="destructive" className="sm:mr-auto" onClick={remove}>Remove link</Button>
            ) : null}
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button type="submit">{editing ? "Update" : "Insert"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ImageDialog({ editor, open, onOpenChange, onUpload }) {
  const [src, setSrc] = React.useState("")
  const [alt, setAlt] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const fileRef = React.useRef(null)
  const id = React.useId()
  React.useEffect(() => {
    if (!open) return
    const current = editor && editor.isActive("image") ? editor.getAttributes("image") : {}
    setSrc(current.src || "")
    setAlt(current.alt || "")
    setError("")
    setBusy(false)
  }, [open, editor])
  const close = () => onOpenChange(false)
  const insert = (url, altText) => {
    editor.chain().focus().setImage({ src: url, alt: altText || undefined }).run()
    close()
  }
  const save = (e) => {
    e.preventDefault()
    const t = src.trim()
    const url = safeUrl(/^[a-z][a-z0-9+.-]*:/i.test(t) || /^[/.]/.test(t) ? t : t ? `https://${t}` : "", "src", { allowDataImages: false })
    if (!url) {
      setError(t ? "Use an http(s) or relative image URL." : "Enter an image URL.")
      return
    }
    insert(url, alt.trim())
  }
  const upload = async (file) => {
    if (!file || !onUpload) return
    if (!/^image\//.test(file.type)) {
      setError("Choose an image file.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const r = await onUpload(file)
      insert(r.src, alt.trim() || r.alt || "")
    } catch (err) {
      setError((err && err.message) || "Upload failed.")
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-rte-dialog="image">
        <form onSubmit={save} className="grid gap-4" aria-busy={busy || undefined}>
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
            <DialogDescription>{onUpload ? "Link to an image, or upload one to this record's attachments." : "Link to an image by URL."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-src`} className="text-sm font-medium">Image URL</label>
            <input
              id={`${id}-src`}
              className={inputClass}
              value={src}
              autoFocus
              inputMode="url"
              placeholder="https://example.com/picture.png"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-err` : undefined}
              onChange={(e) => {
                setSrc(e.target.value)
                setError("")
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-alt`} className="text-sm font-medium">Alternative text</label>
            <input id={`${id}-alt`} className={inputClass} value={alt} placeholder="Describe the image for screen readers" onChange={(e) => setAlt(e.target.value)} />
          </div>
          {error ? <p id={`${id}-err`} role="alert" className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            {onUpload ? (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => upload(e.target.files && e.target.files[0])} />
                <Button type="button" variant="outline" className="sm:mr-auto" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}>
                  <UploadIcon aria-hidden="true" />
                  {busy ? "Uploading…" : "Upload"}
                </Button>
              </>
            ) : null}
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button type="submit" disabled={busy}>Insert</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Rich-text editor with an HTML value.
 *
 * Props:
 *   value, onChange(html)           HTML in / out ('' when empty); output is sanitised
 *   onBlur(html, { changed })       focus left the editor (toolbar and its dialogs count as inside)
 *   onFocus()
 *   readOnly                        render the value (components:rich-text), no toolbar
 *   disabled                        inert editor and toolbar
 *   placeholder, autoFocus, invalid, required
 *   id, aria-label, aria-labelledby, aria-describedby   wired to the contenteditable (role=textbox)
 *   minHeight / maxHeight           content area bounds (CSS lengths; default 8rem / 32rem)
 *   onUploadImage(file) → Promise<{ src, alt? }>   paste / drop / Upload images; without it images are URL-only
 *   toolbarHide                     item keys to hide ('block', 'bold', …, 'image', 'undo')
 *   notice                          extra content above the toolbar (e.g. "editing simplifies tables")
 *   className, contentClassName
 */
export function RichTextEditor(props) {
  const {
    value = "",
    onChange,
    onBlur,
    onFocus,
    readOnly,
    disabled,
    placeholder,
    autoFocus,
    invalid,
    required,
    id,
    minHeight = "8rem",
    maxHeight = "32rem",
    onUploadImage,
    toolbarHide,
    notice,
    className,
    contentClassName,
  } = props
  const [dialog, setDialog] = React.useState(null)
  const [status, setStatus] = React.useState("")
  const toolbarRef = React.useRef(null)
  const rootRef = React.useRef(null)
  const uploadRef = useLatest(onUploadImage)

  const editable = !readOnly && !disabled
  const attributes = {
    id: id || undefined,
    role: "textbox",
    "aria-multiline": "true",
    "aria-label": props["aria-label"] || undefined,
    "aria-labelledby": props["aria-labelledby"] || undefined,
    "aria-describedby": props["aria-describedby"] || undefined,
    "aria-invalid": invalid ? "true" : undefined,
    "aria-required": required ? "true" : undefined,
    "aria-readonly": !editable ? "true" : undefined,
    class: cn("rp-prose rp-rte-content min-w-0 px-3 py-2 outline-none", contentClassName),
  }
  Object.keys(attributes).forEach((k) => attributes[k] === undefined && delete attributes[k])

  const insertUploads = (files, at) => {
    const upload = uploadRef.current
    if (!upload) {
      setStatus("Images can only be added by URL here (Image button).")
      return true
    }
    let pos = at && typeof at.pos === "number" ? at.pos : null
    setStatus(files.length > 1 ? `Uploading ${files.length} images…` : "Uploading image…")
    Promise.all(
      files.map((file) =>
        upload(file).then(
          (r) => ({ ok: true, r, file }),
          (error) => ({ ok: false, error, file })
        )
      )
    ).then((results) => {
      const ed = rte.editor
      const failed = results.filter((x) => !x.ok)
      results.forEach((x) => {
        if (!x.ok || !ed || ed.isDestroyed) return
        const node = { type: "image", attrs: { src: x.r.src, alt: x.r.alt || x.file.name.replace(/\.[a-z0-9]+$/i, "") } }
        if (pos !== null) ed.chain().focus().insertContentAt(Math.min(pos, ed.state.doc.content.size), node).run()
        else ed.chain().focus().insertContent(node).run()
        pos = null
      })
      setStatus(failed.length ? `Upload failed: ${(failed[0].error && failed[0].error.message) || failed[0].file.name}` : results.length > 1 ? `${results.length} images uploaded.` : "Image uploaded.")
    })
    return true
  }

  const rte = useRichTextEditor({
    value,
    editable,
    placeholder,
    autofocus: autoFocus ? "end" : false,
    attributes,
    onChange,
    onFocus,
    onImageFiles: insertUploads,
    onShortcut: (name) => {
      if (!editable) return
      if (name === "link" && !(toolbarHide && toolbarHide.indexOf("link") >= 0)) setDialog("link")
      if (name === "toolbar" && toolbarRef.current) toolbarRef.current.focus()
    },
  })

  // Blur = focus left the root and isn't in one of our dialogs.
  const onBlurCapture = (e) => {
    const next = e.relatedTarget
    if (dialog) return
    if (next && rootRef.current && rootRef.current.contains(next)) return
    if (next && next.closest && next.closest("[data-rte-dialog]")) return
    if (onBlur) onBlur(rte.getHtml(), { changed: rte.changed })
  }
  const closeDialog = (open) => {
    if (open) return
    setDialog(null)
    // The editor keeps its selection; give it focus back (Base UI returns focus to the trigger first).
    requestAnimationFrame(() => {
      if (rte.editor && !rte.editor.isDestroyed) rte.editor.commands.focus()
    })
  }

  if (readOnly) {
    return (
      <RichText
        html={value}
        id={id}
        role="textbox"
        aria-readonly="true"
        aria-multiline="true"
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={props["aria-describedby"]}
        tabIndex={0}
        className={cn("rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", className)}
      />
    )
  }

  const loading = rte.status === "loading"
  const failed = rte.status === "error"
  return (
    <div
      ref={rootRef}
      data-slot="rich-text-editor"
      data-status={rte.status}
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      onBlur={onBlurCapture}
      className={cn(
        "rp-rte flex w-full min-w-0 flex-col overflow-hidden rounded-md border border-input bg-background text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color]",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        invalid ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/30" : "",
        disabled ? "cursor-not-allowed opacity-50" : "",
        className
      )}
    >
      {notice ? <div className="border-b border-input bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">{notice}</div> : null}
      {failed ? null : <RichTextToolbar ref={toolbarRef} editor={rte.editor} disabled={loading || disabled} onDialog={setDialog} hide={toolbarHide || []} />}
      <div className="relative min-w-0 overflow-y-auto" style={{ minHeight, maxHeight }}>
        {loading ? (
          <div aria-busy="true" className="pointer-events-none">
            {isHtmlEmpty(value) ? (
              <p className="px-3 py-2 text-muted-foreground">{placeholder || " "}</p>
            ) : (
              <RichText html={value} className="px-3 py-2 opacity-70" />
            )}
            <span role="status" className="sr-only">Loading the editor</span>
          </div>
        ) : null}
        {failed ? (
          <div className="flex flex-col gap-2 p-2">
            <p role="alert" className="text-xs text-destructive">
              The rich-text editor didn’t load ({String((rte.error && rte.error.message) || rte.error)}). You can edit the HTML directly.{" "}
              <button type="button" className="font-medium underline underline-offset-2" onClick={rte.retry}>Retry</button>
            </p>
            <textarea
              id={id}
              aria-label={props["aria-label"]}
              aria-labelledby={props["aria-labelledby"]}
              aria-describedby={props["aria-describedby"]}
              aria-invalid={invalid || undefined}
              className="min-h-32 w-full resize-y rounded-md border border-input bg-background p-2 font-mono text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              defaultValue={value}
              disabled={disabled}
              onChange={(e) => onChange && onChange(e.target.value)}
            />
          </div>
        ) : null}
        <div ref={rte.mountRef} className={cn(loading || failed ? "hidden" : "", "min-h-[inherit]")} data-rte-mount="" onClick={(e) => {
          // Clicking the empty area below the text focuses the editor.
          if (e.target === e.currentTarget && rte.editor) rte.editor.commands.focus("end")
        }} />
      </div>
      <span role="status" aria-live="polite" className={status ? "border-t border-input px-3 py-1 text-xs text-muted-foreground" : "sr-only"}>{status}</span>
      {rte.editor ? <LinkDialog editor={rte.editor} open={dialog === "link"} onOpenChange={closeDialog} /> : null}
      {rte.editor ? <ImageDialog editor={rte.editor} open={dialog === "image"} onOpenChange={closeDialog} onUpload={onUploadImage} /> : null}
    </div>
  )
}

export { findUnsupportedHtml, sanitizeHtml }
