// Editor groups: allotment splits (VS Code's split view) around groups of tabs. Tabs drag between
// groups, reorder within a group, or drop on a group's edge to split it. Every tab keeps its
// editor mounted (hidden when inactive) so cursor, scroll and undo history survive switching.
import React, { useCallback, useRef, useState } from 'react';
import { Allotment } from 'allotment';
import { Columns2, Eye, X } from 'lucide-react';
import CodeEditor from './editor';
import PreviewPane from './preview';
import { FileIcon, baseName } from './dialogs';
import { PREVIEW_TAB, useStudio } from './store';

// Drag payload lives here: dataTransfer can't be read during dragover.
const drag = { current: null }; // { path, fromGroup | null }

export function startFileDrag(event, path, fromGroup) {
	drag.current = { path, fromGroup: fromGroup || null };
	event.dataTransfer.effectAllowed = 'move';
	try {
		// A custom type, so CodeMirror never treats the drag as text to insert.
		event.dataTransfer.setData('application/x-rps-file', path);
	} catch (error) {
		/* ignore */
	}
}

export function endFileDrag() {
	drag.current = null;
}

export default function EditorGroups({ studio, root, dark, onMenu }) {
	const layout = useStudio(studio, (s) => s.layout);
	return (
		<div className="rps-groups" data-rps-groups="">
			<Node node={layout} studio={studio} root={root} dark={dark} onMenu={onMenu} />
		</div>
	);
}

function Node({ node, studio, root, dark, onMenu }) {
	if (node.type === 'group') return <EditorGroup group={node} studio={studio} root={root} dark={dark} onMenu={onMenu} />;
	return (
		<Allotment key={node.id} vertical={node.dir === 'column'} proportionalLayout>
			{node.children.map((child) => (
				<Allotment.Pane key={child.id} minSize={120}>
					<Node node={child} studio={studio} root={root} dark={dark} onMenu={onMenu} />
				</Allotment.Pane>
			))}
		</Allotment>
	);
}

function edgeOf(rect, x, y) {
	const fx = (x - rect.left) / rect.width;
	const fy = (y - rect.top) / rect.height;
	const m = 0.22;
	const d = { left: fx, right: 1 - fx, top: fy, bottom: 1 - fy };
	const nearest = Object.keys(d).reduce((a, b) => (d[a] < d[b] ? a : b));
	return d[nearest] < m ? nearest : 'center';
}

const HL = {
	center: { left: 0, top: 0, width: '100%', height: '100%' },
	left: { left: 0, top: 0, width: '50%', height: '100%' },
	right: { left: '50%', top: 0, width: '50%', height: '100%' },
	top: { left: 0, top: 0, width: '100%', height: '50%' },
	bottom: { left: 0, top: '50%', width: '100%', height: '50%' }
};

