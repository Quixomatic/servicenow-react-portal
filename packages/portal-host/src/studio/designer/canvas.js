// Designer canvas. The page renders for real: the host's portal runtime (router, layout, regions,
// blocks, loader, theme) in a root owned by the host's React (registry internals), so it looks
// exactly like the portal. The design overlay sits on top and is Studio's own: it measures the
// runtime's markers and draws drop zones, outlines, labels and drag handles there, and shields the
// live widgets from clicks unless "interact" is on.
//
// Markers (set by the runtime, src/runtime/widgets.js):
//   [data-rp-region]                        a layout region
//   [data-rp-placement][data-rp-scope]      a placement (a widget's wrapper, or a block's root)
//     [data-rp-parent][data-rp-zone]        … nested in a block's drop zone
//   [data-rp-zone][data-rp-parent]          a block drop zone with its own element (no `contents`)
// A `contents` zone has no element: its area is the block root's.
//   [data-rp-embed]                         an embedded widget instance (display: contents; read-only,
//                                           never selectable or draggable: its area is its children's)
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical, Globe, LayoutGrid } from 'lucide-react';
import { eachPlacement, findPlacement, samplePath } from './designer-store';
import { useHostTextStyle } from '../host-text';

const DEVICE_WIDTH = { desktop: null, tablet: 820, mobile: 390 };
const MIN_REGION = 28;
const MIN_ZONE = 36;
const PORTAL_STRIP = 8; // empty portal-wide strip: thin, so drops at a region top still go to the page

function internals() {
	const r = globalThis.__REACT_PORTAL__ || {};
	return { ...(r.internals || {}), React: r.modules && r.modules.react, ReactDOMClient: r.modules && r.modules['react-dom/client'] };
}

/** Mounts the host runtime's PortalPreview for (slug, page) into `mountEl`. */
function useRuntimeMount(mountEl, props) {
	const rootRef = useRef(null);
	useEffect(() => {
		const { ReactDOMClient } = internals();
		if (!mountEl || !ReactDOMClient) return undefined;
		rootRef.current = ReactDOMClient.createRoot(mountEl);
		return () => {
			const r = rootRef.current;
			rootRef.current = null;
			setTimeout(() => r && r.unmount(), 0);
		};
	}, [mountEl]);
	useEffect(() => {
		const { React: H, PortalPreview } = internals();
		if (!rootRef.current || !H || !PortalPreview) return;
		rootRef.current.render(H.createElement(PortalPreview, props));
	});
}

const sameGeo = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Block DTOs of the current page (page + portal-wide trees), by id. */
function blocksOf(state) {
	const out = {};
	const page = state.page;
	[page && page.placements, page && page.portalPlacements].forEach((tree) =>
		eachPlacement(tree, (p) => {
			if (p.children) out[p.id] = p;
		})
	);
	return out;
}

