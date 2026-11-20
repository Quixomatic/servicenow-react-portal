import { useCallback, useEffect, useRef, useState } from 'react'
import { filesFromTransfer, acceptAttribute } from './files'

/**
 * Headless file-picking hooks (no markup): build any drop zone, button or paste target on them.
 *
 *   const drop = useFileDrop({ onFiles, multiple: true, extensions })
 *   <div {...drop.rootProps} data-dragging={drop.dragging || undefined}>
 *     <input {...drop.inputProps} />
 *     <button type="button" onClick={drop.open}>Browse</button>
 *   </div>
 *
 *   usePasteFiles(ref, onFiles)        Ctrl/⌘+V with files while focus is inside `ref`
 *   usePasteFiles('window', onFiles)   …anywhere on the page, except in text inputs / editors
 */

export type UseFileDropOptions = {
    onFiles: (files: File[]) => void
    disabled?: boolean
    multiple?: boolean
    /** Allowed extensions for the picker's `accept` (validation still happens in validateFiles). */
    extensions?: string[]
}

function hasFiles(e: DragEvent | any): boolean {
    const types = e && e.dataTransfer && e.dataTransfer.types
    return !!types && Array.from(types as ArrayLike<string>).indexOf('Files') >= 0
}

export function useFileDrop(options: UseFileDropOptions) {
    const [dragging, setDragging] = useState(false)
    const depth = useRef(0)
    const input = useRef<HTMLInputElement | null>(null)
    const opts = useRef(options)
    opts.current = options

    const open = useCallback(() => {
        if (!opts.current.disabled && input.current) input.current.click()
    }, [])

    const rootProps = {
        onDragEnter: (e: any) => {
            if (!hasFiles(e)) return
            e.preventDefault()
            depth.current++
            if (!opts.current.disabled) setDragging(true)
        },
        onDragOver: (e: any) => {
            if (!hasFiles(e)) return
            e.preventDefault()
            if (e.dataTransfer) e.dataTransfer.dropEffect = opts.current.disabled ? 'none' : 'copy'
        },
        onDragLeave: (e: any) => {
            if (!hasFiles(e)) return
            depth.current = Math.max(0, depth.current - 1)
            if (!depth.current) setDragging(false)
        },
        onDrop: (e: any) => {
            if (!hasFiles(e)) return
            e.preventDefault()
            depth.current = 0
            setDragging(false)
            // Nested drop targets (a drop zone inside a droppable panel): the innermost one takes the
            // files; outer ones only reset their drag state (the event still bubbles for that).
            const native = e.nativeEvent || e
            if (native.__rpFilesTaken) return
            if (opts.current.disabled) return
            native.__rpFilesTaken = true
            const files = filesFromTransfer(e.dataTransfer)
            if (files.length) opts.current.onFiles(opts.current.multiple === false ? files.slice(0, 1) : files)
        },
    }

    const inputProps = {
        ref: input,
        type: 'file',
        multiple: options.multiple !== false,
        accept: acceptAttribute(options.extensions),
        disabled: options.disabled,
        tabIndex: -1,
        'aria-hidden': true,
        className: 'sr-only',
        style: { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' } as any,
        onChange: (e: any) => {
            const files = Array.from((e.target.files || []) as ArrayLike<File>)
            // Reset so choosing the same file again fires change.
            e.target.value = ''
            if (files.length) opts.current.onFiles(files)
        },
    }

    return { dragging, open, rootProps, inputProps, inputRef: input }
}

function isEditable(el: any): boolean {
    if (!el || !el.tagName) return false
    const tag = String(el.tagName).toLowerCase()
    if (tag === 'textarea') return true
    if (tag === 'input') return ['text', 'search', 'email', 'url', 'tel', 'password', 'number', ''].indexOf(String(el.type || '').toLowerCase()) >= 0
    return !!el.isContentEditable
}

/**
 * Files pasted (Ctrl/⌘+V) while focus is inside `scope` (a ref), or anywhere ('window'). Pastes
 * into text fields and rich-text editors are left alone (the HTML field takes its own images).
 */
export function usePasteFiles(scope: { current: HTMLElement | null } | 'window', onFiles: (files: File[]) => void, enabled = true): void {
    const cb = useRef(onFiles)
    cb.current = onFiles
    useEffect(() => {
        if (!enabled) return
        const handler = (e: ClipboardEvent) => {
            const path = (e.composedPath ? e.composedPath() : []) as any[]
            const origin = path[0] || e.target
            if (isEditable(origin)) return
            if (scope !== 'window') {
                const root = scope.current
                if (!root || path.indexOf(root) < 0) return
            }
            const files = filesFromTransfer(e.clipboardData)
            if (!files.length) return
            e.preventDefault()
            cb.current(files)
        }
        // window: paste events from inside the portal's shadow root bubble (composed) up to it.
        window.addEventListener('paste', handler as any)
        return () => window.removeEventListener('paste', handler as any)
    }, [enabled, scope])
}
