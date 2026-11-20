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
import * as Sheet from '#/components/ui/sheet';
import * as Sidebar from '#/components/ui/sidebar';
import * as Tooltip from '#/components/ui/tooltip';
import * as Collapsible from '#/components/ui/collapsible';
import * as Tabs from '#/components/ui/tabs';
import * as Dialog from '#/components/ui/dialog';
import * as Icon from '#/components/ui/icon';
import * as Calendar from '#/components/ui/calendar';
import * as RichText from '#/components/ui/rich-text';
import * as RichTextEditor from '#/components/ui/rich-text-editor';
import * as Skeleton from '#/components/ui/skeleton';
import * as Empty from '#/components/ui/empty';
import * as Kbd from '#/components/ui/kbd';
import { PortalContext, WidgetInstanceContext } from './contexts';
import { NavigationContext } from './navigation';
import { WidgetErrorBoundary } from './widgets';
import { createStore } from './store';
import { loadBuild, loadComponent, peekComponent } from './loader';
import { ensureStyle } from './styles';
import { themeStore } from './theme-mode';
import * as ReactQuery from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import * as ReactTable from '@tanstack/react-table';
import * as ReactVirtual from '@tanstack/react-virtual';
import { queryClient } from './query-client';
import { PortalPreview, invalidatePortal } from '#/portal/portal-preview';
import { designApi as mockDesignApi } from './mock';

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
    'components:sheet': Sheet,
    // shadcn Sidebar wired to the portal shell's useSidebar() (header trigger + sidebar widget).
    'components:sidebar': Sidebar,
    'components:tooltip': Tooltip,
    'components:collapsible': Collapsible,
    // shadcn Tabs on Base UI (tablist, roving focus, arrow/Home/End keys, aria wiring).
    'components:tabs': Tabs,
    // shadcn Dialog on Base UI (modal focus trap, Escape / outside click, focus return), in the overlay layer.
    'components:dialog': Dialog,
    // Calendar grid (no date library): 'YYYY-MM-DD' in/out, Intl month/weekday names, WAI-ARIA grid keys.
    'components:calendar': Calendar,
    // Read-only rich text + the HTML sanitiser (sanitizeHtml, htmlToText, isHtmlEmpty, findUnsupportedHtml).
    'components:rich-text': RichText,
    // TipTap editor with an HTML value; TipTap itself is a lazily loaded chunk (portal-rte.jsdbx).
    'components:rich-text-editor': RichTextEditor,
    // Curated lucide icons by name: <Icon name="layout-dashboard" />.
    'components:icon': Icon,
    'components:skeleton': Skeleton,
    'components:empty': Empty,
    'components:kbd': Kbd,
    'utilities:cn': cnModule,
    // TanStack Query (the host's copy, so hooks share the page QueryClient). Utilities and primitives
    // build data hooks on it: import { useQuery } from 'utilities:react-query'.
    'utilities:react-query': ReactQuery,
    // TanStack Table (headless table state: sorting, selection, visibility, ordering, sizing) and
    // TanStack Virtual (row virtualization), for the list primitives: import { useReactTable } from
    // 'utilities:react-table', import { useVirtualizer } from 'utilities:react-virtual'.
    'utilities:react-table': ReactTable,
    'utilities:react-virtual': ReactVirtual,
};

const registry = (globalThis.__REACT_PORTAL__ = globalThis.__REACT_PORTAL__ || { modules: {} });
Object.assign(registry.modules, modules);
registry.abi = PortalRuntime.RUNTIME_ABI;
registry.reactVersion = React.version;

// Host internals for Portal Studio's preview. The Studio chunk is a separate bundle with its own
// React, so it renders widget previews through the host's React and these host instances (the
// contexts widgets read via @portal/runtime). Not part of the widget API.
registry.internals = {
    PortalContext,
    WidgetInstanceContext,
    NavigationContext,
    WidgetErrorBoundary,
    createStore,
    loadBuild,
    // Loads a ComponentRef with its record imports (registered under their specifiers first).
    loadComponent,
    peekComponent,
    ensureStyle,
    // Light/dark/system preference: one store for the page, shared with Studio's React copy.
    themeStore,
    // The page-level query cache, for previews of widgets that use data hooks.
    QueryClientProvider,
    queryClient,
    // Page designer: the real portal runtime as a component, plus cache invalidation.
    PortalPreview,
    invalidatePortal,
    // Mock design API, so mock writes reach the same mock data the host runtime reads.
    mockDesignApi,
};

/** Register more modules at runtime (e.g. 'components:<widget>' for widgets other widgets use). */
registry.register = function register(name, mod) {
    registry.modules[name] = mod;
};

export default registry;
