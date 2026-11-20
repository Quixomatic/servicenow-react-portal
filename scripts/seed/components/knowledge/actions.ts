/** Article actions: print (a clean print window), copy link, share. */
import { sanitizeHtml } from 'components:rich-text'

function esc(s: string) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

/** The current page URL (the article's own link: the platform owns the URL, so it already names the article). */
export function articleUrl(): string {
    return typeof window !== 'undefined' ? window.location.href : ''
}

/** Copy text to the clipboard; resolves false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (e) {
        try {
            const ta = document.createElement('textarea')
            ta.value = text
            ta.setAttribute('readonly', '')
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            const ok = document.execCommand('copy')
            ta.remove()
            return ok
        } catch (e2) {
            return false
        }
    }
}

/** Whether the Web Share API is available (mobile browsers, some desktops). */
export function canShare(): boolean {
    return typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function'
}

/** Share through the OS share sheet; falls back to copying the link. Resolves 'shared' | 'copied' | 'failed' | 'cancelled'. */
export async function shareArticle(a: { title: string; number?: string }, url = articleUrl()): Promise<'shared' | 'copied' | 'failed' | 'cancelled'> {
    if (canShare()) {
        try {
            await (navigator as any).share({ title: a.title, text: a.number ? a.number + ': ' + a.title : a.title, url })
            return 'shared'
        } catch (e: any) {
            if (e && e.name === 'AbortError') return 'cancelled'
        }
    }
    return (await copyText(url)) ? 'copied' : 'failed'
}

/**
 * Print the article alone: a new window with the sanitised body in print typography (the portal's
 * shell, menus and widgets stay out of the printout), then the browser's print dialog.
 */
export function printArticle(a: { title: string; number?: string; kb?: string; category?: string; author?: string; updated?: string; html: string }): boolean {
    const w = window.open('', '_blank', 'noopener=no,width=900,height=1000')
    if (!w) {
        window.print()
        return false
    }
    const meta = [a.number, a.kb, a.category, a.author, a.updated ? 'Updated ' + a.updated : ''].filter(Boolean).map(esc).join(' · ')
    const body = sanitizeHtml(a.html || '')
    w.document.open()
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(a.title)}</title><base href="${esc(location.origin)}/">
<style>
  @page { margin: 18mm 16mm; }
  body { font: 11pt/1.6 Georgia, 'Times New Roman', serif; color: #111; max-width: 720px; margin: 24px auto; padding: 0 16px; }
  header { border-bottom: 1px solid #ccc; margin-bottom: 18px; padding-bottom: 10px; }
  header h1 { font: 600 20pt/1.25 system-ui, sans-serif; margin: 0 0 6px; }
  header p { font: 9pt system-ui, sans-serif; color: #555; margin: 0; }
  h1, h2, h3, h4 { font-family: system-ui, sans-serif; line-height: 1.3; break-after: avoid; }
  img { max-width: 100%; height: auto; }
  pre, code { font-family: ui-monospace, Consolas, monospace; font-size: 9pt; }
  pre { white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; }
  table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; vertical-align: top; }
  a { color: inherit; } a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 8pt; color: #555; }
</style></head><body><header><h1>${esc(a.title)}</h1><p>${meta}</p></header><main>${body}</main></body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => {
        try {
            w.print()
        } catch (e) {
            /* closed */
        }
    }, 350)
    return true
}
