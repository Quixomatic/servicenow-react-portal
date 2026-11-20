/**
 * components:app/docs-content — renders one doc's Markdown in the fumadocs look (prose typography,
 * code blocks with copy + highlighting, callouts, heading anchors, scrollable tables, doc links that
 * navigate inside the portal). Presentation only: data comes from the caller.
 *
 *   import DocsContent, { CodeBlock, Callout } from 'components:app/docs-content'
 *   <DocsContent doc={parsed} path="concepts/layouts" skipTitle />
 *
 * Props: doc (parseMarkdown result) or markdown, path (the doc's path, for relative .md links),
 * skipTitle (drop a leading # heading; the page shows the record's title instead), className.
 *
 * Exports for any widget: CodeBlock ({ code, lang, title }), Callout ({ type, title, children }), InlineCode ({ text }),
 * calloutOf(blockquote token) → { type, title } | null, docsComponents(path) (the Markdown component
 * map), EMBEDS (the rp-embed allow-list).
 *
 * Live examples (the embed seam): a fenced block tagged rp-embed whose body is
 *   components:app/server-clock {"title": "UTC"}
 * renders that widget as a real embedded instance, but only for widgets in EMBEDS (imported here,
 * so the server's import-chain authorization allows them). Anything else renders a notice.
 */
import { useState } from 'react';
import { Link, usePortalLocation } from '@portal/runtime';
import { Icon } from 'components:icon';
import { cn } from 'utilities:cn';
import { Markdown, parseMarkdown, tokensToText, renderInline } from 'utilities:app/markdown';
import type { ParsedMarkdown, Token } from 'utilities:app/markdown';
import { Highlight, normalizeLang } from 'utilities:app/code-highlight';
import { resolveDocHref, docRoute, docUrl, scrollToHeading, usePrefetchDoc, requestHeading } from 'utilities:app/docs';
import ServerClock from 'components:app/server-clock';

/** rp-embed allow-list: widget unique id → imported widget (an embed wrapper). */
export const EMBEDS: Record<string, any> = { 'app/server-clock': ServerClock };

/* ---------------- Code blocks ---------------- */

function useCopy(): [boolean, (text: string) => void] {
    const [done, setDone] = useState(false);
    return [
        done,
        (text: string) => {
            const finish = () => {
                setDone(true);
                window.setTimeout(() => setDone(false), 1500);
            };
            if (navigator.clipboard) navigator.clipboard.writeText(text).then(finish, () => {});
        },
    ];
}

export function CopyButton({ text, className }: { text: string; className?: string }) {
    const [done, copy] = useCopy();
    return (
        <button
            type="button"
            aria-label={done ? 'Copied' : 'Copy code'}
            title={done ? 'Copied' : 'Copy'}
            onClick={() => copy(text)}
            className={cn(
                'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                className
            )}
        >
            <Icon name={done ? 'check' : 'copy'} className="size-3.5" />
        </button>
    );
}

const LANG_LABEL: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TSX',
    js: 'JavaScript',
    jsx: 'JSX',
    json: 'JSON',
    css: 'CSS',
    bash: 'Shell',
    sh: 'Shell',
    html: 'HTML',
    text: 'Text',
};

/** A fumadocs-style code block: card, border, copy button; a title bar when `title` is set. */
export function CodeBlock({ code, lang, title }: { code: string; lang?: string; title?: string }) {
    const highlighted = !!normalizeLang(lang || '');
    return (
        <figure className="rp-docs-code not-prose" data-lang={lang || undefined}>
            {title ? (
                <div className="rp-docs-code__title">
                    <Icon
                        name={lang === 'bash' || lang === 'sh' ? 'terminal' : 'file-code'}
                        className="size-3.5 shrink-0"
                    />
                    <figcaption className="min-w-0 flex-1 truncate">{title}</figcaption>
                    <CopyButton text={code} className="-me-2" />
                </div>
            ) : (
                <CopyButton text={code} className="rp-docs-code__copy" />
            )}
            <div
                className="rp-docs-code__viewport"
                role="region"
                tabIndex={0}
                aria-label={title || (lang ? (LANG_LABEL[lang] || lang) + ' code' : 'Code')}
            >
                <pre>{highlighted ? <Highlight code={code} lang={lang} /> : <code className="rp-hl">{code}</code>}</pre>
            </div>
        </figure>
    );
}

