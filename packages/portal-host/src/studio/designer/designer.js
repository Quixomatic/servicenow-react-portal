// Page designer (Studio "Pages" view): pages + outline · live canvas · palette + properties.
// Drag and drop is dnd-kit: palette → region (create), placements between and within regions,
// page ↔ portal-wide; keyboard via dnd-kit's KeyboardSensor (Space, arrows, Space) and the
// Properties panel (region, move up/down, scope, delete).
import React, { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Allotment, LayoutPriority } from 'allotment';
import {
	DndContext,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	pointerWithin,
	rectIntersection,
	useDraggable,
	useSensor,
	useSensors
} from '@dnd-kit/core';
import {
	ArrowDown,
	ArrowUp,
	Eye,
	FilePlus,
	Globe,
	LayoutGrid,
	Home,
	Laptop,
	Loader2,
	MousePointerClick,
	Plus,
	Redo2,
	RefreshCw,
	Settings2,
	Smartphone,
	Tablet,
	Trash2,
	Undo2
} from 'lucide-react';
import { Canvas, computeDropTarget, deepestUnderPointer } from './canvas';
import { OptionsForm, JsonEditor } from './options-form';
import { StyleSection, LayoutSection, ClassesField, DeviceSwitch } from './style-sections';
import { findPlacement, siblingsOf } from './designer-store';
import { ask } from '../dialogs';

export function useDesigner(designer) {
	return useSyncExternalStore(designer.subscribe, designer.get, designer.get);
}

/**
 * The smallest droppable under the pointer wins: block zones nest inside blocks inside regions,
 * and the thin portal-wide strip sits on a region's top edge. Keyboard drags fall back to rects.
 */
function collision(args) {
	const hits = pointerWithin(args);
	if (hits.length) return deepestUnderPointer(hits, args.droppableRects);
	return rectIntersection(args);
}

export default function Designer({ designer, studio, root }) {
	const state = useDesigner(designer);
	const geometryRef = useRef(null);
	const [drag, setDrag] = useState(null); // { label }
	const [dropTarget, setDropTarget] = useState(null);
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

	const onDragStart = (event) => {
		const d = event.active.data.current || {};
		setDrag({ label: d.name || 'Widget', type: d.type });
	};
	const onDragMove = (event) => {
		const t = computeDropTarget(event, geometryRef.current);
		setDropTarget((prev) => (JSON.stringify(prev) === JSON.stringify(t) ? prev : t));
	};
	const onDragEnd = (event) => {
		const d = event.active.data.current || {};
		const t = computeDropTarget(event, geometryRef.current);
		setDrag(null);
		setDropTarget(null);
		if (!t) return;
		const target = { region: t.region, scope: t.scope, parentId: t.parentId, index: t.index };
		if (d.type === 'new') designer.addPlacement(d.component, target, undefined, undefined, d.options);
		else if (d.type === 'placement') designer.movePlacement(d.id, target);
	};
	const onDragCancel = () => {
		setDrag(null);
		setDropTarget(null);
	};

	// Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y), Delete, Escape — not while typing in a field.
	const onKeyDown = (e) => {
		const tag = (e.target && e.target.tagName) || '';
		if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
		const mod = e.ctrlKey || e.metaKey;
		const key = e.key.toLowerCase();
		if (mod && key === 'z' && !e.shiftKey) designer.undo();
		else if ((mod && key === 'z' && e.shiftKey) || (mod && key === 'y')) designer.redo();
		else if ((e.key === 'Delete' || e.key === 'Backspace') && state.selection) designer.deletePlacement(state.selection);
		else if (e.key === 'Escape' && state.selection) designer.select(null);
		else return;
		e.preventDefault();
	};

	return (
		<div className="rpd" onKeyDown={onKeyDown} tabIndex={-1} data-rpd-root="">
			<DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragMove={onDragMove} onDragOver={onDragMove} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
				<Allotment proportionalLayout={false}>
					<Allotment.Pane preferredSize={250} minSize={190} maxSize={480} priority={LayoutPriority.Low}>
						<PagesPanel designer={designer} studio={studio} state={state} />
					</Allotment.Pane>
					<Allotment.Pane minSize={360} priority={LayoutPriority.High}>
						<div className="rpd-center">
							<Toolbar designer={designer} state={state} />
							{state.design && state.page ? (
								<Canvas designer={designer} state={state} root={root} geometryRef={geometryRef} dropTarget={dropTarget} dragging={!!drag} />
							) : (
								<div className="rps-welcome">{state.loading ? 'Loading…' : state.design ? 'This portal has no pages yet. Create one on the left.' : 'Pick a portal on the left.'}</div>
							)}
						</div>
					</Allotment.Pane>
					<Allotment.Pane preferredSize={320} minSize={240} maxSize={560} priority={LayoutPriority.Low}>
						<Allotment vertical>
							<Allotment.Pane preferredSize={260} minSize={120}>
								<Palette designer={designer} state={state} />
							</Allotment.Pane>
							<Allotment.Pane minSize={160}>
								<Inspector designer={designer} studio={studio} state={state} />
							</Allotment.Pane>
						</Allotment>
					</Allotment.Pane>
				</Allotment>
				<DragOverlay dropAnimation={null}>{drag ? <div className="rpd-drag-chip">{drag.label}</div> : null}</DragOverlay>
			</DndContext>
		</div>
	);
}

