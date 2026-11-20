// The docs renderer and its parser, from the instance (not bundled into Studio):
//   components:app/docs-content   the live preview (exactly what /site/docs renders)
//   utilities:app/markdown         lexMarkdown, the parser the visual editor converts with
//   components:rich-text-editor    loadRichTextEngine() → the TipTap chunk (createMarkdownEditor)
// Loading docs-content through the host's loader registers its record imports (app/markdown,
// app/docs, app/code-highlight) in the registry first, so the lexer is the renderer's own copy.
import { studioApi } from '../studio-api';

const DOCS_CONTENT = 'app/docs-content';

export function host() {
	const registry = globalThis.__REACT_PORTAL__ || {};
	const modules = registry.modules || {};
	return { React: modules.react, ReactDOMClient: modules['react-dom/client'], internals: registry.internals || {}, modules };
}

let docsPromise = null;

/** → { Component, ref, cssText, lex } (cached per page; retried after a failure). */
export function loadDocsRenderer(root) {
	if (!docsPromise) {
		docsPromise = (async () => {
			const comps = await studioApi.listComponents();
			const comp = (Array.isArray(comps) ? comps : []).find((c) => c.uniqueId === DOCS_CONTENT);
			if (!comp || !comp.build || !(comp.build.builtRevision > 0)) throw new Error(`The docs renderer (${DOCS_CONTENT}) has no build yet. Seed it, then reload.`);
			const ctx = await studioApi.preview(comp.build.id);
			const ref = ctx.component;
			if (!ref || !ref.build || !ref.build.js) throw new Error('The docs renderer build has no client output');
			const loaded = await host().internals.loadComponent(ref);
			const md = host().modules['utilities:app/markdown'];
			if (!md || typeof md.lexMarkdown !== 'function') throw new Error('utilities:app/markdown did not register (lexMarkdown missing)');
			return { Component: loaded.Component, ref, cssText: loaded.cssText || '', lex: md.lexMarkdown };
		})().catch((error) => {
			docsPromise = null;
			throw error;
		});
	}
	return docsPromise.then((r) => {
		if (root && r.cssText) host().internals.ensureStyle(root, `docs-renderer:${r.ref.build.id}`, r.cssText, 'widget');
		return r;
	});
}

/** The TipTap chunk (portal-rte.jsdbx) through the host's rich-text-editor module. */
export function loadEditorEngine() {
	const rte = host().modules['components:rich-text-editor'];
	if (!rte || typeof rte.loadRichTextEngine !== 'function') return Promise.reject(new Error('The host has no rich text engine'));
	return rte.loadRichTextEngine().then((engine) => {
		if (typeof engine.createMarkdownEditor !== 'function') throw new Error('The deployed rich text engine predates the Docs editor (no createMarkdownEditor): redeploy the host');
		return engine;
	});
}
