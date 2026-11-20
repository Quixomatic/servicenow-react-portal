import { GR, getById, str } from '../lib/gr.ts';

/**
 * Before insert / update on x_312987_portal_doc: the page's `collection` is its section's collection
 * (denormalized for the unique (collection, path) index and for queries). A page without a section
 * keeps whatever collection it has.
 */
export function syncDocCollection(current: GR): void {
    const sectionId = str(current, 'doc_section');
    if (!sectionId) return;
    const section = getById('x_312987_portal_doc_section', sectionId);
    if (!section) return;
    const collection = str(section, 'collection');
    if (collection && collection !== str(current, 'collection')) current.setValue('collection', collection);
}