// ---- toolbar --------------------------------------------------------------------------------

function Toolbar({ designer, state }) {
	const page = state.page && state.page.page;
	const devices = [
		['desktop', Laptop, 'Desktop'],
		['tablet', Tablet, 'Tablet (820px)'],
		['mobile', Smartphone, 'Mobile (390px)']
	];
	return (
		<div className="rpd-toolbar" data-rpd-toolbar="">
			<span className="rpd-path" title="Page route">
				{state.design ? state.design.portal.name : ''}
				{page ? ` / ${page.route || '(home)'}` : ''}
			</span>
			<span style={{ flex: 1 }} />
			{state.busy ? (
				<span className="rps-badge busy" data-rpd-saving="">
					<Loader2 size={12} className="rps-spin" /> saving…
				</span>
			) : null}
			<button className="rps-tbtn" disabled={!state.undo.length || !!state.busy} title={state.undo.length ? `Undo: ${state.undo[state.undo.length - 1].label} (Ctrl+Z)` : 'Undo (Ctrl+Z)'} onClick={() => designer.undo()} data-rpd-undo="">
				<Undo2 size={14} />
			</button>
			<button className="rps-tbtn" disabled={!state.redo.length || !!state.busy} title="Redo (Ctrl+Shift+Z)" onClick={() => designer.redo()} data-rpd-redo="">
				<Redo2 size={14} />
			</button>
			<span className="rpd-sep" />
			{devices.map(([id, Icon, label]) => (
				<button key={id} className="rps-tbtn" aria-pressed={state.device === id} title={label} onClick={() => designer.set({ device: id })} data-rpd-device={id}>
					<Icon size={14} />
				</button>
			))}
			<span className="rpd-sep" />
			<button
				className="rps-tbtn"
				aria-pressed={state.interact}
				title={state.interact ? 'Back to design mode' : 'Preview / interact: let clicks reach the widgets'}
				onClick={() => designer.set((s) => ({ interact: !s.interact, selection: null }))}
				data-rpd-interact=""
			>
				{state.interact ? <MousePointerClick size={14} /> : <Eye size={14} />} {state.interact ? 'Interacting' : 'Preview'}
			</button>
			<button className="rps-tbtn" title="Re-fetch and re-render" onClick={() => designer.refresh()}>
				<RefreshCw size={14} />
			</button>
		</div>
	);
}

// ---- left: portal, pages, outline -----------------------------------------------------------

