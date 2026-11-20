// Unit tests for the navigation history's pure part (src/runtime/nav-history-core.js).
// Run: node --test packages/portal-host/scripts/nav-history.test.mjs
// The host sources are extensionless ESM for webpack; they're copied to a temp folder as .mjs first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'runtime');
const dir = mkdtempSync(join(tmpdir(), 'rp-nav-'));
writeFileSync(join(dir, 'location.mjs'), readFileSync(join(src, 'location.js'), 'utf8'));
writeFileSync(
    join(dir, 'core.mjs'),
    readFileSync(join(src, 'nav-history-core.js'), 'utf8').replace("from './location'", "from './location.mjs'")
);
const core = await import(pathToFileURL(join(dir, 'core.mjs')).href);
const {
    applyLocation,
    applyMemory,
    buildSiteHref,
    emptyState,
    entryTitle,
    fieldsFromUrl,
    fieldsOfTarget,
    flagEntries,
    identityOf,
    keyOf,
    resolveBackTarget,
    siteBaseOf,
    sortedQ,
    backLabel,
    CAP,
} = core;

const BASE = '/x/312987/portal/site';
const url = (slug, params) => {
    const pairs = Object.keys(params || {}).flatMap((k) => [k, encodeURIComponent(params[k])]);
    return `${BASE}/${slug}` + (pairs.length ? '/params/' + pairs.join('/') : '');
};
const F = (slug, params) => fieldsFromUrl(url(slug, params), slug);
const HOME = F('sp');
const LIST = F('sp', { 'page-id': 'list', table: 'sc_req_item', q: 'title=My requested items' });
const RITM = F('sp', { 'page-id': 'form', table: 'sc_req_item', 'sys-id': 'r1' });
const NEW = F('sp', { 'page-id': 'form', table: 'incident', 'sys-id': '-1' });
const INC = F('sp', { 'page-id': 'form', table: 'incident', 'sys-id': 'i1' });

/** Apply a sequence: [pos, fields, extra?] … */
function run(steps, initial) {
    let s = initial || emptyState('e0');
    steps.forEach(([pos, fields, extra]) => {
        s = applyLocation(s, { pos, fields, now: 1000, ...(extra || {}) });
    });
    return s;
}

test('fieldsFromUrl reads dash-cased params and sorts q', () => {
    const f = F('sp', { 'page-id': 'kb/article', q: 'b=2&a=1', 'sys-id': 'x', table: 'kb_knowledge' });
    assert.equal(f.page, 'kb/article');
    assert.equal(f.sysId, 'x');
    assert.equal(f.table, 'kb_knowledge');
    assert.equal(f.q, 'a=1&b=2');
    assert.equal(fieldsFromUrl('/x/312987/portal/site/crm', 'sp'), null);
    assert.equal(sortedQ('z=1&a=2'), 'a=2&z=1');
});

test('a navigate() target and its URL have the same key', () => {
    const t = fieldsOfTarget({ page: 'form', table: 'incident', sysId: 'i1', q: { tab: 'notes' } }, 'sp');
    const u = F('sp', { 'page-id': 'form', q: 'tab=notes', table: 'incident', 'sys-id': 'i1' });
    assert.equal(keyOf(t), keyOf(u));
    const href = buildSiteHref(BASE, t);
    assert.equal(keyOf(fieldsFromUrl(href, 'sp')), keyOf(t));
});

test('push, replace and pop (§3.2)', () => {
    let s = run([
        [0, HOME, { boot: 'fresh' }],
        [1, LIST],
        [2, RITM],
    ]);
    assert.equal(s.cursor, 2);
    assert.deepEqual(Object.keys(s.entries), ['0', '1', '2']);
    // Pop back to the list: same key at pos 1, nothing dropped.
    s = applyLocation(s, { pos: 1, fields: LIST, popped: true, now: 1 });
    assert.equal(s.cursor, 1);
    assert.ok(s.entries[2]);
    // Replace at pos 1 (a filter change): forward entries kept, same identity keeps state.
    s.entries[1].state = { tab: 'x' };
    const LIST_B = F('sp', { 'page-id': 'list', table: 'sc_req_item', q: 'title=My requested items&sort=number' });
    s = applyLocation(s, { pos: 1, fields: LIST_B, now: 2 });
    assert.equal(s.cursor, 1);
    assert.equal(s.entries[1].key, keyOf(LIST_B));
    assert.deepEqual(s.entries[1].state, { tab: 'x' });
    assert.ok(s.entries[2]);
    // Push from pos 1 drops the old forward entry.
    s = applyLocation(s, { pos: 2, fields: INC, now: 3 });
    assert.equal(s.entries[2].key, keyOf(INC));
    assert.equal(Object.keys(s.entries).length, 3);
});

test('fresh boot resets, restore keeps a matching entry', () => {
    const s = run([
        [0, HOME, { boot: 'fresh' }],
        [1, LIST],
    ]);
    const restored = applyLocation(s, { pos: 1, fields: LIST, boot: 'restore', now: 5 });
    assert.equal(restored, s.cursor === 1 ? restored : null);
    assert.ok(restored.entries[0]);
    const mismatch = applyLocation(s, { pos: 1, fields: INC, boot: 'restore', now: 5 });
    assert.deepEqual(Object.keys(mismatch.entries), ['1']);
    const fresh = applyLocation(s, { pos: 0, fields: INC, boot: 'fresh', now: 5 });
    assert.deepEqual(Object.keys(fresh.entries), ['0']);
    assert.notEqual(fresh.epoch, s.epoch);
});

