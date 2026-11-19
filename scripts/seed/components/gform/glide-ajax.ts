import { authHeaders } from 'utilities:app/graphql'

/**
 * GlideAjax for client scripts: the classic processor protocol Workspace itself uses
 * (window.GlideAjax → POST /xmlhttp.do, form-encoded, answer in <xml answer="…"/>).
 *
 *   var ga = new GlideAjax('MyScriptInclude'); ga.addParam('sysparm_name', 'fn'); ga.getXMLAnswer(cb)
 *
 * getXML(cb) passes a response object with responseXML (a parsed Document) and responseText;
 * getXMLAnswer(cb) passes the answer attribute. getXMLWait (synchronous) is not supported.
 */

export type GlideAjaxOptions = { wrap?: <F extends (...a: any[]) => any>(fn: F) => F }

function warn(msg: string) {
    // eslint-disable-next-line no-console
    console.warn(`(GlideAjax) ${msg}`)
}

export function createGlideAjaxClass(options: GlideAjaxOptions = {}) {
    const wrap = options.wrap || (<F,>(fn: F) => fn)
    class GlideAjax {
        private params: Record<string, string>
        private answer: string | null = null
        constructor(processor: string) {
            this.params = { sysparm_processor: String(processor || ''), sysparm_scope: 'global', sysparm_want_session_messages: 'true' }
        }
        addParam(name: string, value: unknown) {
            this.params[String(name)] = value == null ? '' : String(value)
        }
        getParam(name: string) {
            return this.params[name]
        }
        setScope(scope: string) {
            this.params.sysparm_scope = String(scope || 'global')
        }
        getAnswer() {
            return this.answer
        }
        private send(): Promise<{ responseXML: Document | null; responseText: string; answer: string | null }> {
            const headers = authHeaders(false)
            headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
            headers.Accept = 'text/xml, application/xml, */*'
            return fetch('/xmlhttp.do', { method: 'POST', credentials: 'same-origin', headers, body: new URLSearchParams(this.params).toString() })
                .then((r) => r.text().then((text) => ({ ok: r.ok, status: r.status, text })))
                .then(({ ok, status, text }) => {
                    if (!ok) throw new Error(`GlideAjax ${this.params.sysparm_processor}.${this.params.sysparm_name || ''}: HTTP ${status}`)
                    let doc: Document | null = null
                    try {
                        doc = new DOMParser().parseFromString(text, 'text/xml')
                    } catch (e) {
                        doc = null
                    }
                    const root = doc && doc.documentElement
                    const answer = root && root.hasAttribute('answer') ? root.getAttribute('answer') : null
                    this.answer = answer
                    return { responseXML: doc, responseText: text, answer }
                })
        }
        getXML(callback?: (response: any, extra?: unknown) => void, extra?: unknown) {
            if (typeof callback !== 'function') return warn('getXML needs a callback')
            const cb = wrap(callback)
            this.send().then(
                (res) => cb(res, extra),
                (e) => {
                    warn(String((e && e.message) || e))
                    cb({ responseXML: null, responseText: '', answer: null }, extra)
                },
            )
        }
        getXMLAnswer(callback?: (answer: string | null, extra?: unknown) => void, extra?: unknown) {
            if (typeof callback !== 'function') return warn('getXMLAnswer needs a callback')
            const cb = wrap(callback)
            this.send().then(
                (res) => cb(res.answer, extra),
                (e) => {
                    warn(String((e && e.message) || e))
                    cb(null, extra)
                },
            )
        }
        getXMLWait() {
            warn('getXMLWait (synchronous) is not supported; use getXMLAnswer(callback)')
            return null
        }
    }
    return GlideAjax
}
