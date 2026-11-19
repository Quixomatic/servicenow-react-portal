// Studio "View as user": preview what a portal's user criteria hide from a chosen user, in the page
// designer (pages panel + canvas notice) and the Menus preview (items drop like at runtime).
// The server evaluates the criteria (GET /portals/{id}/audience?user=…, UserCriteriaLoader); only the
// user-criteria layer is simulated (Menus keeps its client-side "View as role" for item roles).
// The chosen user is shared by both activities for the Studio session (not persisted).
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { UserRound, X } from 'lucide-react';
import { STUDIO_API_BASE, isMock, requestAt } from '#/runtime/api';

const e = encodeURIComponent;

export const audienceApi = {
	/** → [{ id, name, userName }] */
	users: (q, limit) => requestAt(STUDIO_API_BASE, 'GET', `/users?q=${e(q || '')}&limit=${e(limit || 20)}`),
	/** → { user, bypass, portal, hiddenPages[], hiddenItems[], restrictedPages[], restrictedItems[] } */
	audience: (portalId, userId) => requestAt(STUDIO_API_BASE, 'GET', `/portals/${e(portalId)}/audience?user=${e(userId)}`)
};

// ---- shared selection -------------------------------------------------------------------------

let selected = null; // { id, name, userName } | null
let version = 0; // bumped to re-fetch verdicts (after edits / refresh)
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const snapshot = () => selected;

export const viewAsUser = {
	get: () => selected,
	set: (user) => {
		selected = user || null;
		emit();
	},
	refresh: () => {
		version += 1;
		emit();
	},
	subscribe: (fn) => {
		listeners.add(fn);
		return () => listeners.delete(fn);
	}
};

/** The chosen user plus the portal's verdicts for them ({ user, audience, loading, error }). */
export function useViewAsUser(portalId) {
	const user = useSyncExternalStore(viewAsUser.subscribe, snapshot);
	const ver = useSyncExternalStore(viewAsUser.subscribe, () => version);
	const [result, setResult] = useState({ key: '', audience: null, error: null });
	const key = user && portalId && !isMock() ? `${portalId}|${user.id}|${ver}` : '';
	useEffect(() => {
		if (!key) return undefined;
		let live = true;
		audienceApi.audience(portalId, user.id).then(
			(audience) => live && setResult({ key, audience, error: null }),
			(error) => live && setResult({ key, audience: null, error })
		);
		return () => {
			live = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);
	if (!key) return { user: null, audience: null, loading: false, error: null };
	const fresh = result.key === key;
	return { user, audience: fresh ? result.audience : null, loading: !fresh, error: fresh ? result.error : null };
}

/** Sets for quick lookups: { pages: Set, items: Set, portal: boolean } (null = no user chosen). */
export function hiddenSets(audience) {
	if (!audience) return null;
	return { portal: !audience.portal, pages: new Set(audience.hiddenPages || []), items: new Set(audience.hiddenItems || []) };
}

// ---- picker -----------------------------------------------------------------------------------

/** Toolbar control: "View as user" with a searchable user list; shows the verdict summary. */
export function ViewAsUserPicker({ portalId, state }) {
	const user = useSyncExternalStore(viewAsUser.subscribe, snapshot);
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState('');
	const [users, setUsers] = useState([]);
	const [busy, setBusy] = useState(false);
	const boxRef = useRef(null);

	useEffect(() => {
		if (!open) return undefined;
		let live = true;
		setBusy(true);
		const t = setTimeout(() => {
			audienceApi.users(q, 20).then(
				(list) => live && (setUsers(list || []), setBusy(false)),
				() => live && (setUsers([]), setBusy(false))
			);
		}, 200);
		return () => {
			live = false;
			clearTimeout(t);
		};
	}, [open, q]);

	useEffect(() => {
		if (!open) return undefined;
		const close = (ev) => boxRef.current && !ev.composedPath().includes(boxRef.current) && setOpen(false);
		const root = boxRef.current && boxRef.current.getRootNode();
		(root || document).addEventListener('pointerdown', close, true);
		return () => (root || document).removeEventListener('pointerdown', close, true);
	}, [open]);

	if (isMock()) return null;
	const a = state && state.audience;
	let summary = null;
	if (user && state) {
		if (state.loading) summary = <span className="rpd-hint">checking…</span>;
		else if (state.error) summary = <span className="rps-badge err" title={state.error.message}>criteria check failed</span>;
		else if (a && a.bypass) summary = <span className="rps-badge" title="Admins and React Portal studio users bypass user criteria">bypasses criteria</span>;
		else if (a && !a.portal) summary = <span className="rps-badge err" data-rp-viewas-portal-denied="">can't open this portal</span>;
		else if (a) {
			const n = (a.hiddenPages || []).length + (a.hiddenItems || []).length;
			summary = (
				<span className={'rps-badge' + (n ? ' err' : ' ok')} title={`${(a.hiddenPages || []).length} page(s) and ${(a.hiddenItems || []).length} menu item(s) hidden by user criteria`} data-rp-viewas-summary="">
					{n ? `${(a.hiddenPages || []).length} page(s), ${(a.hiddenItems || []).length} item(s) hidden` : 'nothing hidden'}
				</span>
			);
		}
	}

	return (
		<span ref={boxRef} className="rp-viewas-user" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
			<button
				className="rps-tbtn"
				aria-pressed={!!user}
				disabled={!portalId}
				title="View as user: preview what this portal's user criteria (Available for / Not available for) hide from a user"
				onClick={() => setOpen((v) => !v)}
				data-rp-viewas-user=""
			>
				<UserRound size={14} /> {user ? user.name || user.userName : 'View as user'}
			</button>
			{user ? (
				<button className="rps-tbtn" title="Stop viewing as this user" onClick={() => viewAsUser.set(null)} data-rp-viewas-clear="">
					<X size={14} />
				</button>
			) : null}
			{summary}
			{open ? (
				<div className="rps-pop" style={{ top: 28, left: 0, width: 300 }}>
					<input className="rps-search" autoFocus placeholder="Search users by name, user name or email" value={q} onChange={(ev) => setQ(ev.target.value)} data-rp-viewas-search="" />
					<div className="rps-list">
						{busy && !users.length ? <div className="rps-group-label">Searching…</div> : null}
						{!busy && !users.length ? <div className="rps-group-label">No users</div> : null}
						{users.map((u) => (
							<div
								key={u.id}
								className={'rps-option' + (user && user.id === u.id ? ' active' : '')}
								onClick={() => {
									viewAsUser.set(u);
									setOpen(false);
								}}
								data-rp-viewas-option={u.userName}
							>
								<span>{u.name || u.userName}</span>
								<span className="sub">{u.userName}</span>
							</div>
						))}
					</div>
				</div>
			) : null}
		</span>
	);
}