function PagesPanel({ designer, studio, state }) {
	const design = state.design;
	const pages = (design && design.pages) || [];

	const newPage = async () => {
		const title = await ask(studio, { type: 'prompt', title: 'New page', label: 'Title', value: '', okLabel: 'Next', validate: (v) => (!v.trim() ? 'Enter a title' : null) });
		if (!title) return;
		const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
		const route = await ask(studio, { type: 'prompt', title: 'New page', label: 'Route (e.g. orders or orders/:id)', value: slug, okLabel: 'Create', validate: (v) => (!v.trim() ? 'Enter a route' : null) });
		if (!route) return;
		designer.createPage({ name: title.trim(), title: title.trim(), route: route.trim() });
	};
	const renamePage = async (p) => {
		const title = await ask(studio, { type: 'prompt', title: 'Rename page', label: 'Title', value: p.title || '', okLabel: 'Rename' });
		if (title && title !== p.title) designer.updatePage(p.id, { title, name: title });
	};
	const deletePage = async (p) => {
		const ok = await ask(studio, {
			type: 'confirm',
			title: 'Delete page',
			message: `Delete "${p.title || p.route}" and its placements? This can't be undone here.`,
			buttons: [
				{ label: 'Delete', value: true, primary: true },
				{ label: 'Cancel', value: null }
			]
		});
		if (ok) designer.deletePage(p.id);
	};

	return (
		<div className="rps-sidebar" data-rpd-pages="">
			<div className="rps-sidebar-title">Pages</div>
			<div className="rpd-pad">
				<select
					value={state.portalId || ''}
					onChange={(e) => e.target.value && designer.openPortal(e.target.value)}
					style={{ width: '100%' }}
					data-rpd-portal-select=""
				>
					<option value="">{state.portals ? 'Choose a portal…' : 'Loading portals…'}</option>
					{(state.portals || []).map((p) => (
						<option key={p.id} value={p.id}>
							{p.name} ({p.slug})
						</option>
					))}
				</select>
			</div>
			{design ? (
				<div className="rps-tree" style={{ flex: 1 }}>
					<div className={'rps-row' + (state.node === 'portal' ? ' selected focused' : '')} style={{ paddingLeft: 12 }} onClick={() => designer.showPortalNode()} data-rpd-portal-node="">
						<Settings2 size={14} />
						<span className="label">Portal settings</span>
						<span className="desc">{design.portal.slug}</span>
					</div>
					<div className="rps-section-head" style={{ cursor: 'default' }}>
						<span style={{ paddingLeft: 6 }}>Pages</span>
						<span className="actions" style={{ display: 'flex' }}>
							<button className="rps-icon-btn" title="New page" onClick={newPage} data-rpd-new-page="">
								<FilePlus size={14} />
							</button>
						</span>
					</div>
					{pages.map((p) => (
						<div
							key={p.id}
							className={'rps-row' + (state.node === 'page' && state.pageId === p.id ? ' selected focused' : '') + (p.active === false ? ' warn' : '')}
							style={{ paddingLeft: 12 }}
							onClick={() => designer.openPage(p.id)}
							onDoubleClick={() => renamePage(p)}
							title={`${p.title} · /${p.route}`}
							data-rpd-page={p.route}
						>
							{design.portal.homePage === p.id ? <Home size={13} color="var(--rps-accent)" /> : <span style={{ width: 13 }} />}
							<span className="label">{p.title || p.name}</span>
							<span className="desc">/{p.route}</span>
							<span className="rpd-row-actions">
								<button className="rps-icon-btn" title="Rename" onClick={(e) => (e.stopPropagation(), renamePage(p))}>
									<Settings2 size={12} />
								</button>
								<button className="rps-icon-btn" title="Delete page" onClick={(e) => (e.stopPropagation(), deletePage(p))} data-rpd-delete-page={p.route}>
									<Trash2 size={12} />
								</button>
							</span>
						</div>
					))}
					{state.page ? <Outline designer={designer} state={state} /> : null}
				</div>
			) : null}
		</div>
	);
}

function Outline({ designer, state }) {
	const page = state.page;
	const regions = (page.layout && page.layout.regions) || [];
	return (
		<>
			<div className="rps-section-head" style={{ cursor: 'default' }}>
				<span style={{ paddingLeft: 6 }}>Outline</span>
			</div>
			{regions.map((r) => {
				const portal = (page.portalPlacements || {})[r.name] || [];
				const own = (page.placements || {})[r.name] || [];
				return (
					<div key={r.name}>
						<div className="rps-row" style={{ paddingLeft: 12, cursor: 'default' }}>
							<span className="label" style={{ color: 'var(--rps-muted)', fontSize: 11, textTransform: 'uppercase' }}>
								{r.name}
							</span>
						</div>
						{portal.concat(own).map((p) => (
							<OutlineItem key={p.id} p={p} depth={0} designer={designer} state={state} />
						))}
						{!portal.length && !own.length ? <div className="rps-empty" style={{ paddingLeft: 26, paddingTop: 0 }}>empty</div> : null}
					</div>
				);
			})}
		</>
	);
}

/** One placement in the outline; a block lists its zones and their items beneath it. */
function OutlineItem({ p, depth, designer, state }) {
	const pad = 26 + depth * 14;
	const isBlock = p.component.kind === 'block';
	return (
		<>
			<div
				className={'rps-row' + (state.selection === p.id ? ' selected focused' : '')}
				style={{ paddingLeft: pad, opacity: p.active === false ? 0.55 : 1 }}
				onClick={() => designer.select(p.id)}
				data-rpd-outline={p.id}
			>
				{p.scope === 'portal' && !p.parentId ? <Globe size={12} color="var(--rps-accent)" /> : isBlock ? <LayoutGrid size={12} /> : <span style={{ width: 12 }} />}
				<span className="label">{p.component.name}</span>
				{p.active === false ? <span className="desc">inactive</span> : null}
			</div>
			{isBlock
				? (p.regions || []).map((z) => {
						const kids = (p.children && p.children[z.name]) || [];
						return (
							<div key={z.name}>
								<div className="rps-row" style={{ paddingLeft: pad + 14, cursor: 'default', height: 18 }} data-rpd-outline-zone={`${p.id}|${z.name}`}>
									<span className="label" style={{ color: 'var(--rps-muted)', fontSize: 11 }}>
										{z.label || z.name}
									</span>
									{!kids.length ? <span className="desc">empty</span> : null}
								</div>
								{kids.map((c) => (
									<OutlineItem key={c.id} p={c} depth={depth + 2} designer={designer} state={state} />
								))}
							</div>
						);
					})
				: null}
		</>
	);
}

