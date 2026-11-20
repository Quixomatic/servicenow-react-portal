import { useId, useRef, useState } from 'react';
import { toast } from '@portal/runtime';
import { Button } from 'components:button';
import { Icon } from 'components:icon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from 'components:dialog';
import { cx } from 'components:app/field';
import { useArticleFeedback, useKbFeedbackConfig, KB_FEEDBACK_REASONS } from 'utilities:app/knowledge';
import type { KbArticle, KnowledgeBase } from 'utilities:app/knowledge';

/**
 * components:app/kb-feedback: article feedback, written to kb_feedback as the user (the platform's
 * ACLs and business rules apply; see utilities:app/knowledge useArticleFeedback).
 *
 *   <KbFeedback article={article} kb={kb} />        "Was this helpful?" (No asks what was missing),
 *                                                    star rating, helpful stats, Flag article
 *   <StarRatingInput value onChange />               accessible 1–5 radio group (arrow keys)
 *   <StarRatingDisplay value />                      read-only stars (average rating)
 *   <KbFlagDialog open onOpenChange onSubmit reasons />
 *   <KbFlagButton article kb />                      the flag action alone (for a toolbar)
 *
 * What shows follows the platform: glide.knowman.show_rating_options / show_yn_rating /
 * show_star_rating / show_flag (+ .roles) and the KB's disable_mark_as_helpful / disable_rating /
 * disable_suggesting (useKbFeedbackConfig).
 */

const STAR =
    'M11.48 3.5a.56.56 0 0 1 1.04 0l2.12 5.11a.56.56 0 0 0 .48.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.39a.56.56 0 0 1-.84.61l-4.73-2.89a.56.56 0 0 0-.58 0l-4.73 2.89a.56.56 0 0 1-.84-.61l1.28-5.39a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .48-.35z';

function Star({ fill, className }: { fill: number; className?: string }) {
    const id = useId().replace(/:/g, '');
    return (
        <svg viewBox="0 0 24 24" aria-hidden className={cx('size-5', className)}>
            <defs>
                <linearGradient id={'g' + id}>
                    <stop offset={fill} stopColor="currentColor" />
                    <stop offset={fill} stopColor="transparent" />
                </linearGradient>
            </defs>
            <path d={STAR} fill={`url(#g${id})`} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
    );
}

export function StarRatingDisplay({
    value,
    className,
    size = 'sm',
}: {
    value: number;
    className?: string;
    size?: 'sm' | 'md';
}) {
    const v = Math.max(0, Math.min(5, value || 0));
    return (
        <span
            className={cx('inline-flex items-center gap-0.5 text-amber-500', className)}
            role="img"
            aria-label={`Rated ${v.toFixed(1)} out of 5`}
        >
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    fill={Math.max(0, Math.min(1, v - (i - 1)))}
                    className={size === 'sm' ? 'size-4' : 'size-5'}
                />
            ))}
        </span>
    );
}

