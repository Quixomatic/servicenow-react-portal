---
title: Contracts
description: The wire types shared by the server and the host (src/shared/contracts.ts), condensed.
section: Reference
order: 4
tags: [reference, types, contracts, rest]
---

# Contracts

`src/shared/contracts.ts` defines every wire shape shared by the Fluent server modules and the host. It's plain types only. This page condenses it; the file is authoritative.

## Envelope

```ts
interface Envelope<T> { data: T; options?: Record<string, unknown>; meta: EnvelopeMeta }
interface EnvelopeMeta { correlationId: string; durationMs?: number; release?: { id: string; version: number } | null; build?: string | null; [key: string]: unknown }
interface ErrorBody { error: { status: number; code: string; message: string; details?: unknown }; meta: EnvelopeMeta }
```

The platform wraps every body as `{ result: … }`.

## Enums

```ts
type ComponentKind = 'widget' | 'layout' | 'block' | 'primitive' | 'utility'
type ServerMode = 'none' | 'on-load' | 'on-demand'
type BuildState = 'pending' | 'ready' | 'failed'
type ContentWidth = 'full' | '7xl' | '6xl' | '5xl' | '4xl' | '3xl'
type NavItemType = 'page' | 'route' | 'url' | 'group' | 'separator' | 'dynamic'
type ExecuteAction = 'initialize' | 'get' | 'update'
type SourceTarget = 'client' | 'server' | 'style' | 'asset'
```

## Manifest pieces

```ts
interface BuildRef { id: string; js: string | null; css: string | null }
interface RegionDef { name: string; acceptsContributions: boolean; label?: string }

interface ComponentRef {
    id: string; uniqueId: string; name: string; kind: ComponentKind; serverMode: ServerMode
    build: BuildRef | null
    regions?: RegionDef[]                    // layouts
    defaultOptions?: Record<string, unknown> // layouts
    imports?: ComponentImport[]              // transitive, dependencies first
}
interface ComponentImport {
    specifier: string; id: string; uniqueId: string; kind: ComponentKind; build: BuildRef | null
    name?: string; serverMode?: ServerMode
    importers?: string[]                     // components whose builds import it directly (embed authorization)
}

type Responsive<T> = T & { tablet?: Partial<T>; mobile?: Partial<T> }
interface PlacementLayout { colSpan?: number | 'full'; rowSpan?: number; colStart?: number; rowStart?: number; order?: number; alignSelf?: string; justifySelf?: string }

interface PlacementRef {
    id: string; region: string; order: number; parentId: string | null
    component: ComponentRef
    options: Record<string, unknown>         // effective
    styleTokens: Record<string, unknown>
    layout: Responsive<PlacementLayout>
    classes: string
    css: string                              // compiled instance CSS
    regions?: RegionDef[]; children?: RegionMap // blocks
}
type RegionMap = Record<string, PlacementRef[]>

interface ThemeRef { id: string; key: string; name: string; tokens: Record<string, string>; tokensDark: Record<string, string> | null; css: string[]; cssText: string | null }
```

## Runtime payloads

```ts
interface PortalUser { sysId; userName; name; firstName; lastName; email; title; avatar: string | null; roles: string[]; timeZone; language; isImpersonating: boolean; impersonatedBy?: string | null }
interface PageSummary { id: string; route: string; title: string }

interface BootstrapData {
    portal: { id; slug; name; homeRoute; settings: Record<string, unknown>; navigation: unknown }
    user: PortalUser
    release: { id: string; version: number } | null
    theme: ThemeRef | null
    layout: ComponentRef | null
    layoutOptions: Record<string, unknown>
    regions: RegionMap
    pages: PageSummary[]
    menus: MenuMap
}
interface ResolvePageRequest { portal: string; page: string }
interface ResolvePageData {
    page: PageSummary & { params: Record<string, string>; contentWidth: ContentWidth }
    layout: ComponentRef | null
    layoutOptions: Record<string, unknown>
    regions: RegionMap
}

interface InitializeRequest { portal: string; page?: string; instances: Array<string | EmbedDescriptor>; context?: Record<string, unknown> }
interface InitializeData { instances: Record<string, InstanceResult> }
interface InstanceResult { ok: boolean; data?; options?; error?: { status; code; message }; build?: string | null; messages?: ServerMessage[]; token?: string | null }
interface ExecuteRequest { portal: string; page?: string; action?: ExecuteAction; input?; data?; context?; embed?: EmbedRequest }
interface ServerMessage { type: 'info' | 'error' | 'warning' | 'success'; message: string }
```

