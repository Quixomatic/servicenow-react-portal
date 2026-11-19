// In-memory AMB for mock mode (?rpmock=1 and the local dev server): a client with the surface the
// runtime uses (getChannel, getRecordWatcherChannel, subscribeToEvent, getConnectionState,
// getChannels) and a bus that turns mock row writes into record-watch messages with the real
// payload shape (entry / change / exit relative to each channel's filter).
//
//   window.__rpAmb.emit(table, sysId, patch)    patch a mock row (or insert it) and publish
//   window.__rpAmb.remove(table, sysId)         delete a mock row and publish
import { mockTableRows } from './index';

function encodeQuery(query) {
	const bytes = encodeURIComponent(query).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
	return btoa(bytes).replace(/=/g, '-');
}

function decodeQuery(encoded) {
	try {
		const bin = atob(String(encoded || '').replace(/-/g, '='));
		return decodeURIComponent(
			Array.from(bin)
				.map((ch) => '%' + ch.charCodeAt(0).toString(16).padStart(2, '0'))
				.join('')
		);
	} catch (error) {
		return '';
	}
}

/** Evaluates the simple encoded queries mock data needs; anything else matches. */
export function mockMatches(row, query) {
	if (!row) return false;
	const q = String(query || '');
	if (!q) return false; // like the platform: an empty filter never delivers
	if (/\^OR|\^NQ/.test(q)) return true;
	return q.split('^').every((term) => {
		if (!term || /^ORDERBY/.test(term)) return true;
		let m = term.match(/^([\w.]+)ISNOTEMPTY$/);
		if (m) return row[m[1]] !== undefined && row[m[1]] !== '';
		m = term.match(/^([\w.]+)ISEMPTY$/);
		if (m) return row[m[1]] === undefined || row[m[1]] === '';
		m = term.match(/^([\w.]+)LIKE(.*)$/);
		if (m) return String(row[m[1]] || '').toLowerCase().indexOf(m[2].toLowerCase()) >= 0;
		m = term.match(/^([\w.]+)STARTSWITH(.*)$/);
		if (m) return String(row[m[1]] || '').toLowerCase().indexOf(m[2].toLowerCase()) === 0;
		m = term.match(/^([\w.]+)!=(.*)$/);
		if (m) return String(row[m[1]] === undefined ? '' : row[m[1]]) !== m[2];
		m = term.match(/^([\w.]+)=(.*)$/);
		if (m) {
			const v = row[m[1]];
			if (m[2] === 'true' || m[2] === 'false') return String(v === undefined ? 'true' : v) === m[2];
			return String(v === undefined ? '' : v) === m[2];
		}
		return true;
	});
}

function fieldsOf(row, names) {
	const out = {};
	names.forEach((n) => {
		if (row && row[n] !== undefined) out[n] = { value: String(row[n]), display_value: String(row[n]) };
	});
	return out;
}

function createMockAmbClient() {
	const channels = new Map(); // name → { table, query, listeners: Map(id → cb) }
	const events = new Map(); // id → { name, fn }
	let nextId = 1;

	function channelListener(name, table, query, options) {
		const id = nextId++;
		let ch = channels.get(name);
		if (!ch) {
			ch = { table, query, listeners: new Map() };
			channels.set(name, ch);
		}
		const listener = {
			getID: () => id,
			subscribe(cb) {
				ch.listeners.set(id, cb);
				if (options && typeof options.subscriptionCallback === 'function') {
					const known = !table || table.indexOf('__denied') < 0;
					setTimeout(() => options.subscriptionCallback(known ? { successful: true, subscription: name } : { successful: false, error: '403:Denied (mock)' }), 20);
				}
				return listener;
			},
			unsubscribe() {
				ch.listeners.delete(id);
				if (!ch.listeners.size) channels.delete(name);
				return listener;
			}
		};
		return listener;
	}

	const client = {
		mock: true,
		getConnectionState: () => 'opened',
		subscribeToEvent(name, fn) {
			const id = nextId++;
			events.set(id, { name, fn });
			return id;
		},
		unsubscribeFromEvent(id) {
			events.delete(id);
		},
		getChannels: () => Object.fromEntries(Array.from(channels.keys()).map((k) => [k, {}])),
		getRecordWatcherChannel(table, query, prefix, options) {
			const name = `/rw/${prefix || 'default'}/${table}/${encodeQuery(query || '')}`;
			return channelListener(name, table, query || '', options);
		},
		getChannel(name, options) {
			const m = String(name).match(/^\/rw\/default\/([^/]+)\/(.*)$/);
			return channelListener(name, m ? m[1] : null, m ? decodeQuery(m[2]) : '', options);
		},
		/** Publish a record change: before / after are rows (null for insert / delete). */
		publish(table, sysId, before, after, operation, changes) {
			channels.forEach((ch, name) => {
				if (ch.table !== table) return;
				const was = mockMatches(before, ch.query);
				const is = mockMatches(after, ch.query);
				if (!was && !is) return;
				const action = !was ? 'entry' : !is ? 'exit' : 'change';
				const row = after || before || {};
				const sysFields = ['sys_mod_count', 'sys_updated_on', 'sys_updated_by'];
				const record = action === 'entry' ? fieldsOf(row, Object.keys(row)) : fieldsOf(row, changes.concat(sysFields));
				const message = {
					channel: name,
					ext: { from_user: 'mock.user' },
					data: {
						action,
						operation,
						table_name: table,
						sys_id: sysId,
						display_value: String(row.number || row.name || sysId),
						changes,
						changes_with_users: Object.fromEntries(changes.map((c) => [c, 'mock.user'])),
						record
					}
				};
				Array.from(ch.listeners.values()).forEach((cb) => cb(message));
			});
		}
	};
	return client;
}

let mockClient = null;

export function getMockAmbClient() {
	if (!mockClient) {
		mockClient = createMockAmbClient();
		if (typeof window !== 'undefined') {
			window.__rpAmb = Object.assign(window.__rpAmb || {}, {
				emit: (table, sysId, patch) => mockWrite(table, sysId, patch || {}),
				remove: (table, sysId) => mockDelete(table, sysId)
			});
		}
	}
	return mockClient;
}

function stamp(row) {
	row.sys_mod_count = String(Number(row.sys_mod_count || 0) + 1);
	row.sys_updated_on = new Date().toISOString().replace('T', ' ').slice(0, 19);
	row.sys_updated_by = 'mock.user';
}

/** Patch (or insert) a mock row and publish the record-watch message. */
export function mockWrite(table, sysId, patch) {
	const rows = mockTableRows(table);
	const index = rows.findIndex((r) => r.sys_id === sysId);
	const before = index >= 0 ? { ...rows[index] } : null;
	const after = { ...(before || { sys_id: sysId }), ...patch };
	const changes = Object.keys(patch).filter((k) => !before || String(before[k]) !== String(patch[k]));
	stamp(after);
	if (index >= 0) rows[index] = after;
	else rows.push(after);
	getMockAmbClient().publish(table, sysId, before, after, before ? 'update' : 'insert', before ? changes : Object.keys(after));
	return after;
}

/** Delete a mock row and publish. */
export function mockDelete(table, sysId) {
	const rows = mockTableRows(table);
	const index = rows.findIndex((r) => r.sys_id === sysId);
	if (index < 0) return false;
	const before = rows[index];
	rows.splice(index, 1);
	getMockAmbClient().publish(table, sysId, before, null, 'delete', []);
	return true;
}
