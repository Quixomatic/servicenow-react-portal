/**
 * React Portal wire contracts shared by the server (Fluent server modules) and the host
 * component (packages/portal-host). Plain types only: no platform APIs, nothing at runtime.
 *
 * Every scripted REST response body is an Envelope; the platform wraps it as { result: Envelope }.
 */

/**
 * widget: placeable content · layout: a page's frame · block: page-structure building block placed on
 * pages (has drop zones) · primitive: reusable UI building block imported by widgets (fields, lists,
 * forms…), never placed directly · utility: shared code.
 */
export type ComponentKind = 'widget' | 'layout' | 'block' | 'primitive' | 'utility';
export type ServerMode = 'none' | 'on-load' | 'on-demand';
/** pending: compile requested, no output yet · ready: has compiled output · failed: never compiled successfully. */
export type BuildState = 'pending' | 'ready' | 'failed';

export interface Envelope<T> {
    data: T;
    options?: Record<string, unknown>;
    meta: EnvelopeMeta;
}

export interface EnvelopeMeta {
    correlationId: string;
    durationMs?: number;
    release?: { id: string; version: number } | null;
    build?: string | null;
    [key: string]: unknown;
}

export interface ErrorBody {
    error: { status: number; code: string; message: string; details?: unknown };
    meta: EnvelopeMeta;
}

export interface BuildRef {
    id: string;
    /** Same-origin URL of the ES module entry, or null if the build has no JS. */
    js: string | null;
    /**
     * Same-origin URL of the build's CSS, or null: the author CSS (styles.css and imported .css). Pre-v6
     * builds (no `utilities`) have their Tailwind utilities in this sheet too.
     */
    css: string | null;
    /**
     * Same-origin URL of the build's own Tailwind utilities sheet (compiler v6+). The host skips it when
     * the portal utilities sheet covers the build (PortalUtilities.covers has utilitiesKey).
     */
    utilities?: string | null;
    /** Content key of the utilities sheet (16 hex characters; also its URL version). */
    utilitiesKey?: string;
}

/**
 * The portal utilities sheet (manifest v5): one Tailwind sheet in @layer rp-portal, compiled at
 * reprocess from the union of the valid candidates of every build in the portal's manifest plus the
 * host's classes. A build is covered when its utilitiesKey is in `covers`; the host then skips the
 * build's own utilities sheet. Anything else (a build outside the manifest, a newer compile than the
 * sheet) falls back to its own utilities sheet.
 */
export interface PortalUtilities {
    /** Same-origin URL of the sheet. */
    css: string;
    /** Content hash of the candidate union (and compiler version) the sheet was compiled from. */
    hash: string;
    /** utilitiesKey of every build the sheet covers, sorted. */
    covers: string[];
}

export interface RegionDef {
    name: string;
    acceptsContributions: boolean;
    /** Display label (block regions, e.g. "Column 2"). */
    label?: string;
}

/** Per-device overrides: the base keys apply everywhere; `tablet` (≤1023px) and `mobile` (≤639px) override them. */
export type Responsive<T> = T & { tablet?: Partial<T>; mobile?: Partial<T> };

/** How an instance sits in its parent block's grid (any placement). */
export interface PlacementLayout {
    colSpan?: number | 'full';
    rowSpan?: number;
    colStart?: number;
    rowStart?: number;
    order?: number;
    alignSelf?: string;
    justifySelf?: string;
}

export interface ComponentRef {
    id: string;
    uniqueId: string;
    name: string;
    kind: ComponentKind;
    serverMode: ServerMode;
    build: BuildRef | null;
    /** Layouts only. */
    regions?: RegionDef[];
    /** Layouts only: the layout's default options (default_options_json). */
    defaultOptions?: Record<string, unknown>;
    /**
     * Other component records this build imports (components:<ns>/<key>, utilities:<ns>/<key>),
     * transitively, dependencies first. The host loads each build and registers its module under
     * the specifier before evaluating this component.
     */
    imports?: ComponentImport[];
}

