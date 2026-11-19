import { send, wrap } from './http.ts'
import { lucideSpriteJson } from '../icons/lucide-sprite.ts'
import { LUCIDE_VERSION } from '../icons/lucide-names.ts'

/**
 * GET /api/x_312987_portal/rp/icons/lucide: the lucide sprite as raw JSON
 * { version, icons: { name: innerSvgMarkup }, aliases: { alias: name } } for the classic-form
 * icon picker. Its own module so no other route loads the ~420 KB sprite. The URL has no file
 * extension on purpose (the platform 404s /api URLs whose last segment looks like a file).
 */
export function iconSpriteRoute(request: any, response: any): void {
    let cid = ''
    try {
        const req = wrap(request)
        cid = req.correlationId
        const etag = `"lucide-${LUCIDE_VERSION}"`
        response.setHeader('ETag', etag)
        response.setHeader('Cache-Control', 'private, max-age=86400')
        response.setHeader('X-Content-Type-Options', 'nosniff')
        if (req.header('If-None-Match') === etag) {
            response.setStatus(304)
            return
        }
        response.setStatus(200)
        response.setContentType('application/json; charset=utf-8')
        response.getStreamWriter().writeString(lucideSpriteJson())
    } catch (e) {
        send(response, 500, { error: { status: 500, code: 'internal_error', message: 'Could not load the icon sprite' }, meta: { correlationId: cid } })
    }
}
