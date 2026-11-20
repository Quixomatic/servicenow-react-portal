/**
 * utilities:app/knowledge: knowledge base logic for any widget (no markup).
 *
 * Reads run as the user (Table / Aggregate API), so the platform's KB ACLs apply: a knowledge base's
 * can / cannot read user criteria decide which KBs, categories and articles come back. Every article
 * query also carries kb_knowledge_baseIN<readable KBs>, which keeps totals and facet counts exact.
 *
 * Hooks
 *   useKnowledgeBases({ ids?, includeEmpty? })   readable KBs with published counts → { data, all, byId, readableIds }
 *   useKbCategories({ ids? })                     category tree (byKb roots, byId), counts own + descendants
 *   useKbArticles({ kb, category, deep, types, sort, limit, page, featured, exclude, term, withText })
 *   useKbSearch({ term, kb, category, types, sort, page, pageSize })   results + excerpts + facets
 *   useKbArticle(sysId)                           one article (null when missing or not readable)
 *   useRelatedArticles(article, { limit })        text-index matches on the title's keywords
 *   useArticleToc(html, { title })                sanitised HTML with heading ids + TocHeading[]
 *   useTocSpy(rootRef, ids, offset?)              the heading being read (scroll-spy)
 *   useArticleFeedback(sysId)                     { mine, stats, vote, rate, flag, pending, error }
 *   useKbFeedbackConfig(kb, article)              which feedback controls the user gets (properties + roles + KB switches)
 *   useKbProperties()                             the exposed glide.knowman.* properties (KB_PROPERTIES)
 *   useRecordArticleView(server, sysId)           count one view per article per mount
 *
 * Plain functions
 *   recordArticleView(server, sysId)              the platform's view count (needs the widget server handler, below)
 *   fetchKnowledgeBases, fetchCategoryTree, fetchArticles, fetchFacets, fetchArticle, fetchFeedbackStats,
 *   createFeedback, updateFeedback, articleCondition, publishedCondition, categoryWithDescendants, categoryPath,
 *   prepareArticleHtml, slugify, scrollParent, scrollToHeading, readingMinutes, articleText, excerpt, keywords,
 *   printArticle, shareArticle, copyText, canShare, articleUrl, kbLinks, formatKbDate, KB_SORTS, KB_FEEDBACK_REASONS
 *
 * View counting needs a server script. A widget that counts views handles this input:
 *
 *   if (input && input.kbAction === 'view') {
 *       var kb = new GlideRecordSecure('kb_knowledge')
 *       if (kb.get(String(input.article))) {
 *           new global.KBViewModel().increaseKBView(kb)                     // sys_view_count (incrementViewCount)
 *           var use = new GlideRecord('kb_use')                               // the row the kb.view script action writes
 *           use.setValue('article', kb.getUniqueValue()); use.setValue('user', gs.getUserID())
 *           use.setValue('viewed', true); use.setValue('session_id', gs.getSessionID()); use.insert()
 *           // (gs.eventQueue('kb.view') is refused from a scoped app: the event belongs to global)
 *           data.kbView = { views: … }
 *       }
 *   }
 *
 * (app/kb-article's server.js does exactly that, the same calls the platform's own portal widgets make.)
 */
export {
    fetchKnowledgeBases,
    fetchCategoryTree,
    fetchArticles,
    fetchFacets,
    fetchArticle,
    articleCondition,
    publishedCondition,
    categoryWithDescendants,
    categoryPath,
    articleSummary,
    articleText,
    excerpt,
    keywords,
    readingMinutes,
    safeId,
    safeIds,
    KB_SORTS,
    ARTICLE_LIST_FIELDS,
} from './api';
export type {
    KnowledgeBase,
    KbCategoryNode,
    KbCategoryTree,
    KbArticleSummary,
    KbArticle,
    KbSort,
    KbFacets,
    KbFacetValue,
    ArticleQuery,
    ArticlePage,
} from './api';
export {
    useKnowledgeBases,
    useKbCategories,
    useKbArticles,
    useKbSearch,
    useKbArticle,
    useRelatedArticles,
    useKbProperties,
    recordArticleView,
    useRecordArticleView,
    KB_KEY,
    KB_PROPERTIES,
} from './hooks';
export type { KbArticlesOptions } from './hooks';
export { prepareArticleHtml, useArticleToc, useTocSpy, scrollToHeading, scrollParent, slugify } from './toc';
export type { TocHeading } from './toc';
export {
    useArticleFeedback,
    useKbFeedbackConfig,
    createFeedback,
    updateFeedback,
    fetchFeedbackStats,
    KB_FEEDBACK_REASONS,
} from './feedback';
export type { KbFeedbackConfig, FeedbackStats } from './feedback';
export { printArticle, shareArticle, copyText, canShare, articleUrl } from './actions';

export type KbPages = {
    /** KB home (default 'kb'). */
    home?: string;
    /** Article page, opened with sys_id (default 'kb/article'). */
    article?: string;
    /** Category / knowledge base browsing, q kb=…&category=… (default 'kb/category'). */
    category?: string;
    /** KB search, q term=…&kb=…&category=…&type=…&sort=…&page=… (default 'kb/search'). */
    search?: string;
};

/** <Link> props for the KB pages (one place that knows the routes and their params). */
export function kbLinks(p: KbPages = {}) {
    const pages = {
        home: p.home || 'kb',
        article: p.article || 'kb/article',
        category: p.category || 'kb/category',
        search: p.search || 'kb/search',
    };
    const clean = (q: Record<string, any>) => {
        const out: Record<string, string> = {};
        Object.keys(q).forEach((k) => {
            const value = q[k];
            if (value !== undefined && value !== null && value !== '' && !(k === 'page' && String(value) === '1'))
                out[k] = String(value);
        });
        return out;
    };
    return {
        pages,
        home: () => ({ to: pages.home }),
        article: (sysId: string) => ({ to: pages.article, sysId }),
        kb: (kb: string) => ({ to: pages.category, q: clean({ kb }) }),
        category: (kb: string, category?: string, extra: Record<string, any> = {}) => ({
            to: pages.category,
            q: clean({ kb, category, ...extra }),
        }),
        search: (q: {
            term?: string;
            kb?: string;
            category?: string;
            type?: string;
            sort?: string;
            page?: number;
        }) => ({ to: pages.search, q: clean(q) }),
    };
}

/** A date for article metadata: "12 Mar 2024" (from 'YYYY-MM-DD[ HH:mm:ss]' UTC values), '' when empty. */
export function formatKbDate(value: string, opts: { relative?: boolean } = {}): string {
    const s = String(value || '').trim();
    if (!s) return '';
    const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return s;
    if (opts.relative) {
        const days = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (days < 1) return 'today';
        if (days < 2) return 'yesterday';
        if (days < 30) return days + ' days ago';
        if (days < 365) {
            const m = Math.floor(days / 30);
            return m + (m === 1 ? ' month ago' : ' months ago');
        }
        const y = Math.floor(days / 365);
        return y + (y === 1 ? ' year ago' : ' years ago');
    }
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function KnowledgeUtility() {
    return null;
}
