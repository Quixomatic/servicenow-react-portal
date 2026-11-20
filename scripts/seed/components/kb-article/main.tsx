import { useRef } from 'react';
import { usePortalLocation, useServer, Link, toast } from '@portal/runtime';
import { Button } from 'components:button';
import { Card } from 'components:card';
import { Icon } from 'components:icon';
import { Tooltip, TooltipTrigger, TooltipContent } from 'components:tooltip';
import { cx } from 'components:app/field';
import {
    useKbArticle,
    useKnowledgeBases,
    useKbCategories,
    useKbArticles,
    useRelatedArticles,
    useArticleToc,
    useRecordArticleView,
    categoryPath,
    readingMinutes,
    kbLinks,
    printArticle,
    shareArticle,
    copyText,
    canShare,
    articleUrl,
} from 'utilities:app/knowledge';
import type { KbArticleSummary } from 'utilities:app/knowledge';
import { useAttachments } from 'utilities:app/attachments';
import { AttachmentList } from 'components:app/attachment-list';
import {
    KbArticleHeader,
    KbArticleBody,
    KbArticleSkeleton,
    KbArticleUnavailable,
} from 'components:app/kb-article-view';
import { KbToc } from 'components:app/kb-toc';
import { KbFeedback } from 'components:app/kb-feedback';
import { KbArticleList, KbArticleListSkeleton } from 'components:app/kb-article-list';

type Options = {
    /** Restrict to these knowledge bases (sys_ids); empty = every KB the user can read. */
    knowledgeBases?: string[] | string;
    homePage?: string;
    categoryPage?: string;
    searchPage?: string;
    articlePage?: string;
    /** "On this page" from the article's headings. */
    showToc?: boolean;
    /** auto: when the article's "Display attachments" is on (the platform's rule); always; never. */
    attachments?: 'auto' | 'always' | 'never';
    showFeedback?: boolean;
    showRelated?: boolean;
    showMoreInCategory?: boolean;
    relatedLimit?: number;
    /** Count the view (kb_use + sys_view_count), as the platform does on every article view. */
    countViews?: boolean;
};

function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={label}
                        onClick={onClick}
                        className="text-muted-foreground hover:text-foreground"
                    />
                }
            >
                <Icon name={icon} />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

function SideList({
    title,
    icon,
    articles,
    loading,
    link,
    more,
}: {
    title: string;
    icon: string;
    articles: KbArticleSummary[];
    loading: boolean;
    link: (a: KbArticleSummary) => any;
    more?: any;
}) {
    if (!loading && !articles.length) return null;
    return (
        <Card className="gap-0 py-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h2 className="m-0 flex items-center gap-2 text-sm font-semibold">
                    <Icon name={icon} className="size-4 text-muted-foreground" aria-hidden />
                    {title}
                </h2>
                {more}
            </div>
            <div className="p-1.5">
                {loading ? (
                    <KbArticleListSkeleton rows={3} variant="compact" />
                ) : (
                    <KbArticleList articles={articles} link={link} variant="compact" showKb={false} />
                )}
            </div>
        </Card>
    );
}

/**
 * Knowledge Article: the article reading page (sys_id URL param). Breadcrumb (Knowledge › KB ›
 * category path), title, author / dates / reading time / views, print · copy link · share, the body
 * in reading typography with a sticky "On this page" (scroll-spy), attachments, "Was this helpful?" +
 * rating + flag (kb_feedback), related articles and "More in <category>". Counts the view the
 * platform's way (server.js). Composes app/kb-article-view, app/kb-toc, app/kb-feedback,
 * app/kb-article-list and app/attachment-list on utilities:app/knowledge.
 */