/** ```rp-embed fence: `components:app/<key> {json options}`. */
function EmbedBlock({ text }: { text: string }) {
    const m = String(text || '')
        .trim()
        .match(/^components:(app\/[a-z][a-z0-9-]*)\s*([\s\S]*)$/);
    let options: any = {};
    let error = '';
    if (!m) error = 'Expected `components:app/<key> {options}`.';
    else if (m[2].trim()) {
        try {
            options = JSON.parse(m[2]);
        } catch (e) {
            error = 'Options are not valid JSON.';
        }
    }
    const Widget = m ? EMBEDS[m[1]] : null;
    if (!error && !Widget) error = (m ? m[1] : 'This widget') + " isn't in the docs' embed allow-list.";
    if (error)
        return (
            <Callout type="warning" title="Live example unavailable">
                {error}
            </Callout>
        );
    const key = m![1].replace(/[^A-Za-z0-9_-]/g, '-') + '-' + Math.abs(hash(text)).toString(36);
    return (
        <div className="rp-docs-embed not-prose">
            <div className="rp-docs-embed__label">
                <Icon name="play" className="size-3" /> Live example · <code>{m![1]}</code>
            </div>
            <Widget embedKey={key.slice(0, 64)} options={options} />
        </div>
    );
}
function hash(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
}

/* ---------------- Callouts ---------------- */

const CALLOUT_ICON: Record<string, string> = {
    info: 'info',
    warning: 'triangle-alert',
    error: 'circle-x',
    success: 'circle-check',
    idea: 'lightbulb',
};
const CALLOUT_LABELS: Record<string, string> = {
    note: 'info',
    info: 'info',
    tip: 'idea',
    hint: 'idea',
    important: 'info',
    warning: 'warning',
    caution: 'warning',
    danger: 'error',
    error: 'error',
    success: 'success',
};

/** A fumadocs Callout: card with a tinted bar and a filled icon. type: info | warning | error | success | idea. */
export function Callout({
    type = 'info',
    title,
    children,
}: {
    type?: string;
    title?: React.ReactNode;
    children?: React.ReactNode;
}) {
    const t = CALLOUT_ICON[type] ? type : 'info';
    return (
        <div className="rp-docs-callout" data-type={t} role="note">
            <div className="rp-docs-callout__bar" role="none" />
            <Icon name={CALLOUT_ICON[t]} className="rp-docs-callout__icon" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                {title ? <p className="rp-docs-callout__title">{title}</p> : null}
                <div className="rp-docs-callout__body">{children}</div>
            </div>
        </div>
    );
}

/**
 * `> **Note:** …` / `> **Warning:** …` (and GitHub's `> [!NOTE]`) → { type, title, rest }, where
 * rest is the blockquote's tokens without the label.
 */
export function calloutOf(token: Token): { type: string; title: string; tokens: Token[] } | null {
    const first = token.tokens && token.tokens[0];
    if (!first || first.type !== 'paragraph' || !first.tokens || !first.tokens.length) return null;
    const lead = first.tokens[0];
    let label = '';
    let restInline: Token[] = [];
    if (lead.type === 'strong') {
        const text = tokensToText(lead.tokens).trim();
        const m = text.match(/^([A-Za-z ]+):$/);
        if (!m) return null;
        label = m[1];
        restInline = first.tokens.slice(1);
        const head = restInline[0];
        if (head && head.type === 'text')
            restInline = [{ ...head, text: String(head.text).replace(/^\s+/, ''), tokens: undefined }].concat(
                restInline.slice(1)
            );
    } else if (lead.type === 'text') {
        const m = String(lead.text).match(/^\[!([A-Za-z]+)\]\s*/);
        if (!m) return null;
        label = m[1];
        restInline = [{ ...lead, text: String(lead.text).slice(m[0].length), tokens: undefined }].concat(
            first.tokens.slice(1)
        );
    } else return null;
    const type = CALLOUT_LABELS[label.toLowerCase()];
    if (!type) return null;
    const title = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    return { type, title, tokens: [{ ...first, tokens: restInline }].concat(token.tokens!.slice(1)) };
}

/* ---------------- Inline code ---------------- */

/**
 * Inline code with line-break opportunities after '.' and '/' (<wbr>, no visible characters):
 * dotted property names and paths (x_312987_portal.source.max_file_bytes) wrap at a dot instead
 * of overflowing a table column or breaking mid-word. Exported for other docs widgets.
 */
export function InlineCode({ text }: { text: string }) {
    const parts = String(text || '').split(/(?<=[./])(?=[^./])/);
    if (parts.length < 2) return <code>{text}</code>;
    return (
        <code>
            {parts.map((part, i) => (
                <span key={i}>
                    {part}
                    {i < parts.length - 1 ? <wbr /> : null}
                </span>
            ))}
        </code>
    );
}

/* ---------------- Headings, links, tables ---------------- */