/** Measures layout regions, placements and block zones rendered by the runtime, relative to the frame. */
function useGeometry(frameEl, mountEl, blocks) {
	const [geo, setGeo] = useState({ regions: [], placements: [], zones: [], embeds: [] });
	const blocksRef = useRef(blocks);
	blocksRef.current = blocks;
	useEffect(() => {
		if (!frameEl || !mountEl) return undefined;
		let raf = 0;
		const measure = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const base = frameEl.getBoundingClientRect();
				const rel = (r) => ({ left: Math.round(r.left - base.left), top: Math.round(r.top - base.top), width: Math.round(r.width), height: Math.round(r.height) });
				const regions = Array.from(mountEl.querySelectorAll('[data-rp-region]')).map((el) => ({ name: el.getAttribute('data-rp-region'), rect: rel(el.getBoundingClientRect()) }));
				const placementEls = {};
				const placements = Array.from(mountEl.querySelectorAll('[data-rp-placement]'))
					.filter((el) => ['layout', 'studio-preview'].indexOf(el.getAttribute('data-rp-placement')) === -1)
					.map((el) => {
						const regionEl = el.parentElement && el.parentElement.closest('[data-rp-region]');
						const id = el.getAttribute('data-rp-placement');
						placementEls[id] = el;
						return {
							id,
							region: regionEl ? regionEl.getAttribute('data-rp-region') : null,
							scope: el.getAttribute('data-rp-scope') === 'portal' ? 'portal' : 'page',
							parentId: el.getAttribute('data-rp-parent') || null,
							zone: el.getAttribute('data-rp-zone') || null,
							kind: el.getAttribute('data-rp-kind') || 'widget',
							rect: rel(el.getBoundingClientRect())
						};
					})
					.filter((p) => p.region);
				// Zones: every resolved zone of every rendered block (element, or the block root's area).
				const zones = [];
				Object.keys(blocksRef.current || {}).forEach((blockId) => {
					const root = placementEls[blockId];
					if (!root) return;
					const scope = root.getAttribute('data-rp-scope') === 'portal' ? 'portal' : 'page';
					(blocksRef.current[blockId].regions || []).forEach((z) => {
						const el = mountEl.querySelector(`[data-rp-zone="${z.name}"][data-rp-parent="${blockId}"]:not([data-rp-placement])`);
						const r = el && el.getBoundingClientRect();
						const rect = rel(r && (r.width || r.height) ? r : root.getBoundingClientRect());
						zones.push({ parentId: blockId, name: z.name, label: z.label || z.name, scope, own: !!el, rect });
					});
				});
				// Embeds: display: contents wrappers, measured as the union of their children.
				const embeds = Array.from(mountEl.querySelectorAll('[data-rp-embed]'))
					.map((el) => {
						const rects = Array.from(el.children)
							.map((c) => c.getBoundingClientRect())
							.filter((r) => r.width || r.height);
						if (!rects.length) return null;
						const left = Math.min(...rects.map((r) => r.left));
						const top = Math.min(...rects.map((r) => r.top));
						const right = Math.max(...rects.map((r) => r.right));
						const bottom = Math.max(...rects.map((r) => r.bottom));
						const id = el.getAttribute('data-rp-embed');
						return {
							id,
							key: id.split('~').pop(),
							component: el.getAttribute('data-rp-component') || '',
							depth: parseInt(el.getAttribute('data-rp-embed-depth') || '1', 10),
							rect: rel({ left, top, width: right - left, height: bottom - top })
						};
					})
					.filter(Boolean);
				const next = { regions, placements, zones, embeds };
				setGeo((prev) => (sameGeo(prev, next) ? prev : next));
			});
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(frameEl);
		ro.observe(mountEl);
		const mo = new MutationObserver(measure);
		mo.observe(mountEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
		window.addEventListener('resize', measure);
		const timer = setInterval(measure, 1200);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			mo.disconnect();
			window.removeEventListener('resize', measure);
			clearInterval(timer);
		};
	}, [frameEl, mountEl]);
	return geo;
}

export function Canvas({ designer, state, root, geometryRef, dropTarget, dragging }) {
	const { design, page, version, device, interact, selection } = state;
	const [stageEl, setStageEl] = useState(null);
	const [frameEl, setFrameEl] = useState(null);
	const [mountEl, setMountEl] = useState(null);
	const [stageHeight, setStageHeight] = useState(600);
	const hostText = useHostTextStyle(root);
	const slug = design && design.portal ? design.portal.slug : '';
	const path = page && page.page ? samplePath(page.page.route) : '';

	useLayoutEffect(() => {
		if (!stageEl) return undefined;
		const update = () => setStageHeight(Math.max(320, stageEl.clientHeight - 2));
		update();
		const ro = new ResizeObserver(update);
		ro.observe(stageEl);
		return () => ro.disconnect();
	}, [stageEl]);

	useRuntimeMount(mountEl, {
		slug,
		page: path,
		version,
		target: root,
		height: `${stageHeight}px`,
		onNavigate: (to) => {
			// A link clicked in interact mode: open that page in the designer if it exists.
			const route = typeof to === 'string' ? to : to && (to.to || to.page);
			const pages = (design && design.pages) || [];
			const match = pages.find((p) => p.route === route) || (route === '' && pages.find((p) => p.id === design.portal.homePage));
			if (match) designer.openPage(match.id);
		}
	});

	const blocks = blocksOf(state);
	const geo = useGeometry(frameEl, mountEl, blocks);
	geometryRef.current = { ...geo, frameEl };

	const width = DEVICE_WIDTH[device];
	return (
		<div ref={setStageEl} className="rpd-stage" data-rpd-stage="">
			<div ref={setFrameEl} className={'rpd-frame rps-host-content' + (width ? ' device' : '')} style={width ? { ...hostText, width } : hostText} data-rpd-frame="">
				<div ref={setMountEl} className={'rpd-mount' + (interact ? '' : ' designing')} data-rpd-mount="" />
				{!interact ? (
					<Overlay designer={designer} state={state} geo={geo} selection={selection} dropTarget={dropTarget} dragging={dragging} />
				) : null}
			</div>
		</div>
	);
}

