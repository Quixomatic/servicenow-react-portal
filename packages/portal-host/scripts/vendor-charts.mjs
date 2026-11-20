// Pre-bundles Recharts (the chart engine) into src/vendor/recharts.js for the portal-charts chunk.
//
// Why pre-bundle: the CLI deploys a dynamic import as a standalone ES module that shares nothing
// with the main host bundle. Recharts is React components, so a plain import would pull a second
// React into the chunk, and hooks from two Reacts break ("Invalid hook call"). Here esbuild maps
// react, react-dom and react/jsx-runtime to the host's own React 19, read at load time from the
// module registry (globalThis.__REACT_PORTAL__.modules, published before any chunk loads). The
// chunk then holds Recharts and its non-React dependencies (redux toolkit, d3 pieces, es-toolkit,
// react-redux, use-sync-external-store, react-is) and no React.
//
// Run after changing the recharts / react-is devDependencies:  pnpm run vendor:charts
// esbuild resolves from the repo root's node_modules (the server compiler's vendor build uses it too).
import { build } from 'esbuild';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(root, 'src', 'vendor', 'recharts.js');
const version = JSON.parse(readFileSync(join(root, 'node_modules', 'recharts', 'package.json'), 'utf8')).version;
// Motion (motion/react, MIT) for the chart gallery's enter / hover animations, exported as one namespace
// (`Motion`) so its names never collide with Recharts'.
const motionVersion = JSON.parse(readFileSync(join(root, 'node_modules', 'motion', 'package.json'), 'utf8')).version;

// Registry keys for the host's React (src/runtime/registry.js).
const HOST_REACT = {
    react: 'react',
    'react-dom': 'react-dom',
    'react-dom/client': 'react-dom/client',
    'react/jsx-runtime': 'react/jsx-runtime',
    'react/jsx-dev-runtime': 'react/jsx-runtime',
};

const hostReact = {
    name: 'host-react',
    setup(b) {
        b.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (args) => {
            if (!(args.path in HOST_REACT)) throw new Error(`vendor-charts: unmapped React import "${args.path}"`);
            return { path: args.path, namespace: 'host-react' };
        });
        // CommonJS, so esbuild's interop turns `import { useState } from 'react'` into property reads
        // on the live module object (no export list to keep in sync with React).
        b.onLoad({ filter: /.*/, namespace: 'host-react' }, (args) => ({
            contents: [
                'var r = globalThis.__REACT_PORTAL__;',
                `var m = r && r.modules && r.modules[${JSON.stringify(HOST_REACT[args.path])}];`,
                `if (!m) throw new Error('portal-charts: host module ${HOST_REACT[args.path]} is not registered');`,
                'module.exports = m;',
            ].join('\n'),
            loader: 'js',
        }));
    },
};

await build({
    stdin: {
        contents: [
            "export * from 'recharts';",
            `export const RECHARTS_VERSION = ${JSON.stringify(version)};`,
            // Named imports so esbuild drops the parts of motion/react the gallery doesn't use.
            "import { motion, AnimatePresence, LayoutGroup, MotionConfig, animate, stagger, useAnimate, useInView, useReducedMotion, useMotionValue, useSpring, useTransform, useMotionValueEvent } from 'motion/react';",
            'export const Motion = { motion, AnimatePresence, LayoutGroup, MotionConfig, animate, stagger, useAnimate, useInView, useReducedMotion, useMotionValue, useSpring, useTransform, useMotionValueEvent };',
            `export const MOTION_VERSION = ${JSON.stringify(motionVersion)};`,
        ].join('\n'),
        resolveDir: root,
        sourcefile: 'recharts-entry.js',
        loader: 'js',
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2019',
    minify: true,
    legalComments: 'eof',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [hostReact],
    banner: {
        js: `/* Recharts ${version} (MIT), Motion ${motionVersion} (MIT) + redux toolkit, d3, es-toolkit (MIT / ISC), pre-bundled by scripts/vendor-charts.mjs against the host's React. Do not edit. */`,
    },
    outfile: out,
    logLevel: 'info',
});

const text = readFileSync(out, 'utf8');
if (/@jsxImportSource/.test(text))
    throw new Error('vendor-charts: a @jsxImportSource pragma survived; the CLI build will fail');
if (/__SECRET_INTERNALS|react\.production\.min|ReactCurrentDispatcher/.test(text))
    throw new Error('vendor-charts: a copy of React was bundled');
console.log(
    `vendor-charts: ${out} (${statSync(out).size} bytes, gzip ${gzipSync(text).length}, Recharts ${version}, Motion ${motionVersion})`
);
