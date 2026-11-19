import { createCustomElement } from '@servicenow/ui-core';
import react from '@servicenow/ui-renderer-react';
// Publish globalThis.__REACT_PORTAL__ before any widget module can load.
import '#/runtime/registry';
import view from './view';
// Compiled Tailwind v4 + shadcn theme (pnpm build:css). Lands in the host's shadow root; the
// renderer mirrors it into the overlay layer.
import styles from '../styles/tailwind.generated.css';

// The React Portal host. UI Builder binds the `site` page's URL parameters to these properties
// (portal -> portalSlug, page -> page, id -> recordId, q -> q). Navigation goes out as
// PORTAL_NAVIGATE (payload portalSlug/page/recordId/q), handled by a "Link to destination"
// event handler on the page. Never add a property named `id`: it collides with the element's
// HTML id attribute.
createCustomElement('x-312987-portal-host', {
	renderer: { type: react },
	view,
	styles,
	properties: {
		mode: { default: 'portal' },
		portalSlug: { default: '' },
		page: { default: '' },
		recordId: { default: '' },
		q: { default: '' }
	}
});
