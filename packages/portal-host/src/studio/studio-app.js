// Portal Studio entry, loaded with import() only in mode = studio (consumers never download it).
// Layout: title bar · explorer | editor groups / panel | properties · status bar, filling the
// host's height. The open component is the host's recordId property; switching components
// dispatches PORTAL_NAVIGATE { recordId } so the platform URL follows.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Allotment, LayoutPriority } from 'allotment';
import allotmentStyles from 'allotment/dist/style.css';
import { Code2, LayoutTemplate, Plus } from 'lucide-react';
import { isMock } from '#/runtime/api';
import { ensureStyle, styleTarget } from '#/runtime/styles';
import { useAvailableHeight } from '#/runtime/use-available-height';
import { createStudio, useStudio } from './store';
import { STUDIO_CSS } from './studio-css';
import { useStudioTheme } from './theme';
import { Toaster, toast } from 'sonner';
import { createDesigner } from './designer/designer-store';
import Designer from './designer/designer';
import { designApi } from './designer/designer-api';
import EditorGroups from './groups';
import Explorer from './explorer';
import { ConflictBanner, Panel, Properties, QuickOpen, StatusBar, Titlebar, guardedOpen } from './chrome';
import { ContextMenu, Dialogs, ask, confirmDiscard } from './dialogs';

function cssText(mod) {
	if (!mod) return '';
	if (typeof mod === 'string') return mod;
	const value = mod.default !== undefined ? mod.default : mod;
	return typeof value === 'string' ? value : String(value);
}

// allotment's stylesheet defines its variables on :root, which doesn't exist in a shadow root.
const ALLOTMENT_CSS = cssText(allotmentStyles).replace(/:root\b/g, ':host');

/**
 * props (from the host, plain objects; Studio has its own React, see src/portal-studio.js):
 *   locationStore  the host's normalized-location store (recordId = open component)
 *   navigate       (to, { recordId }) => dispatches PORTAL_NAVIGATE through the host
 */
