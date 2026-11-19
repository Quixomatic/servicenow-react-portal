---
title: Layout and navigation
description: Region, RegionPortal, useBlock, useLayout, useNavigation, useSidebar and usePortalContainer.
section: Runtime API
order: 4
tags: [Region, RegionPortal, useBlock, useLayout, useNavigation, useSidebar]
---

# Layout and navigation

## `<Region>`

```tsx
<Region name="main" className?="…" contents?={false} as?="div" />
```

- **In a layout:** renders that region: its portal-level placements (mounted across navigation), the page's placements (the main region via the router outlet), then an outlet for `RegionPortal` contributions. The element carries `data-rp-region`.
- **Inside a block:** renders the block instance's children in that drop zone. With `contents`, the zone has no element of its own, so children are direct grid/flex items of the block root (needed for grid and subgrid).

`Region` is memoized: navigation never re-renders a Region itself.

## `<RegionPortal>`

```tsx
<RegionPortal region="header">…</RegionPortal>
```

Contributes content into a layout region's outlet (a React portal: state, context and events stay with the contributor; it unmounts with it). Renders nothing, with a one-time console warning, when the layout's region has `acceptsContributions: false` or doesn't exist.

## `useBlock()`

Blocks only:

```ts
useBlock(): {
    placementId: string
    options: Record<string, unknown>       // effective block options
    regions: RegionDef[]                   // the instance's resolved drop zones
    rootProps: { 'data-rp-placement', 'data-rp-widget', …, className?: string }
}
```

Spread `rootProps` on the block's root element and merge your own `className`. It carries the instance-CSS target (`data-rp-placement`), the designer's markers and the instance's Tailwind classes.

## `useLayout()`

```ts
useLayout(): { layout: ComponentRef | null; options: Record<string, unknown>; mainRegion: string; regions: RegionDef[] }
```

The effective layout and its options (layout defaults → portal `settings.layoutOptions` → the page's own). Layout components also get `options` as a prop. An options change re-renders the layout and the readers of `useLayout()`, never the regions or their widgets.

## `useNavigation()`

`useNavigation(key = 'primary')`: one portal menu, resolved once and shared by every header, sidebar and footer variant.

```ts
useNavigation(key?: string): {
    items: NavItem[]
    activePath: NavItem[]            // root → active, for breadcrumbs
    active: NavItem | null
    menu: { key: string; name: string } | null
    path: string
    source: 'menu' | 'navigation' | 'pages' | 'none'
}

type NavItem = {
    id: string
    type: 'page' | 'route' | 'url' | 'group' | 'separator'
    label: string
    icon?: string; badge?: string; tooltip?: string
    tint?: string                    // chart-1 … chart-5 by position when not set
    to?: string; href?: string; target?: '_self' | '_blank'
    match?: 'exact' | 'prefix'
    portalSlug?: string; recordId?: string; q?: Record<string, string>
    active: boolean
    open?: boolean                   // groups
    children: NavItem[]
    link?: object                    // spread on <Link {...item.link}>
    attrs: { 'data-rp-nav-item': string }
}
```

**Source**, in order:

1. bootstrap `menus[key]`: [menu records](../concepts/menus.md), already resolved for this user (`source: 'menu'`);
2. for `primary` only: the deprecated `portal.navigation` (`'navigation'`);
3. for `primary` only: every page without route params (`'pages'`).

Other keys without a menu record are empty (`'none'`).

**Active state:** the route item whose path equals the current path, else the one whose path is the longest prefix of it (`orders` is active on `orders/42`); `match: 'exact'` items are only active on their own path. At most one leaf is active, and its ancestor groups are active and open.

Spread `item.link` on `<Link>` and `item.attrs` on any other element that renders an item (URL anchors, group triggers), so Studio's Menus preview can select it:

```tsx
const { items } = useNavigation('primary')
return (
    <nav>
        {items.map((item) =>
            item.type === 'url' ? (
                <a key={item.id} href={item.href} target={item.target} {...item.attrs}>{item.label}</a>
            ) : item.type === 'group' || item.type === 'separator' ? null : (
                <Link key={item.id} {...item.link} className={item.active ? 'font-semibold' : ''}>{item.label}</Link>
            ),
        )}
    </nav>
)
```

## `useSidebar()`

The portal shell's sidebar state, shadcn's `useSidebar` hoisted to the portal so a header trigger and a sidebar widget share it:

```ts
useSidebar(): {
    state: 'expanded' | 'collapsed'
    open: boolean; setOpen(open: boolean): void; toggleSidebar(): void
    isMobile: boolean                 // portal frame narrower than 768px
    openMobile: boolean; setOpenMobile(open: boolean): void
    available: boolean                // a collapsible sidebar is mounted
}
```

- `open` persists per portal in `localStorage['rp-sidebar:<slug>']`.
- **Ctrl/⌘+B** toggles while a collapsible sidebar is mounted.
- On mobile (by frame width, not window width) the sidebar is an overlay sheet.
- `components:sidebar` is wired to it: no provider to render. See [Host kit](host-kit.md#sidebar).

## `usePortalContainer()`

```ts
usePortalContainer(): Element
```

The overlay layer for floating UI. The host kit uses it; pass it to any custom portal (`createPortal(node, usePortalContainer())`) or Base UI `.Portal` (`container={usePortalContainer()}`). Roots the host creates itself (the designer canvas, the menus preview) provide their own container.

## Related

- [Layouts](../concepts/layouts.md)
- [Menus](../concepts/menus.md)
- [Header slots](../primitives/header-slots.md)
