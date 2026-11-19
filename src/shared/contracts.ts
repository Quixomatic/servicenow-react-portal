/**
 * React Portal wire contracts shared by the server (Fluent server modules) and the host
 * component (packages/portal-host). Plain types only: no platform APIs, nothing at runtime.
 *
 * Every scripted REST response body is an Envelope; the platform wraps it as { result: Envelope }.
 */

export type ComponentKind = 'widget' | 'layout' | 'utility'
export type ServerMode = 'none' | 'on-load' | 'on-demand'
/** pending: compile requested, no output yet · ready: has compiled output · failed: never compiled successfully. */
export type BuildState = 'pending' | 'ready' | 'failed'

export interface Envelope<T> {
    data: T
    options?: Record<string, unknown>
    meta: EnvelopeMeta
}

export interface EnvelopeMeta {
    correlationId: string
    durationMs?: number
    release?: { id: string; version: number } | null
    build?: string | null
    [key: string]: unknown
}

export interface ErrorBody {
    error: { status: number; code: string; message: string; details?: unknown }
    meta: EnvelopeMeta
}

export interface BuildRef {
    id: string
    /** Same-origin URL of the ES module entry, or null if the build has no JS. */
    js: string | null
    /** Same-origin URL of the build's CSS, or null. */
    css: string | null
}

export interface RegionDef {
    name: string
    acceptsContributions: boolean
}

export interface ComponentRef {
    id: string
    uniqueId: string
    name: string
    kind: ComponentKind
    serverMode: ServerMode
    build: BuildRef | null
    /** Layouts only. */
    regions?: RegionDef[]
}

export interface PlacementRef {
    id: string
    region: string
    order: number
    parentId: string | null
    component: ComponentRef
    options: Record<string, unknown>
    styleTokens: Record<string, string>
}

export type RegionMap = Record<string, PlacementRef[]>

export interface ThemeRef {
    id: string
    key: string
    name: string
    /** Light-mode tokens (CSS custom properties without the leading --). */
    tokens: Record<string, string>
    /** Dark-mode tokens, applied on :host(.dark); null = use the framework's default dark palette. */
    tokensDark: Record<string, string> | null
    /** Compiled stylesheet URLs (ready theme build). */
    css: string[]
    /** Raw stylesheet when the theme has no ready build yet (live mode only). */
    cssText: string | null
}

export interface PortalUser {
    sysId: string
    userName: string
    name: string
    firstName: string
    lastName: string
    email: string
    title: string
    avatar: string | null
    roles: string[]
    timeZone: string
    language: string
    isImpersonating: boolean
}

export interface PageSummary {
    id: string
    route: string
    title: string
}

export interface BootstrapData {
    portal: {
        id: string
        slug: string
        name: string
        homeRoute: string
        settings: Record<string, unknown>
        navigation: unknown
    }
    user: PortalUser
    release: { id: string; version: number } | null
    theme: ThemeRef | null
    layout: ComponentRef | null
    /** Portal-level placements (header, sidebar, footer…); stay mounted across navigation. */
    regions: RegionMap
    pages: PageSummary[]
}

export interface ResolvePageRequest {
    portal: string
    /** Portal-relative page path, already URL-decoded ('' = home). */
    page: string
}

export interface ResolvePageData {
    page: PageSummary & { params: Record<string, string> }
    layout: ComponentRef | null
    regions: RegionMap
}

export interface InitializeRequest {
    portal: string
    page?: string
    instances: string[]
    context?: Record<string, unknown>
}

export interface InstanceResult {
    ok: boolean
    data?: Record<string, unknown>
    options?: Record<string, unknown>
    error?: { status: number; code: string; message: string }
    build?: string | null
}

export interface InitializeData {
    instances: Record<string, InstanceResult>
}

export type ExecuteAction = 'initialize' | 'get' | 'update'

export interface ExecuteRequest {
    portal: string
    page?: string
    action?: ExecuteAction
    input?: Record<string, unknown>
    data?: Record<string, unknown>
    context?: Record<string, unknown>
}

/* ---------------- Studio ---------------- */

