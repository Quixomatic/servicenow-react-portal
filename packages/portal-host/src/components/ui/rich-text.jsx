import * as React from 'react';
import { cn } from 'cn';

// components:rich-text: a read-only HTML renderer and the allow-list sanitiser behind it (also used
// by components:rich-text-editor on paste and on output). Generic: no record or field logic.
//
//   <RichText html={value} />                 sanitised, themed (rp-prose) block
//   sanitizeHtml(html, options?)              allow-listed tags/attributes, safe URLs, safe links
//   htmlToText(html) / isHtmlEmpty(html)      plain text (lists, counters) / "nothing to show"
//   findUnsupportedHtml(html)                 formatting the editor's schema would drop
//
// The sanitiser parses with DOMParser (an inert document: no scripts run, no images load, no event
// handlers fire), walks the tree and serialises what survives. It never uses innerHTML on a live
// element with untrusted input.

/** Tags kept as they are (attributes still filtered). */
const ALLOWED_TAGS = new Set(
    'a abbr b bdi bdo blockquote br caption cite code col colgroup dd del dfn div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img ins kbd li mark ol p pre q s samp small span strike strong sub sup table tbody td tfoot th thead time tr u ul var wbr'.split(
        ' '
    )
);

/** Tags removed together with their content (never unwrapped: their text is code, not prose). */
const DROP_TAGS = new Set(
    'script style template noscript iframe frame frameset object embed applet svg math head title meta link base form input button select textarea option optgroup datalist video audio source track canvas map area portal slot dialog'.split(
        ' '
    )
);

/** Attributes kept on any allowed tag. */
const GLOBAL_ATTRS = new Set(['title', 'lang', 'dir']);

/** Extra attributes per tag. */
const TAG_ATTRS = {
    a: new Set(['href', 'target', 'rel', 'name']),
    img: new Set(['src', 'alt', 'width', 'height']),
    ol: new Set(['start', 'reversed']),
    td: new Set(['colspan', 'rowspan', 'headers']),
    th: new Set(['colspan', 'rowspan', 'scope', 'headers', 'abbr']),
    col: new Set(['span']),
    colgroup: new Set(['span']),
    time: new Set(['datetime']),
    q: new Set(['cite']),
    blockquote: new Set(['cite']),
    del: new Set(['datetime']),
    ins: new Set(['datetime']),
};

/** Inline style properties kept (layout only: colours and fonts follow the theme). */
const STYLE_PROPS = new Set(['text-align']);

