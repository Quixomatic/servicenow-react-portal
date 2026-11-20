/**
 * Article feedback, written to kb_feedback as the user the way the platform does.
 *
 * The KM portal's widgets call KBPortalService.saveUsefulWithParams / saveStarRatingWithParams /
 * kbWriteCommentWithParams, which check the glide.knowman.show_* properties (and their .roles), then
 * insert a kb_feedback row with GlideRecordSecure. We do the same insert through the Table API in the
 * user's session, so the same create ACL (the user must be able to read the article) and the same
 * business rules run: session_id and user filled in, the article's rating and helpful_count
 * recalculated, flagged set on the article, a Knowledge Feedback Task opened for "not helpful",
 * low ratings and flags. The property / role gates are read from the exposed properties.
 *
 * Like KBViewModel.createOrUpdateLastFeedback, a second vote or rating in the same browser session
 * updates the row it wrote before (the write ACL lets the creator update it) instead of adding one.
 */
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from 'utilities:react-query';
import { useUser } from '@portal/runtime';
import { authHeaders } from 'utilities:app/graphql';
import { getWithTotal } from 'utilities:app/search';
import { safeId } from './api';
import { useKbProperties, KB_KEY } from './hooks';

export type KbFeedbackConfig = {
    /** "Was this helpful?" yes / no. */
    helpful: boolean;
    /** Star rating (1–5). */
    rating: boolean;
    /** Flag article (comment required). */
    flag: boolean;
    /** Ask for a reason with a flag (actionable feedback). */
    flagReasons: boolean;
    /** Ask for a reason with "No" (actionable feedback). */
    helpfulReasons: boolean;
    loading: boolean;
};

/** Reasons the platform offers (kb_feedback.reason choices). */
export const KB_FEEDBACK_REASONS = [
    { value: '1', label: 'The article is incomplete' },
    { value: '2', label: 'The article contains incorrect information' },
    { value: '3', label: 'The article is unclear' },
    { value: '4', label: 'Other' },
];

/**
 * Which feedback controls this user gets, from the platform's properties (glide.knowman.show_rating_options,
 * show_yn_rating, show_star_rating, show_flag and their .roles; "public" = everyone) and the
 * knowledge base's / article's own switches (disable_mark_as_helpful, disable_rating,
 * disable_suggesting).
 */
export function useKbFeedbackConfig(
    kb?: { disableHelpful?: boolean; disableRating?: boolean; disableSuggesting?: boolean } | null,
    article?: { disableSuggesting?: boolean } | null
): KbFeedbackConfig {
    const { values, isLoading } = useKbProperties();
    const user = useUser() as any;
    const on = (name: string, dflt = 'true') => {
        const raw = values[name];
        const value = String(raw === null || raw === undefined || raw === '' ? dflt : raw).toLowerCase();
        if (value === 'false') return false;
        const roles = String(values[name + '.roles'] || '').trim();
        if (!roles || roles === 'public') return true;
        const list = roles
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean);
        return list.indexOf('public') >= 0 || !!(user && user.hasAnyRole && user.hasAnyRole(list));
    };
    const options = on('glide.knowman.show_rating_options');
    return {
        helpful: options && on('glide.knowman.show_yn_rating') && !(kb && kb.disableHelpful),
        rating: options && on('glide.knowman.show_star_rating') && !(kb && kb.disableRating),
        flag: on('glide.knowman.show_flag') && !(kb && kb.disableSuggesting) && !(article && article.disableSuggesting),
        flagReasons: String(values['glide.knowman.feedback.enable_actionable_feedback_for_flag'] || '') === 'true',
        helpfulReasons:
            String(values['glide.knowman.feedback.enable_actionable_feedback_for_helpful'] || '') === 'true',
        loading: isLoading,
    };
}

async function send(method: 'POST' | 'PATCH', url: string, body: any): Promise<any> {
    const r = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: authHeaders(true),
        body: JSON.stringify(body),
    });
    const text = await r.text();
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch (e) {
        /* not JSON */
    }
    if (!r.ok) {
        const err: any = new Error(
            (json && json.error && (json.error.message || json.error.detail)) || `HTTP ${r.status}`
        );
        err.status = r.status;
        throw err;
    }
    return json ? json.result : null;
}

const FIELDS = 'sys_id,article,useful,rating,flagged,comments,reason,session_id';

/** Insert a kb_feedback row (article + fields) as the user. */
export function createFeedback(article: string, fields: Record<string, any>) {
    return send('POST', `/api/now/table/kb_feedback?sysparm_fields=${FIELDS}`, { ...fields, article: safeId(article) });
}

/** Update a kb_feedback row the user created. */
export function updateFeedback(sysId: string, fields: Record<string, any>) {
    return send('PATCH', `/api/now/table/kb_feedback/${safeId(sysId)}?sysparm_fields=${FIELDS}`, fields);
}

type Mine = { useful?: { id: string; value: 'yes' | 'no' }; rating?: { id: string; value: number }; flagged?: boolean };