export default function StudioApp({ locationStore, navigate }) {
	const location = useSyncExternalStore(locationStore.subscribe, locationStore.get, locationStore.get);
	const [rootEl, setRootEl] = useState(null);
	const [target, setTarget] = useState(null);
	const height = useAvailableHeight(rootEl);
	const setRoot = useCallback((el) => {
		if (el) {
			setRootEl(el);
			setTarget(styleTarget(el));
		}
	}, []);
	const navigateRef = useRef(navigate);
	navigateRef.current = navigate;
	const [studio] = useState(() =>
		createStudio({
			navigate: (to, opts) => navigateRef.current(to, opts)
		})
	);
	const [designer] = useState(() =>
		createDesigner({
			navigate: (to, opts) => navigateRef.current(to, opts),
			log: (level, text) => studio.log(level, text)
		})
	);
	const view = useStudio(studio, (s) => s.view);
	// One light/dark/system preference for the portal and Studio (the host's store).
	const { resolvedTheme } = useStudioTheme();
	const dark = resolvedTheme === 'dark';
	const owner = useStudio(studio, (s) => s.owner);
	const explorerOpen = useStudio(studio, (s) => s.explorerOpen);
	const panelOpen = useStudio(studio, (s) => s.panelOpen);
	const propertiesOpen = useStudio(studio, (s) => s.propertiesOpen);
	const loading = useStudio(studio, (s) => s.loading);
	const loadError = useStudio(studio, (s) => s.loadError);
	const [menu, setMenu] = useState(null);
	// allotment applies preferred sizes on its first layout, so it renders only once the body has
	// a real size (Studio renders in its own async React root).
	const [bodyEl, setBodyEl] = useState(null);
	const [bodySized, setBodySized] = useState(false);
	useEffect(() => {
		if (!bodyEl || bodySized) return undefined;
		const check = () => {
			const r = bodyEl.getBoundingClientRect();
			if (r.width > 0 && r.height > 0) setBodySized(true);
		};
		check();
		const ro = new ResizeObserver(check);
		ro.observe(bodyEl);
		return () => ro.disconnect();
	}, [bodyEl, bodySized]);
	const closeMenu = useCallback(() => setMenu(null), []);

	// Styles into the shadow root (CodeMirror mounts its own through EditorView's root option).
	useLayoutEffect(() => {
		if (!target) return;
		ensureStyle(target, 'studio:allotment', ALLOTMENT_CSS, 'widget');
		ensureStyle(target, 'studio', STUDIO_CSS, 'widget');
	}, [target]);

	// Catalog once; the recordId property picks the open component.
	useEffect(() => {
		studio.loadCatalog();
		designer.loadPortals();
	}, [studio, designer]);

	// recordId → what it is: a component or theme opens the editor; a portal or page opens the
	// designer. Studio's own navigation dispatches the id it already has open (no-op here).
	const recordId = location ? location.recordId : '';
	const handling = useRef(false);
	useEffect(() => {
		const current = studio.get().owner;
		const d = designer.get();
		if (!recordId || handling.current) return;
		if ((current && current.id === recordId) || d.pageId === recordId || (d.portalId === recordId && d.node === 'portal')) return;
		handling.current = true;
		(async () => {
			let catalog = studio.get().catalog;
			if (!catalog.components) await studio.loadCatalog();
			catalog = studio.get().catalog;
			const isOwner = (catalog.components || []).some((c) => c.id === recordId) || (catalog.themes || []).some((t) => t.id === recordId);
			let kind = isOwner ? 'component' : null;
			let resolved = null;
			if (!kind) {
				try {
					resolved = await designApi.resolve(recordId);
					kind = resolved.kind;
				} catch (error) {
					kind = 'component'; // older backends: try it as a component
				}
			}
			if (kind === 'portal' || kind === 'page') {
				studio.set({ view: 'pages' });
				await designer.openPortal(resolved.portalId, { pageId: resolved.pageId, node: kind === 'portal' ? 'portal' : 'page', navigate: false });
				return;
			}
			if (kind === 'unknown') {
				toast.error('Nothing in React Portal has the id ' + recordId);
				return;
			}
			studio.set({ view: 'components' });
			if (current && studio.anyDirty()) {
				const choice = await confirmDiscard(studio, current.name);
				if (choice === null) {
					navigateRef.current('', { recordId: current.id }); // put the URL back
					return;
				}
				if (choice === 'save') await studio.save();
			}
			await studio.openOwner(recordId, { navigate: false });
		})().finally(() => {
			handling.current = false;
		});
	}, [recordId, studio, designer]);

	// Opening the Pages view without a portal: open the default (or first) one.
	const designerPortals = useSyncExternalStore(designer.subscribe, () => designer.get().portals);
	const designerPortalId = useSyncExternalStore(designer.subscribe, () => designer.get().portalId);
	useEffect(() => {
		if (view !== 'pages' || designerPortalId || !designerPortals || !designerPortals.length || handling.current) return;
		const def = designerPortals.find((p) => p.isDefault) || designerPortals[0];
		designer.openPortal(def.id, { navigate: false });
	}, [view, designerPortals, designerPortalId, designer]);

	// Warn before leaving the page with unsaved work.
	useEffect(() => {
		const onBeforeUnload = (e) => {
			if (!studio.anyDirty()) return undefined;
			e.preventDefault();
			e.returnValue = '';
			return '';
		};
		window.addEventListener('beforeunload', onBeforeUnload);
		return () => window.removeEventListener('beforeunload', onBeforeUnload);
	}, [studio]);

	// Workbench shortcuts (capture phase, before CodeMirror). Browsers reserve Ctrl+W and
	// Ctrl+Tab, so Alt+W and Ctrl+Alt+←/→ (or Alt+PageUp/PageDown) do the same.
	const onKeyDown = (e) => {
		const mod = e.ctrlKey || e.metaKey;
		const key = e.key.toLowerCase();
		let handled = true;
		if (studio.get().view === 'pages') {
			// The designer saves every change as it happens; it handles its own keys (undo, delete).
			if (mod && !e.shiftKey && key === 's') {
				e.preventDefault();
				e.stopPropagation();
			}
			return;
		}
		if (mod && !e.shiftKey && key === 's') studio.save();
		else if (mod && !e.shiftKey && key === 'p') studio.set((s) => ({ quickOpen: !s.quickOpen }));
		else if (mod && key === 'o' && !e.shiftKey) {
			const btn = rootEl && rootEl.querySelector('[data-rps-switcher]');
			if (btn) btn.click();
		} else if (mod && (e.key === '\\' || e.code === 'Backslash')) studio.splitActive(e.shiftKey ? 'bottom' : 'right');
		else if ((mod && key === 'w') || (e.altKey && !mod && key === 'w')) studio.closeActiveTab();
		else if (e.ctrlKey && e.key === 'Tab') studio.cycleTab(e.shiftKey ? -1 : 1);
		else if ((e.ctrlKey && e.altKey && e.key === 'ArrowRight') || (e.altKey && e.key === 'PageDown')) studio.cycleTab(1);
		else if ((e.ctrlKey && e.altKey && e.key === 'ArrowLeft') || (e.altKey && e.key === 'PageUp')) studio.cycleTab(-1);
		else if (mod && !e.shiftKey && key === 'j') studio.set((s) => ({ panelOpen: !s.panelOpen }));
		else if (mod && !e.shiftKey && key === 'b') studio.set((s) => ({ explorerOpen: !s.explorerOpen }));
		else if (mod && e.shiftKey && key === 'm') studio.set({ panelOpen: true, panelTab: 'problems' });
		else if (e.key === 'Escape' && studio.get().quickOpen) studio.set({ quickOpen: false });
		else handled = false;
		if (handled) {
			e.preventDefault();
			e.stopPropagation();
		}
	};

	return (
		<div ref={setRoot} className={'rps' + (dark ? '' : ' rps-light')} style={{ height }} onKeyDownCapture={onKeyDown} data-rps-root="">
			<Titlebar studio={studio} designer={designer} />
			{view === 'components' ? <ConflictBanner studio={studio} /> : null}
			<div className="rps-main">
			<div className="rps-activity" role="tablist" aria-label="Views">
				<button role="tab" aria-pressed={view === 'components'} title="Components: the code editor" onClick={() => studio.set({ view: 'components' })} data-rps-activity="components">
					<Code2 size={22} strokeWidth={1.6} />
				</button>
				<button role="tab" aria-pressed={view === 'pages'} title="Pages: the page designer" onClick={() => studio.set({ view: 'pages' })} data-rps-activity="pages">
					<LayoutTemplate size={22} strokeWidth={1.6} />
				</button>
			</div>
			<div className="rps-body" ref={setBodyEl}>
				{target && bodySized && view === 'pages' ? <Designer designer={designer} studio={studio} root={target} /> : null}
				{target && bodySized && view === 'components' ? (
					<Allotment proportionalLayout={false} separator>
						<Allotment.Pane preferredSize={260} minSize={170} maxSize={600} visible={explorerOpen} snap priority={LayoutPriority.Low}>
							<Explorer studio={studio} onMenu={setMenu} />
						</Allotment.Pane>
						<Allotment.Pane minSize={300} priority={LayoutPriority.High}>
							<Allotment vertical proportionalLayout={false}>
								<Allotment.Pane minSize={120} priority={LayoutPriority.High}>
									{owner ? (
										<EditorGroups studio={studio} root={target} dark={dark} onMenu={setMenu} />
									) : (
										<Welcome studio={studio} loading={loading} error={loadError} />
									)}
								</Allotment.Pane>
								<Allotment.Pane preferredSize={190} minSize={70} visible={panelOpen} snap priority={LayoutPriority.Low}>
									<Panel studio={studio} />
								</Allotment.Pane>
							</Allotment>
						</Allotment.Pane>
						<Allotment.Pane preferredSize={280} minSize={220} maxSize={480} visible={propertiesOpen && !!owner} priority={LayoutPriority.Low}>
							<Properties studio={studio} />
						</Allotment.Pane>
					</Allotment>
				) : null}
			</div>
			</div>
			<StatusBar studio={studio} designer={designer} dark={dark} mock={isMock()} />
			<Toaster theme={dark ? 'dark' : 'light'} position="bottom-right" closeButton richColors />
			<QuickOpen studio={studio} />
			<Dialogs studio={studio} />
			<ContextMenu menu={menu} onClose={closeMenu} />
		</div>
	);
}

