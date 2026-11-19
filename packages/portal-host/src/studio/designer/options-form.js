// Options form generated from a component's options schema (the subset Studio supports):
// string → input / textarea / select (enum), number|integer → number input, boolean → checkbox,
// array of objects → repeatable rows, object/unknown → JSON editor. No schema → raw JSON editor.
// Edits apply on blur / Enter (checkboxes and selects at once).
import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const same = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);

export function OptionsForm({ schema, value, defaults, onApply, disabled }) {
	const [raw, setRaw] = useState(false);
	const props = schema && schema.type === 'object' && schema.properties ? schema.properties : null;
	if (!props || raw) {
		return (
			<div className="rpd-form">
				{props ? (
					<button className="rps-tbtn" onClick={() => setRaw(false)}>
						Back to the form
					</button>
				) : (
					<div className="rpd-hint">No options schema: edit the JSON directly.</div>
				)}
				<JsonEditor value={value || {}} onApply={onApply} disabled={disabled} rows={10} />
			</div>
		);
	}
	const required = new Set(schema.required || []);
	const set = (name, next) => {
		const merged = { ...(value || {}) };
		if (next === undefined) delete merged[name];
		else merged[name] = next;
		if (!same(merged, value || {})) onApply(merged);
	};
	return (
		<div className="rpd-form" data-rpd-options-form="">
			{Object.keys(props).map((name) => (
				<Field
					key={name}
					name={name}
					spec={props[name] || {}}
					value={(value || {})[name]}
					placeholder={defaults && defaults[name] !== undefined ? defaults[name] : props[name] && props[name].default}
					required={required.has(name)}
					onApply={(next) => set(name, next)}
					disabled={disabled}
				/>
			))}
			<button className="rps-tbtn" onClick={() => setRaw(true)} style={{ alignSelf: 'flex-start' }}>
				Edit as JSON
			</button>
		</div>
	);
}

function Label({ spec, name, required, children, onPreset, current }) {
	const presets = Array.isArray(spec['x-presets']) && onPreset ? spec['x-presets'] : null;
	return (
		<label className="rpd-field" data-rpd-field={name}>
			<span className="rpd-label">
				{spec.title || name}
				{required ? <span style={{ color: 'var(--rps-error)' }}> *</span> : null}
			</span>
			{presets ? <PresetButtons presets={presets} current={current} onPreset={onPreset} name={name} /> : null}
			{children}
			{spec.description ? <span className="rpd-hint">{spec.description}</span> : null}
		</label>
	);
}

function Field({ name, spec, value, placeholder, required, onApply, disabled }) {
	const type = spec.type || (Array.isArray(spec.enum) ? 'string' : 'object');
	if (type === 'boolean') {
		return (
			<label className="rpd-field rpd-check" data-rpd-field={name}>
				<input type="checkbox" checked={value === undefined ? !!placeholder : !!value} onChange={(e) => onApply(e.target.checked)} disabled={disabled} />
				<span className="rpd-label">{spec.title || name}</span>
			</label>
		);
	}
	if (type === 'string' && Array.isArray(spec.enum)) {
		return (
			<Label spec={spec} name={name} required={required} onPreset={onApply} current={value}>
				<select value={value === undefined ? '' : value} onChange={(e) => onApply(e.target.value === '' ? undefined : e.target.value)} disabled={disabled}>
					<option value="">{placeholder !== undefined ? `Default (${placeholder})` : '(none)'}</option>
					{spec.enum.map((opt, i) => (
						<option key={String(opt)} value={opt}>
							{(spec.enumNames && spec.enumNames[i]) || String(opt)}
						</option>
					))}
				</select>
			</Label>
		);
	}
	if (type === 'string' || type === 'number' || type === 'integer') {
		const numeric = type !== 'string';
		return (
			<Label spec={spec} name={name} required={required} onPreset={onApply} current={value}>
				<TextInput
					multiline={spec.format === 'textarea'}
					inputType={numeric ? 'number' : spec.format === 'color' ? 'color' : spec.format === 'url' ? 'url' : 'text'}
					value={value === undefined || value === null ? '' : String(value)}
					placeholder={placeholder === undefined || placeholder === null ? '' : String(placeholder)}
					onApply={(text) => {
						if (text === '') return onApply(undefined);
						if (!numeric) return onApply(text);
						const n = type === 'integer' ? parseInt(text, 10) : parseFloat(text);
						return onApply(Number.isNaN(n) ? undefined : n);
					}}
					disabled={disabled}
				/>
			</Label>
		);
	}
	if (type === 'array' && spec.items && spec.items.type === 'object' && spec.items.properties) {
		return (
			<Label spec={spec} name={name} required={required} onPreset={onApply} current={value}>
				<ArrayRows items={spec.items} value={Array.isArray(value) ? value : []} onApply={onApply} disabled={disabled} />
			</Label>
		);
	}
	return (
		<Label spec={spec} name={name} required={required} onPreset={onApply} current={value}>
			<JsonEditor value={value === undefined ? null : value} onApply={onApply} disabled={disabled} rows={4} />
		</Label>
	);
}