export default function KbArticlePage({ options = {} }: { options?: Options }) {
    const loc = (usePortalLocation() as any) || {};
    const { server } = useServer({ toastErrors: false }) as any;
    const sysId = String(loc.sysId || '');
    const links = kbLinks({
        home: options.homePage,
        category: options.categoryPage,
        search: options.searchPage,
        article: options.articlePage || String(loc.page || '') || undefined,
    });
    const a = useKbArticle(sysId);
    const art = a.data || null;
    const kbs = useKnowledgeBases({ includeEmpty: true });
    const cats = useKbCategories();
    const bodyRef = useRef<HTMLElement | null>(null);
    const toc = useArticleToc(art && !art.wiki ? art.html : '', { title: art ? art.title : '' });
    useRecordArticleView(server, art && art.live ? art.id : '', options.countViews !== false);
    const attMode = options.attachments || 'auto';
    const wantAtt = !!art && (attMode === 'always' || (attMode === 'auto' && art.displayAttachments));
    const att = useAttachments('kb_knowledge', wantAtt && art ? art.id : '', {
        live: false,
        enabled: wantAtt,
    } as any) as any;
    const files = (att && att.attachments) || [];
    const limit = Math.max(1, Math.min(10, options.relatedLimit || 5));
    const related = useRelatedArticles(art, { limit, knowledgeBases: options.knowledgeBases });
    const inCategory = useKbArticles({
        category: art ? art.categoryId : '',
        deep: false,
        exclude: art ? [art.id] : [],
        limit,
        sort: 'views',
        knowledgeBases: options.knowledgeBases,
        enabled: !!(art && art.categoryId),
    });
    const articleLink = (x: KbArticleSummary) => links.article(x.id);

    if (!sysId || a.isLoading)
        return sysId ? (
            <KbArticleSkeleton className="py-2" />
        ) : (
            <KbArticleUnavailable homeLink={links.home()} searchLink={links.search({})} />
        );
    if (!art) return <KbArticleUnavailable homeLink={links.home()} searchLink={links.search({})} />;

    const kb = kbs.byId[art.kbId] || null;
    const path = categoryPath(cats.tree, art.categoryId);
    const minutes = readingMinutes(art.html);
    const showToc = options.showToc !== false && toc.headings.length >= 2;
    const relatedList = related.articles.filter(
        (x: KbArticleSummary) => !inCategory.articles.some((y: KbArticleSummary) => y.id === x.id)
    );
    const actions = (
        <div className="rp-kba-actions flex items-center gap-0.5">
            <ActionButton
                icon="printer"
                label="Print"
                onClick={() => printArticle({ ...art, html: toc.html || art.html })}
            />
            <ActionButton
                icon="link"
                label="Copy link"
                onClick={async () =>
                    (await copyText(articleUrl()))
                        ? toast.success('Link copied')
                        : toast.error("Couldn't copy the link")
                }
            />
            {canShare() ? (
                <ActionButton
                    icon="share-2"
                    label="Share"
                    onClick={async () => {
                        const r = await shareArticle(art);
                        if (r === 'copied') toast.success('Link copied');
                        else if (r === 'failed') toast.error("Couldn't share the link");
                    }}
                />
            ) : null}
        </div>
    );
    const titleId = 'rp-kba-title-' + art.id;
    return (
        <div className="rp-kba min-w-0" data-rp-kb-article={art.number} data-toc={showToc ? '1' : '0'}>
            <div className="rp-kba-grid">
                <div className="flex min-w-0 flex-col gap-8">
                    <KbArticleHeader
                        article={art}
                        kb={kb}
                        path={path}
                        links={links}
                        minutes={minutes}
                        actions={actions}
                        titleId={titleId}
                        className="border-b border-border pb-6"
                    />
                    {showToc ? (
                        <KbToc
                            variant="collapsible"
                            headings={toc.headings}
                            rootRef={bodyRef}
                            offset={56}
                            className="rp-kba-toc-inline"
                        />
                    ) : null}
                    <KbArticleBody
                        html={art.wiki ? art.html : toc.html}
                        wiki={art.wiki}
                        contentRef={bodyRef}
                        labelledBy={titleId}
                    />
                    {wantAtt && files.length ? (
                        <section aria-labelledby={'rp-kba-att-' + art.id} className="flex max-w-[72ch] flex-col gap-2">
                            <h2
                                id={'rp-kba-att-' + art.id}
                                className="m-0 flex items-center gap-2 text-sm font-semibold"
                            >
                                <Icon name="paperclip" className="size-4 text-muted-foreground" aria-hidden />
                                Attachments
                                <span className="font-normal text-muted-foreground tabular-nums">{files.length}</span>
                            </h2>
                            <Card className="gap-0 p-1.5">
                                <AttachmentList
                                    attachments={files}
                                    layout="list"
                                    readOnly
                                    label="Article attachments"
                                />
                            </Card>
                        </section>
                    ) : null}
                    {options.showFeedback !== false && art.live ? (
                        <KbFeedback article={art} kb={kb} className="max-w-[72ch]" />
                    ) : null}
                    {(options.showRelated !== false && (related.isLoading || relatedList.length)) ||
                    (options.showMoreInCategory !== false &&
                        art.categoryId &&
                        (inCategory.isLoading || inCategory.articles.length)) ? (
                        <div className="rp-kba-related">
                            {options.showMoreInCategory !== false && art.categoryId ? (
                                <SideList
                                    title={'More in ' + (art.category || 'this category')}
                                    icon="folder-open"
                                    articles={inCategory.articles}
                                    loading={inCategory.isLoading}
                                    link={articleLink}
                                    more={
                                        inCategory.total > inCategory.articles.length ? (
                                            <Link
                                                {...links.category(art.kbId, art.categoryId)}
                                                className="text-xs font-medium text-primary no-underline hover:underline"
                                            >
                                                View all {inCategory.total + 1}
                                            </Link>
                                        ) : null
                                    }
                                />
                            ) : null}
                            {options.showRelated !== false ? (
                                <SideList
                                    title="Related articles"
                                    icon="sparkles"
                                    articles={relatedList}
                                    loading={related.isLoading}
                                    link={articleLink}
                                />
                            ) : null}
                        </div>
                    ) : null}
                </div>
                <aside className={cx('rp-kba-rail min-w-0')} aria-label="Article navigation">
                    {showToc ? (
                        <KbToc
                            headings={toc.headings}
                            rootRef={bodyRef}
                            footer={
                                <button
                                    type="button"
                                    onClick={() => {
                                        const h = document && bodyRef.current;
                                        if (h)
                                            h.closest('[data-rp-kb-article]')!.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'start',
                                            });
                                    }}
                                    className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
                                >
                                    <Icon name="arrow-up" className="size-3.5" />
                                    Back to top
                                </button>
                            }
                        />
                    ) : null}
                </aside>
            </div>
        </div>
    );
}
