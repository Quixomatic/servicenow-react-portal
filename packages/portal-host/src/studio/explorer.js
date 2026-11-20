// Explorer: the component's virtual files (labelled by role) and its extra source files as a tree.
// Single click opens a preview tab, double-click pins. Context menu: New File / New Folder /
// Rename / Delete (folders are path prefixes, not records).
import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FilePlus, Folder, FolderOpen, FolderPlus } from 'lucide-react';
import { FileIcon, ask, baseName } from './dialogs';
import { startFileDrag, endFileDrag } from './groups';
import { useStudio, virtualLabel } from './store';
import { copyStudioLink } from './deep-link/controller';
import * as L from './layout';

function buildTree(paths, folders) {
	const rootNode = { name: '', path: '', folders: new Map(), files: [] };
	const ensure = (dirPath) => {
		let node = rootNode;
		if (!dirPath) return node;
		dirPath.split('/').forEach((seg, i, all) => {
			const p = all.slice(0, i + 1).join('/');
			if (!node.folders.has(seg)) node.folders.set(seg, { name: seg, path: p, folders: new Map(), files: [] });
			node = node.folders.get(seg);
		});
		return node;
	};
	folders.forEach((f) => ensure(f));
	paths.forEach((p) => {
		const i = p.lastIndexOf('/');
		ensure(i === -1 ? '' : p.slice(0, i)).files.push(p);
	});
	return rootNode;
}