// ---- right: palette -------------------------------------------------------------------------

function Palette({ designer, state }) {
	const [query, setQuery] = useState('');
	const palette = (state.design && state.design.palette) || [];
	const blocks = (state.design && state.design.blocks) || [];
	const q = query.trim().toLowerCase();
	const match = (c) => !q || (c.name || '').toLowerCase().includes(q) || (c.uniqueId || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
	const list = palette.filter(match);
	const blockList = blocks.filter(match);
	const regions = (state.page && state.page.layout && state.page.layout.regions) || [];
	const mainRegion = regions.some((r) => r.name === 'main') ? 'main' : regions[0] && regions[0].name;
	const add = (c, options) => (state.page && mainRegion ? () => designer.addPlacement(c, mainRegion, 'page', undefined, options) : null);
	return (
		<div className="rps-sidebar" data-rpd-palette="">
			<div className="rps-sidebar-title">Add</div>
			<div className="rpd-pad">
				<input placeholder="Search widgets and blocks" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: '100%' }} data-rpd-palette-search="" />
			</div>
			<div className="rps-tree">
				<div className="rps-group-label">Blocks</div>
				{blockList.map((c) => (
					<BlockPaletteItem key={c.id} component={c} add={add} />
				))}
				{!blockList.length ? <div className="rps-empty">{blocks.length ? 'No match' : 'No blocks'}</div> : null}
				<div className="rps-group-label">Widgets</div>
				{list.map((c) => (
					<PaletteItem key={c.id} component={c} onAdd={add(c)} />
				))}
				{!list.length ? <div className="rps-empty">{palette.length ? 'No match' : 'No placeable widgets'}</div> : null}
			</div>
		</div>
	);
}

/** The presets a block's schema declares (x-presets), as { label, options }. */
function presetsOf(component) {
	const props = (component.optionsSchema && component.optionsSchema.properties) || {};
	const out = [];
	Object.keys(props).forEach((key) => {
		(props[key]['x-presets'] || []).forEach((preset) => {
			const isObj = preset && typeof preset === 'object' && !Array.isArray(preset) && 'value' in preset;
			out.push({ key, label: isObj ? preset.label || String(preset.value) : String(preset), options: { [key]: isObj ? preset.value : preset } });
		});
	});
	return out;
}

function BlockPaletteItem({ component, add }) {
	const presets = presetsOf(component);
	return (
		<div data-rpd-block-item={component.uniqueId}>
			<PaletteItem component={component} onAdd={add(component)} icon={<LayoutGrid size={13} />} />
			{presets.length ? (
				<div className="rpd-presets" data-rpd-presets={component.uniqueId}>
					{presets.map((p) => (
						<PresetChip key={p.key + p.label} component={component} preset={p} />
					))}
				</div>
			) : null}
		</div>
	);
}

function PresetChip({ component, preset }) {
	const { attributes, listeners, setNodeRef } = useDraggable({
		id: `new|${component.id}|${preset.key}|${preset.label}`,
		data: { type: 'new', component, options: preset.options, name: `${component.name} ${preset.label}` }
	});
	return (
		<button ref={setNodeRef} className="rpd-preset" title={`Drag a ${component.name} (${preset.label}) onto the page`} {...listeners} {...attributes} data-rpd-preset={preset.label}>
			{preset.label}
		</button>
	);
}

function PaletteItem({ component, onAdd, icon }) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `new|${component.id}`, data: { type: 'new', component, name: component.name } });
	return (
		<div className={'rps-row rpd-palette-item' + (isDragging ? ' selected' : '')} style={{ paddingLeft: 10, height: 'auto', minHeight: 34, alignItems: 'flex-start', paddingTop: 4, paddingBottom: 4 }} data-rpd-palette-item={component.uniqueId}>
			<div ref={setNodeRef} {...listeners} {...attributes} className="rpd-palette-drag" title="Drag onto a region or zone (or focus and press Space)">
				<span className="label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
					{icon}
					{component.name}
				</span>
				<span className="desc" style={{ whiteSpace: 'normal' }}>
					{component.description || component.uniqueId}
				</span>
			</div>
			{onAdd ? (
				<button className="rps-icon-btn" title="Add to the end of main" onClick={onAdd} data-rpd-palette-add={component.uniqueId}>
					<Plus size={14} />
				</button>
			) : null}
		</div>
	);
}

// ---- right: inspector (placement / page / portal) -------------------------------------------

