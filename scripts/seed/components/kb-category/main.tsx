import { useState } from 'react';
import { usePortalLocation, useNavigate, Link } from '@portal/runtime';
import { Card } from 'components:card';
import { Icon } from 'components:icon';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from 'components:empty';
import { cx } from 'components:app/field';
import {
    useKnowledgeBases,
    useKbCategories,
    useKbArticles,
    categoryPath,
    kbLinks,
    safeId,
} from 'utilities:app/knowledge';
import type { KbArticleSummary, KbCategoryNode, KbSort } from 'utilities:app/knowledge';
import { KbBreadcrumb } from 'components:app/kb-article-view';
import type { KbCrumb } from 'components:app/kb-article-view';
import { KbArticleList, KbArticleListSkeleton, KbPager, KbSortSelect } from 'components:app/kb-article-list';
import { KbCategoryTree, KbSubcategoryGrid } from 'components:app/kb-category-tree';

type Options = {
    knowledgeBases?: string[] | string;
    pageSize?: number;
    /** Default sort: views, updated, published, title, rating. */
    sort?: KbSort;
    homePage?: string;
    articlePage?: string;
    searchPage?: string;
    showTree?: boolean;
    showSubcategories?: boolean;
};

const SORTS: KbSort[] = ['views', 'updated', 'published', 'rating', 'title'];

/**
 * Knowledge Category: browse a knowledge base or one of its categories (q kb=…&category=…). Breadcrumb,
 * title and count, the KB's category tree (sticky, counts), subcategory tiles, a search box scoped to
 * the category, then the articles (subcategories included or not) with sort and numbered paging (q
 * sort, page, all=0). State lives in the URL, so Back and shared links work. Built on
 * utilities:app/knowledge.
 */
