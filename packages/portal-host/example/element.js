import { createCustomElement } from '@servicenow/ui-core';
import snabbdom from '@servicenow/ui-renderer-snabbdom';
import '../src/portal-host';

// Dev-only stand-in for the platform (snc ui-component develop). It answers PORTAL_NAVIGATE the
// way the `site` page's "Link to destination" handler does: by changing the host's properties.
// A portal change replaces the host element, like a change of the required `portal` URL
// parameter does on the instance. It never touches window.history.
const absent = (value) => (value === undefined || value === null ? '' : String(value));

createCustomElement('x-312987-portal-host-harness', {
    renderer: { type: snabbdom },
    initialState: {
        mode: 'portal',
        // ?portal=<slug>&page=<path> pick the starting location (dev only).
        portalSlug: new URLSearchParams(window.location.search).get('portal') || 'sp',
        page: new URLSearchParams(window.location.search).get('page') || '',
        recordId: '',
        q: '',
        generation: 1,
        lastAction: 'none',
    },
    actionHandlers: {
        PORTAL_NAVIGATE: ({ action, state, updateState }) => {
            const p = action.payload || {};
            const portalSlug = absent(p.portalSlug) || state.portalSlug;
            updateState({
                portalSlug,
                page: absent(p.page),
                recordId: absent(p.recordId),
                q: absent(p.q),
                // Required parameter changed -> new host instance (new page match on the instance).
                generation: portalSlug !== state.portalSlug ? state.generation + 1 : state.generation,
                lastAction: JSON.stringify(p),
            });
        },
        HARNESS_REMOUNT: ({ state, updateState }) => updateState({ generation: state.generation + 1 }),
        HARNESS_ABSENT_TRUE: ({ updateState }) =>
            updateState({
                page: 'true',
                recordId: 'true',
                q: 'true',
                lastAction: 'absent optional params delivered as "true"',
            }),
        HARNESS_TOGGLE_MODE: ({ state, updateState }) =>
            updateState({ mode: state.mode === 'studio' ? 'portal' : 'studio' }),
    },
    view: (state, { dispatch }) => (
        <div style={{ border: '2px dashed #2563eb', padding: '6px', fontFamily: 'system-ui, sans-serif' }}>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    alignItems: 'center',
                    font: '12px monospace',
                    marginBottom: '6px',
                }}
            >
                <b>fake platform</b>
                <span>
                    props: portalSlug=<b>{state.portalSlug}</b> page=<b>{state.page || '""'}</b> recordId=
                    <b>{state.recordId || '""'}</b> q=<b>{state.q || '""'}</b> mode=<b>{state.mode}</b> · element #
                    {state.generation}
                </span>
                <button on-click={() => dispatch('HARNESS_REMOUNT')}>remount host</button>
                <button on-click={() => dispatch('HARNESS_ABSENT_TRUE')}>send "true" for absent params</button>
                <button on-click={() => dispatch('HARNESS_TOGGLE_MODE')}>toggle studio mode</button>
            </div>
            <div style={{ font: '11px monospace', marginBottom: '6px', wordBreak: 'break-all' }}>
                last PORTAL_NAVIGATE: <span id="harness-last">{state.lastAction}</span>
            </div>
            <x-312987-portal-host
                key={`host-${state.generation}`}
                mode={state.mode}
                portal-slug={state.portalSlug}
                page={state.page}
                record-id={state.recordId}
                q={state.q}
            ></x-312987-portal-host>
        </div>
    ),
});

const el = document.createElement('DIV');
document.body.appendChild(el);
el.innerHTML = '<x-312987-portal-host-harness></x-312987-portal-host-harness>';
