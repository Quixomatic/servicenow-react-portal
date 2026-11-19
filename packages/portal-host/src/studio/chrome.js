import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	ChevronsUpDown,
	CircleCheck,
	CircleX,
	Code2,
	Eye,
	Info,
	Loader2,
	Monitor,
	Moon,
	PanelBottom,
	PanelLeft,
	Plus,
	Save,
	Settings2,
	Sun,
	TriangleAlert,
	X
} from 'lucide-react';
import { FileIcon, ask, baseName, confirmDiscard } from './dialogs';
import { useStudioTheme } from './theme';
import { PREVIEW_TAB, languageOf, useStudio, virtualLabel } from './store';
import * as L from './layout';

// ---- switching with unsaved changes ---------------------------------------------------------

export async function guardedOpen(studio, target) {
	if (studio.anyDirty()) {
		const owner = studio.get().owner;
		const choice = await confirmDiscard(studio, owner && owner.name);
		if (choice === null) return false;
		if (choice === 'save') {
			await studio.save();
			if (studio.anyDirty() || studio.get().conflict) return false;
		}
	}
	await studio.openOwner(target);
	return true;
}

// ---- title bar ------------------------------------------------------------------------------

export function Titlebar({ studio }) {
	const owner = useStudio(studio, (s) => s.owner);
	const dirtyCount = useStudio(studio, (s) => Object.keys(s.dirty).length + s.deleted.length + (s.metaDirty ? 1 : 0));
	const busy = useStudio(studio, (s) => s.busy);
	const build = useStudio(studio, (s) => s.build);
	const revision = useStudio(studio, (s) => s.revision);
	const checking = useStudio(studio, (s) => s.checking);
	const explorerOpen = useStudio(studio, (s) => s.explorerOpen);
	const panelOpen = useStudio(studio, (s) => s.panelOpen);
	const propertiesOpen = useStudio(studio, (s) => s.propertiesOpen);
	const { theme, resolvedTheme, cycle } = useStudioTheme();

	const newComponent = async () => {
		const value = await ask(studio, { type: 'newComponent' });
		if (!value) return;
		if (studio.anyDirty()) {
			const choice = await confirmDiscard(studio, owner && owner.name);
			if (choice === null) return;
			if (choice === 'save') await studio.save();
		}
		await studio.createComponent(value.name, value.kind);
	};

	return (
		<div className="rps-titlebar" data-rps-titlebar="">
			<span className="rps-brand">
				<Code2 size={16} color="var(--rps-accent)" /> Portal Studio
			</span>
			<button className="rps-tbtn" aria-pressed={explorerOpen} title="Toggle explorer (Ctrl+B)" onClick={() => studio.set((s) => ({ explorerOpen: !s.explorerOpen }))}>
				<PanelLeft size={15} />
			</button>
			<Switcher studio={studio} />
			<button className="rps-tbtn" title="New component" onClick={newComponent} data-rps-new-component="">
				<Plus size={15} /> New
			</button>
			<span className="rps-spacer" />
			{owner ? <BuildBadge build={build} busy={busy} checking={checking} /> : null}
			{owner ? (
				<span className="rps-badge" title="Saved revision" data-rps-revision="">
					rev {revision}
				</span>
			) : null}
			{owner ? (
				<button className="rps-tbtn" title="Open the preview of the latest build" onClick={() => openPreview(studio)} data-rps-open-preview="">
					<Eye size={15} /> Preview
				</button>
			) : null}
			<button className="rps-tbtn" aria-pressed={propertiesOpen} disabled={!owner} title="Properties" onClick={() => studio.set((s) => ({ propertiesOpen: !s.propertiesOpen }))} data-rps-props-toggle="">
				<Settings2 size={15} />
			</button>
			<button className="rps-tbtn" title={`Theme: ${theme}${theme === 'system' ? ` (${resolvedTheme})` : ''}. Click for ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'}`} onClick={cycle} data-rps-theme={theme}>
				{theme === 'system' ? <Monitor size={15} /> : resolvedTheme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
			</button>
			<button className="rps-tbtn" aria-pressed={panelOpen} title="Toggle panel (Ctrl+J)" onClick={() => studio.set((s) => ({ panelOpen: !s.panelOpen }))}>
				<PanelBottom size={15} />
			</button>
			<button className="rps-tbtn rps-primary" disabled={!owner || busy === 'saving'} title="Save (Ctrl+S)" onClick={() => studio.save()} data-rps-save="">
				{busy === 'saving' ? <Loader2 size={14} className="rps-spin" /> : <Save size={14} />}
				Save
				{dirtyCount ? <span className="rps-dirty-dot" style={{ background: '#fff' }} title={`${dirtyCount} unsaved change(s)`} data-rps-dirty="" /> : null}
			</button>
		</div>
	);
}

export function openPreview(studio) {
	const s = studio.get();
	const existing = L.groups(s.layout).find((g) => g.tabs.some((t) => t.path === PREVIEW_TAB));
	if (existing) {
		studio.activateTab(existing.id, PREVIEW_TAB);
		return;
	}
	const groupsList = L.groups(s.layout);
	if (groupsList.length > 1) {
		const other = groupsList.find((g) => g.id !== s.activeGroup) || groupsList[0];
		studio.openFile(PREVIEW_TAB, { groupId: other.id, preview: false });
		return;
	}
	const ng = L.group([{ path: PREVIEW_TAB, preview: false }], PREVIEW_TAB);
	studio.set({ layout: L.splitAt(s.layout, s.activeGroup, 'right', ng), activeGroup: ng.id });
}

function BuildBadge({ build, busy, checking }) {
	if (busy === 'saving')
		return (
			<span className="rps-badge busy" data-rps-build="compiling">
				<Loader2 size={12} className="rps-spin" /> compiling…
			</span>
		);
	if (!build) return <span className="rps-badge" data-rps-build="none">no build</span>;
	const ms = build.diagnostics && build.diagnostics.ms;
	if (build.state === 'failed')
		return (
			<span className="rps-badge err" title="The last compile failed; the previous good build keeps serving" data-rps-build="failed">
				<CircleX size={12} /> failed{ms ? ` · ${ms} ms` : ''}
			</span>
		);
	if (build.state === 'pending')
		return (
			<span className="rps-badge busy" data-rps-build="pending">
				<Loader2 size={12} className="rps-spin" /> pending
			</span>
		);
	return (
		<span className="rps-badge ok" title={`Built revision ${build.builtRevision}`} data-rps-build="ready">
			<CircleCheck size={12} /> ready{ms ? ` · ${ms} ms` : ''}
			{checking ? <Loader2 size={11} className="rps-spin" /> : null}
		</span>
	);
}

// ---- component switcher ---------------------------------------------------------------------

function Switcher({ studio }) {
	const catalog = useStudio(studio, (s) => s.catalog);
	const owner = useStudio(studio, (s) => s.owner);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [index, setIndex] = useState(0);
	const ref = useRef(null);
	const inputRef = useRef(null);

	useEffect(() => {
		if (!open) return undefined;
		if (inputRef.current) inputRef.current.focus();
		const off = (e) => ref.current && !e.composedPath().includes(ref.current) && setOpen(false);
		window.addEventListener('mousedown', off, true);
		return () => window.removeEventListener('mousedown', off, true);
	}, [open]);

	const items = useMemo(() => {
		const q = query.trim().toLowerCase();
		const match = (x) => !q || (x.name || '').toLowerCase().includes(q) || (x.uniqueId || x.key || '').toLowerCase().includes(q);
		const out = [];
		[
			['widget', 'Widgets'],
			['layout', 'Layouts'],
			['utility', 'Utilities']
		].forEach(([kind, label]) => {
			const list = (catalog.components || []).filter((c) => (c.kind || 'widget') === kind && match(c)).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
			if (list.length) out.push({ header: label }, ...list.map((c) => ({ type: 'component', id: c.id, name: c.name, sub: c.uniqueId, failed: c.build && c.build.state === 'failed' })));
		});
		const themes = (catalog.themes || []).filter(match);
		if (themes.length) out.push({ header: 'Themes' }, ...themes.map((t) => ({ type: 'theme', id: t.id, name: t.name, sub: t.key })));
		return out;
	}, [catalog, query]);
	const selectable = items.filter((i) => !i.header);

	const choose = (item) => {
		setOpen(false);
		setQuery('');
		if (!item || (owner && item.id === owner.id)) return;
		guardedOpen(studio, { type: item.type, id: item.id, name: item.name });
	};

	return (
		<div className="rps-switcher" ref={ref}>
			<button className="rps-switcher-btn" onClick={() => setOpen((v) => !v)} title="Switch component (Ctrl+O)" data-rps-switcher="">
				{owner ? <span className="rps-badge" style={{ height: 16, fontSize: 10 }}>{owner.type === 'theme' ? 'theme' : 'component'}</span> : null}
				<span className="name">{owner ? owner.name : catalog.components ? 'Open a component…' : 'Loading components…'}</span>
				<ChevronsUpDown size={13} />
			</button>
			{open ? (
				<div className="rps-pop" style={{ left: 0, right: 0, top: 28 }}>
					<input
						ref={inputRef}
						className="rps-search"
						placeholder="Search components and themes"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setIndex(0);
						}}
						onKeyDown={(e) => {
							if (e.key === 'ArrowDown') setIndex((i) => Math.min(i + 1, selectable.length - 1));
							else if (e.key === 'ArrowUp') setIndex((i) => Math.max(i - 1, 0));
							else if (e.key === 'Enter') choose(selectable[index]);
							else if (e.key === 'Escape') setOpen(false);
							else return;
							e.preventDefault();
						}}
						data-rps-switcher-search=""
					/>
					<div className="rps-list">
						{catalog.error ? <div className="rps-empty">{String(catalog.error.message)}</div> : null}
						{!catalog.components && !catalog.error ? <div className="rps-empty">Loading…</div> : null}
						{items.map((item, i) =>
							item.header ? (
								<div key={'h' + i} className="rps-group-label">
									{item.header}
								</div>
							) : (
								<div
									key={item.type + item.id}
									className={'rps-option' + (selectable[index] === item ? ' active' : '')}
									onMouseEnter={() => setIndex(selectable.indexOf(item))}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => choose(item)}
									data-rps-option={item.id}
								>
									{item.failed ? <CircleX size={13} color="var(--rps-error)" /> : null}
									<span>{item.name}</span>
									<span className="sub">{item.sub}</span>
								</div>
							)
						)}
						{catalog.components && !selectable.length ? <div className="rps-empty">No match</div> : null}
					</div>
				</div>
			) : null}
		</div>
	);
}

