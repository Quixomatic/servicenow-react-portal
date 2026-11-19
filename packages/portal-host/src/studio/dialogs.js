import React, { useEffect, useRef, useState } from 'react';
import { Braces, FileCode2, FileJson2, FileText, LayoutPanelTop, Palette, Server, Settings2, SlidersHorizontal } from 'lucide-react';
import { useStudio, virtualLabel, kindFilesFor } from './store';

// ---- file icons -----------------------------------------------------------------------------

const EXT_COLORS = { tsx: '#3178c6', ts: '#3178c6', jsx: '#e8a33d', js: '#e8d44d', mjs: '#e8d44d', css: '#a074c4', json: '#cbcb41' };

export function FileIcon({ path, size }) {
	const s = size || 15;
	const v = virtualLabel(path);
	if (v) {
		const color = { client: '#3178c6', styles: '#a074c4', server: '#89d185', schema: '#cbcb41', defaults: '#cbcb41', regions: '#e37933', tokens: '#e37933' }[v.kind];
		const Icon = { client: FileCode2, styles: Palette, server: Server, schema: Braces, defaults: SlidersHorizontal, regions: LayoutPanelTop, tokens: Settings2 }[v.kind] || FileText;
		return <Icon size={s} color={color} />;
	}
	const ext = (path.split('.').pop() || '').toLowerCase();
	if (ext === 'json') return <FileJson2 size={s} color={EXT_COLORS.json} />;
	if (ext === 'css') return <Palette size={s} color={EXT_COLORS.css} />;
	if (EXT_COLORS[ext]) return <FileCode2 size={s} color={EXT_COLORS[ext]} />;
	return <FileText size={s} />;
}

export const baseName = (path) => path.split('/').pop();

// ---- dialogs (promise based) ----------------------------------------------------------------

/** Open a dialog; resolves with the chosen value (or null on cancel). */
export function ask(studio, spec) {
	return new Promise((resolve) => studio.set({ dialog: { ...spec, resolve } }));
}

export function confirmDiscard(studio, what) {
	return ask(studio, {
		type: 'confirm',
		title: 'Unsaved changes',
		message: `${what || 'This component'} has unsaved changes. Save them first?`,
		buttons: [
			{ label: 'Save', value: 'save', primary: true },
			{ label: "Don't save", value: 'discard' },
			{ label: 'Cancel', value: null }
		]
	});
}

export function Dialogs({ studio }) {
	const dialog = useStudio(studio, (s) => s.dialog);
	if (!dialog) return null;
	const close = (value) => {
		studio.set({ dialog: null });
		dialog.resolve(value);
	};
	return (
		<div className="rps-overlay" onMouseDown={(e) => e.target === e.currentTarget && close(null)}>
			{dialog.type === 'prompt' ? <PromptDialog dialog={dialog} close={close} /> : null}
			{dialog.type === 'confirm' ? <ConfirmDialog dialog={dialog} close={close} /> : null}
			{dialog.type === 'newComponent' ? <NewComponentDialog dialog={dialog} close={close} kindFiles={studio.get().kindFiles} /> : null}
		</div>
	);
}

function ConfirmDialog({ dialog, close }) {
	const first = useRef(null);
	useEffect(() => first.current && first.current.focus(), []);
	return (
		<div className="rps-dialog" role="dialog" onKeyDown={(e) => e.key === 'Escape' && close(null)}>
			<h3>{dialog.title}</h3>
			<div>{dialog.message}</div>
			<div className="row">
				{dialog.buttons.map((b, i) => (
					<button key={b.label} ref={i === 0 ? first : null} className={'rps-btn' + (b.primary ? '' : ' secondary')} onClick={() => close(b.value)}>
						{b.label}
					</button>
				))}
			</div>
		</div>
	);
}

function PromptDialog({ dialog, close }) {
	const [value, setValue] = useState(dialog.value || '');
	const [error, setError] = useState(null);
	const input = useRef(null);
	useEffect(() => {
		const el = input.current;
		if (!el) return;
		el.focus();
		// Select the base name (VS Code rename behaviour).
		const v = el.value;
		const slash = v.lastIndexOf('/') + 1;
		const dot = v.lastIndexOf('.');
		el.setSelectionRange(dialog.selectBase ? slash : v.length, dialog.selectBase && dot > slash ? dot : v.length);
	}, [dialog.selectBase]);
	const submit = () => {
		const err = dialog.validate ? dialog.validate(value) : null;
		if (err) setError(err);
		else close(value);
	};
	return (
		<div className="rps-dialog" role="dialog">
			<h3>{dialog.title}</h3>
			<label>
				{dialog.label}
				<input
					ref={input}
					value={value}
					onChange={(e) => {
						setValue(e.target.value);
						setError(null);
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter') submit();
						if (e.key === 'Escape') close(null);
					}}
					data-rps-prompt=""
				/>
			</label>
			{error ? <div className="error">{error}</div> : null}
			<div className="row">
				<button className="rps-btn secondary" onClick={() => close(null)}>
					Cancel
				</button>
				<button className="rps-btn" onClick={submit}>
					{dialog.okLabel || 'OK'}
				</button>
			</div>
		</div>
	);
}

function NewComponentDialog({ close, kindFiles }) {
	const [name, setName] = useState('');
	const [kind, setKind] = useState('widget');
	const input = useRef(null);
	useEffect(() => input.current && input.current.focus(), []);
	const submit = () => name.trim() && close({ name: name.trim(), kind });
	return (
		<div className="rps-dialog" role="dialog" onKeyDown={(e) => e.key === 'Escape' && close(null)}>
			<h3>New component</h3>
			<label>
				Name
				<input ref={input} value={name} placeholder="Order list" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} data-rps-new-name="" />
			</label>
			<label>
				Kind
				<select value={kind} onChange={(e) => setKind(e.target.value)} data-rps-new-kind="">
					<option value="widget">Widget</option>
					<option value="layout">Layout</option>
					<option value="block">Block</option>
					<option value="primitive">Primitive</option>
					<option value="utility">Utility</option>
				</select>
			</label>
			<div className="hint" data-rps-new-kind-files="">Files: {kindFilesFor(kindFiles, kind).join(', ')}</div>
			<div className="row">
				<button className="rps-btn secondary" onClick={() => close(null)}>
					Cancel
				</button>
				<button className="rps-btn" disabled={!name.trim()} onClick={submit}>
					Create
				</button>
			</div>
		</div>
	);
}

// ---- context menu ---------------------------------------------------------------------------

export function ContextMenu({ menu, onClose }) {
	const ref = useRef(null);
	useEffect(() => {
		if (!menu) return undefined;
		const off = (e) => {
			if (ref.current && e.composedPath().includes(ref.current)) return;
			onClose();
		};
		const key = (e) => e.key === 'Escape' && onClose();
		window.addEventListener('mousedown', off, true);
		window.addEventListener('keydown', key, true);
		window.addEventListener('blur', onClose);
		return () => {
			window.removeEventListener('mousedown', off, true);
			window.removeEventListener('keydown', key, true);
			window.removeEventListener('blur', onClose);
		};
	}, [menu, onClose]);
	if (!menu) return null;
	return (
		<div ref={ref} className="rps-menu" style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 30 * menu.items.length - 10) }} data-rps-menu="">
			{menu.items.map((item, i) =>
				item === '-' ? (
					<div key={i} className="sep" />
				) : (
					<button
						key={item.label}
						onClick={() => {
							onClose();
							item.run();
						}}
					>
						{item.label}
					</button>
				)
			)}
		</div>
	);
}
