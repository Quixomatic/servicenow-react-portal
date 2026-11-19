// Designer canvas. The page renders for real: the host's portal runtime (router, layout, regions,
// loader, theme) in a root owned by the host's React (registry internals), so it looks exactly
// like the portal. The design overlay sits on top and is Studio's own: it measures the runtime's
// [data-rp-region] / [data-rp-placement] elements and draws drop zones, outlines, labels and drag
// handles there, and shields the live widgets from clicks unless "interact" is on.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical, Globe } from 'lucide-react';
import { findPlacement, samplePath } from './designer-store';
import { useHostTextStyle } from '../host-text';

const DEVICE_WIDTH = { desktop: null, tablet: 820, mobile: 390 };
const MIN_REGION = 28;
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

/** Measures regions and placements rendered by the runtime, relative to the frame. */
function useGeometry(frameEl, mountEl) {
	const [geo, setGeo] = useState({ regions: [], placements: [] });
	useEffect(() => {
		if (!frameEl || !mountEl) return undefined;
		let raf = 0;
		const measure = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const base = frameEl.getBoundingClientRect();
				const rel = (r) => ({ left: Math.round(r.left - base.left), top: Math.round(r.top - base.top), width: Math.round(r.width), height: Math.round(r.height) });
				const regions = Array.from(mountEl.querySelectorAll('[data-rp-region]')).map((el) => ({ name: el.getAttribute('data-rp-region'), rect: rel(el.getBoundingClientRect()) }));
				const placements = Array.from(mountEl.querySelectorAll('[data-rp-placement]'))
					.filter((el) => ['layout', 'studio-preview'].indexOf(el.getAttribute('data-rp-placement')) === -1)
					.map((el) => {
						const regionEl = el.parentElement && el.parentElement.closest('[data-rp-region]');
						return {
							id: el.getAttribute('data-rp-placement'),
							region: regionEl ? regionEl.getAttribute('data-rp-region') : null,
							scope: el.getAttribute('data-rp-scope') === 'portal' ? 'portal' : 'page',
							rect: rel(el.getBoundingClientRect())
						};
					})
					.filter((p) => p.region);
				const next = { regions, placements };
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

	const geo = useGeometry(frameEl, mountEl);
	geometryRef.current = { ...geo, frameEl };

	const width = DEVICE_WIDTH[device];
	return (
		<div ref={setStageEl} className="rpd-stage" data-rpd-stage="">
			<div ref={setFrameEl} className={'rpd-frame rps-host-content' + (width ? ' device' : '')} style={width ? { ...hostText, width } : hostText} data-rpd-frame="">
				<div ref={setMountEl} className="rpd-mount" data-rpd-mount="" />
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
	[['page', page && page.placements], ['portal', page && page.portalPlacements]].forEach(([scope, byRegion]) =>
		Object.keys(byRegion || {}).forEach((region) =>
			byRegion[region].forEach((p) => {
				if (p.active === false) inactive[region] = (inactive[region] || 0) + 1;
			})
		)
	);
	return (
		<div className="rpd-overlay" onMouseDown={(e) => e.target === e.currentTarget && designer.select(null)} data-rpd-overlay="">
			{geo.regions.map((r) => (
				<RegionZones key={r.name} region={r} geo={geo} dragging={dragging} target={dropTarget} inactive={inactive[r.name] || 0} />
			))}
			{geo.placements.map((p) => {
				const found = findPlacement(state, p.id);
				return <PlacementBox key={`${p.scope}:${p.id}`} box={p} info={found} selected={selection === p.id} designer={designer} dragging={dragging} />;
			})}
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
	const portalItems = geo.placements.filter((p) => p.region === region.name && p.scope === 'portal');
	const portalBottom = portalItems.length ? Math.max(...portalItems.map((p) => p.rect.top + p.rect.height)) : box.top + PORTAL_STRIP;
	const strip = { left: box.left, top: box.top, width: box.width, height: Math.max(PORTAL_STRIP, portalBottom - box.top) };
	const page = useDroppable({ id: `drop|page|${region.name}`, data: { scope: 'page', region: region.name } });
	const portal = useDroppable({ id: `drop|portal|${region.name}`, data: { scope: 'portal', region: region.name } });
	const isTarget = (scope) => dragging && target && target.region === region.name && target.scope === scope;
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

function PlacementBox({ box, info, selected, designer, dragging }) {
	const name = info ? info.placement.component.name : box.id;
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: `pl|${box.id}`,
		data: { type: 'placement', id: box.id, name, scope: box.scope, region: box.region }
	});
	return (
		<div
			className={'rpd-placement' + (selected ? ' selected' : '') + (box.scope === 'portal' ? ' portal' : '') + (isDragging ? ' lifted' : '') + (dragging ? ' dragging' : '')}
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
				<span className="rpd-name">{name}</span>
				{box.scope === 'portal' ? (
					<span className="rpd-badge" title="Portal-wide: shows on every page of this portal">
						<Globe size={10} /> portal-wide
					</span>
				) : null}
			</div>
		</div>
	);
}

/**
 * Where a drag would drop: the droppable under it (scope + region) and the index among that
 * region's placements of the same scope (the dragged one excluded), with an insertion line.
 */
export function computeDropTarget(event, geometry) {
	const over = event.over;
	if (!over || !over.data || !over.data.current || !geometry || !geometry.frameEl) return null;
	const { scope, region } = over.data.current;
	const activeId = event.active.data.current && event.active.data.current.type === 'placement' ? event.active.data.current.id : null;
	const frame = geometry.frameEl.getBoundingClientRect();
	const rect = event.active.rect.current.translated || event.active.rect.current.initial;
	const cy = rect ? rect.top + rect.height / 2 - frame.top : 0;
	const items = geometry.placements
		.filter((p) => p.region === region && p.scope === scope && p.id !== activeId)
		.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
	const index = items.filter((p) => p.rect.top + p.rect.height / 2 < cy).length;
	const r = geometry.regions.find((x) => x.name === region);
	let line = null;
	if (r) {
		let y;
		if (items.length === 0) y = scope === 'portal' ? r.rect.top + 2 : r.rect.top + Math.max(MIN_REGION, r.rect.height) / 2;
		else if (index < items.length) y = items[index].rect.top - 3;
		else y = items[items.length - 1].rect.top + items[items.length - 1].rect.height + 2;
		line = { left: r.rect.left + 4, top: y, width: Math.max(20, r.rect.width - 8) };
	}
	return { scope, region, index, line };
}
