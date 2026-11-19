// Page designer API (/api/x_312987_portal/rp_studio). In mock mode the calls go to the host's
// mock design API (registry internals), which mutates the same mock data the host runtime renders
// on the canvas; the deployed Studio chunk has its own module copies, so a local import would not.
import { STUDIO_API_BASE, isMock, requestAt } from '#/runtime/api';
import { designApi as localMock } from '#/runtime/mock';

function mock() {
	const internals = globalThis.__REACT_PORTAL__ && globalThis.__REACT_PORTAL__.internals;
	return (internals && internals.mockDesignApi) || localMock;
}

const call = (method, path, body) => requestAt(STUDIO_API_BASE, method, path, body);
const e = encodeURIComponent;

export const designApi = {
	/** → { kind: 'portal'|'page'|'component'|'theme'|'unknown', portalId, pageId } */
	resolve: (id) => (isMock() ? mock().resolve(id) : call('GET', `/design/${e(id)}`)),
	listPortals: () => (isMock() ? mock().listPortals() : call('GET', '/portals')),
	portalDesign: (portalId) => (isMock() ? mock().portalDesign(portalId) : call('GET', `/portals/${e(portalId)}/design`)),
	pageDesign: (pageId) => (isMock() ? mock().pageDesign(pageId) : call('GET', `/pages/${e(pageId)}/design`)),
	createPlacement: (body) => (isMock() ? mock().createPlacement(body) : call('POST', '/placements', body)),
	patchPlacement: (id, body) => (isMock() ? mock().patchPlacement(id, body) : call('PATCH', `/placements/${e(id)}`, body)),
	deletePlacement: (id) => (isMock() ? mock().deletePlacement(id) : call('DELETE', `/placements/${e(id)}`)),
	createPage: (body) => (isMock() ? mock().createPage(body) : call('POST', '/pages', body)),
	patchPage: (id, body) => (isMock() ? mock().patchPage(id, body) : call('PATCH', `/pages/${e(id)}`, body)),
	deletePage: (id) => (isMock() ? mock().deletePage(id) : call('DELETE', `/pages/${e(id)}`)),
	patchPortal: (id, body) => (isMock() ? mock().patchPortal(id, body) : call('PATCH', `/portals/${e(id)}`, body))
};