export interface ComponentImport {
    specifier: string;
    id: string;
    uniqueId: string;
    kind: ComponentKind;
    build: BuildRef | null;
    /** Display name (labels embed errors). Manifest v4+. */
    name?: string;
    /** Server mode: decides whether an embedded instance initializes. Manifest v4+. */
    serverMode?: ServerMode;
    /**
     * Component sys_ids in this import tree whose builds import it DIRECTLY (one entry per
     * build_dep edge). Authorizes each step of an embed chain. Manifest v4+.
     */
    importers?: string[];
}

/**
 * An embedded widget's model: what $sp.getWidget() and getWidget() return, and what
 * <Embed model> / <Widget model> consume.
 */
export interface EmbedModel {
    $embed: 1;
    /** Unique id of the embedded component, e.g. 'app/server-clock'. */
    component: string;
    /** Default embedKey. */
    key: string;
    ok: boolean;
    data?: Record<string, unknown>;
    /** Effective options. */
    options: Record<string, unknown>;
    /** Signature over (root, path, options, user); null = client-originated options. */
    token: string | null;
    build: string | null;
    error?: { status: number; code: string; message: string };
    messages?: ServerMessage[];
}

/** One embedded instance in an initialize request. */
export interface EmbedDescriptor {
    /** Composite instance id (<placement>~<key>…), echoed as the result key. */
    id: string;
    /** Root placement sys_id, or 'layout:<component sys_id>' for an embed under the effective layout. */
    placement: string;
    /** Embedded components' unique ids, outermost first (max 4). */
    path: string[];
    /** Matching embed keys (diagnostics / context only). */
    keys?: string[];
    /** Leaf options (≤ 16 KB JSON). */
    options?: Record<string, unknown>;
    /** From a server-built model, if any. */
    token?: string | null;
}

/** Execute-request addition: run an embedded instance under the URL's root placement. */
export interface EmbedRequest {
    path: string[];
    keys?: string[];
    options?: Record<string, unknown>;
    token?: string | null;
}

export interface PlacementRef {
    id: string;
    region: string;
    order: number;
    parentId: string | null;
    component: ComponentRef;
    options: Record<string, unknown>;
    /** Instance styling tokens (padding, background, radius, …) with tablet/mobile overrides. */
    styleTokens: Record<string, unknown>;
    /** Position in the parent block's grid, with tablet/mobile overrides. */
    layout: Responsive<PlacementLayout>;
    /** Per-instance Tailwind classes, applied to the instance's root element. */
    classes: string;
    /**
     * Compiled instance CSS: the classes' utilities plus the style-token, layout and responsive
     * option rules, scoped to [data-rp-placement="<id>"]. The host injects it once per placement.
     */
    css: string;
    /** Blocks only: the instance's resolved drop zones and the placements inside them. */
    regions?: RegionDef[];
    children?: RegionMap;
}

export type RegionMap = Record<string, PlacementRef[]>;

export interface ThemeRef {
    id: string;
    key: string;
    name: string;
    /** Light-mode tokens (CSS custom properties without the leading --). */
    tokens: Record<string, string>;
    /** Dark-mode tokens, applied on :host(.dark); null = use the framework's default dark palette. */
    tokensDark: Record<string, string> | null;
    /** Compiled stylesheet URLs (ready theme build). */
    css: string[];
    /** Raw stylesheet when the theme has no ready build yet (live mode only). */
    cssText: string | null;
}

export interface PortalUser {
    sysId: string;
    userName: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    title: string;
    avatar: string | null;
    roles: string[];
    timeZone: string;
    language: string;
    isImpersonating: boolean;
    /** User name of the impersonator, when impersonating and the global helper app is installed. */
    impersonatedBy?: string | null;
}

export interface PageSummary {
    id: string;
    route: string;
    title: string;
}

