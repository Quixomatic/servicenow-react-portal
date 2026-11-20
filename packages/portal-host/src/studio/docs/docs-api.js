// Docs API (/api/x_312987_portal/rp_studio/…): docs collections, their sections and pages for the
// Docs activity. Every page call names its collection (a request without one gets the pre-collection
// behaviour, kept for older hosts). Live only: on mock data the activity says so instead of editing.
import { STUDIO_API_BASE, requestAt } from '#/runtime/api';

const call = (method, path, body) => requestAt(STUDIO_API_BASE, method, path, body);
const e = encodeURIComponent;

export const docsApi = {
    /** → CollectionDto[] ({ id, key, title, description, icon, active, pageCount, sectionCount, portals }) */
    collections: () => call('GET', '/doc-collections'),
    /** body: { key, title, description?, icon? } → CollectionDto */
    createCollection: (body) => call('POST', '/doc-collections', body),
    /** body: { title?, description?, icon?, active? } → CollectionDto */
    updateCollection: (id, body) => call('PATCH', `/doc-collections/${e(id)}`, body),
    /** → SectionDto[] of a collection (inactive included, in order) */
    sections: (collection) => call('GET', `/doc-sections?collection=${e(collection)}`),
    /** body: { collection, title, slug?, icon? } → SectionDto */
    createSection: (body) => call('POST', '/doc-sections', body),
    /** body: { title?, icon?, active? } → SectionDto (one row; its pages edited in Studio follow) */
    updateSection: (id, body) => call('PATCH', `/doc-sections/${e(id)}`, body),
    /** → DocDto[] of a collection (every page, inactive included, nav order, no markdown) */
    list: (collection) => call('GET', `/docs?collection=${e(collection)}`),
    /** → DocDto with markdown */
    get: (id) => call('GET', `/docs/${e(id)}`),
    /** body: { collection, section (sys_id), title, path?, description?, tags?, icon?, markdown? } */
    create: (body) => call('POST', '/docs', body),
    /** body: { collection, baseHash?, ...fields, section?, markdown?, active? }; 409 doc_conflict on a stale baseHash */
    update: (id, body) => call('PATCH', `/docs/${e(id)}`, body),
    /** body: { collection, sections: [{ id, pages: [id…] }] } → DocDto[] */
    order: (body) => call('POST', '/docs/order', body),
};