function Inspector({ designer, studio, state }) {
	const found = findPlacement(state, state.selection);
	let body;
	if (found) body = <PlacementProperties designer={designer} studio={studio} state={state} found={found} />;
	else if (state.node === 'portal' && state.design) body = <PortalSettings designer={designer} state={state} />;
	else if (state.page) body = <PageSettings designer={designer} studio={studio} state={state} />;
	else body = <div className="rps-empty">Nothing selected.</div>;
	return (
		<div className="rps-sidebar" data-rpd-inspector="">
			<div className="rps-sidebar-title">{found ? 'Placement' : state.node === 'portal' ? 'Portal' : 'Page'}</div>
			<div className="rpd-inspector">{body}</div>
		</div>
	);
}

function PlacementProperties({ designer, studio, state, found }) {
	const { placement, scope, parent } = found;
	const [device, setDevice] = useState('base');
	const entry = designer.paletteEntry(placement.component.id);
	const isBlock = placement.component.kind === 'block';
	const zones = parent ? parent.regions || [] : null;
	const regionChoices = zones ? zones.map((z) => ({ name: z.name, label: z.label || z.name })) : ((state.page && state.page.layout && state.page.layout.regions) || []).map((r) => ({ name: r.name, label: r.name }));
	const list = siblingsOf(state, found);
	const index = list.findIndex((p) => p.id === placement.id);
	const busy = !!state.busy;
	const childCount = Object.keys(placement.children || {}).reduce((n, z) => n + (placement.children[z] || []).length, 0);
	const target = (over) => ({ region: placement.region, scope, parentId: parent ? parent.id : null, ...over });

	// Options for the chosen device: base keys, or the tablet / mobile sub-object.
	const own = placement.options || {};
	const optValue = device === 'base' ? own : own[device] || {};
	const optDefaults = device === 'base' ? placement.effectiveOptions || (entry && entry.defaultOptions) || {} : { ...(placement.effectiveOptions || {}), ...((placement.effectiveOptions || {})[device] || {}) };
	const applyOptions = (next) => {
		if (device === 'base') {
			const keep = {};
			['tablet', 'mobile'].forEach((d) => own[d] && (keep[d] = own[d]));
			return designer.setOptions(placement.id, { ...(next || {}), ...keep });
		}
		const merged = { ...own };
		if (next && Object.keys(next).length) merged[device] = next;
		else delete merged[device];
		return designer.setOptions(placement.id, merged);
	};

	const remove = async () => {
		if (childCount) {
			const choice = await ask(studio, {
				type: 'confirm',
				title: `Delete ${placement.component.name}`,
				message: `This ${placement.component.name} contains ${childCount} item(s). Move them out to where the block is (undoable), or delete everything (can't be undone)?`,
				buttons: [
					{ label: 'Move contents out', value: 'lift', primary: true },
					{ label: 'Delete everything', value: 'cascade' },
					{ label: 'Cancel', value: null }
				]
			});
			if (choice) designer.deletePlacement(placement.id, choice);
			return;
		}
		const ok = await ask(studio, {
			type: 'confirm',
			title: 'Remove',
			message: `Remove ${placement.component.name} from ${placement.region}? (Ctrl+Z undoes it)`,
			buttons: [
				{ label: 'Remove', value: true, primary: true },
				{ label: 'Cancel', value: null }
			]
		});
		if (ok) designer.deletePlacement(placement.id);
	};

	return (
		<div className="rpd-form" data-rpd-placement-props={placement.id}>
			<div>
				<div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
					{isBlock ? <LayoutGrid size={13} /> : null}
					{placement.component.name}
				</div>
				<div className="rpd-hint">
					{placement.component.uniqueId} · {scope === 'portal' ? 'portal-wide' : 'this page'} · {parent ? `${parent.component.name} › ${placement.region}` : placement.region}
				</div>
			</div>
			<label className="rpd-field rpd-check">
				<input type="checkbox" checked={placement.active !== false} onChange={(e) => designer.setActive(placement.id, e.target.checked)} disabled={busy} data-rpd-active="" />
				<span className="rpd-label">Active</span>
			</label>
			<label className="rpd-field">
				<span className="rpd-label">{parent ? 'Zone' : 'Region'}</span>
				<select value={placement.region} onChange={(e) => designer.movePlacement(placement.id, target({ region: e.target.value, index: undefined }))} disabled={busy} data-rpd-region-select="">
					{regionChoices.map((r) => (
						<option key={r.name} value={r.name}>
							{r.label}
						</option>
					))}
				</select>
			</label>
			<div className="rpd-buttons">
				<button className="rps-tbtn" disabled={busy || index <= 0} onClick={() => designer.movePlacement(placement.id, target({ index: index - 1 }))} title="Move up">
					<ArrowUp size={13} /> Up
				</button>
				<button className="rps-tbtn" disabled={busy || index === -1 || index >= list.length - 1} onClick={() => designer.movePlacement(placement.id, target({ index: index + 1 }))} title="Move down">
					<ArrowDown size={13} /> Down
				</button>
				{parent ? (
					<button className="rps-tbtn" disabled={busy} onClick={() => designer.movePlacement(placement.id, outOf(state, parent, scope))} data-rpd-move-out="">
						Move out of {parent.component.name}
					</button>
				) : (
					<button className="rps-tbtn" disabled={busy} onClick={() => designer.movePlacement(placement.id, { region: placement.region, scope: scope === 'portal' ? 'page' : 'portal', parentId: null, index: undefined })} data-rpd-scope-toggle="">
						<Globe size={13} /> {scope === 'portal' ? 'Move to this page' : 'Make portal-wide'}
					</button>
				)}
				<button className="rps-tbtn" disabled={busy} onClick={remove} data-rpd-delete="">
					<Trash2 size={13} /> {childCount ? 'Delete…' : 'Remove'}
				</button>
			</div>

			<DeviceSwitch value={device} onChange={setDevice} />

			<div className="rpd-section-title">Options{device !== 'base' ? ` · ${device}` : ''}</div>
			<OptionsForm
				key={placement.id + ':' + device + ':' + JSON.stringify(optValue)}
				schema={entry ? entry.optionsSchema : null}
				value={optValue}
				defaults={optDefaults}
				onApply={applyOptions}
				disabled={busy}
				presets
			/>

			<StyleSection key={'s' + placement.id + device} placement={placement} device={device} disabled={busy} onApply={(styleTokens) => designer.setStyle(placement.id, { styleTokens }, 'Styled')} />
			<LayoutSection
				key={'l' + placement.id + device}
				placement={placement}
				device={device}
				inBlock={!!parent}
				disabled={busy}
				onApply={(layout) => designer.setStyle(placement.id, { layout }, 'Updated grid layout of')}
			/>
			<ClassesField key={'c' + placement.id} placement={placement} disabled={busy} onApply={(classes) => designer.setStyle(placement.id, { classes }, 'Updated classes of')} />
		</div>
	);
}