export interface BootstrapData {
    portal: {
        id: string;
        slug: string;
        name: string;
        homeRoute: string;
        settings: Record<string, unknown>;
        navigation: unknown;
    };
    user: PortalUser;
    release: { id: string; version: number } | null;
    theme: ThemeRef | null;
    layout: ComponentRef | null;
    /** Effective options for the portal's default layout: layout defaults → portal settings.layoutOptions. */
    layoutOptions: Record<string, unknown>;
    /** Portal-level placements (header, sidebar, footer…); stay mounted across navigation. */
    regions: RegionMap;
    /** The portal utilities sheet, or null (not compiled yet, live manifest): every build falls back. */
    utilities: PortalUtilities | null;
    pages: PageSummary[];
    /**
     * The portal's menus by key (primary, footer, account…), already filtered for this user: inactive
     * items, items the user lacks roles for, items whose condition returned false, page items the user
     * can't open, and empty groups are gone. portal.navigation (navigation_json) is the deprecated
     * fallback for portals without menu records.
     */
    menus: MenuMap;
}

/* ---------------- Menus ---------------- */

export type NavItemType = 'page' | 'route' | 'url' | 'group' | 'separator' | 'dynamic';

/** One resolved menu entry. The client computes `active` from the current path. */
export interface NavItem {
    id: string;
    type: NavItemType;
    label: string;
    /** lucide icon name (kebab-case). */
    icon?: string;
    badge?: string;
    tooltip?: string;
    /** page / route items: the portal-relative path ('' = home), page route params already filled in. */
    to?: string;
    /** page / route items: query parameters (<Link q={…}>). */
    q?: Record<string, string>;
    /** route items: another portal's slug (params_json.portal), for a cross-portal link. */
    portalSlug?: string;
    /**
     * page / route items: explicit record params (params_json.record), the site page's optional URL
     * params (<Link table sysId view query>). Active matching requires them to equal the location's.
     */
    table?: string;
    sysId?: string;
    view?: string;
    query?: string;
    /** url items: the external URL (http(s): or mailto:). */
    href?: string;
    target?: '_self' | '_blank';
    /** Active-state matching for page / route items: exact path, or path prefix (default). */
    match?: 'exact' | 'prefix';
    /** Groups: initially expanded (!collapsed). */
    open?: boolean;
    children: NavItem[];
}

/** Menus by key. */
export type MenuMap = Record<string, NavItem[]>;

/** Studio: a menu record with its full (unfiltered) item tree. */
export interface MenuDto {
    id: string;
    portalId: string;
    key: string;
    name: string;
    description: string;
    active: boolean;
    items: MenuItemDto[];
}

/** Studio: a menu item record (every field, scripts included). */
export interface MenuItemDto {
    id: string;
    menuId: string;
    parentId: string | null;
    order: number;
    type: NavItemType;
    label: string;
    active: boolean;
    pageId: string | null;
    /** Display only: the referenced page's route and title. */
    page: { id: string; route: string; title: string } | null;
    params: {
        params?: Record<string, string>;
        query?: Record<string, string>;
        /** Explicit record params: { table, sys_id, view, query }. */
        record?: { table?: string; sys_id?: string; view?: string; query?: string };
        portal?: string;
    } | null;
    route: string;
    url: string;
    icon: string;
    target: '' | '_self' | '_blank';
    match: 'exact' | 'prefix';
    tooltip: string;
    collapsed: boolean;
    roles: string[];
    condition: string;
    badge: string;
    badgeScript: string;
    script: string;
    children: MenuItemDto[];
}

export interface ResolvePageRequest {
    portal: string;
    /** Portal-relative page path, already URL-decoded ('' = home). */
    page: string;
}

/** Max width of a page's main content: 'full' (full bleed) or a Tailwind container size. */
export type ContentWidth = 'full' | '7xl' | '6xl' | '5xl' | '4xl' | '3xl';

export interface ResolvePageData {
    /** contentWidth is the effective width: the page's own, else the portal default (settings.contentWidth), else 7xl. */
    page: PageSummary & { params: Record<string, string>; contentWidth: ContentWidth };
    layout: ComponentRef | null;
    /**
     * Effective options for the page's layout: layout defaults → portal settings.layoutOptions (when the page
     * uses the portal's default layout) → the page's own layout_options_json.
     */
    layoutOptions: Record<string, unknown>;
    regions: RegionMap;
}

export interface InitializeRequest {
    portal: string;
    page?: string;
    /** Placement ids, or embed descriptors. */
    instances: Array<string | EmbedDescriptor>;
    context?: Record<string, unknown>;
}

