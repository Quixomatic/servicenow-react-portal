import '@servicenow/sdk/global';
import { BusinessRule } from '@servicenow/sdk/core';
import { syncDocCollection } from '../../server/docs/doc-rules';

/* Doc pages: the denormalized collection follows the section (x_312987_portal_doc_section.collection). */

BusinessRule({
    $id: Now.ID['br-doc-collection-from-section'],
    name: 'RP: Doc page collection from section',
    description:
        "Doc pages: collection = the section's collection, so paths stay unique per collection (index rp_doc_collection_path).",
    table: 'x_312987_portal_doc',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: syncDocCollection,
});
