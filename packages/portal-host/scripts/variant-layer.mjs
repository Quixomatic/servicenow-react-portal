// Post-processes the host's framework CSS (pnpm build:css) the same way the server compiler
// post-processes every component build: Tailwind variant rules (sm:, hover:, dark:, data-[…]:, …)
// move from @layer utilities into @layer rp-variants, which sorts after utilities. Shares the one
// implementation in src/server/compiler/variant-layer.ts (Node strips the types).
//
// Usage: node scripts/variant-layer.mjs <css file>   (rewrites the file in place)
import { readFileSync, writeFileSync } from 'node:fs';
import { moveVariantsToLayer, VARIANT_LAYER } from '../../../src/server/compiler/variant-layer.ts';

const file = process.argv[2];
if (!file) {
	console.error('usage: node scripts/variant-layer.mjs <css file>');
	process.exit(1);
}
const before = readFileSync(file, 'utf8');
const after = moveVariantsToLayer(before);
if (after.indexOf(`@layer ${VARIANT_LAYER}`) < 0) {
	console.error(`variant-layer: no @layer ${VARIANT_LAYER} produced for ${file}`);
	process.exit(1);
}
writeFileSync(file, after);
console.log(`variant-layer: ${file} (${before.length} -> ${after.length} bytes)`);