/** Text field that applies on blur or Enter (not on every keystroke). */
function TextInput({ multiline, inputType, value, placeholder, onApply, disabled }) {
	const [draft, setDraft] = useState(value);
	useEffect(() => setDraft(value), [value]);
	const commit = () => {
		if (draft !== value) onApply(draft);
	};
	const common = {
		value: draft,
		placeholder,
		disabled,
		onChange: (e) => setDraft(e.target.value),
		onBlur: commit
	};
	if (multiline) return <textarea rows={3} {...common} onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && commit()} />;
	return <input type={inputType} {...common} onKeyDown={(e) => e.key === 'Enter' && commit()} />;
}

function ArrayRows({ items, value, onApply, disabled }) {
	const fields = Object.keys(items.properties);
	const update = (index, field, next) => {
		const rows = value.map((row, i) => (i === index ? { ...row, [field]: next } : row));
		if (next === undefined) delete rows[index][field];
		onApply(rows);
	};
	return (
		<div className="rpd-rows">
			{value.map((row, index) => (
				<div key={index} className="rpd-row" data-rpd-row={index}>
					{fields.map((f) => {
						const spec = items.properties[f] || {};
						if (spec.type === 'boolean') {
							return (
								<label key={f} className="rpd-check" title={spec.title || f}>
									<input type="checkbox" checked={!!row[f]} onChange={(e) => update(index, f, e.target.checked)} disabled={disabled} />
									<span>{spec.title || f}</span>
								</label>
							);
						}
						return (
							<TextInput
								key={f}
								inputType={spec.type === 'number' || spec.type === 'integer' ? 'number' : 'text'}
								value={row[f] === undefined || row[f] === null ? '' : String(row[f])}
								placeholder={spec.title || f}
								onApply={(text) => update(index, f, text === '' ? undefined : spec.type === 'integer' ? parseInt(text, 10) : spec.type === 'number' ? parseFloat(text) : text)}
								disabled={disabled}
							/>
						);
					})}
					<button className="rps-icon-btn" title="Remove row" onClick={() => onApply(value.filter((r, i) => i !== index))} disabled={disabled}>
						<Trash2 size={13} />
					</button>
				</div>
			))}
			<button className="rps-tbtn" style={{ alignSelf: 'flex-start' }} onClick={() => onApply(value.concat({}))} disabled={disabled} data-rpd-add-row="">
				<Plus size={13} /> Add
			</button>
		</div>
	);
}

/** JSON textarea: applies valid JSON on blur (Ctrl+Enter too); invalid JSON shows an error. */
export function JsonEditor({ value, onApply, disabled, rows }) {
	const text = JSON.stringify(value === undefined ? null : value, null, 2);
	const [draft, setDraft] = useState(text);
	const [error, setError] = useState(null);
	useEffect(() => {
		setDraft(text);
		setError(null);
	}, [text]);
	const commit = () => {
		if (draft === text) return;
		try {
			const parsed = draft.trim() ? JSON.parse(draft) : null;
			setError(null);
			onApply(parsed);
		} catch (e) {
			setError(e.message);
		}
	};
	return (
		<div className="rpd-json">
			<textarea
				className="rpd-mono"
				rows={rows || 6}
				value={draft}
				disabled={disabled}
				spellCheck={false}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && commit()}
				data-rpd-json=""
			/>
			{error ? <span className="rpd-error">{error}</span> : null}
		</div>
	);
}

/** x-presets: quick buttons ({ label, value } objects or plain values) that set the option. */
function PresetButtons({ presets, current, onPreset, name }) {
	const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
	return (
		<span className="rpd-presets inline" data-rpd-option-presets={name}>
			{presets.map((p, i) => {
				const isObj = p && typeof p === 'object' && !Array.isArray(p) && 'value' in p;
				const value = isObj ? p.value : p;
				const label = isObj ? p.label || String(p.value) : String(p);
				return (
					<button
						key={i}
						type="button"
						className={'rpd-preset' + (same(current, value) ? ' active' : '')}
						aria-pressed={same(current, value)}
						title={typeof value === 'string' ? value : label}
						onClick={(e) => {
							e.preventDefault();
							onPreset(value);
						}}
					>
						{label}
					</button>
				);
			})}
		</span>
	);
}