/** A message a server script raised (gs.addInfoMessage / addErrorMessage, or $sp.add*Message); shown as a toast. */
export interface ServerMessage {
    type: 'info' | 'error' | 'warning' | 'success';
    message: string;
}

export interface InstanceResult {
    ok: boolean;
    data?: Record<string, unknown>;
    options?: Record<string, unknown>;
    error?: { status: number; code: string; message: string };
    build?: string | null;
    /** Messages the server script raised (also on failure). */
    messages?: ServerMessage[];
    /** Embeds: the token for these options (null = client-originated). */
    token?: string | null;
}

export interface InitializeData {
    instances: Record<string, InstanceResult>;
}

export type ExecuteAction = 'initialize' | 'get' | 'update';

export interface ExecuteRequest {
    portal: string;
    page?: string;
    action?: ExecuteAction;
    input?: Record<string, unknown>;
    data?: Record<string, unknown>;
    context?: Record<string, unknown>;
    /** Run an embedded instance under the URL's root placement. */
    embed?: EmbedRequest;
}

/* ---------------- Studio ---------------- */

export type SourceTarget = 'client' | 'server' | 'style' | 'asset';

export interface SourceFileDto {
    id?: string;
    path: string;
    target: SourceTarget;
    content: string;
    encoding?: 'utf8' | 'base64';
    mimeType?: string;
    hash?: string;
    revision?: number;
    /** Save only: delete this path. */
    deleted?: boolean;
    /**
     * True for files backed by record fields rather than source_file rows:
     * See VIRTUAL_FILES: component client/CSS/server/options/regions fields and theme
     * stylesheet/tokens. server.js and the JSON files are never compiled for the client.
     */
    virtual?: boolean;
    /**
     * Virtual files only: the component's kind doesn't list this baseline file
     * (x_312987_portal.studio.kind_files), but its field still has content. Shown so nothing is
     * hidden; it drops out once emptied.
     */
    unused?: boolean;
}

/** Virtual file paths and the record fields behind them. */
export const VIRTUAL_FILES = {
    component: {
        'main.tsx': 'client_script',
        'styles.css': 'css',
        'server.js': 'script',
        'options.schema.json': 'options_schema_json',
        'options.defaults.json': 'default_options_json',
        'regions.json': 'regions_json', // per kind: x_312987_portal.studio.kind_files
    },
    theme: { 'theme.css': 'stylesheet', 'tokens.json': 'tokens_json' },
} as const;

export interface ComponentMetaDto {
    name?: string;
    namespace?: string;
    key?: string;
    kind?: ComponentKind;
    description?: string;
    placeable?: boolean;
    active?: boolean;
    clientScript?: string;
    css?: string;
    /** Default true: generate Tailwind utilities for classes used in the client code. */
    tailwind?: boolean;
    script?: string;
    serverMode?: ServerMode;
    exports?: unknown;
    optionsSchema?: unknown;
    defaultOptions?: Record<string, unknown>;
    regions?: RegionDef[];
    dependencySpec?: unknown;
}

export interface ProjectData {
    owner: { type: 'component' | 'theme'; id: string; uniqueId: string; name: string };
    meta: ComponentMetaDto & { tokens?: Record<string, string>; stylesheet?: string };
    revision: number;
    /** Virtual baseline files first, then the extra source files. */
    files: SourceFileDto[];
    latestBuild: BuildSummary | null;
    /** Components: kind → baseline virtual files (x_312987_portal.studio.kind_files, defaults applied). */
    kindFiles?: Record<string, string[]>;
}

export interface SaveRequest {
    expectedRevision: number;
    files?: SourceFileDto[];
    meta?: ComponentMetaDto & { tokens?: Record<string, string>; stylesheet?: string };
}

/** One build record per component/theme, overwritten by each successful compile. */
export interface BuildSummary {
    id: string;
    state: BuildState;
    /** Source revision of the compiled output currently served (0 = never compiled). */
    builtRevision: number;
    /** Source revision the browser compiler must compile next (0 = nothing pending). */
    pendingRevision: number;
    inputHash: string;
    /** True when the saved sources matched the compiled output, so no compile is needed. */
    upToDate?: boolean;
    needsRebuild?: boolean;
    diagnostics?: unknown;
}