export default function Explorer({ studio, onMenu }) {
	const files = useStudio(studio, (s) => s.files);
	const folders = useStudio(studio, (s) => s.folders);
	const dirty = useStudio(studio, (s) => s.dirty);
	const owner = useStudio(studio, (s) => s.owner);
	const kind = useStudio(studio, (s) => (s.savedMeta && s.savedMeta.kind) || 'widget');
	const problems = useStudio(studio, (s) => s.problems);
	const activePath = useStudio(studio, (s) => {
		const g = L.findGroup(s.layout, s.activeGroup);
		return g ? g.active : null;
	});
	const [collapsed, setCollapsed] = useState({});
	const [openSections, setOpenSections] = useState({ component: true, files: true });

	const virtual = files.filter((f) => f.virtual);
	const extra = files.filter((f) => !f.virtual);
	const tree = useMemo(() => buildTree(extra.map((f) => f.path), folders), [extra.map((f) => f.path).join('|'), folders]); // eslint-disable-line react-hooks/exhaustive-deps
	const severity = useMemo(() => {
		const m = {};
		problems.list.forEach((p) => {
			const file = p.file || 'main.tsx';
			if (p.severity === 'error' || !m[file]) m[file] = p.severity;
		});
		return m;
	}, [problems]);

	const open = (path, pinned) => studio.openFile(path, { preview: !pinned });

	const newFile = async (prefix) => {
		const value = await ask(studio, {
			type: 'prompt',
			title: 'New file',
			label: 'Path (folders are created from the path)',
			value: prefix ? prefix + '/' : '',
			okLabel: 'Create',
			validate: (v) => (!v.trim() || /\/$/.test(v.trim()) ? 'Enter a file name' : null)
		});
		if (!value) return;
		const result = studio.createFile(value, '');
		if (result.error) studio.log('error', result.error);
	};
	const newFolder = async (prefix) => {
		const value = await ask(studio, { type: 'prompt', title: 'New folder', label: 'Folder path', value: prefix ? prefix + '/' : '', okLabel: 'Create' });
		if (value) studio.createFolder(value);
	};
	const renameItem = async (path, isFolder) => {
		const value = await ask(studio, { type: 'prompt', title: isFolder ? 'Rename folder' : 'Rename file', label: 'New path', value: path, selectBase: !isFolder, okLabel: 'Rename' });
		if (!value || value === path) return;
		const result = studio.rename(path, value, isFolder);
		if (result.error) studio.log('error', result.error);
	};
	const deleteItem = async (path, isFolder) => {
		const ok = await ask(studio, {
			type: 'confirm',
			title: isFolder ? 'Delete folder' : 'Delete file',
			message: `Delete ${path}${isFolder ? ' and everything in it' : ''}? It is removed on the next save.`,
			buttons: [
				{ label: 'Delete', value: true, primary: true },
				{ label: 'Cancel', value: null }
			]
		});
		if (ok) studio.remove(path, isFolder);
	};

	const menuFor = (e, item) => {
		e.preventDefault();
		e.stopPropagation();
		const items = [];
		const dir = item ? (item.isFolder ? item.path : item.path.includes('/') ? item.path.slice(0, item.path.lastIndexOf('/')) : '') : '';
		items.push({ label: 'New File…', run: () => newFile(dir) });
		items.push({ label: 'New Folder…', run: () => newFolder(dir) });
		if (item && !item.virtual) {
			items.push('-');
			if (!item.isFolder) items.push({ label: 'Open to the Side', run: () => studio.openToSide(item.path) });
			if (!item.isFolder) items.push({ label: 'Copy Link to File', run: () => copyStudioLink({ file: item.path, line: false }) });
			items.push({ label: 'Rename…', run: () => renameItem(item.path, item.isFolder) });
			items.push({ label: 'Delete', run: () => deleteItem(item.path, item.isFolder) });
		}
		if (item && item.virtual) {
			items.push('-');
			items.push({ label: 'Open to the Side', run: () => studio.openToSide(item.path) });
		}
		onMenu({ x: e.clientX, y: e.clientY, items });
	};

	const fileRow = (path, depth, label, desc, isVirtual, unused) => (
		<div
			key={path}
			className={'rps-row' + (activePath === path ? ' selected focused' : '') + (severity[path] === 'error' ? ' err' : severity[path] === 'warning' ? ' warn' : '')}
			style={{ paddingLeft: 8 + depth * 12 }}
			onClick={(e) => (e.altKey ? studio.openToSide(path) : open(path, false))}
			onDoubleClick={() => open(path, true)}
			onContextMenu={(e) => menuFor(e, { path, virtual: isVirtual })}
			draggable
			onDragStart={(e) => startFileDrag(e, path, null)}
			onDragEnd={endFileDrag}
			title={unused ? `${path}: not used by ${kind} components (x_312987_portal.studio.kind_files). Shown because it still has content; empty it and save to remove it.` : path}
			data-rps-file={path}
			data-rps-unused={unused ? '' : undefined}
		>
			<span style={{ width: 16 }} />
			<FileIcon path={path} />
			<span className="label">{label}</span>
			{desc ? <span className="desc">{desc}</span> : null}
			{unused ? <span className="rps-badge-unused">Not used by {kind}</span> : null}
			{dirty[path] ? <span className="dirty" /> : null}
		</div>
	);

	const renderFolder = (node, depth) => {
		const out = [];
		Array.from(node.folders.values())
			.sort((a, b) => a.name.localeCompare(b.name))
			.forEach((f) => {
				const isCollapsed = !!collapsed[f.path];
				out.push(
					<div
						key={'d:' + f.path}
						className="rps-row"
						style={{ paddingLeft: 8 + depth * 12 }}
						onClick={() => setCollapsed((c) => ({ ...c, [f.path]: !c[f.path] }))}
						onContextMenu={(e) => menuFor(e, { path: f.path, isFolder: true })}
						data-rps-folder={f.path}
					>
						{isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
						{isCollapsed ? <Folder size={15} color="#dcb67a" /> : <FolderOpen size={15} color="#dcb67a" />}
						<span className="label">{f.name}</span>
					</div>
				);
				if (!isCollapsed) out.push(...renderFolder(f, depth + 1));
			});
		node.files.sort((a, b) => a.localeCompare(b)).forEach((p) => out.push(fileRow(p, depth, baseName(p), null, false)));
		return out;
	};

	if (!owner) return <div className="rps-sidebar"><div className="rps-sidebar-title">Explorer</div><div className="rps-empty">Open a component from the switcher.</div></div>;

	return (
		<div className="rps-sidebar" data-rps-explorer="">
			<div className="rps-sidebar-title">Explorer</div>
			<div className="rps-section" style={{ flex: 'none' }}>
				<div className="rps-section-head" onClick={() => setOpenSections((s) => ({ ...s, component: !s.component }))}>
					{openSections.component ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
					<span>{owner.type === 'theme' ? 'Theme' : 'Component'}</span>
				</div>
				{openSections.component ? (
					<div>
						{virtual.map((f) => {
							const v = virtualLabel(f.path);
							return fileRow(f.path, 0, v ? v.label : f.path, v ? f.path : null, true, !!f.unused);
						})}
					</div>
				) : null}
			</div>
			{owner.type === 'component' ? (
				<div className="rps-section" style={{ flex: 1 }}>
					<div className="rps-section-head" onClick={() => setOpenSections((s) => ({ ...s, files: !s.files }))}>
						{openSections.files ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
						<span>Files</span>
						<span className="actions" onClick={(e) => e.stopPropagation()}>
							<button className="rps-icon-btn" title="New File…" onClick={() => newFile('')} data-rps-new-file="">
								<FilePlus size={15} />
							</button>
							<button className="rps-icon-btn" title="New Folder…" onClick={() => newFolder('')}>
								<FolderPlus size={15} />
							</button>
						</span>
					</div>
					{openSections.files ? (
						<div className="rps-tree" onContextMenu={(e) => menuFor(e, null)}>
							{extra.length || folders.length ? renderFolder(tree, 0) : <div className="rps-empty">No extra files. Right-click to add one.</div>}
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
}