export type SourceTarget = 'client' | 'server' | 'style' | 'asset'

export interface SourceFileDto {
    id?: string
    path: string
    target: SourceTarget
    content: string
    encoding?: 'utf8' | 'base64'
    mimeType?: string
    hash?: string
    revision?: number
    /** Save only: delete this path. */
    deleted?: boolean
    /**
     * True for files backed by record fields rather than source_file rows:
     * See VIRTUAL_FILES: component client/CSS/server/options/regions fields and theme
     * stylesheet/tokens. server.js and the JSON files are never compiled for the client.
     */
    virtual?: boolean
}

/** Virtual file paths and the record fields behind them. */
export const VIRTUAL_FILES = {
    component: {
        'main.tsx': 'client_script',
        'styles.css': 'css',
        'server.js': 'script',
        'options.schema.json': 'options_schema_json',
        'options.defaults.json': 'default_options_json',
        'regions.json': 'regions_json', // layouts only
    },
    theme: { 'theme.css': 'stylesheet', 'tokens.json': 'tokens_json' },
} as const

export interface ComponentMetaDto {
    name?: string
    namespace?: string
    key?: string
    kind?: ComponentKind
    description?: string
    placeable?: boolean
    active?: boolean
    clientScript?: string
    css?: string
    /** Default true: generate Tailwind utilities for classes used in the client code. */
    tailwind?: boolean
    script?: string
    serverMode?: ServerMode
    exports?: unknown
    optionsSchema?: unknown
    defaultOptions?: Record<string, unknown>
    regions?: RegionDef[]
    dependencySpec?: unknown
}

export interface ProjectData {
    owner: { type: 'component' | 'theme'; id: string; uniqueId: string; name: string }
    meta: ComponentMetaDto & { tokens?: Record<string, string>; stylesheet?: string }
    revision: number
    /** Virtual baseline files first, then the extra source files. */
    files: SourceFileDto[]
    latestBuild: BuildSummary | null
}

export interface SaveRequest {
    expectedRevision: number
    files?: SourceFileDto[]
    meta?: ComponentMetaDto & { tokens?: Record<string, string>; stylesheet?: string }
}

/** One build record per component/theme, overwritten by each successful compile. */
export interface BuildSummary {
    id: string
    state: BuildState
    /** Source revision of the compiled output currently served (0 = never compiled). */
    builtRevision: number
    /** Source revision the browser compiler must compile next (0 = nothing pending). */
    pendingRevision: number
    inputHash: string
    /** True when the saved sources matched the compiled output, so no compile is needed. */
    upToDate?: boolean
    needsRebuild?: boolean
    diagnostics?: unknown
}

export interface SaveData {
    revision: number
    build: BuildSummary
    /**
     * Compiler inputs for build.pendingRevision: virtual main.tsx / styles.css (theme.css)
     * plus extra client/style files. Server-only code (server.js, target=server) is excluded.
     */
    files: SourceFileDto[]
    registry: { runtimeAbiVersion: string }
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
    ok: boolean
    diagnostics: { errors: { file?: string; line?: number; column?: number; message: string }[]; warnings: { file?: string; line?: number; column?: number; message: string }[] }
    ms: number
}

export interface BuildAssetDto {
    path: string
    kind: 'js' | 'css' | 'map' | 'wasm' | 'other'
    content: string
    mimeType?: string
}

export interface BuildDependencyDto {
    specifier: string
    kind: 'component' | 'host' | 'package' | 'relative'
    targetBuild?: string
    hostExport?: string
    packageVersion?: string
    resolvedEntry?: string
}

export interface CompleteBuildRequest {
    /** The pendingRevision this compile was for; stale completions are rejected (409). */
    revision: number
    success: boolean
    compilerVersion?: string
    runtimeAbiVersion?: string
    assets?: BuildAssetDto[]
    dependencies?: BuildDependencyDto[]
    diagnostics?: unknown
}

/** The compiled form of a portal: one record per portal, reprocessed when its inputs change. */
export interface ReleaseSummary {
    id: string
    portal: string
    revision: number
    manifestHash: string
    processedAt: string
    problems: string[]
}