/** 1–5 stars as a radio group: arrow keys move and select, Home / End jump. */
export function StarRatingInput({
    value,
    onChange,
    disabled,
    label = 'Rate this article',
    className,
}: {
    value: number;
    onChange: (n: number) => void;
    disabled?: boolean;
    label?: string;
    className?: string;
}) {
    const [hover, setHover] = useState(0);
    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    const shown = hover || value;
    const focusable = value || 1;
    const words = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
    const move = (n: number) => {
        const k = Math.max(1, Math.min(5, n));
        onChange(k);
        const el = refs.current[k - 1];
        if (el) el.focus();
    };
    return (
        <div className={cx('flex items-center gap-2', className)}>
            <div role="radiogroup" aria-label={label} className="flex items-center" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        ref={(el) => {
                            refs.current[n - 1] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} star${n === 1 ? '' : 's'}, ${words[n]}`}
                        tabIndex={n === focusable ? 0 : -1}
                        disabled={disabled}
                        onMouseEnter={() => setHover(n)}
                        onClick={() => onChange(n)}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
                                (e.preventDefault(), move((value || 0) + 1));
                            else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
                                (e.preventDefault(), move((value || 2) - 1));
                            else if (e.key === 'Home') (e.preventDefault(), move(1));
                            else if (e.key === 'End') (e.preventDefault(), move(5));
                        }}
                        className={cx(
                            'rounded-md p-0.5 outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/40 enabled:hover:scale-110 disabled:opacity-50',
                            n <= shown ? 'text-amber-500' : 'text-muted-foreground/45'
                        )}
                    >
                        <Star fill={n <= shown ? 1 : 0} className="size-6" />
                    </button>
                ))}
            </div>
            <span className="min-w-16 text-xs text-muted-foreground" aria-live="polite">
                {shown ? words[shown] : ''}
            </span>
        </div>
    );
}

const fieldCls =
    'w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30';

function Reasons({ value, onChange, name }: { value: string; onChange: (v: string) => void; name: string }) {
    return (
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1.5 p-0 text-sm font-medium">Reason</legend>
            {KB_FEEDBACK_REASONS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                        type="radio"
                        name={name}
                        value={r.value}
                        checked={value === r.value}
                        onChange={() => onChange(r.value)}
                        className="size-4 accent-[var(--primary)]"
                    />
                    {r.label}
                </label>
            ))}
        </fieldset>
    );
}

/** Flag dialog: a required comment (and a reason when actionable feedback is on). */
export function KbFlagDialog({
    open,
    onOpenChange,
    onSubmit,
    reasons,
    busy,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    onSubmit: (comment: string, reason?: string) => Promise<boolean> | void;
    reasons?: boolean;
    busy?: boolean;
}) {
    const [comment, setComment] = useState('');
    const [reason, setReason] = useState('');
    const [tried, setTried] = useState(false);
    const id = useId().replace(/:/g, '');
    const missing = !comment.trim() || (reasons && !reason);
    const submit = async () => {
        setTried(true);
        if (missing) return;
        const ok = await onSubmit(comment.trim(), reasons ? reason : undefined);
        if (ok !== false) {
            setComment('');
            setReason('');
            setTried(false);
            onOpenChange(false);
        }
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Flag this article</DialogTitle>
                    <DialogDescription>
                        Tell the knowledge team what's wrong. Flagged articles are reviewed and fixed or retired.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    {reasons ? <Reasons value={reason} onChange={setReason} name={'rp-kb-flag-' + id} /> : null}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor={'rp-kb-flag-c-' + id} className="text-sm font-medium">
                            Comment <span className="text-destructive">*</span>
                        </label>
                        <textarea
                            id={'rp-kb-flag-c-' + id}
                            rows={4}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            aria-invalid={tried && !comment.trim() ? true : undefined}
                            aria-required
                            placeholder="What's incorrect, outdated or missing?"
                            className={cx(fieldCls, 'resize-y aria-invalid:border-destructive')}
                        />
                        {tried && missing ? (
                            <p className="m-0 text-xs text-destructive">
                                {!comment.trim() ? 'A comment is required.' : 'Pick a reason.'}
                            </p>
                        ) : null}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={busy}>
                        {busy ? <Icon name="loader-circle" className="animate-spin" /> : <Icon name="flag" />}
                        Flag article
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** The flag action alone (shown only where the platform allows flagging for this user and article). */
export function KbFlagButton({
    article,
    kb,
    variant = 'ghost',
    size = 'sm',
    label = true,
    className,
}: {
    article: KbArticle;
    kb?: KnowledgeBase | null;
    variant?: any;
    size?: any;
    label?: boolean;
    className?: string;
}) {
    const cfg = useKbFeedbackConfig(kb, article);
    const fb = useArticleFeedback(article.id);
    const [open, setOpen] = useState(false);
    if (!cfg.flag || cfg.loading) return null;
    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={className}
                onClick={() => setOpen(true)}
                disabled={fb.mine.flagged}
                aria-label={label ? undefined : fb.mine.flagged ? 'Flagged' : 'Flag article'}
                title={label ? undefined : fb.mine.flagged ? 'Flagged' : 'Flag article'}
            >
                <Icon name="flag" />
                {label ? (fb.mine.flagged ? 'Flagged' : 'Flag article') : null}
            </Button>
            <KbFlagDialog
                open={open}
                onOpenChange={setOpen}
                reasons={cfg.flagReasons}
                busy={fb.pending === 'flag'}
                onSubmit={async (c, r) => {
                    const ok = await fb.flag(c, r);
                    if (ok) toast.success('Thanks. The article has been flagged for review.');
                    else toast.error(fb.error || "Couldn't flag the article.");
                    return ok;
                }}
            />
        </>
    );
}

/**
 * The article's feedback block: "Was this article helpful?" (Yes thanks you; No asks what was
 * missing, optionally with a reason, then sends both together), a star rating, the helpful share
 * and the average rating. Nothing renders when the platform hides every option for this user.
 */
export function KbFeedback({
    article,
    kb,
    className,
    showFlag = true,
}: {
    article: KbArticle;
    kb?: KnowledgeBase | null;
    className?: string;
    showFlag?: boolean;
}) {
    const cfg = useKbFeedbackConfig(kb, article);
    const fb = useArticleFeedback(article.id);
    const [asking, setAsking] = useState(false);
    const [comment, setComment] = useState('');
    const [reason, setReason] = useState('');
    const [thanked, setThanked] = useState('');
    const id = useId().replace(/:/g, '');
    if (cfg.loading || (!cfg.helpful && !cfg.rating && !(showFlag && cfg.flag))) return null;
    const vote = async (value: 'yes' | 'no', extra: any = {}) => {
        const ok = await fb.vote(value, extra);
        if (ok) {
            setAsking(false);
            setComment('');
            setThanked(
                value === 'yes' ? 'Thanks! Glad it helped.' : 'Thanks. Your feedback goes to the article’s owners.'
            );
        } else toast.error(fb.error || "Couldn't send your feedback.");
    };
    const stats = fb.stats;
    const voted = fb.mine.useful;
    return (
        <section
            aria-labelledby={'rp-kb-fb-' + id}
            className={cx(
                'flex flex-col gap-5 rounded-xl border border-border bg-muted/30 px-5 py-4 max-sm:px-4!',
                className
            )}
            data-rp-kb-feedback=""
        >
            {cfg.helpful ? (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <h2 id={'rp-kb-fb-' + id} className="m-0 text-[15px] font-semibold tracking-tight">
                            Was this article helpful?
                        </h2>
                        <div className="flex items-center gap-2" role="group" aria-label="Was this article helpful?">
                            <Button
                                variant={voted === 'yes' ? 'default' : 'outline'}
                                size="sm"
                                aria-pressed={voted === 'yes'}
                                disabled={fb.pending === 'vote'}
                                onClick={() => vote('yes')}
                                className="min-w-[4.5rem]"
                            >
                                <Icon name="thumbs-up" />
                                Yes
                            </Button>
                            <Button
                                variant={voted === 'no' || asking ? 'default' : 'outline'}
                                size="sm"
                                aria-pressed={voted === 'no'}
                                aria-expanded={asking}
                                disabled={fb.pending === 'vote'}
                                onClick={() => {
                                    setThanked('');
                                    setAsking(true);
                                }}
                                className="min-w-[4.5rem]"
                            >
                                <Icon name="thumbs-down" />
                                No
                            </Button>
                        </div>
                    </div>
                    {asking ? (
                        <form
                            className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3.5"
                            onSubmit={(e) => {
                                e.preventDefault();
                                vote('no', {
                                    comments: comment.trim(),
                                    reason: cfg.helpfulReasons ? reason : undefined,
                                });
                            }}
                        >
                            {cfg.helpfulReasons ? (
                                <Reasons value={reason} onChange={setReason} name={'rp-kb-why-' + id} />
                            ) : null}
                            <label htmlFor={'rp-kb-c-' + id} className="text-sm font-medium">
                                What was missing or unclear?{' '}
                                <span className="font-normal text-muted-foreground">(optional)</span>
                            </label>
                            <textarea
                                id={'rp-kb-c-' + id}
                                rows={3}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className={cx(fieldCls, 'resize-y')}
                                placeholder="Help us improve this article"
                                autoFocus
                            />
                            <div className="flex flex-wrap justify-end gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setAsking(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={fb.pending === 'vote'}>
                                    {fb.pending === 'vote' ? (
                                        <Icon name="loader-circle" className="animate-spin" />
                                    ) : null}
                                    Send feedback
                                </Button>
                            </div>
                        </form>
                    ) : null}
                    <p className="m-0 min-h-4 text-xs text-muted-foreground" aria-live="polite">
                        {thanked ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                                <Icon name="circle-check" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                {thanked}
                            </span>
                        ) : stats && stats.total ? (
                            `${stats.percent}% of ${stats.total.toLocaleString()} ${stats.total === 1 ? 'reader' : 'readers'} found this helpful`
                        ) : stats ? (
                            'Be the first to say whether this helped.'
                        ) : null}
                    </p>
                </div>
            ) : null}
            {cfg.rating || (showFlag && cfg.flag) ? (
                <div
                    className={cx(
                        'flex flex-wrap items-center justify-between gap-x-4 gap-y-3',
                        cfg.helpful ? 'border-t border-border pt-4' : ''
                    )}
                >
                    {cfg.rating ? (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-sm font-medium" id={'rp-kb-r-' + id}>
                                Rate this article
                            </span>
                            <StarRatingInput
                                value={fb.mine.rating}
                                disabled={fb.pending === 'rate'}
                                onChange={async (n) => {
                                    const ok = await fb.rate(n);
                                    if (!ok) toast.error(fb.error || "Couldn't save your rating.");
                                }}
                            />
                            {article.rating ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <StarRatingDisplay value={article.rating} />
                                    <span className="tabular-nums">{article.rating.toFixed(1)} average</span>
                                </span>
                            ) : null}
                        </div>
                    ) : (
                        <span />
                    )}
                    {showFlag ? (
                        <KbFlagButton
                            article={article}
                            kb={kb}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                        />
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}

export default function KbFeedbackPreview() {
    const [v, setV] = useState(3);
    return <StarRatingInput value={v} onChange={setV} />;
}