export interface SaveData {
    revision: number;
    build: BuildSummary;
    /**
     * Compiler inputs for build.pendingRevision: virtual main.tsx / styles.css (theme.css)
     * plus extra client/style files. Server-only code (server.js, target=server) is excluded.
     */
    files: SourceFileDto[];
    registry: { runtimeAbiVersion: string };
}

/**
 * Compiler output contract for a component build:
 * - index.js: ES module, default export = the component; React, @portal/runtime and shipped
 *   UI come from the host registry (globalThis.__REACT_PORTAL__.modules), never bundled.
 * - index.css: when `tailwind` is on, the Tailwind v4 utilities generated for the classes
 *   used in main.tsx and the extra client files (compiled against the portal theme tokens),
 *   FOLLOWED BY styles.css (the css field) and any extra style files — author CSS wins.
 */
export interface CheckData {
    ok: boolean;
    diagnostics: {
        errors: { file?: string; line?: number; column?: number; message: string }[];
        warnings: { file?: string; line?: number; column?: number; message: string }[];
    };
    ms: number;
}

export interface BuildAssetDto {
    path: string;
    kind: 'js' | 'css' | 'map' | 'wasm' | 'other';
    content: string;
    mimeType?: string;
}

export interface BuildDependencyDto {
    specifier: string;
    kind: 'component' | 'host' | 'package' | 'relative';
    targetBuild?: string;
    hostExport?: string;
    packageVersion?: string;
    resolvedEntry?: string;
}

export interface CompleteBuildRequest {
    /** The pendingRevision this compile was for; stale completions are rejected (409). */
    revision: number;
    success: boolean;
    compilerVersion?: string;
    runtimeAbiVersion?: string;
    assets?: BuildAssetDto[];
    dependencies?: BuildDependencyDto[];
    diagnostics?: unknown;
}

/** The compiled form of a portal: one record per portal, reprocessed when its inputs change. */
export interface ReleaseSummary {
    id: string;
    portal: string;
    revision: number;
    manifestHash: string;
    processedAt: string;
    problems: string[];
}

// ---- navigation history (@portal/runtime: useBackTarget, useNavHistory; .plans/back-navigation.md) ----

/** navigate(to, opts) / <Link> options beyond the target itself. */
export interface NavigateOptions {
    portalSlug?: string;
    recordId?: string;
    q?: string | Record<string, unknown>;
    table?: string;
    sysId?: string;
    view?: string;
    query?: string;
    /** No new history entry (state writes, new → saved record, success screens). */
    replace?: boolean;
    /** Label of the new history entry ("Back to <title>"). */
    title?: string;
    /** Don't ask the navigation guards (useNavigationGuard) first. */
    skipGuard?: boolean;
}

/** One entry of the tab's navigation history, keyed by the shell's history.state.position. */
export interface NavEntry {
    pos: number;
    key: string;
    identity: string;
    portalSlug: string;
    page: string;
    params: { table: string; sysId: string; recordId: string; view: string; query: string; q: string };
    title: string;
    hintTitle: string;
    kind: 'page' | 'record' | 'new-record' | 'success';
    flags: { gone?: boolean; skip?: boolean };
    scroll: Record<string, number>;
    state: Record<string, unknown>;
    at: number;
    epoch: string;
    /** useNavHistory() only: the entry's label. */
    label?: string;
}

/** A declared parent for useBackTarget / app/back-button (deep links, new tabs). */
export interface BackParent {
    to: string;
    portalSlug?: string;
    table?: string;
    sysId?: string;
    recordId?: string;
    view?: string;
    query?: string;
    q?: string | Record<string, unknown>;
    label?: string;
}

/** useBackTarget() result. */
export interface BackTarget {
    available: boolean;
    label: string;
    title: string;
    source: 'history' | 'parent' | 'browser' | 'home' | 'none';
    go: () => Promise<boolean>;
}