const HREF_SCHEMES = ['http', 'https', 'mailto', 'tel'];
const SRC_SCHEMES = ['http', 'https'];
const DATA_IMAGE = /^data:image\/(png|gif|jpe?g|webp|avif);base64,[a-z0-9+/=\s]+$/i;
// Platform pages stored as relative URLs ("sys_attachment.do?sys_id=…") resolve against the portal
// URL; make them root-relative so they still reach the platform.
const PLATFORM_RELATIVE = /^[a-z0-9_]+\.do([?#]|$)/i;

/**
 * Normalise and check a URL attribute. Returns the safe URL, or null to drop the attribute.
 * Relative URLs are allowed; absolute ones need an allowed scheme (no javascript:, vbscript:,
 * data: except base64 raster images in img src, file:, blob:…).
 */
export function safeUrl(value, kind = 'href', options = {}) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return null;
    // Browsers ignore tabs/newlines and leading control characters inside the scheme ("java\nscript:").
    const probe = raw.replace(/[\u0000- \u007f-\u009f]/g, '');
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(probe);
    if (scheme) {
        const s = scheme[1].toLowerCase();
        if (kind === 'src') {
            if (s === 'data') return options.allowDataImages !== false && DATA_IMAGE.test(raw) ? raw : null;
            return SRC_SCHEMES.indexOf(s) >= 0 ? raw : null;
        }
        return HREF_SCHEMES.indexOf(s) >= 0 ? raw : null;
    }
    if (probe.indexOf('\\') >= 0) return null;
    if (PLATFORM_RELATIVE.test(raw)) return '/' + raw;
    return raw;
}

function isExternal(href) {
    return /^(https?:)?\/\//i.test(href);
}

function cleanStyle(text) {
    const kept = [];
    String(text || '')
        .split(';')
        .forEach((decl) => {
            const i = decl.indexOf(':');
            if (i < 0) return;
            const prop = decl.slice(0, i).trim().toLowerCase();
            const val = decl.slice(i + 1).trim();
            if (STYLE_PROPS.has(prop) && /^(left|right|center|justify|start|end)$/i.test(val))
                kept.push(`${prop}: ${val.toLowerCase()}`);
        });
    return kept.join('; ');
}

function parse(html) {
    if (typeof DOMParser === 'undefined') return null;
    const doc = new DOMParser().parseFromString(
        `<!doctype html><body><div>${html == null ? '' : String(html)}</div></body>`,
        'text/html'
    );
    return doc.body.firstElementChild;
}

/**
 * Sanitise untrusted HTML for rendering or storing.
 *
 * - Tags: an allow-list (text, headings, lists, quotes, code, tables, images, links). Unknown tags
 *   are unwrapped (their text stays); script, style, iframe, object, embed, form controls, svg,
 *   math, media… are removed with their content. Comments are removed.
 * - Attributes: an allow-list per tag. Every on* handler, class, id, style (except text-align),
 *   data-* and aria-* attribute is dropped.
 * - URLs: href allows http(s), mailto, tel and relative URLs; img src allows http(s), relative and
 *   base64 raster data: images (`allowDataImages: false` to refuse). javascript:, vbscript:, other
 *   data:, file:, blob:… are dropped. Relative platform URLs (`sys_attachment.do?…`) become
 *   root-relative.
 * - Links: rel="noopener noreferrer" always; target="_blank" only for absolute http(s) links
 *   (`linkTarget: 'keep'` keeps the author's target instead, `'none'` removes it).
 *
 * options: { allowImages?: true, allowDataImages?: true, allowTables?: true, linkTarget?: 'external'|'keep'|'none' }
 */
export function sanitizeHtml(html, options = {}) {
    if (html == null || html === '') return '';
    const root = parse(html);
    if (!root) return '';
    const allowImages = options.allowImages !== false;
    const allowTables = options.allowTables !== false;
    const linkTarget = options.linkTarget || 'external';
    const TABLE_TAGS = /^(table|thead|tbody|tfoot|tr|td|th|caption|col|colgroup)$/;

    const walk = (el) => {
        for (const child of Array.from(el.childNodes)) {
            if (child.nodeType === 8 || child.nodeType === 7 || child.nodeType === 4) {
                child.remove();
                continue;
            }
            if (child.nodeType !== 1) continue;
            const tag = child.tagName.toLowerCase();
            if (DROP_TAGS.has(tag) || (tag === 'img' && !allowImages)) {
                child.remove();
                continue;
            }
            if (!ALLOWED_TAGS.has(tag) || (!allowTables && TABLE_TAGS.test(tag))) {
                walk(child);
                child.replaceWith(...Array.from(child.childNodes));
                continue;
            }
            const extra = TAG_ATTRS[tag];
            for (const attr of Array.from(child.attributes)) {
                const n = attr.name.toLowerCase();
                if (n === 'style') {
                    const style = cleanStyle(attr.value);
                    if (style) child.setAttribute('style', style);
                    else child.removeAttribute(attr.name);
                    continue;
                }
                if (!GLOBAL_ATTRS.has(n) && !(extra && extra.has(n))) {
                    child.removeAttribute(attr.name);
                    continue;
                }
                if (n === 'href' || n === 'src' || n === 'cite') {
                    const url = safeUrl(attr.value, n === 'src' ? 'src' : 'href', options);
                    if (url === null) child.removeAttribute(attr.name);
                    else if (url !== attr.value) child.setAttribute(attr.name, url);
                } else if (
                    (n === 'width' ||
                        n === 'height' ||
                        n === 'colspan' ||
                        n === 'rowspan' ||
                        n === 'span' ||
                        n === 'start') &&
                    !/^\d{1,5}%?$/.test(attr.value.trim())
                ) {
                    child.removeAttribute(attr.name);
                }
            }
            if (tag === 'img' && !child.getAttribute('src')) {
                child.remove();
                continue;
            }
            if (tag === 'a') {
                const href = child.getAttribute('href') || '';
                child.setAttribute('rel', 'noopener noreferrer');
                if (linkTarget === 'none') child.removeAttribute('target');
                else if (linkTarget === 'external') {
                    if (href && isExternal(href)) child.setAttribute('target', '_blank');
                    else child.removeAttribute('target');
                } else if (
                    child.getAttribute('target') &&
                    !/^_(blank|self|parent|top)$/.test(child.getAttribute('target'))
                )
                    child.setAttribute('target', '_blank');
            }
            walk(child);
        }
    };
    walk(root);
    return root.innerHTML;
}

/** Plain text of an HTML value (block boundaries become spaces / newlines), for lists and counters. */
export function htmlToText(html, { newlines = false } = {}) {
    if (html == null || html === '') return '';
    const root = parse(sanitizeHtml(html, { allowImages: false }));
    if (!root) return String(html).replace(/<[^>]*>/g, ' ');
    const BLOCK = /^(p|div|li|h[1-6]|blockquote|pre|tr|dt|dd|figcaption|caption|table|ul|ol|dl|hr)$/;
    const out = [];
    const walk = (node) => {
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === 3) out.push(child.nodeValue);
            else if (child.nodeType === 1) {
                const tag = child.tagName.toLowerCase();
                if (tag === 'br') out.push('\n');
                else {
                    const block = BLOCK.test(tag);
                    if (block) out.push('\n');
                    walk(child);
                    if (block) out.push('\n');
                    else if (tag === 'td' || tag === 'th') out.push('\t');
                }
            }
        }
    };
    walk(root);
    const text = out.join('');
    return newlines
        ? text
              .replace(/[ \t ]+/g, ' ')
              .replace(/ *\n */g, '\n')
              .replace(/\n{3,}/g, '\n\n')
              .trim()
        : text.replace(/[\s ]+/g, ' ').trim();
}