/** One level up: into the block's own container (its zone, or its layout region), right after it. */
function outOf(state, block, scope) {
	const found = findPlacement(state, block.id);
	const siblings = found ? siblingsOf(state, found) : [];
	const at = siblings.findIndex((p) => p.id === block.id);
	return { region: block.region, scope, parentId: found && found.parent ? found.parent.id : null, index: at === -1 ? undefined : at + 1 };
}

function PageSettings({ designer, studio, state }) {
	const page = state.page.page;
	const design = state.design;
	const busy = !!state.busy;
	const [draft, setDraft] = useState(null);
	const v = draft && draft.id === page.id ? draft : { id: page.id, name: page.name || '', title: page.title || '', route: page.route || '' };
	const commit = (field) => {
		if (v[field] !== (page[field] || '')) designer.updatePage(page.id, { [field]: v[field] });
	};
	const text = (field, label) => (
		<label className="rpd-field">
			<span className="rpd-label">{label}</span>
			<input value={v[field]} onChange={(e) => setDraft({ ...v, [field]: e.target.value })} onBlur={() => commit(field)} onKeyDown={(e) => e.key === 'Enter' && commit(field)} disabled={busy} data-rpd-page-field={field} />
		</label>
	);
	return (
		<div className="rpd-form" data-rpd-page-settings={page.id}>
			{text('title', 'Title')}
			{text('name', 'Name')}
			{text('route', 'Route pattern (orders, orders/:id, docs/*)')}
			<label className="rpd-field">
				<span className="rpd-label">Layout</span>
				<select value={page.layoutOverride || ''} onChange={(e) => designer.updatePage(page.id, { layoutOverride: e.target.value || null })} disabled={busy} data-rpd-layout-override="">
					<option value="">Portal default</option>
					{(design.layouts || []).map((l) => (
						<option key={l.id} value={l.id}>
							{l.name} ({(l.regions || []).map((r) => r.name).join(', ')})
						</option>
					))}
				</select>
			</label>
			<PageLayoutOptions designer={designer} page={page} design={design} busy={busy} />
			<label className="rpd-field">
				<span className="rpd-label">Content width</span>
				<select value={page.contentWidth || 'inherit'} onChange={(e) => designer.updatePage(page.id, { contentWidth: e.target.value })} disabled={busy} data-rpd-content-width="">
					<option value="inherit">Portal default ({(design.portal.settings && design.portal.settings.contentWidth) || '7xl'})</option>
					{CONTENT_WIDTH_OPTIONS.map(([v, label]) => (
						<option key={v} value={v}>
							{label}
						</option>
					))}
				</select>
			</label>
			<label className="rpd-field rpd-check">
				<input type="checkbox" checked={page.active !== false} onChange={(e) => designer.updatePage(page.id, { active: e.target.checked })} disabled={busy} />
				<span className="rpd-label">Active</span>
			</label>
			<label className="rpd-field">
				<span className="rpd-label">Access (roles JSON)</span>
				<JsonEditor value={page.access || null} onApply={(next) => designer.updatePage(page.id, { access: next })} disabled={busy} rows={3} />
			</label>
			<div className="rpd-buttons">
				<button className="rps-tbtn" disabled={busy || design.portal.homePage === page.id} onClick={() => designer.updatePortal({ homePage: page.id })} data-rpd-make-home="">
					<Home size={13} /> {design.portal.homePage === page.id ? 'Home page' : 'Make home page'}
				</button>
				<button
					className="rps-tbtn"
					disabled={busy}
					onClick={async () => {
						const ok = await ask(studio, {
							type: 'confirm',
							title: 'Delete page',
							message: `Delete "${page.title || page.route}" and its placements?`,
							buttons: [
								{ label: 'Delete', value: true, primary: true },
								{ label: 'Cancel', value: null }
							]
						});
						if (ok) designer.deletePage(page.id);
					}}
				>
					<Trash2 size={13} /> Delete page
				</button>
			</div>
			<div className="rpd-hint">Select a widget on the canvas to edit its options.</div>
		</div>
	);
}

