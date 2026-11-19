// Studio API (/api/x_312987_portal/rp_studio). Same envelope and auth as the runtime API
// (runtime/api.js requestAt); the mock (studio-mock.js) answers when the host runs on mock data.
import { STUDIO_API_BASE, isMock, requestAt } from '#/runtime/api';
import * as mock from './studio-mock';

const call = (method, path, body) => (isMock() ? mock.handle(method, path, body) : requestAt(STUDIO_API_BASE, method, path, body));
const id = (value) => encodeURIComponent(value);

export const studioApi = {
	listComponents: () => call('GET', '/components'),
	listThemes: () => call('GET', '/themes'),
	listPortals: () => call('GET', '/portals'),
	/** owner = { type: 'component' | 'theme', id } */
	getProject: (owner) => call('GET', `/${owner.type === 'theme' ? 'themes' : 'components'}/${id(owner.id)}/project`),
	save: (owner, body) => call('POST', `/${owner.type === 'theme' ? 'themes' : 'components'}/${id(owner.id)}/save`, body),
	check: (owner, files) => call('POST', `/components/${id(owner.id)}/check`, { files }),
	/** { component, build, imports: [{ id, uniqueId, name, kind, specifier, embeddable }], importedBy: [...] } */
	dependencies: (componentId) => call('GET', `/components/${id(componentId)}/dependencies`),
	createComponent: (body) => call('POST', '/components', body),
	preview: (buildId) => call('POST', `/builds/${id(buildId)}/preview`, {})
};