export default function KbCategoryPage({ options = {} }: { options?: Options }) {
    const loc = (usePortalLocation() as any) || {};
    const navigate = useNavigate();
    const qp = (loc.qParams || {}) as Record<string, string>;
    const here = String(loc.page || 'kb/category');
    const links = kbLinks({
        home: options.homePage,
        article: options.articlePage,
        category: here,
        search: options.searchPage,
    });
    const kbs = useKnowledgeBases({ ids: options.knowledgeBases, includeEmpty: true });
    const cats = useKbCategories({ ids: options.knowledgeBases });
    const category = safeId(qp.category);
    const node: KbCategoryNode | undefined = cats.tree && category ? cats.tree.byId[category] : undefined;
    const kbId = safeId(qp.kb) || (node && node.kb) || (kbs.data.length === 1 ? kbs.data[0].id : '');
    const kb = kbs.byId[kbId];
    const sort: KbSort = SORTS.indexOf(qp.sort as KbSort) >= 0 ? (qp.sort as KbSort) : options.sort || 'views';
    const page = Math.max(1, parseInt(qp.page || '1', 10) || 1);
    const deep = qp.all !== '0';
    const pageSize = Math.max(5, Math.min(50, options.pageSize || 15));
    const list = useKbArticles({
        kb: kbId,
        category,
        deep,
        sort,
        page,
        limit: pageSize,
        knowledgeBases: options.knowledgeBases,
    });
    const [term, setTerm] = useState('');
    const state = (extra: Record<string, any>) =>
        links.category(kbId, category, {
            sort: sort === (options.sort || 'views') ? '' : sort,
            all: deep ? '' : '0',
            ...extra,
        });
    const go = (extra: Record<string, any>) => {
        const l = state(extra);
        navigate(l.to, { q: l.q });
    };

    const notFound = cats.tree && kbs.ready && ((category && !node) || (qp.kb && !kb));
    if (notFound) {
        return (
            <Card className="py-0">
                <Empty className="py-16">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Icon name="folder-x" />
                        </EmptyMedia>
                        <EmptyTitle>Category not available</EmptyTitle>
                        <EmptyDescription>It may have been removed, or you may not have access to it.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </Card>
        );
    }

    const path = categoryPath(cats.tree, category);
    const crumbs: KbCrumb[] = [{ label: 'Knowledge', link: links.home() }];
    if (kb) crumbs.push({ label: kb.title, link: category ? links.kb(kb.id) : undefined });
    path.forEach((c, i) =>
        crumbs.push({ label: c.label, link: i < path.length - 1 ? links.category(kbId, c.id) : undefined })
    );
    const title = node ? node.label : kb ? kb.title : 'All articles';
    const children: KbCategoryNode[] = node ? node.children : kbId && cats.tree ? cats.tree.byKb[kbId] || [] : [];
    const showTree = options.showTree !== false && !!kbId;
    const articles: KbArticleSummary[] = list.articles;
    const from = (page - 1) * pageSize + 1;

    return (
        <div className="rp-kbc min-w-0" data-rp-kb-category={category || kbId}>
            <div
                className={cx('rp-kbc-grid', showTree ? '' : 'rp-kbc-grid--single')}
                style={showTree ? undefined : { gridTemplateColumns: 'minmax(0, 1fr)' }}
            >
                {showTree ? (
                    <aside className="rp-kbc-side min-w-0" aria-label="Categories">
                        <Card className="gap-0 py-0">
                            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                                <Icon name="folder-tree" className="size-4 text-muted-foreground" aria-hidden />
                                <span className="truncate text-sm font-semibold">{kb ? kb.title : 'Categories'}</span>
                            </div>
                            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-2">
                                <KbCategoryTree
                                    tree={cats.tree}
                                    kb={kbId}
                                    activeId={category}
                                    loading={cats.isLoading}
                                    link={(c) => links.category(kbId, c.id)}
                                    allLink={links.kb(kbId)}
                                    allLabel="All articles"
                                    allCount={kb ? kb.count : undefined}
                                    aria-label={(kb ? kb.title : 'Knowledge') + ' categories'}
                                />
                            </div>
                        </Card>
                    </aside>
                ) : null}
                <div className="flex min-w-0 flex-col gap-6">
                    <header className="flex min-w-0 flex-col gap-3">
                        <KbBreadcrumb items={crumbs} />
                        <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-3">
                            <div className="flex min-w-0 flex-col gap-1">
                                <h1 className="m-0 text-2xl leading-tight font-semibold tracking-tight text-balance">
                                    {title}
                                </h1>
                                {!node && kb && kb.description ? (
                                    <p className="m-0 max-w-[70ch] text-sm text-muted-foreground">{kb.description}</p>
                                ) : null}
                            </div>
                            <form
                                role="search"
                                className="relative w-72 max-w-full"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!term.trim()) return;
                                    const l = links.search({ term: term.trim(), kb: kbId, category });
                                    navigate(l.to, { q: l.q });
                                }}
                            >
                                <Icon
                                    name="search"
                                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden
                                />
                                <input
                                    type="search"
                                    value={term}
                                    onChange={(e) => setTerm(e.target.value)}
                                    placeholder={'Search in ' + title}
                                    aria-label={'Search in ' + title}
                                    className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
                                />
                            </form>
                        </div>
                    </header>

                    {options.showSubcategories !== false &&
                    children.some((c) => c.count > 0 || (cats.tree && !cats.tree.countsKnown)) ? (
                        <section aria-labelledby="rp-kbc-sub" className="flex flex-col gap-2.5">
                            <h2 id="rp-kbc-sub" className="m-0 text-sm font-semibold text-muted-foreground">
                                {node ? 'Subcategories' : 'Categories'}
                            </h2>
                            <KbSubcategoryGrid
                                nodes={children}
                                link={(c) => links.category(kbId, c.id)}
                                countsKnown={!cats.tree || cats.tree.countsKnown}
                            />
                        </section>
                    ) : null}

                    <section aria-labelledby="rp-kbc-list" className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                            <h2 id="rp-kbc-list" className="m-0 text-base font-semibold tracking-tight">
                                Articles{' '}
                                <span className="font-normal text-muted-foreground tabular-nums" aria-live="polite">
                                    {list.isLoading ? '' : list.total.toLocaleString()}
                                </span>
                            </h2>
                            <div className="flex flex-wrap items-center gap-3">
                                {node && node.children.length ? (
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
                                        <input
                                            type="checkbox"
                                            checked={deep}
                                            onChange={(e) => go({ all: e.target.checked ? '' : '0', page: 1 })}
                                            className="size-4 accent-[var(--primary)]"
                                        />
                                        Include subcategories
                                    </label>
                                ) : null}
                                <KbSortSelect
                                    value={sort}
                                    sorts={SORTS}
                                    onChange={(s) => go({ sort: s === (options.sort || 'views') ? '' : s, page: 1 })}
                                />
                            </div>
                        </div>
                        <Card
                            className={cx(
                                'gap-0 py-0 transition-opacity',
                                list.isFetching && !list.isLoading ? 'opacity-70' : ''
                            )}
                            aria-busy={list.isFetching || undefined}
                        >
                            {list.isLoading ? (
                                <KbArticleListSkeleton rows={6} />
                            ) : articles.length ? (
                                <KbArticleList
                                    articles={articles}
                                    link={(a) => links.article(a.id)}
                                    showKb={false}
                                    showCategory={!!(node ? node.children.length && deep : true)}
                                    showSnippet={false}
                                />
                            ) : (
                                <Empty className="py-12">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <Icon name="book-open" />
                                        </EmptyMedia>
                                        <EmptyTitle>No articles here yet</EmptyTitle>
                                        <EmptyDescription>
                                            {node && node.children.length && !deep
                                                ? 'Include subcategories, or try another category.'
                                                : 'Try another category, or search all knowledge.'}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            )}
                        </Card>
                        {list.total ? (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {from.toLocaleString()}–
                                    {Math.min(list.total, from + articles.length - 1).toLocaleString()} of{' '}
                                    {list.total.toLocaleString()}
                                </span>
                                <KbPager page={page} pages={list.pages} link={(n) => state({ page: n })} />
                            </div>
                        ) : null}
                    </section>
                </div>
            </div>
        </div>
    );
}
