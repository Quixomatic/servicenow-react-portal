/**
 * Variant sub-layer: moves Tailwind variant rules (sm:, max-sm:, @container, hover:, focus-visible:,
 * group-*, peer-*, data-[…]:, aria-*, dark:, [&>svg]:, …) out of `@layer utilities` into a later
 * `@layer rp-variants`.
 *
 * Why: every component build ships its own Tailwind sheet, and same-named layers merge across the
 * <style> sheets in the host's shadow root. Inside one sheet Tailwind orders base utilities before
 * variants; across sheets, a later sheet's `.hidden` beat an earlier sheet's `sm:block` at equal
 * specificity. With the variants in their own later layer, any variant from any sheet beats any
 * base utility from any sheet, which restores Tailwind's single-sheet guarantee across sheets.
 *
 * Layer order: theme, base, components, utilities, rp-variants. Widget styles.css stays unlayered.
 *
 * Rules whose declarations are all !important (`max-sm:flex!`) stay in `utilities`: for important
 * declarations the layer order flips (earlier layers win), so moving them would let an important
 * base utility beat them even inside one sheet.
 *
 * Pure string code with no dependencies: it runs in the server compiler (instance), in Node for the
 * host's framework CSS build (packages/portal-host/scripts/variant-layer.mjs), and in tests. It works
 * on Tailwind's nested output (compile().build()) and on the CLI's flattened, minified output.
 */

export const VARIANT_LAYER = 'rp-variants';
export const LAYER_ORDER = 'theme, base, components, utilities, ' + VARIANT_LAYER;

interface CssBlock {
    kind: 'block';
    prelude: string;
    children: CssNode[];
}
interface CssText {
    kind: 'text';
    text: string;
}
type CssNode = CssBlock | CssText;

const BACKSLASH = String.fromCharCode(92);

/** Parse CSS into blocks and text (declarations, statements, whitespace), keeping every byte. */
function parse(css: string): CssNode[] {
    let i = 0;
    const n = css.length;
    function list(): CssNode[] {
        const out: CssNode[] = [];
        let buf = '';
        let parens = 0;
        while (i < n) {
            const ch = css.charAt(i);
            if (ch === BACKSLASH) {
                buf += css.substr(i, 2);
                i += 2;
            } else if (ch === '/' && css.charAt(i + 1) === '*') {
                const end = css.indexOf('*/', i + 2);
                const stop = end < 0 ? n : end + 2;
                buf += css.substring(i, stop);
                i = stop;
            } else if (ch === '"' || ch === "'") {
                let j = i + 1;
                while (j < n && css.charAt(j) !== ch) j += css.charAt(j) === BACKSLASH ? 2 : 1;
                buf += css.substring(i, j + 1);
                i = j + 1;
            } else if (ch === '(') {
                parens++;
                buf += ch;
                i++;
            } else if (ch === ')') {
                if (parens > 0) parens--;
                buf += ch;
                i++;
            } else if (ch === '{') {
                i++;
                const children = list();
                out.push({ kind: 'block', prelude: buf, children });
                buf = '';
                parens = 0;
            } else if (ch === '}') {
                i++;
                if (buf) out.push({ kind: 'text', text: buf });
                return out;
            } else if (ch === ';' && parens === 0) {
                out.push({ kind: 'text', text: buf + ';' });
                buf = '';
                i++;
            } else {
                buf += ch;
                i++;
            }
        }
        if (buf) out.push({ kind: 'text', text: buf });
        return out;
    }
    return list();
}

function print(nodes: CssNode[]): string {
    let s = '';
    for (const node of nodes) s += node.kind === 'text' ? node.text : node.prelude + '{' + print(node.children) + '}';
    return s;
}