function Heading({ id, depth, children }: { id: string; depth: number; children: React.ReactNode }) {
    const [done, copy] = useCopy();
    const loc = usePortalLocation();
    const Tag = ('h' + depth) as any;
    if (depth < 2 || depth > 4 || !id) return <Tag id={id}>{children}</Tag>;
    const path = loc && loc.page ? loc.page : 'index';
    return (
        <Tag id={id} className="rp-docs-heading group/heading">
            <a
                href={'#' + id}
                data-card=""
                onClick={(e: any) => {
                    e.preventDefault();
                    scrollToHeading(id, { root: e.currentTarget });
                }}
            >
                {children}
            </a>
            <button
                type="button"
                aria-label={done ? 'Copied anchor link' : 'Copy anchor link'}
                onClick={() => copy(docUrl(path, id))}
                className="not-prose inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover/heading:opacity-100 hover:bg-accent focus-visible:opacity-100"
            >
                <Icon name={done ? 'copy-check' : 'link'} className="size-3.5" />
            </button>
        </Tag>
    );
}

function DocLink({
    href,
    title,
    children,
    path,
}: {
    href: string;
    title?: string;
    children: React.ReactNode;
    path: string;
}) {
    const prefetch = usePrefetchDoc();
    const target = resolveDocHref(href, path);
    if (target.kind === 'doc') {
        return (
            <Link
                to={docRoute(target.path)}
                q={target.hash ? { h: target.hash } : undefined}
                title={title}
                onMouseEnter={() => prefetch(target.path)}
                onFocus={() => prefetch(target.path)}
                onClick={() => requestHeading(target.path, target.hash)}
            >
                {children}
            </Link>
        );
    }
    if (target.kind === 'hash') {
        return (
            <a
                href={'#' + target.hash}
                title={title}
                onClick={(e) => {
                    e.preventDefault();
                    scrollToHeading(target.hash, { root: e.currentTarget });
                }}
            >
                {children}
            </a>
        );
    }
    if (!href) return <span>{children}</span>;
    const external = /^https?:/i.test(href);
    return (
        <a
            href={href}
            title={title}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
        >
            {children}
        </a>
    );
}

/** The Markdown component map used by DocsContent (exported so other widgets can reuse it). */
export function docsComponents(path: string) {
    const components: any = {
        heading: ({ id, depth, children }: any) => (
            <Heading id={id} depth={depth}>
                {children}
            </Heading>
        ),
        code: ({ lang, meta, text }: any) => {
            if (lang === 'rp-embed') return <EmbedBlock text={text} />;
            const title = (String(meta || '').match(/title=(?:"([^"]*)"|'([^']*)'|(\S+))/) || [])
                .slice(1)
                .find(Boolean);
            return <CodeBlock code={text} lang={lang === 'text' ? '' : lang} title={title} />;
        },
        blockquote: ({ token, children }: any) => {
            const c = calloutOf(token);
            if (!c) return <blockquote>{children}</blockquote>;
            return (
                <Callout type={c.type} title={c.title}>
                    <Markdown doc={{ tokens: c.tokens, headings: [] }} components={components} />
                </Callout>
            );
        },
        table: ({ token, children }: any) => (
            <div
                className="rp-docs-table"
                data-cols={(token.header || []).length}
                tabIndex={0}
                role="region"
                aria-label="Table"
            >
                <table>{children}</table>
            </div>
        ),
        link: ({ href, title, children }: any) => (
            <DocLink href={href} title={title} path={path}>
                {children}
            </DocLink>
        ),
        codespan: ({ text }: any) => <InlineCode text={text} />,
        // Raw HTML in the docs (<Region>, <Link> written outside backticks) shows as literal text.
        html: ({ text, token }: any) => (token && token.block ? <p>{text}</p> : <>{text}</>),
    };
    return components;
}

export default function DocsContent({
    doc,
    markdown,
    path = 'index',
    skipTitle = false,
    className,
}: {
    doc?: ParsedMarkdown;
    markdown?: string;
    path?: string;
    skipTitle?: boolean;
    className?: string;
}) {
    const parsed = doc || parseMarkdown(markdown || '');
    // The page header shows the record's title: drop the source's leading `# Title`.
    const firstHeading = parsed.tokens.findIndex((t) => t.type !== 'space');
    const skip = skipTitle
        ? (t: Token, i: number) => i === firstHeading && t.type === 'heading' && t.depth === 1
        : undefined;
    return (
        <div className={cn('rp-docs-prose', className)}>
            <Markdown doc={parsed} components={docsComponents(path)} skip={skip} />
        </div>
    );
}

export { renderInline };
