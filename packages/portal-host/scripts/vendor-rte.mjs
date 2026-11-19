// Pre-bundles TipTap (the rich-text engine) into src/vendor/tiptap.js for the portal-rte chunk.
//
// Why: TipTap's dist files start with a `/** @jsxImportSource @tiptap/core */` pragma, and the
// ServiceNow CLI's babel (classic JSX runtime) refuses to build them ("importSource cannot be set
// when runtime is classic"). Bundling once with esbuild removes the pragmas (minified output keeps
// only the license comments) and gives the CLI one plain ES module.
//
// Run after changing the @tiptap/* devDependencies:  pnpm run vendor:rte
// esbuild resolves from the repo root's node_modules (the server compiler's vendor build uses it too).
import { build } from 'esbuild';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(root, 'src', 'vendor', 'tiptap.js');
const version = JSON.parse(readFileSync(join(root, 'node_modules', '@tiptap', 'core', 'package.json'), 'utf8')).version;

await build({
	stdin: {
		contents: [
			"export { Editor, Extension, Mark, Node, mergeAttributes } from '@tiptap/core';",
			"export { default as StarterKit } from '@tiptap/starter-kit';",
			"export { default as Image } from '@tiptap/extension-image';",
			"export { Placeholder } from '@tiptap/extensions';",
			`export const TIPTAP_VERSION = ${JSON.stringify(version)};`
		].join('\n'),
		resolveDir: root,
		sourcefile: 'tiptap-entry.js',
		loader: 'js'
	},
	bundle: true,
	format: 'esm',
	platform: 'browser',
	target: 'es2019',
	minify: true,
	legalComments: 'eof',
	banner: { js: `/* TipTap ${version} + ProseMirror (MIT), pre-bundled by scripts/vendor-rte.mjs. Do not edit. */` },
	outfile: out,
	logLevel: 'info'
});

const text = readFileSync(out, 'utf8');
if (/@jsxImportSource/.test(text)) throw new Error('vendor-rte: a @jsxImportSource pragma survived; the CLI build will fail');
console.log(`vendor-rte: ${out} (${statSync(out).size} bytes, TipTap ${version})`);