function stripComments(s: string): string {
    return s.replace(/\/\*[\s\S]*?\*\//g, '');
}

function atName(prelude: string): string {
    const m = /^\s*@([\w-]+)/.exec(stripComments(prelude));
    return m ? m[1].toLowerCase() : '';
}

function isUtilitiesLayer(node: CssNode): boolean {
    return node.kind === 'block' && /^@layer\s+utilities$/i.test(stripComments(node.prelude).trim());
}

/** Split a selector list on top-level commas (not inside parens, brackets or strings). */
function splitSelectors(sel: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let cur = '';
    for (let i = 0; i < sel.length; i++) {
        const ch = sel.charAt(i);
        if (ch === BACKSLASH) {
            cur += sel.substr(i, 2);
            i++;
            continue;
        }
        if (ch === '"' || ch === "'") {
            let j = i + 1;
            while (j < sel.length && sel.charAt(j) !== ch) j += sel.charAt(j) === BACKSLASH ? 2 : 1;
            cur += sel.substring(i, j + 1);
            i = j;
            continue;
        }
        if (ch === '(' || ch === '[') depth++;
        else if ((ch === ')' || ch === ']') && depth > 0) depth--;
        if (ch === ',' && depth === 0) {
            out.push(cur);
            cur = '';
        } else cur += ch;
    }
    out.push(cur);
    return out;
}

function isHexDigit(ch: string): boolean {
    return /^[0-9a-fA-F]$/.test(ch);
}

/**
 * True when a class in the selector was written with a variant: an escaped colon outside its
 * escaped square brackets (`.sm\:block`, `.data-\[state\=open\]\:flex`, `.\[\&\>svg\]\:size-4`),
 * not an arbitrary property (`.\[mask-type\:luminance\]`). Every class is checked, because
 * group/peer variants lead with `.group` / `.peer` (`:is(:where(.group):hover .group-hover\:x)`).
 */
export function selectorHasVariant(selector: string): boolean {
    const sel = stripComments(selector);
    let inClass = false;
    let depth = 0;
    let attr = 0;
    for (let i = 0; i < sel.length; i++) {
        const ch = sel.charAt(i);
        if (ch === BACKSLASH) {
            let escaped = sel.charAt(i + 1);
            let len = 2;
            if (isHexDigit(escaped)) {
                let hex = '';
                let j = i + 1;
                while (j < sel.length && hex.length < 6 && isHexDigit(sel.charAt(j))) hex += sel.charAt(j++);
                escaped = String.fromCharCode(parseInt(hex, 16));
                len = j - i + (sel.charAt(j) === ' ' ? 1 : 0);
            }
            if (inClass) {
                if (escaped === '[') depth++;
                else if (escaped === ']' && depth > 0) depth--;
                else if (escaped === ':' && depth === 0) return true;
            }
            i += len - 1;
            continue;
        }
        if (ch === '"' || ch === "'") {
            let j = i + 1;
            while (j < sel.length && sel.charAt(j) !== ch) j += sel.charAt(j) === BACKSLASH ? 2 : 1;
            i = j;
            inClass = false;
            continue;
        }
        if (attr > 0) {
            if (ch === '[') attr++;
            else if (ch === ']') attr--;
            continue;
        }
        if (ch === '[') {
            attr = 1;
            inClass = false;
        } else if (ch === '.') {
            inClass = true;
            depth = 0;
        } else if (!/[\w-]/.test(ch) && ch.charCodeAt(0) < 128) inClass = false;
    }
    return false;
}

/** Every declaration in the rule (nested blocks included) is !important. */
function allImportant(nodes: CssNode[]): boolean {
    let seen = 0;
    function walk(list: CssNode[]): boolean {
        for (const node of list) {
            if (node.kind === 'block') {
                if (!walk(node.children)) return false;
                continue;
            }
            const decl = stripComments(node.text).trim().replace(/;$/, '').trim();
            if (!decl || decl.indexOf(':') < 0 || decl.charAt(0) === '@') continue;
            seen++;
            if (!/!\s*important$/i.test(decl)) return false;
        }
        return true;
    }
    return walk(nodes) && seen > 0;
}

/** Grouping at-rules whose child rules are sorted individually (CLI output nests rules in them). */
const GROUPING = ['media', 'supports', 'container', 'starting-style', 'scope', 'layer', 'document'];

interface Split {
    base: CssNode[];
    variants: CssNode[];
}

function hasBlocks(nodes: CssNode[]): boolean {
    for (const node of nodes) if (node.kind === 'block') return true;
    return false;
}

function splitNodes(nodes: CssNode[]): Split {
    const out: Split = { base: [], variants: [] };
    for (const node of nodes) {
        if (node.kind === 'text') {
            out.base.push(node);
            // Keep the pretty-printed indentation in both halves.
            if (!node.text.trim()) out.variants.push(node);
            continue;
        }
        const at = atName(node.prelude);
        if (at) {
            if (GROUPING.indexOf(at) < 0) {
                out.base.push(node);
                continue;
            }
            const inner = splitNodes(node.children);
            if (hasBlocks(inner.base) || !hasBlocks(inner.variants))
                out.base.push({ kind: 'block', prelude: node.prelude, children: inner.base });
            if (hasBlocks(inner.variants))
                out.variants.push({ kind: 'block', prelude: node.prelude, children: inner.variants });
            continue;
        }
        // A style rule (a utility). Tailwind nests its variant's conditions inside it.
        if (allImportant(node.children)) {
            out.base.push(node);
            continue;
        }
        const selectors = splitSelectors(node.prelude);
        const variantSel: string[] = [];
        const baseSel: string[] = [];
        for (const s of selectors) (selectorHasVariant(s) ? variantSel : baseSel).push(s);
        if (!variantSel.length) out.base.push(node);
        else if (!baseSel.length) out.variants.push(node);
        else {
            out.base.push({ kind: 'block', prelude: baseSel.join(','), children: node.children });
            out.variants.push({ kind: 'block', prelude: variantSel.join(','), children: node.children });
        }
    }
    return out;
}

/** `@layer a, b, utilities;` statements gain rp-variants right after utilities. */
function addToStatement(text: string): string {
    return text.replace(/@layer\s+([^;{}]+);/gi, (whole: string, list: string) => {
        const names = list.split(',').map((s) => s.trim());
        if (names.indexOf('utilities') < 0 || names.indexOf(VARIANT_LAYER) >= 0) return whole;
        names.splice(names.indexOf('utilities') + 1, 0, VARIANT_LAYER);
        return '@layer ' + names.join(', ') + ';';
    });
}

function transform(nodes: CssNode[], pretty: boolean): CssNode[] {
    const out: CssNode[] = [];
    for (const node of nodes) {
        if (node.kind === 'text') {
            out.push({ kind: 'text', text: addToStatement(node.text) });
            continue;
        }
        if (isUtilitiesLayer(node)) {
            const parts = splitNodes(node.children);
            out.push({ kind: 'block', prelude: node.prelude, children: parts.base });
            // Right after utilities: even without a layer statement, rp-variants is then first
            // mentioned after utilities, so it sorts after it.
            if (hasBlocks(parts.variants)) {
                out.push({ kind: 'text', text: pretty ? '\n' : '' });
                out.push({
                    kind: 'block',
                    prelude: '@layer ' + VARIANT_LAYER + (pretty ? ' ' : ''),
                    children: parts.variants.concat(pretty ? [{ kind: 'text', text: '\n' }] : []),
                });
            }
            continue;
        }
        const at = atName(node.prelude);
        if (at === 'media' || at === 'supports' || at === 'container' || at === 'layer')
            out.push({ kind: 'block', prelude: node.prelude, children: transform(node.children, pretty) });
        else out.push(node);
    }
    return out;
}

/**
 * Move variant rules from every `@layer utilities` block into `@layer rp-variants`, and add
 * rp-variants after utilities in `@layer …;` statements. Input without variants comes back as is.
 */
export function moveVariantsToLayer(css: string): string {
    if (!css || css.indexOf('utilities') < 0) return css;
    const pretty = css.indexOf('\n') >= 0;
    return print(transform(parse(css), pretty));
}
