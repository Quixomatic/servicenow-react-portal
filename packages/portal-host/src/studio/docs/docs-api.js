// Docs API (/api/x_312987_portal/rp_studio/docs…): x_312987_portal_doc rows for the Docs activity.
// Live only: on mock data the activity says so instead of editing.
import { STUDIO_API_BASE, requestAt } from '#/runtime/api';

const call = (method, path, body) => requestAt(STUDIO_API_BASE, method, path, body);
const e = encodeURIComponent;

export const docsApi = {
	/** → DocDto[] (every page, inactive included, nav order, no markdown) */
	list: () => call('GET', '/docs'),
	/** → DocDto with markdown */
	get: (id) => call('GET', `/docs/${e(id)}`),
	/** body: { title, section, sectionSlug, path?, description?, tags?, icon?, markdown? } */
	create: (body) => call('POST', '/docs', body),
	/** body: { baseHash?, ...fields, markdown?, active? }; 409 doc_conflict on a stale baseHash */
	update: (id, body) => call('PATCH', `/docs/${e(id)}`, body),
	/** body: { sections: [{ slug, title, pages: [id…] }] } → DocDto[] */
	order: (body) => call('POST', '/docs/order', body)
};