const storeKey = (article: string) => 'x_312987_portal.kb.feedback.' + article;

function readMine(article: string): Mine {
    try {
        const raw = sessionStorage.getItem(storeKey(article));
        return raw ? JSON.parse(raw) || {} : {};
    } catch (e) {
        return {};
    }
}

function writeMine(article: string, mine: Mine) {
    try {
        sessionStorage.setItem(storeKey(article), JSON.stringify(mine));
    } catch (e) {
        /* blocked */
    }
}

export type FeedbackStats = { yes: number; no: number; total: number; percent: number | null };

/**
 * Helpful counts for an article: kb_feedback rows with useful = yes / any, counted through the Table
 * API's X-Total-Count as the user (the Aggregate API refuses kb_feedback even to admins). Feedback
 * read ACL: the user must be able to read the article.
 */
export async function fetchFeedbackStats(article: string, signal?: AbortSignal): Promise<FeedbackStats> {
    const id = safeId(article);
    const count = async (q: string) => {
        const r = await getWithTotal(
            `/api/now/table/kb_feedback?sysparm_query=${encodeURIComponent('article=' + id + '^' + q)}&sysparm_fields=sys_id&sysparm_limit=1`,
            signal
        );
        return r.total;
    };
    const [yes, total] = await Promise.all([count('useful=yes'), count('usefulISNOTEMPTY')]);
    return { yes, no: Math.max(0, total - yes), total, percent: total ? Math.round((yes * 100) / total) : null };
}

/**
 * Feedback for one article: the user's own vote / rating this session, the helpful stats, and
 * actions. `vote('no', { comments, reason })` sends the comment with the vote (one row, so the
 * feedback task the platform opens carries it).
 */
export function useArticleFeedback(article: string | undefined) {
    const id = safeId(article);
    const qc = useQueryClient();
    const [mine, setMine] = useState<Mine>(() => (id ? readMine(id) : {}));
    const [pending, setPending] = useState<'' | 'vote' | 'rate' | 'flag'>('');
    const [error, setError] = useState<string>('');
    useEffect(() => setMine(id ? readMine(id) : {}), [id]);
    const stats = useQuery({
        queryKey: [KB_KEY, 'feedback-stats', id],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchFeedbackStats(id, signal),
        enabled: !!id,
        staleTime: 60_000,
        retry: false,
    }) as any;
    const save = (next: Mine) => {
        setMine(next);
        writeMine(id, next);
    };
    const run = useCallback(
        async (kind: 'vote' | 'rate' | 'flag', fn: () => Promise<void>) => {
            setPending(kind);
            setError('');
            try {
                await fn();
                qc.invalidateQueries({ queryKey: [KB_KEY, 'feedback-stats', id] });
                qc.invalidateQueries({ queryKey: [KB_KEY, 'article', id] });
                return true;
            } catch (e: any) {
                setError(
                    e && e.status === 403
                        ? "You can't leave feedback on this article."
                        : "Couldn't send your feedback: " + String((e && e.message) || e)
                );
                return false;
            } finally {
                setPending('');
            }
        },
        [id, qc]
    );
    const vote = useCallback(
        (value: 'yes' | 'no', extra: { comments?: string; reason?: string } = {}) =>
            run('vote', async () => {
                const current = readMine(id);
                const fields: any = { useful: value };
                if (extra.comments) fields.comments = extra.comments;
                if (extra.reason) fields.reason = extra.reason;
                const row = current.useful
                    ? await updateFeedback(current.useful.id, fields)
                    : await createFeedback(id, fields);
                save({
                    ...current,
                    useful: { id: String((row && row.sys_id) || (current.useful && current.useful.id) || ''), value },
                });
            }),
        [id, run]
    );
    const rate = useCallback(
        (value: number) =>
            run('rate', async () => {
                const n = Math.max(1, Math.min(5, Math.round(value)));
                const current = readMine(id);
                const row = current.rating
                    ? await updateFeedback(current.rating.id, { rating: n })
                    : await createFeedback(id, { rating: n });
                save({
                    ...current,
                    rating: {
                        id: String((row && row.sys_id) || (current.rating && current.rating.id) || ''),
                        value: n,
                    },
                });
            }),
        [id, run]
    );
    const flag = useCallback(
        (comments: string, reason?: string) =>
            run('flag', async () => {
                const fields: any = { flagged: 'true', comments: String(comments || '').trim() };
                if (reason) fields.reason = reason;
                await createFeedback(id, fields);
                save({ ...readMine(id), flagged: true });
            }),
        [id, run]
    );
    return {
        mine: {
            useful: mine.useful ? mine.useful.value : undefined,
            rating: mine.rating ? mine.rating.value : 0,
            flagged: !!mine.flagged,
        },
        stats: (stats.data as FeedbackStats) || null,
        vote,
        rate,
        flag,
        pending,
        error,
        clearError: () => setError(''),
    };
}