function Overlay({ designer, state, geo, selection, dropTarget, dragging }) {
	const page = state.page;
	const inactive = {};
	[page && page.placements, page && page.portalPlacements].forEach((tree) =>
		eachPlacement(tree, (p, parent) => {
			if (p.active !== false) return;
			const key = parent ? `${parent.id}|${p.region}` : p.region;
			inactive[key] = (inactive[key] || 0) + 1;
		})
	);
	// Deeper placements render later (on top), so a nested item's handle wins over its block's.
	const depth = (p) => {
		let d = 0;
		let cur = p;
		while (cur && cur.parentId && d < 8) {
			d += 1;
			cur = geo.placements.find((x) => x.id === cur.parentId);
		}
		return d;
	};
	const placements = geo.placements.slice().sort((a, b) => depth(a) - depth(b));
	return (
		<div className="rpd-overlay" onMouseDown={(e) => e.target === e.currentTarget && designer.select(null)} data-rpd-overlay="">
			{geo.regions.map((r) => (
				<RegionZones key={r.name} region={r} geo={geo} dragging={dragging} target={dropTarget} inactive={inactive[r.name] || 0} />
			))}
			{geo.zones.map((z) => (
				<BlockZoneDrop key={`${z.parentId}|${z.name}`} zone={z} dragging={dragging} target={dropTarget} inactive={inactive[`${z.parentId}|${z.name}`] || 0} />
			))}
			{placements.map((p) => {
				const found = findPlacement(state, p.id);
				return <PlacementBox key={`${p.scope}:${p.id}`} box={p} info={found} selected={selection === p.id} designer={designer} dragging={dragging} />;
			})}
			{dragging
				? null
				: (geo.embeds || []).map((e) => (
						<div key={e.id} className="rpd-embed" style={e.rect} aria-hidden="true" data-rpd-embed={e.id}>
							<span className="rpd-embed-label">
								embedded · {e.component} · {e.key}
							</span>
						</div>
					))}
			{dragging && dropTarget && dropTarget.line ? <div className="rpd-insert" style={dropTarget.line} data-rpd-insert="" /> : null}
		</div>
	);
}

function regionBox(r) {
	return { ...r.rect, height: Math.max(MIN_REGION, r.rect.height) };
}

/** Each region accepts page placements (whole region) and portal-wide ones (a strip on top). */
function RegionZones({ region, geo, dragging, target, inactive }) {
	const box = regionBox(region);
	const portalItems = geo.placements.filter((p) => p.region === region.name && p.scope === 'portal' && !p.parentId);
	const portalBottom = portalItems.length ? Math.max(...portalItems.map((p) => p.rect.top + p.rect.height)) : box.top + PORTAL_STRIP;
	const strip = { left: box.left, top: box.top, width: box.width, height: Math.max(PORTAL_STRIP, portalBottom - box.top) };
	const page = useDroppable({ id: `drop|page|${region.name}`, data: { scope: 'page', region: region.name, parentId: null } });
	const portal = useDroppable({ id: `drop|portal|${region.name}`, data: { scope: 'portal', region: region.name, parentId: null } });
	const isTarget = (scope) => dragging && target && !target.parentId && target.region === region.name && target.scope === scope;
	return (
		<>
			<div
				ref={page.setNodeRef}
				className={'rpd-region' + (dragging ? ' dragging' : '') + (isTarget('page') ? ' over' : '')}
				style={box}
				data-rpd-region={region.name}
			>
				<span className="rpd-region-label">
					{region.name}
					{inactive ? ` · ${inactive} inactive` : ''}
				</span>
			</div>
			<div ref={portal.setNodeRef} className={'rpd-portal-strip' + (dragging ? ' dragging' : '') + (isTarget('portal') ? ' over' : '')} style={strip} data-rpd-portal-strip={region.name}>
				{dragging ? <span className="rpd-strip-label">portal-wide</span> : null}
			</div>
		</>
	);
}

