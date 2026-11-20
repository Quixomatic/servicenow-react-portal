// The overlay layer for Base UI portals (dropdowns, popovers, tooltips, sheets, toasts).
// On the platform the renderer provides it (usePortalContainer from @servicenow/ui-renderer-react).
// Roots the host creates itself (Studio's page designer canvas and Menus preview, via
// PortalPreview) have no renderer context, so they provide their own element here; without one
// the portals had no container and never opened.
import { createContext, useContext } from 'react';
import { usePortalContainer as useRendererContainer } from '@servicenow/ui-renderer-react';

export const OverlayContainerContext = createContext(null);

/** The element overlays render into: the nearest OverlayContainerContext, else the renderer's. */
export function usePortalContainer() {
    const own = useContext(OverlayContainerContext);
    const renderer = useRendererContainer();
    return own || renderer;
}
