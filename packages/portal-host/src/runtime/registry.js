// Host module registry (spec §8.4), published on globalThis.__REACT_PORTAL__ before any widget
// loads. Compiled widgets contain no React and no shipped UI: the authoring compiler rewrites
// those imports into lookups here, e.g.
//   const { Button } = globalThis.__REACT_PORTAL__.modules['components:button'];
//
// All React entries are the renderer's bundled React 19 (via react-shim), never the platform's 16.
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as JSXRuntime from 'react/jsx-runtime';
import * as PortalRuntime from './portal-runtime';
import * as cnModule from 'cn';
import * as Badge from '#/components/ui/badge';
import * as Button from '#/components/ui/button';
import * as Card from '#/components/ui/card';
import * as DropdownMenu from '#/components/ui/dropdown-menu';
import * as Popover from '#/components/ui/popover';
import * as Separator from '#/components/ui/separator';

const modules = {
	react: React,
	'react-dom': ReactDOM,
	'react-dom/client': ReactDOMClient,
	'react/jsx-runtime': JSXRuntime,
	'@portal/runtime': PortalRuntime,
	// One entry per shipped shadcn component file (src/components/ui), with its named exports.
	'components:badge': Badge,
	'components:button': Button,
	'components:card': Card,
	'components:dropdown-menu': DropdownMenu,
	'components:popover': Popover,
	'components:separator': Separator,
	'utilities:cn': cnModule
};

const registry = (globalThis.__REACT_PORTAL__ = globalThis.__REACT_PORTAL__ || { modules: {} });
Object.assign(registry.modules, modules);
registry.abi = PortalRuntime.RUNTIME_ABI;
registry.reactVersion = React.version;

/** Register more modules at runtime (e.g. 'components:<widget>' for widgets other widgets use). */
registry.register = function register(name, mod) {
	registry.modules[name] = mod;
};

export default registry;