// ---- conflict banner ------------------------------------------------------------------------

export function ConflictBanner({ studio }) {
	const conflict = useStudio(studio, (s) => s.conflict);
	if (!conflict) return null;
	return (
		<div className="rps-banner" data-rps-conflict="">
			<TriangleAlert size={15} color="var(--rps-warn)" />
			<span>
				Someone else saved this component (now at revision {conflict.currentRevision === undefined ? '?' : conflict.currentRevision}). Your changes were not saved.
			</span>
			<span className="rps-spacer" />
			<button className="rps-btn secondary" onClick={() => studio.resolveConflict('reload')} data-rps-conflict-reload="">
				Reload (discard mine)
			</button>
			<button className="rps-btn" onClick={() => studio.resolveConflict('overwrite')} data-rps-conflict-overwrite="">
				Overwrite
			</button>
			<button className="rps-icon-btn" title="Dismiss" onClick={() => studio.resolveConflict('dismiss')}>
				<X size={14} />
			</button>
		</div>
	);
}

// ---- bottom panel ---------------------------------------------------------------------------

export function Panel({ studio }) {
	const tab = useStudio(studio, (s) => s.panelTab);
	const problems = useStudio(studio, (s) => s.problems);
	const output = useStudio(studio, (s) => s.output);
	const outRef = useRef(null);
	useEffect(() => {
		if (tab === 'output' && outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
	}, [output, tab]);

	const byFile = useMemo(() => {
		const m = new Map();
		problems.list.forEach((p) => {
			const k = p.file || '';
			if (!m.has(k)) m.set(k, []);
			m.get(k).push(p);
		});
		return Array.from(m.entries());
	}, [problems]);
	const errors = problems.list.filter((p) => p.severity === 'error').length;
	const warnings = problems.list.length - errors;

	return (
		<div className="rps-panel" data-rps-panel="">
			<div className="rps-panel-head">
				<button className={'rps-panel-tab' + (tab === 'problems' ? ' active' : '')} onClick={() => studio.set({ panelTab: 'problems' })} data-rps-panel-tab="problems">
					Problems <span className="rps-count">{problems.list.length}</span>
				</button>
				<button className={'rps-panel-tab' + (tab === 'output' ? ' active' : '')} onClick={() => studio.set({ panelTab: 'output' })} data-rps-panel-tab="output">
					Output
				</button>
				<span style={{ flex: 1 }} />
				{tab === 'problems' && problems.source ? (
					<span style={{ fontSize: 11, color: 'var(--rps-muted)', paddingRight: 8 }}>
						{problems.source === 'check' ? 'live check' : problems.source === 'save' ? 'last save' : 'last build'} · {problems.at}
					</span>
				) : null}
				{tab === 'output' ? (
					<button className="rps-tbtn" onClick={() => studio.set({ output: [] })}>
						Clear
					</button>
				) : null}
				<button className="rps-icon-btn" title="Close panel" onClick={() => studio.set({ panelOpen: false })}>
					<X size={14} />
				</button>
			</div>
			{tab === 'problems' ? (
				<div className="rps-panel-body" data-rps-problems="">
					{problems.list.length === 0 ? <div className="rps-empty">No problems have been detected.</div> : null}
					{byFile.map(([file, list]) => (
						<div key={file}>
							<div className="rps-problem-file">
								{file ? <FileIcon path={file} size={14} /> : <Info size={14} />}
								<span>{file ? baseName(file) : 'Component'}</span>
								{file && file.includes('/') ? <span style={{ fontWeight: 400, color: 'var(--rps-muted)', fontSize: 12 }}>{file.slice(0, file.lastIndexOf('/'))}</span> : null}
								<span className="rps-count">{list.length}</span>
							</div>
							{list.map((p, i) => (
								<div
									key={i}
									className="rps-problem"
									onClick={() => {
										const target = p.file || 'main.tsx';
										studio.openFile(target, { preview: false, line: p.line, column: p.column });
									}}
									data-rps-problem={`${p.file}:${p.line}`}
								>
									{p.severity === 'error' ? <CircleX size={14} className="rps-sev-error" /> : <TriangleAlert size={14} className="rps-sev-warning" />}
									<span>{p.message}</span>
									{p.hasPosition ? <span className="where">[Ln {p.line}, Col {p.column}]</span> : null}
								</div>
							))}
						</div>
					))}
					<div style={{ display: 'none' }}>{errors + warnings}</div>
				</div>
			) : (
				<div className="rps-panel-body rps-output" ref={outRef} data-rps-output="">
					{output.map((o, i) => (
						<div key={i} className={o.level}>
							<span className="t">[{o.time}]</span> {o.text}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ---- status bar -----------------------------------------------------------------------------

export function StatusBar({ studio, dark, mock }) {
	const build = useStudio(studio, (s) => s.build);
	const busy = useStudio(studio, (s) => s.busy);
	const revision = useStudio(studio, (s) => s.revision);
	const owner = useStudio(studio, (s) => s.owner);
	const cursor = useStudio(studio, (s) => s.cursor);
	const problems = useStudio(studio, (s) => s.problems);
	const { theme: themeMode, cycle } = useStudioTheme();
	const activePath = useStudio(studio, (s) => {
		const g = L.findGroup(s.layout, s.activeGroup);
		return g ? g.active : null;
	});
	const errors = problems.list.filter((p) => p.severity === 'error').length;
	const warnings = problems.list.length - errors;
	return (
		<div className={'rps-statusbar' + (build && build.state === 'failed' && busy !== 'saving' ? ' failed' : '')} data-rps-statusbar="">
			<span className="item">
				{busy === 'saving' ? <Loader2 size={12} className="rps-spin" /> : build && build.state === 'failed' ? <CircleX size={12} /> : <CircleCheck size={12} />}
				{busy === 'saving' ? 'Compiling…' : build ? `Build ${build.state}` : 'No build'}
			</span>
			<button className="item" onClick={() => studio.set({ panelOpen: true, panelTab: 'problems' })} title="Problems" data-rps-status-problems="">
				<CircleX size={12} /> {errors} <TriangleAlert size={12} /> {warnings}
			</button>
			{mock ? <span className="item">mock data</span> : null}
			<span className="spacer" />
			{activePath && activePath !== PREVIEW_TAB && cursor.path === activePath ? (
				<span className="item" data-rps-cursor="">
					Ln {cursor.line}, Col {cursor.col}
				</span>
			) : null}
			{activePath ? <span className="item">{activePath === PREVIEW_TAB ? 'Preview' : languageOf(activePath)}</span> : null}
			{activePath && virtualLabel(activePath) ? <span className="item">{virtualLabel(activePath).label}</span> : null}
			{owner ? <span className="item">Revision {revision}</span> : null}
			<button className="item" title={`Theme: ${themeMode} (click to change)`} onClick={cycle}>
				{themeMode === 'system' ? <Monitor size={12} /> : dark ? <Moon size={12} /> : <Sun size={12} />} {themeMode}
			</button>
		</div>
	);
}

// ---- quick open (Ctrl+P) --------------------------------------------------------------------

function fuzzy(text, query) {
	if (!query) return 0;
	const t = text.toLowerCase();
	const q = query.toLowerCase();
	const direct = t.indexOf(q);
	if (direct !== -1) return 1000 - direct;
	let ti = 0;
	let score = 0;
	for (let qi = 0; qi < q.length; qi += 1) {
		const found = t.indexOf(q[qi], ti);
		if (found === -1) return -1;
		score += found === ti ? 5 : 1;
		ti = found + 1;
	}
	return score;
}

export function QuickOpen({ studio }) {
	const open = useStudio(studio, (s) => s.quickOpen);
	const files = useStudio(studio, (s) => s.files);
	const [query, setQuery] = useState('');
	const [index, setIndex] = useState(0);
	const inputRef = useRef(null);
	useEffect(() => {
		if (open) {
			setQuery('');
			setIndex(0);
			setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
		}
	}, [open]);
	const results = useMemo(() => {
		return files
			.map((f) => {
				const v = virtualLabel(f.path);
				const label = f.path + (v ? ' ' + v.label : '');
				return { path: f.path, v, score: query ? fuzzy(label, query) : 1 };
			})
			.filter((r) => r.score >= 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 50);
	}, [files, query]);
	if (!open) return null;
	const close = () => studio.set({ quickOpen: false });
	const choose = (r, toSide) => {
		close();
		if (!r) return;
		if (toSide) studio.openToSide(r.path);
		else studio.openFile(r.path, { preview: false });
	};
	return (
		<div className="rps-overlay" style={{ paddingTop: 60 }} onMouseDown={(e) => e.target === e.currentTarget && close()}>
			<div className="rps-quick" data-rps-quick-open="">
				<input
					ref={inputRef}
					placeholder="Search files by name"
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setIndex(0);
					}}
					onKeyDown={(e) => {
						if (e.key === 'ArrowDown') setIndex((i) => Math.min(i + 1, results.length - 1));
						else if (e.key === 'ArrowUp') setIndex((i) => Math.max(i - 1, 0));
						else if (e.key === 'Enter') choose(results[index], e.ctrlKey || e.metaKey);
						else if (e.key === 'Escape') close();
						else return;
						e.preventDefault();
					}}
				/>
				<div className="rps-list">
					{results.map((r, i) => (
						<div key={r.path} className={'rps-option' + (i === index ? ' active' : '')} onMouseEnter={() => setIndex(i)} onClick={(e) => choose(r, e.altKey || e.ctrlKey || e.metaKey)} title="Enter opens · Ctrl+Enter opens to the side">
							<FileIcon path={r.path} size={14} />
							<span>{r.v ? r.v.label : baseName(r.path)}</span>
							<span className="sub">{r.path}</span>
						</div>
					))}
					{!results.length ? <div className="rps-empty">No matching files</div> : null}
				</div>
			</div>
		</div>
	);
}

// ---- properties (meta) ----------------------------------------------------------------------

export function Properties({ studio }) {
	const owner = useStudio(studio, (s) => s.owner);
	const meta = useStudio(studio, (s) => s.meta);
	const metaDirty = useStudio(studio, (s) => s.metaDirty);
	if (!owner) return null;
	const set = (k) => (e) => studio.setMeta({ [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
	return (
		<div className="rps-props" data-rps-properties="">
			<h4>Properties {metaDirty ? '•' : ''}</h4>
			<label>
				Name
				<input value={meta.name || ''} onChange={set('name')} data-rps-meta-name="" />
			</label>
			{owner.type === 'component' ? (
				<>
					<label>
						Description
						<textarea rows={3} value={meta.description || ''} onChange={set('description')} />
					</label>
					<label>
						Kind
						<select value={meta.kind || 'widget'} onChange={set('kind')}>
							<option value="widget">Widget</option>
							<option value="layout">Layout</option>
							<option value="utility">Utility</option>
						</select>
					</label>
					<label>
						Server mode
						<select value={meta.serverMode || 'none'} onChange={set('serverMode')}>
							<option value="none">none: no server script</option>
							<option value="on-load">on-load: batch-initialized with the page</option>
							<option value="on-demand">on-demand: explicit calls only</option>
						</select>
					</label>
					<label className="check">
						<input type="checkbox" checked={meta.tailwind !== false} onChange={set('tailwind')} /> Tailwind utilities
					</label>
					<label className="check">
						<input type="checkbox" checked={!!meta.placeable} onChange={set('placeable')} /> Placeable on pages
					</label>
					<label className="check">
						<input type="checkbox" checked={meta.active !== false} onChange={set('active')} /> Active
					</label>
				</>
			) : null}
			<h4>Identity</h4>
			<div className="ro">
				{owner.type} · {owner.uniqueId || ''}
				<br />
				{owner.id}
			</div>
			<div style={{ color: 'var(--rps-muted)' }}>Changes are saved with the files (Ctrl+S).</div>
		</div>
	);
}
