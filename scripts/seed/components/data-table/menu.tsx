import { useEffect, useRef } from 'react'
import { Popup } from 'components:app/combobox'
import { cx } from 'components:app/field'

export type MenuItem =
    | { type?: 'item'; id: string; label: string; onSelect: () => void; disabled?: boolean; hint?: string; icon?: any; destructive?: boolean }
    | { type: 'separator'; id: string }
    | { type: 'label'; id: string; label: string }

/**
 * A context menu at a point (right-click, Shift+F10, the Menu key): WAI-ARIA menu with roving
 * focus (↑/↓/Home/End, typeahead), Enter/Space to run, Escape or Tab to close. Rendered in the
 * top layer so table scrollers and cards never clip it.
 */
export function PointMenu(props: { open: boolean; x: number; y: number; items: MenuItem[]; onClose: (refocus: boolean) => void; label?: string }) {
    const anchor = useRef<HTMLSpanElement | null>(null)
    const menu = useRef<HTMLDivElement | null>(null)
    const actionable = props.items.filter((i) => (i.type || 'item') === 'item' && !(i as any).disabled) as any[]

    useEffect(() => {
        if (!props.open) return undefined
        const id = requestAnimationFrame(() => {
            const first = menu.current && (menu.current.querySelector('[role="menuitem"]:not([aria-disabled="true"])') as HTMLElement | null)
            if (first) first.focus()
        })
        return () => cancelAnimationFrame(id)
    }, [props.open, props.x, props.y])

    const move = (dir: number | 'first' | 'last') => {
        const nodes = Array.from((menu.current && menu.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')) || []) as HTMLElement[]
        if (!nodes.length) return
        const root = menu.current!.getRootNode() as any
        const i = nodes.indexOf(root.activeElement)
        const next = dir === 'first' ? 0 : dir === 'last' ? nodes.length - 1 : (i + (dir as number) + nodes.length) % nodes.length
        nodes[next].focus()
    }
    const onKeyDown = (e: any) => {
        if (e.key === 'ArrowDown') move(1)
        else if (e.key === 'ArrowUp') move(-1)
        else if (e.key === 'Home') move('first')
        else if (e.key === 'End') move('last')
        else if (e.key === 'Escape') props.onClose(true)
        else if (e.key === 'Tab') props.onClose(false)
        else if (e.key.length === 1 && /\S/.test(e.key)) {
            const hit = actionable.find((i) => i.label.toLowerCase().startsWith(e.key.toLowerCase()))
            const node = hit && menu.current && (menu.current.querySelector(`[data-id="${hit.id}"]`) as HTMLElement | null)
            if (node) node.focus()
        } else return
        e.preventDefault()
        e.stopPropagation()
    }

    return (
        <>
            <span ref={anchor} aria-hidden="true" style={{ position: 'fixed', left: props.x, top: props.y, width: 1, height: 1, pointerEvents: 'none' }} />
            <Popup anchor={anchor} open={props.open} onDismiss={() => props.onClose(false)} matchWidth={false} minWidth={220} maxHeight={420}>
                <div ref={menu} role="menu" aria-label={props.label || 'Actions'} onKeyDown={onKeyDown} className="flex flex-col py-0.5">
                    {props.items.map((item) => {
                        if (item.type === 'separator') return <div key={item.id} role="separator" className="-mx-1 my-1 h-px bg-border" />
                        if (item.type === 'label')
                            return (
                                <div key={item.id} role="presentation" className="truncate px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                                    {item.label}
                                </div>
                            )
                        const it = item as any
                        return (
                            <div
                                key={it.id}
                                data-id={it.id}
                                role="menuitem"
                                tabIndex={-1}
                                aria-disabled={it.disabled || undefined}
                                className={cx(
                                    'flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground',
                                    it.disabled ? 'pointer-events-none opacity-50' : '',
                                    it.destructive ? 'text-destructive focus:text-destructive' : '',
                                )}
                                onClick={() => {
                                    if (it.disabled) return
                                    props.onClose(false)
                                    it.onSelect()
                                }}
                                onKeyDown={(e: any) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (it.disabled) return
                                        props.onClose(false)
                                        it.onSelect()
                                    }
                                }}
                            >
                                {it.icon ? <span className="flex size-4 items-center justify-center text-muted-foreground">{it.icon}</span> : null}
                                <span className="min-w-0 flex-1 truncate">{it.label}</span>
                                {it.hint ? <span className="ml-4 truncate text-xs text-muted-foreground">{it.hint}</span> : null}
                            </div>
                        )
                    })}
                </div>
            </Popup>
        </>
    )
}