test('Home → list → RITM → back lands on the list; deep link → parent', () => {
    const s = run([
        [0, HOME, { boot: 'fresh' }],
        [1, RITM],
    ]);
    const t = resolveBackTarget(s, { identity: identityOf(RITM), portalSlug: 'sp', parent: { to: 'list' } });
    assert.equal(t.source, 'history');
    assert.equal(t.delta, -1);
    assert.equal(t.title, 'Home');
    assert.equal(backLabel(t), 'Back to Home');
    const deep = run([[0, RITM, { boot: 'fresh' }]]);
    const p = resolveBackTarget(deep, {
        identity: identityOf(RITM),
        portalSlug: 'sp',
        parent: { to: 'list', label: 'Requested items' },
    });
    assert.equal(p.source, 'parent');
    assert.equal(backLabel(p), 'Back to Requested items');
    const none = resolveBackTarget(run([[0, HOME, { boot: 'fresh' }]]), {
        identity: identityOf(HOME),
        portalSlug: 'sp',
        isHome: true,
    });
    assert.equal(none.available, false);
    const home = resolveBackTarget(deep, { identity: identityOf(RITM), portalSlug: 'sp' });
    assert.equal(home.source, 'home');
});

test('list → New → save (replace) → back = the list', () => {
    let s = run([
        [0, LIST, { boot: 'fresh' }],
        [1, NEW],
    ]);
    assert.equal(s.entries[1].kind, 'new-record');
    s = applyLocation(s, { pos: 1, fields: INC, now: 9 }); // replace -1 → i1
    assert.equal(s.entries[1].kind, 'record');
    const t = resolveBackTarget(s, { identity: identityOf(INC), portalSlug: 'sp' });
    assert.equal(t.entry.key, keyOf(LIST));
    assert.equal(t.title, 'My requested items');
});

test('skips new-record, gone, same identity and other portals (decision 4)', () => {
    const CRM = F('crm', { 'page-id': 'accounts' });
    let s = run([
        [0, HOME, { boot: 'fresh' }],
        [1, INC],
        [2, NEW],
        [3, CRM],
        [4, F('sp', { 'page-id': 'form', table: 'incident', 'sys-id': 'i1', view: 'ess' })],
        [5, RITM],
    ]);
    s = flagEntries(s, { table: 'incident', sysId: 'i1' }, { gone: true });
    assert.ok(s.entries[1].flags.gone && s.entries[4].flags.gone);
    const t = resolveBackTarget(s, { identity: identityOf(RITM), portalSlug: 'sp' });
    assert.equal(t.entry.pos, 0);
    assert.equal(t.delta, -5);
    const crm = resolveBackTarget(s, { identity: identityOf(CRM), portalSlug: 'crm' });
    // From RITM's cursor, nothing in crm before → parent/home fallback.
    assert.equal(crm.source, 'home');
});

test('a hint names the new entry; widget titles win', () => {
    const hint = { key: keyOf(INC), identity: identityOf(INC), title: 'INC0010023', at: 1000 };
    let s = run([
        [0, HOME, { boot: 'fresh' }],
        [1, INC, { hint }],
        [2, RITM],
    ]);
    assert.equal(entryTitle(s.entries[1]), 'INC0010023');
    s.entries[1].title = 'INC0010023 · Email';
    assert.equal(entryTitle(s.entries[1]), 'INC0010023 · Email');
    s.pageTitles = { 'sp|list': 'Lists' };
    assert.equal(entryTitle({ page: 'list', portalSlug: 'sp', params: { q: '' } }, s.pageTitles), 'Lists');
    assert.equal(entryTitle({ page: 'my-requests', portalSlug: 'sp', params: { q: '' } }, {}), 'My requests');
    // A stale hint is ignored.
    const late = applyLocation(emptyState(), { pos: 0, fields: INC, hint: { ...hint, at: 0 }, now: 99999 });
    assert.equal(late.entries[0].hintTitle, '');
});

test('cap keeps the newest positions', () => {
    let s = emptyState();
    for (let i = 0; i < CAP + 10; i += 1) {
        s = applyLocation(s, { pos: i, fields: F('sp', { 'page-id': 'p' + i }), now: i, boot: i ? null : 'fresh' });
    }
    const keys = Object.keys(s.entries).map(Number);
    assert.equal(keys.length, CAP);
    assert.equal(Math.min(...keys), 10);
});

test('memory mode: push, then back via pop', () => {
    let s = applyMemory(emptyState(), { fields: HOME, now: 1 });
    s = applyMemory(s, { fields: LIST, now: 2 });
    s = applyMemory(s, { fields: RITM, now: 3 });
    assert.equal(s.cursor, 2);
    const t = resolveBackTarget(s, { identity: identityOf(RITM), portalSlug: 'sp' });
    s = applyMemory(s, { fields: LIST, pop: { key: t.entry.key, pos: t.entry.pos }, now: 4 });
    assert.equal(s.cursor, 1);
    assert.ok(s.entries[2]);
});

test('hrefs: UIB format, one params segment', () => {
    assert.equal(siteBaseOf('/x/312987/portal/site/sp/params/page-id/form', 'sp'), BASE);
    assert.equal(siteBaseOf('/x/312987/portal/site/sp', 'sp'), BASE);
    const h = buildSiteHref(BASE, fieldsOfTarget({ page: 'kb/article', sysId: 'abc', q: { a: '1 2' } }, 'sp'));
    assert.equal(h, BASE + '/sp/params/page-id/kb%2Farticle/sys-id/abc/q/a%3D1%2B2');
    assert.equal(buildSiteHref(BASE, fieldsOfTarget({ page: '' }, 'crm')), BASE + '/crm');
    const r = buildSiteHref(BASE, fieldsOfTarget({ page: 'orders', recordId: '42' }, 'sp'));
    assert.equal(r, BASE + '/sp/params/page-id/orders/id/42');
});