function EditorGroup({ group, studio, root, dark, onMenu }) {
	const focused = useStudio(studio, (s) => s.activeGroup === group.id);
	const dirty = useStudio(studio, (s) => s.dirty);
	const problems = useStudio(studio, (s) => s.problems);
	const loadVersion = useStudio(studio, (s) => s.loadVersion);
	const [dropEdge, setDropEdge] = useState(null);
	const [dropIndex, setDropIndex] = useState(null);
	const areaRef = useRef(null);

	const onAreaDragOver = useCallback(
		(e) => {
			if (!drag.current) return;
			e.preventDefault();
			e.stopPropagation();
			e.dataTransfer.dropEffect = 'move';
			const edge = edgeOf(areaRef.current.getBoundingClientRect(), e.clientX, e.clientY);
			setDropEdge((prev) => (prev === edge ? prev : edge));
		},
		[]
	);

	const onAreaDrop = (e) => {
		if (!drag.current) return;
		e.preventDefault();
		e.stopPropagation();
		const d = drag.current;
		const edge = dropEdge;
		setDropEdge(null);
		drag.current = null;
		if (!d) return;
		if (edge === 'center' || !edge) {
			if (d.fromGroup) studio.moveTab(d.fromGroup, d.path, group.id);
			else studio.openFile(d.path, { groupId: group.id, preview: false });
		} else studio.dropOnEdge(d.fromGroup, d.path, group.id, edge);
	};

	const onTabDrop = (e, index) => {
		e.preventDefault();
		e.stopPropagation();
		const d = drag.current;
		setDropIndex(null);
		drag.current = null;
		if (!d) return;
		if (d.fromGroup) {
			const from = d.fromGroup === group.id ? group.tabs.findIndex((t) => t.path === d.path) : -1;
			studio.moveTab(d.fromGroup, d.path, group.id, from !== -1 && from < index ? index - 1 : index);
		} else {
			studio.openFile(d.path, { groupId: group.id, preview: false });
			studio.moveTab(group.id, d.path, group.id, index);
		}
	};

	const errorPaths = new Set(problems.list.filter((p) => p.severity === 'error').map((p) => p.file || 'main.tsx'));

	return (
		<div className={'rps-group' + (focused ? ' focused' : '')} onMouseDown={() => studio.focusGroup(group.id)} data-rps-group={group.id}>
			<div
				className="rps-tabbar"
				onDragOver={(e) => {
					if (!drag.current) return;
					e.preventDefault();
					setDropIndex(group.tabs.length);
				}}
				onDragLeave={() => setDropIndex(null)}
				onDrop={(e) => onTabDrop(e, group.tabs.length)}
				onDoubleClick={(e) => {
					if (e.target === e.currentTarget) studio.splitActive('right');
				}}
				data-rps-tabbar=""
			>
				{group.tabs.map((tab, index) => {
					const isPreviewTab = tab.path === PREVIEW_TAB;
					const isDirty = !!dirty[tab.path];
					return (
						<div
							key={tab.path}
							className={
								'rps-tab' +
								(group.active === tab.path ? ' active' : '') +
								(tab.preview ? ' preview' : '') +
								(isDirty ? ' dirty' : '') +
								(dropIndex === index ? ' drop-before' : '')
							}
							draggable
							onDragStart={(e) => startFileDrag(e, tab.path, group.id)}
							onDragEnd={endFileDrag}
							onDragOver={(e) => {
								if (!drag.current) return;
								e.preventDefault();
								e.stopPropagation();
								setDropIndex(index);
							}}
							onDrop={(e) => onTabDrop(e, index)}
							onMouseDown={(e) => {
								if (e.button === 1) e.preventDefault();
							}}
							onClick={() => studio.activateTab(group.id, tab.path)}
							onDoubleClick={() => studio.pin(group.id, tab.path)}
							onContextMenu={(e) => {
								e.preventDefault();
								if (!onMenu) return;
								onMenu({
									x: e.clientX,
									y: e.clientY,
									items: [
										{ label: 'Close', run: () => studio.closeTab(group.id, tab.path) },
										{ label: 'Close Others', run: () => studio.closeOthers(group.id, tab.path) },
										{ label: 'Close All', run: () => studio.closeAll(group.id) },
										'-',
										{ label: 'Split Right', run: () => studio.splitTab(group.id, tab.path, 'right') },
										{ label: 'Split Down', run: () => studio.splitTab(group.id, tab.path, 'bottom') },
										...(tab.preview ? ['-', { label: 'Keep Open', run: () => studio.pin(group.id, tab.path) }] : [])
									]
								});
							}}
							onAuxClick={(e) => {
								if (e.button === 1) studio.closeTab(group.id, tab.path);
							}}
							title={isPreviewTab ? 'Preview of the latest build' : tab.path}
							data-rps-tab={tab.path}
						>
							{isPreviewTab ? <Eye size={14} /> : <FileIcon path={tab.path} size={14} />}
							<span className="title" style={errorPaths.has(tab.path) ? { color: 'var(--rps-error)' } : undefined}>
								{isPreviewTab ? 'Preview' : baseName(tab.path)}
							</span>
							<button
								className="close"
								title="Close (Alt+W)"
								onClick={(e) => {
									e.stopPropagation();
									studio.closeTab(group.id, tab.path);
								}}
							>
								<X size={14} className="x" />
								<span className="dot" />
							</button>
						</div>
					);
				})}
				<div className="rps-tabbar-fill" />
				<button className="rps-icon-btn" style={{ margin: '6px 4px' }} title="Split editor right (Ctrl+\)" onClick={() => studio.splitActive('right')}>
					<Columns2 size={15} />
				</button>
			</div>
			{group.active && group.active !== PREVIEW_TAB ? (
				<div className="rps-breadcrumbs">
					{group.active.split('/').map((seg, i, all) => (
						<React.Fragment key={i}>
							{i > 0 ? <span>›</span> : null}
							<span style={i === all.length - 1 ? { color: 'var(--rps-fg)' } : undefined}>{seg}</span>
						</React.Fragment>
					))}
				</div>
			) : null}
			<div ref={areaRef} className="rps-editor-area" onDragOverCapture={onAreaDragOver} onDragLeave={(e) => !areaRef.current.contains(e.relatedTarget) && setDropEdge(null)} onDropCapture={onAreaDrop}>
				{group.tabs.length === 0 ? <EmptyGroup /> : null}
				{group.tabs.map((tab) =>
					tab.path === PREVIEW_TAB ? (
						<PreviewPane key={`${loadVersion}:${tab.path}`} studio={studio} root={root} active={group.active === tab.path} />
					) : (
						<CodeEditor
							key={`${loadVersion}:${tab.path}`}
							studio={studio}
							path={tab.path}
							groupId={group.id}
							active={group.active === tab.path}
							root={root}
							dark={dark}
							onFocus={() => studio.focusGroup(group.id)}
						/>
					)
				)}
				{dropEdge ? (
					<div className="rps-dropzone">
						<div className="hl" style={HL[dropEdge]} />
					</div>
				) : null}
			</div>
		</div>
	);
}

function EmptyGroup() {
	return (
		<div className="rps-welcome" style={{ fontSize: 12 }}>
			<div>Drop a tab or a file here, or open one from the explorer.</div>
		</div>
	);
}
