// Evidence for spec §8.4 [Verify]: can this page import() modules from blob:, data: and
// same-origin URLs under the instance's CSP? Listens for securitypolicyviolation events, so a CSP
// block can be told apart from a plain network error (the same-origin URL is expected to 404
// until the asset API exists).
import { setCspProbe } from './diagnostics';

const SAME_ORIGIN_PROBE = '/api/x_312987_portal/rp/assets/csp-probe/probe.js';

function attempt(label, url) {
	const started = Date.now();
	return import(/* webpackIgnore: true */ url).then(
		(mod) => ({ label, ok: true, value: mod && mod.default, ms: Date.now() - started }),
		(error) => ({ label, ok: false, error: String((error && error.message) || error), ms: Date.now() - started })
	);
}

export async function runCspProbe() {
	const violations = [];
	const onViolation = (event) =>
		violations.push({ directive: event.effectiveDirective || event.violatedDirective, blockedURI: event.blockedURI });
	document.addEventListener('securitypolicyviolation', onViolation);

	const blobUrl = URL.createObjectURL(new Blob(['export default "blob ok";'], { type: 'text/javascript' }));
	const results = [];
	results.push(await attempt('blob: import()', blobUrl));
	results.push(await attempt('data: import()', 'data:text/javascript,export%20default%20%22data%20ok%22%3B'));
	results.push(await attempt('same-origin import() (404 expected until the asset API exists)', SAME_ORIGIN_PROBE + '?t=' + Date.now()));
	let blobFetch;
	try {
		blobFetch = { label: 'fetch(blob:)', ok: (await (await fetch(blobUrl)).text()).length > 0 };
	} catch (error) {
		blobFetch = { label: 'fetch(blob:)', ok: false, error: String(error.message || error) };
	}
	results.push(blobFetch);
	URL.revokeObjectURL(blobUrl);

	await new Promise((resolve) => setTimeout(resolve, 100)); // violation events are async
	document.removeEventListener('securitypolicyviolation', onViolation);

	const meta = document.querySelector('meta[http-equiv="Content-Security-Policy" i]');
	const result = {
		at: new Date().toISOString(),
		href: window.location.href,
		results,
		violations,
		metaCsp: meta ? meta.getAttribute('content') : null
	};
	setCspProbe(result);
	// eslint-disable-next-line no-console
	console.info('[react-portal] CSP probe', JSON.stringify(result, null, 2));
	return result;
}