## Embeds

```ts
interface EmbedModel { $embed: 1; component: string; key: string; ok: boolean; data?; options: Record<string, unknown>; token: string | null; build: string | null; error?; messages?: ServerMessage[] }
interface EmbedDescriptor { id: string; placement: string; path: string[]; keys?: string[]; options?: Record<string, unknown>; token?: string | null }
interface EmbedRequest { path: string[]; keys?: string[]; options?: Record<string, unknown>; token?: string | null }
```

## Menus

```ts
interface NavItem {
    id: string; type: NavItemType; label: string
    icon?: string; badge?: string; tooltip?: string
    to?: string; q?: Record<string, string>; portalSlug?: string
    href?: string; target?: '_self' | '_blank'; match?: 'exact' | 'prefix'
    open?: boolean; children: NavItem[]
}
type MenuMap = Record<string, NavItem[]>
interface MenuDto { id; portalId; key; name; description; active: boolean; items: MenuItemDto[] }
interface MenuItemDto {
    id; menuId; parentId: string | null; order: number; type: NavItemType; label; active: boolean
    pageId: string | null; page: { id; route; title } | null
    params: { params?: Record<string, string>; query?: Record<string, string> } | null
    route; url; icon; target: '' | '_self' | '_blank'; match: 'exact' | 'prefix'; tooltip; collapsed: boolean
    roles: string[]; condition; badge; badgeScript; script; children: MenuItemDto[]
}
```

## Studio

```ts
interface SourceFileDto { id?; path: string; target: SourceTarget; content: string; encoding?: 'utf8' | 'base64'; mimeType?; hash?; revision?: number; deleted?: boolean; virtual?: boolean }
const VIRTUAL_FILES = {
    component: { 'main.tsx': 'client_script', 'styles.css': 'css', 'server.js': 'script', 'options.schema.json': 'options_schema_json', 'options.defaults.json': 'default_options_json', 'regions.json': 'regions_json' },
    theme: { 'theme.css': 'stylesheet', 'tokens.json': 'tokens_json' },
}
interface ProjectData { owner: { type: 'component' | 'theme'; id; uniqueId; name }; meta: ComponentMetaDto & { tokens?; stylesheet? }; revision: number; files: SourceFileDto[]; latestBuild: BuildSummary | null }
interface SaveRequest { expectedRevision: number; files?: SourceFileDto[]; meta?: ComponentMetaDto & { tokens?; stylesheet? } }
interface SaveData { revision: number; build: BuildSummary; files: SourceFileDto[]; registry: { runtimeAbiVersion: string } }
interface BuildSummary { id; state: BuildState; builtRevision: number; pendingRevision: number; inputHash: string; upToDate?: boolean; needsRebuild?: boolean; diagnostics?: unknown }
interface CheckData { ok: boolean; diagnostics: { errors: Diag[]; warnings: Diag[] }; ms: number }   // Diag = { file?, line?, column?, message }
interface CompleteBuildRequest { revision: number; success: boolean; compilerVersion?; runtimeAbiVersion?; assets?: BuildAssetDto[]; dependencies?: BuildDependencyDto[]; diagnostics?: unknown }
interface ReleaseSummary { id; portal; revision: number; manifestHash; processedAt; problems: string[] }
```

> **Note:** **In progress** in the working tree: `EmbedDescriptor.placement` also accepts `'layout:<component sys_id>'`; `SourceFileDto.unused` and `ProjectData.kindFiles` (per-kind baseline files).

## Related

- [REST conventions](../rest-api/conventions.md)
- [Runtime REST API](../rest-api/runtime.md)
- [Studio REST API](../rest-api/studio.md)