function layoutById(design, id) {
	return (design.layouts || []).find((l) => l.id === id) || null;
}

const hasKeys = (o) => !!o && typeof o === 'object' && Object.keys(o).length > 0;

/** The portal default layout's options (settings.layoutOptions), as a schema-driven form. */
function PortalLayoutOptions({ designer, portal, design, busy }) {
	const layout = layoutById(design, portal.defaultLayout);
	if (!layout) return null;
	const settings = portal.settings || {};
	const value = hasKeys(settings.layoutOptions) ? settings.layoutOptions : {};
	const apply = (next) => {
		const merged = { ...settings };
		if (hasKeys(next)) merged.layoutOptions = next;
		else delete merged.layoutOptions;
		designer.updatePortal({ settings: merged });
	};
	return (
		<div className="rpd-field" data-rpd-portal-layout-options="">
			<span className="rpd-label">Layout options ({layout.name})</span>
			<OptionsForm key={'portal-lo:' + layout.id + ':' + JSON.stringify(value)} schema={layout.optionsSchema} value={value} defaults={layout.defaultOptions || {}} onApply={apply} disabled={busy} />
		</div>
	);
}

/**
 * The page's layout options: "Portal default" (null: layout defaults → portal settings) or
 * "Custom" (layout_options_json, merged over them). Custom with nothing set yet stays custom in
 * the panel until a value is applied.
 */
function PageLayoutOptions({ designer, page, design, busy }) {
	const portal = design.portal || {};
	const layoutId = page.layoutOverride || portal.defaultLayout;
	const layout = layoutById(design, layoutId);
	const [customFor, setCustomFor] = useState(null);
	if (!layout) return null;
	const own = hasKeys(page.layoutOptions) ? page.layoutOptions : null;
	const custom = !!own || customFor === page.id;
	const usesDefault = layoutId === portal.defaultLayout;
	const portalOpts = usesDefault && portal.settings && hasKeys(portal.settings.layoutOptions) ? portal.settings.layoutOptions : {};
	const inherited = { ...(layout.defaultOptions || {}), ...portalOpts };
	return (
		<div className="rpd-field" data-rpd-page-layout-options="">
			<span className="rpd-label">Layout options ({layout.name})</span>
			<select
				value={custom ? 'custom' : 'default'}
				onChange={(e) => {
					if (e.target.value === 'custom') setCustomFor(page.id);
					else {
						setCustomFor(null);
						if (own) designer.updatePage(page.id, { layoutOptions: null });
					}
				}}
				disabled={busy}
				aria-label="Layout options source"
				data-rpd-page-layout-options-mode=""
			>
				<option value="default">{usesDefault ? 'Portal default' : 'Layout defaults'}</option>
				<option value="custom">Custom</option>
			</select>
			{custom ? (
				<OptionsForm
					key={'page-lo:' + page.id + ':' + layout.id + ':' + JSON.stringify(own || {})}
					schema={layout.optionsSchema}
					value={own || {}}
					defaults={inherited}
					onApply={(next) => designer.updatePage(page.id, { layoutOptions: hasKeys(next) ? next : null })}
					disabled={busy}
				/>
			) : null}
		</div>
	);
}

