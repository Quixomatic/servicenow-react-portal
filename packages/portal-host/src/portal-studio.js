// Portal Studio chunk entry, loaded by the host with import() only in mode = studio.
//
// The ServiceNow CLI deploys a dynamic import as a standalone ES module that shares nothing with
// the main bundle: it carries its own copy of React (the renderer) and of any host module it
// imports. So Studio never renders inside the host's React tree. The host calls mount() with plain
// objects (location store, navigate, shadow root) and Studio renders in its own React root.
// Widget previews go back through the host's React via the registry (see studio/preview.js).
//
// This file sits at the src root on purpose: the CLI names the chunk asset after the module's
// path, and on Windows a nested path gives an asset named "studio\studio-app" whose /uxasset URL
// can't be resolved. This one deploys as ".../portal-host/portal-studio.jsdbx".
import React from 'react';
import { createRoot } from 'react-dom/client';
import StudioApp from './studio/studio-app';

/** props = { locationStore, navigate, root } */
export function mount(container, props) {
	const root = createRoot(container);
	root.render(<StudioApp {...props} />);
	return {
		update(next) {
			root.render(<StudioApp {...next} />);
		},
		unmount() {
			root.unmount();
		}
	};
}

export default mount;
