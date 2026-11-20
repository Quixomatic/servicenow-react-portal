/**
 * utilities:app/code-highlight — a small, dependency-free syntax highlighter (a regex scanner, not a
 * parser) for code blocks: ts / tsx / js / jsx / json / css / bash / html. Colours follow GitHub's
 * light and dark themes (styles.css, keyed off the host's .dark class), the same palette fumadocs'
 * shiki defaults use.
 *
 *   import { Highlight, highlight, normalizeLang } from 'utilities:app/code-highlight'
 *   <Highlight code={text} lang="tsx" />            // <code class="rp-hl"> with token <span>s
 *   highlight(text, 'json') → [{ type: 'string', text: '"a"' }, …]
 *
 * Token types (class rp-hl-<type>): comment, string, number, keyword, literal, function, type, tag,
 * attr, property, variable, operator, punct, plain. Unknown languages render plain.
 */
import { createElement, useMemo } from 'react';

export type HlToken = { type: string; text: string };
type Rule = [RegExp, string | ((m: RegExpExecArray, prev: HlToken | undefined) => string)];

const JS_KEYWORDS =
    'as|async|await|break|case|catch|class|const|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|keyof|let|namespace|new|of|private|protected|public|readonly|return|satisfies|set|static|super|switch|this|throw|try|type|typeof|var|void|while|with|yield';
const JS: Rule[] = [
    [/\/\/[^\n]*/y, 'comment'],
    [/\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'],
    [/`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`?/y, 'string'],
    [/'(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?/y, 'string'],
    [/<\/?(?=[A-Za-z])[\w.:-]*/y, 'tag'],
    [/\b(?:true|false|null|undefined|NaN|Infinity)\b/y, 'literal'],
    [new RegExp('\\b(?:' + JS_KEYWORDS + ')\\b', 'y'), 'keyword'],
    [/\b(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?)\b/y, 'number'],
    [/[A-Z][\w$]*(?=\s*[<(.]|\b)/y, 'type'],
    [/[A-Za-z_$][\w$]*(?=\s*\()/y, 'function'],
    [/[A-Za-z_$][\w$-]*(?==)/y, (m, prev) => (prev && /tag|attr|string|plain/.test(prev.type) ? 'attr' : 'plain')],
    [/[A-Za-z_$][\w$]*/y, 'plain'],
    [/=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\?\.|\.\.\.|[+\-*/%=!<>?:&|^~]/y, 'operator'],
    [/[{}()[\];,.]/y, 'punct'],
];
const JSON_RULES: Rule[] = [
    [/"(?:\\.|[^"\\\n])*"(?=\s*:)/y, 'property'],
    [/"(?:\\.|[^"\\\n])*"?/y, 'string'],
    [/\b(?:true|false|null)\b/y, 'literal'],
    [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y, 'number'],
    [/\/\/[^\n]*/y, 'comment'],
    [/[{}[\]:,]/y, 'punct'],
];
const CSS: Rule[] = [
    [/\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'],
    [/'(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?/y, 'string'],
    [/@[\w-]+/y, 'keyword'],
    [/--[\w-]+/y, 'variable'],
    [/[\w-]+(?=\s*:(?!:)[^{;]*[;}\n])/y, 'property'],
    [/#[\da-fA-F]{3,8}\b/y, 'number'],
    [/-?\d*\.?\d+(?:%|[a-z]+)?/y, 'number'],
    [/[\w-]+(?=\()/y, 'function'],
    [/[.#]?[A-Za-z_][\w-]*/y, (m, prev) => (m[0][0] === '.' || m[0][0] === '#' ? 'tag' : 'plain')],
    [/[{}();:,>+~*[\]=]/y, 'punct'],
];
const BASH: Rule[] = [
    [/#[^\n]*/y, 'comment'],
    [/'[^']*'?|"(?:\\.|[^"\\])*"?/y, 'string'],
    [/\$\{[^}]*\}|\$[\w@#?$!*-]+/y, 'variable'],
    [/(?:^|(?<=[\n;|&]\s*))[\w./-]+/y, 'function'],
    [/(?<=\s)--?[\w-]+(?:=[^\s'"]*)?/y, 'attr'],
    [/\b(?:if|then|else|fi|for|do|done|while|case|esac|in|export|function)\b/y, 'keyword'],
    [/[|&;<>]+/y, 'operator'],
    [/[^\s'"$#|&;<>]+/y, 'plain'],
];
const HTML: Rule[] = [
    [/<!--[\s\S]*?(?:-->|$)/y, 'comment'],
    [/<\/?[\w:-]+/y, 'tag'],
    [/[\w:-]+(?==)/y, 'attr'],
    [/"[^"]*"?|'[^']*'?/y, 'string'],
    [/\/?>/y, 'tag'],
    [/&\w+;/y, 'variable'],
];

const LANGS: Record<string, Rule[]> = { js: JS, json: JSON_RULES, css: CSS, bash: BASH, html: HTML };
const ALIASES: Record<string, string> = {
    ts: 'js',
    tsx: 'js',
    jsx: 'js',
    javascript: 'js',
    typescript: 'js',
    mjs: 'js',
    cjs: 'js',
    jsonc: 'json',
    json5: 'json',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    console: 'bash',
    powershell: 'bash',
    ps1: 'bash',
    xml: 'html',
    svg: 'html',
    jsx_html: 'html',
    scss: 'css',
    less: 'css',
};

/** 'tsx' → 'js' rules key, 'shell' → 'bash'; '' for plain text. */
export function normalizeLang(lang: string): string {
    const l = String(lang || '')
        .toLowerCase()
        .trim();
    if (LANGS[l]) return l;
    return ALIASES[l] || '';
}

/** Tokenise `code` for `lang`. Adjacent plain characters merge into one token. */
export function highlight(code: string, lang: string): HlToken[] {
    const rules = LANGS[normalizeLang(lang)];
    const text = String(code || '');
    if (!rules) return [{ type: 'plain', text }];
    const out: HlToken[] = [];
    const push = (type: string, t: string) => {
        const last = out[out.length - 1];
        if (last && last.type === type && (type === 'plain' || type === 'punct')) last.text += t;
        else out.push({ type, text: t });
    };
    let i = 0;
    while (i < text.length) {
        const ch = text[i];
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
            let j = i + 1;
            while (j < text.length && /[ \t\r\n]/.test(text[j])) j++;
            push('plain', text.slice(i, j));
            i = j;
            continue;
        }
        let matched = false;
        for (const [re, kind] of rules) {
            re.lastIndex = i;
            const m = re.exec(text);
            if (!m || !m[0].length) continue;
            const prev = [...out].reverse().find((t) => !/^\s+$/.test(t.text));
            push(typeof kind === 'function' ? kind(m, prev) : kind, m[0]);
            i += m[0].length;
            matched = true;
            break;
        }
        if (!matched) {
            push('plain', ch);
            i++;
        }
    }
    return out;
}

/** <code class="rp-hl"> with one span per token. Memoised on code + lang. */
export function Highlight({ code, lang, className }: { code: string; lang?: string; className?: string }) {
    const tokens = useMemo(() => highlight(code, lang || ''), [code, lang]);
    return createElement(
        'code',
        { className: 'rp-hl' + (className ? ' ' + className : ''), 'data-lang': lang || undefined },
        tokens.map((t, i) =>
            t.type === 'plain' ? t.text : createElement('span', { key: i, className: 'rp-hl-' + t.type }, t.text)
        )
    );
}

export default Highlight;