const CONTENT_WIDTH_OPTIONS = [
	['full', 'Full bleed'],
	['7xl', '7xl (80rem)'],
	['6xl', '6xl (72rem)'],
	['5xl', '5xl (64rem)'],
	['4xl', '4xl (56rem)'],
	['3xl', '3xl (48rem)']
];

function PortalSettings({ designer, state }) {
	const design = state.design;
	const portal = design.portal;
	const busy = !!state.busy;
	const [name, setName] = useState(null);
	const nameValue = name === null ? portal.name || '' : name;
	const nav = portal.navigation || [];
	const setNav = (next) => designer.updatePortal({ navigation: next });
	return (
		<div className="rpd-form" data-rpd-portal-settings={portal.id}>
			<label className="rpd-field">
				<span className="rpd-label">Name</span>
				<input
					value={nameValue}
					onChange={(e) => setName(e.target.value)}
					onBlur={() => {
						if (nameValue !== portal.name) designer.updatePortal({ name: nameValue });
						setName(null);
					}}
					onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
					disabled={busy}
					data-rpd-portal-name=""
				/>
			</label>
			<div className="rpd-hint">
				/{portal.slug}
				{portal.isDefault ? ' · default portal' : ''}
			</div>
			<label className="rpd-field">
				<span className="rpd-label">Theme</span>
				<select value={portal.theme || ''} onChange={(e) => designer.updatePortal({ theme: e.target.value })} disabled={busy} data-rpd-portal-theme="">
					{(design.themes || []).map((t) => (
						<option key={t.id} value={t.id}>
							{t.name || t.key}
						</option>
					))}
				</select>
			</label>
			<label className="rpd-field">
				<span className="rpd-label">Default layout</span>
				<select value={portal.defaultLayout || ''} onChange={(e) => designer.updatePortal({ defaultLayout: e.target.value })} disabled={busy}>
					{(design.layouts || []).map((l) => (
						<option key={l.id} value={l.id}>
							{l.name}
						</option>
					))}
				</select>
			</label>
			<PortalLayoutOptions designer={designer} portal={portal} design={design} busy={busy} />
			<label className="rpd-field">
				<span className="rpd-label">Default content width</span>
				<select
					value={(portal.settings && portal.settings.contentWidth) || '7xl'}
					onChange={(e) => designer.updatePortal({ settings: { ...(portal.settings || {}), contentWidth: e.target.value } })}
					disabled={busy}
					data-rpd-portal-content-width=""
				>
					{CONTENT_WIDTH_OPTIONS.map(([v, label]) => (
						<option key={v} value={v}>
							{label}
						</option>
					))}
				</select>
			</label>
			<label className="rpd-field">
				<span className="rpd-label">Home page</span>
				<select value={portal.homePage || ''} onChange={(e) => designer.updatePortal({ homePage: e.target.value })} disabled={busy}>
					{(design.pages || []).map((p) => (
						<option key={p.id} value={p.id}>
							{p.title} (/{p.route})
						</option>
					))}
				</select>
			</label>
			<label className="rpd-field rpd-check">
				<input type="checkbox" checked={portal.active !== false} onChange={(e) => designer.updatePortal({ active: e.target.checked })} disabled={busy} />
				<span className="rpd-label">Active</span>
			</label>
			<div className="rpd-label">Navigation</div>
			<div className="rpd-rows" data-rpd-nav="">
				{nav.map((item, i) => (
					<div key={i} className="rpd-row">
						<NavLabel value={item.label || ''} onApply={(label) => setNav(nav.map((x, j) => (j === i ? { ...x, label } : x)))} disabled={busy} />
						<select value={item.page || ''} onChange={(e) => setNav(nav.map((x, j) => (j === i ? { ...x, page: e.target.value } : x)))} disabled={busy}>
							<option value="">Home</option>
							{(design.pages || [])
								.filter((p) => p.route.indexOf(':') === -1)
								.map((p) => (
									<option key={p.id} value={p.route}>
										{p.title} (/{p.route})
									</option>
								))}
						</select>
						<button className="rps-icon-btn" title="Remove" onClick={() => setNav(nav.filter((x, j) => j !== i))} disabled={busy}>
							<Trash2 size={13} />
						</button>
					</div>
				))}
				<button className="rps-tbtn" style={{ alignSelf: 'flex-start' }} onClick={() => setNav(nav.concat({ label: 'New link', page: '' }))} disabled={busy} data-rpd-nav-add="">
					<Plus size={13} /> Add link
				</button>
			</div>
		</div>
	);
}

function NavLabel({ value, onApply, disabled }) {
	const [draft, setDraft] = useState(value);
	React.useEffect(() => setDraft(value), [value]);
	return <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft !== value && onApply(draft)} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} disabled={disabled} />;
}