/** True when the HTML shows nothing (no text, no images): '', '<p></p>', '<p><br></p>', '&nbsp;'. */
export function isHtmlEmpty(html) {
    if (html == null) return true;
    const s = String(html);
    if (!s.trim()) return true;
    if (/<(img|hr|table)\b/i.test(s)) return false;
    return htmlToText(s) === '';
}

/**
 * Formatting in `html` that the rich-text editor's schema can't represent (so editing would drop
 * it). Returns human labels, e.g. ['tables', 'text colours and fonts']; [] when nothing is lost.
 */
export function findUnsupportedHtml(html) {
    if (!html) return [];
    const root = parse(html);
    if (!root) return [];
    const found = [];
    const has = (sel) => !!root.querySelector(sel);
    if (has('table')) found.push('tables');
    if (has('iframe,video,audio,object,embed')) found.push('embedded media');
    if (has("font,[style*='color'],[style*='font'],[style*='background']")) found.push('text colours and fonts');
    if (has('sub,sup,mark,small,ins')) found.push('special text styles');
    if (has("[style*='text-align']")) found.push('alignment');
    if (has('dl,figure,details')) found.push('other layouts');
    return found;
}

/**
 * Read-only rich text: sanitised HTML in the theme's prose styles. Links open safely; images are
 * capped at the container width.
 *
 *   <RichText html={value} />                         block
 *   <RichText html={value} size="sm" className="…" />
 *   <RichText html={value} sanitize={false} />        only for HTML you already sanitised
 */
function RichText({ html, as = 'div', size = 'default', className, sanitize = true, sanitizeOptions, ...props }) {
    const clean = React.useMemo(
        () => (sanitize ? sanitizeHtml(html, sanitizeOptions) : String(html || '')),
        [html, sanitize, sanitizeOptions]
    );
    const Tag = as;
    return (
        <Tag
            data-slot="rich-text"
            className={cn('rp-prose', size === 'sm' ? 'rp-prose-sm' : '', className)}
            dangerouslySetInnerHTML={{ __html: clean }}
            {...props}
        />
    );
}

export { RichText };