/** A block's drop zone: dashed while dragging, labelled ("Column 2"). */
function BlockZoneDrop({ zone, dragging, target, inactive }) {
	const box = { ...zone.rect, height: Math.max(MIN_ZONE, zone.rect.height) };
	const drop = useDroppable({ id: `drop|zone|${zone.parentId}|${zone.name}`, data: { scope: zone.scope, region: zone.name, parentId: zone.parentId } });
	const over = dragging && target && target.parentId === zone.parentId && target.region === zone.name;
	return (
		<div ref={drop.setNodeRef} className={'rpd-zone' + (dragging ? ' dragging' : '') + (over ? ' over' : '')} style={box} data-rpd-zone={`${zone.parentId}|${zone.name}`}>
			{dragging ? (
				<span className="rpd-zone-label">
					{zone.label}
					{inactive ? ` · ${inactive} inactive` : ''}
				</span>
			) : null}
		</div>
	);
}

function PlacementBox({ box, info, selected, designer, dragging }) {
	const name = info ? info.placement.component.name : box.id;
	const isBlock = box.kind === 'block';
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: `pl|${box.id}`,
		data: { type: 'placement', id: box.id, name, scope: box.scope, region: box.region, kind: box.kind }
	});
	return (
		<div
			className={
				'rpd-placement' +
				(isBlock ? ' block' : '') +
				(selected ? ' selected' : '') +
				(box.scope === 'portal' ? ' portal' : '') +
				(isDragging ? ' lifted' : '') +
				(dragging ? ' dragging' : '')
			}
			style={box.rect}
			onClick={(e) => {
				e.stopPropagation();
				designer.select(box.id);
			}}
			data-rpd-placement={box.id}
		>
			<div className="rpd-chip">
				<button ref={setNodeRef} className="rpd-handle" title="Drag to move (or focus and press Space, then arrows)" {...listeners} {...attributes} data-rpd-handle={box.id}>
					<GripVertical size={12} />
				</button>
				{isBlock ? <LayoutGrid size={11} /> : null}
				<span className="rpd-name">{name}</span>
				{box.scope === 'portal' && !box.parentId ? (
					<span className="rpd-badge" title="Portal-wide: shows on every page of this portal">
						<Globe size={10} /> portal-wide
					</span>
				) : null}
			</div>
		</div>
	);
}

/**
 * Where a drag would drop: the droppable under it (a layout region / portal strip, or a block
 * zone) and the index among that list's placements (the dragged one excluded), in reading order,
 * with an insertion line.
 */
export function computeDropTarget(event, geometry) {
	const over = event.over;
	if (!over || !over.data || !over.data.current || !geometry || !geometry.frameEl) return null;
	const { scope, region, parentId } = over.data.current;
	const activeId = event.active.data.current && event.active.data.current.type === 'placement' ? event.active.data.current.id : null;
	const frame = geometry.frameEl.getBoundingClientRect();
	const rect = event.active.rect.current.translated || event.active.rect.current.initial;
	const cx = rect ? rect.left + rect.width / 2 - frame.left : 0;
	const cy = rect ? rect.top + rect.height / 2 - frame.top : 0;
	const items = geometry.placements
		.filter((p) => p.id !== activeId && (parentId ? p.parentId === parentId && p.zone === region : !p.parentId && p.region === region && p.scope === scope))
		.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
	// Before an item: the cursor is above its row, or on its row and left of its centre.
	const before = (p) => cy < p.rect.top + p.rect.height / 2 && (cy < p.rect.top || cx < p.rect.left + p.rect.width / 2 || p.rect.width > 0.8 * (frame.width || 1));
	let index = items.findIndex(before);
	if (index === -1) index = items.length;
	const area = parentId ? (geometry.zones.find((z) => z.parentId === parentId && z.name === region) || {}).rect : (geometry.regions.find((x) => x.name === region) || {}).rect;
	let line = null;
	if (area) {
		const left = area.left + 4;
		const width = Math.max(20, area.width - 8);
		let y;
		if (items.length === 0) y = scope === 'portal' && !parentId ? area.top + 2 : area.top + Math.max(MIN_ZONE, area.height) / 2;
		else if (index < items.length) y = items[index].rect.top - 3;
		else y = items[items.length - 1].rect.top + items[items.length - 1].rect.height + 2;
		line = { left, top: y, width };
	}
	return { scope, region, parentId: parentId || null, index, line };
}

/** dnd-kit collision: the smallest droppable under the pointer wins (zones nest inside blocks). */
export function deepestUnderPointer(hits, droppableRects) {
	if (!hits.length) return hits;
	const area = (id) => {
		const r = droppableRects.get(id);
		return r ? r.width * r.height : Infinity;
	};
	return [hits.slice().sort((a, b) => area(a.id) - area(b.id))[0]];
}
