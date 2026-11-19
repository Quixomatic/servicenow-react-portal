import { createCustomElement } from '@servicenow/ui-core';
import react from '@servicenow/ui-renderer-react';
// Publish globalThis.__REACT_PORTAL__ before any widget module can load.
import '#/runtime/registry';
import view from './view';
// Compiled Tailwind v4 + shadcn theme (pnpm build:css). Injected by the view as a <style> in the
// framework slot (runtime/framework-css.js), so widget sheets order after it; only if the build
// doesn't give us its text does ui-core adopt it (the old path). The renderer mirrors it into the
// overlay layer either way.
import { frameworkCssText, frameworkStyles } from '#/runtime/framework-css';

// The React Portal host. UI Builder binds the `site` page's URL parameters to these properties
// (portal -> portalSlug, page -> page, id -> recordId, q -> q). Navigation goes out as
// PORTAL_NAVIGATE (payload portalSlug/page/recordId/q), handled by a "Link to destination"
// event handler on the page. Never add a property named `id`: it collides with the element's
// HTML id attribute.
createCustomElement('x-312987-portal-host', {
	renderer: { type: react },
	view,
	...(frameworkCssText ? {} : { styles: frameworkStyles }),
	properties: {
		mode: { default: 'portal' },
		portalSlug: { default: '' },
		page: { default: '' },
		recordId: { default: '' },
		q: { default: '' },
		// Studio only: initial view hint (code | pages | menus), bound to the studio page's `view` param.
		view: { default: '' }
	}
});
