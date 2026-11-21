// Derivations for components:charts/working-agreements: tile states, per-practice and team statistics.
import type { Practice, AgreementWeek } from './data.ts';

export type TileState =
    | 'done'
    | 'kept'
    | 'partly-strong'
    | 'partly'
    | 'missed'
    | 'paused'
    | 'not-adopted'
    | 'on-track'
    | 'behind';

export const STATE_LABEL: Record<TileState, string> = {
    done: 'Kept',
    kept: 'Kept',
    'partly-strong': 'Partly Kept',
    partly: 'Partly Kept',
    missed: 'Missed',
    paused: 'Paused',
    'not-adopted': 'Not Adopted',
    'on-track': 'On Track',
    behind: 'Behind',
};

export function pctOf(w: AgreementWeek): number {
    if (!Array.isArray(w)) return 0;
    return w[1] ? (w[0] / w[1]) * 100 : 100;
}

/** State of week `i` at `target` (current week = last index). */
export function tileState(p: Practice, i: number, target = p.target): TileState {
    const w = p.weeks[i];
    if (w == null) return 'not-adopted';
    if (typeof w === 'string') return 'paused';
    const pct = pctOf(w);
    if (i === p.weeks.length - 1) return pct >= target ? 'on-track' : 'behind';
    if (pct >= 100) return 'done';
    if (pct >= target) return 'kept';
    const ratio = pct / target;
    if (ratio >= 0.875) return 'partly-strong';
    if (ratio >= 0.75) return 'partly';
    return 'missed';
}

export const isKept = (s: TileState) => s === 'done' || s === 'kept';

export type PracticeStats = {
    kept: number;
    counted: number;
    share: number;
    streak: number;
    last4: number;
    last4Of: number;
    prev4: number;
    prev4Of: number;
    trend: 'up' | 'down' | 'level';
    since: number;
};

export function practiceStats(p: Practice, target = p.target): PracticeStats {
    const cur = p.weeks.length - 1;
    const states: TileState[] = [];
    for (let i = 0; i < cur; i++) states.push(tileState(p, i, target));
    const counted = states.filter((s) => s !== 'paused' && s !== 'not-adopted');
    const kept = counted.filter(isKept).length;
    let streak = 0;
    for (let i = states.length - 1; i >= 0; i--) {
        const s = states[i];
        if (s === 'paused') continue;
        if (!isKept(s)) break;
        streak++;
    }
    const recent = counted.slice(-4);
    const before = counted.slice(-8, -4);
    const last4 = recent.filter(isKept).length;
    const prev4 = before.filter(isKept).length;
    const a = recent.length ? last4 / recent.length : 0;
    const b = before.length ? prev4 / before.length : a;
    const since = p.weeks.findIndex((w) => w != null);
    return {
        kept,
        counted: counted.length,
        share: counted.length ? kept / counted.length : 0,
        streak,
        last4,
        last4Of: recent.length,
        prev4,
        prev4Of: before.length,
        trend: a > b ? 'up' : a < b ? 'down' : 'level',
        since: since < 0 ? cur : since,
    };
}

export type TeamStats = {
    kept: number;
    counted: number;
    score: number;
    last4: number;
    prev4: number;
    weekly: (number | null)[];
    onTrack: number;
    active: number;
    areas: Record<string, { kept: number; counted: number; share: number; practices: number }>;
};

export function teamStats(practices: Practice[], targets: Record<string, number> = {}): TeamStats {
    let kept = 0;
    let counted = 0;
    let onTrack = 0;
    let active = 0;
    const areas: TeamStats['areas'] = {};
    const len = practices.reduce((m, p) => Math.max(m, p.weeks.length), 0);
    const cur = len - 1;
    const wk: number[] = new Array(Math.max(0, cur)).fill(0);
    const wc: number[] = new Array(Math.max(0, cur)).fill(0);
    let l4k = 0;
    let l4c = 0;
    let p4k = 0;
    let p4c = 0;
    practices.forEach((p) => {
        const t = targets[p.name] ?? p.target;
        const st = practiceStats(p, t);
        kept += st.kept;
        counted += st.counted;
        l4k += st.last4;
        l4c += st.last4Of;
        p4k += st.prev4;
        p4c += st.prev4Of;
        const a = (areas[p.area] = areas[p.area] || { kept: 0, counted: 0, share: 0, practices: 0 });
        a.kept += st.kept;
        a.counted += st.counted;
        a.practices++;
        const cs = tileState(p, p.weeks.length - 1, t);
        if (cs === 'on-track' || cs === 'behind') active++;
        if (cs === 'on-track') onTrack++;
        for (let i = 0; i < cur; i++) {
            const s = tileState(p, i, t);
            if (s === 'paused' || s === 'not-adopted') continue;
            wc[i]++;
            if (isKept(s)) wk[i]++;
        }
    });
    Object.keys(areas).forEach((k) => {
        areas[k].share = areas[k].counted ? areas[k].kept / areas[k].counted : 0;
    });
    return {
        kept,
        counted,
        score: counted ? kept / counted : 0,
        last4: l4c ? l4k / l4c : 0,
        prev4: p4c ? p4k / p4c : 0,
        weekly: wc.map((c, i) => (c ? wk[i] / c : null)),
        onTrack,
        active,
        areas,
    };
}