function Welcome({ studio, loading, error }) {
	const catalog = useStudio(studio, (s) => s.catalog);
	const recent = (catalog.components || []).slice(0, 12);
	const kbd = (k) => <span className="rps-kbd">{k}</span>;
	return (
		<div className="rps-welcome" data-rps-welcome="">
			<Code2 size={56} strokeWidth={1} color="var(--rps-accent)" />
			<h2>Portal Studio</h2>
			{loading ? <div>Opening…</div> : null}
			{error ? <div style={{ color: 'var(--rps-error)' }}>{String(error.message || error)}</div> : null}
			<div style={{ display: 'flex', gap: 8 }}>
				<button
					className="rps-btn"
					onClick={async () => {
						const value = await ask(studio, { type: 'newComponent' });
						if (value) studio.createComponent(value.name, value.kind);
					}}
				>
					<Plus size={13} style={{ verticalAlign: '-2px' }} /> New component
				</button>
			</div>
			{recent.length ? (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 260 }}>
					<div className="rps-group-label" style={{ paddingLeft: 0 }}>
						Components
					</div>
					{recent.map((c) => (
						<button key={c.id} className="rps-option" style={{ borderRadius: 4 }} onClick={() => guardedOpen(studio, { type: 'component', id: c.id, name: c.name })} data-rps-welcome-open={c.id}>
							<span>{c.name}</span>
							<span className="sub">{c.kind}</span>
						</button>
					))}
				</div>
			) : null}
			<div className="keys">
				<span>Save</span>
				<span>{kbd('Ctrl+S')}</span>
				<span>Quick open file</span>
				<span>{kbd('Ctrl+P')}</span>
				<span>Switch component</span>
				<span>{kbd('Ctrl+O')}</span>
				<span>Split editor</span>
				<span>{kbd('Ctrl+\\')}</span>
				<span>Close tab</span>
				<span>{kbd('Alt+W')}</span>
				<span>Next / previous tab</span>
				<span>
					{kbd('Ctrl+Alt+→')} {kbd('Ctrl+Alt+←')}
				</span>
				<span>Toggle panel / explorer</span>
				<span>
					{kbd('Ctrl+J')} {kbd('Ctrl+B')}
				</span>
			</div>
		</div>
	);
}
