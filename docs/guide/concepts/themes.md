---
title: Themes
description: Theme tokens, light and dark palettes, the theme stylesheet, and how the host applies them.
section: Concepts
order: 2
tags: [theme, tokens, dark-mode, css]
---

# Themes

A **theme** (`x_312987_portal_theme`) is the always-loaded styling of a portal: a set of design **tokens** (CSS custom properties) plus a **stylesheet**. A portal references one theme.

## Fields

| Field | Studio file | Meaning |
|---|---|---|
| `name`, `key` | | `key` is derived from the name when empty (unique) |
| `description` | | Free text |
| `tokens_json` | `tokens.json` | CSS custom properties without the leading `--` |
| `stylesheet` | `theme.css` | Base CSS for the portal, served as written |
| `active` | | Inactive themes aren't applied |
| `source_revision` | | Advances when tokens or the stylesheet change |

## Tokens

Tokens use the shadcn names, so the host kit and every Tailwind class follow the theme: `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `border`, `input`, `ring`, `radius`, `chart-1` … `chart-5`, and `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`.

`tokens.json` is either **flat** (light only) or **per mode**:

```json
{
    "light": { "primary": "oklch(0.45 0.16 260)", "radius": "0.5rem", "sidebar": "oklch(0.98 0 0)" },
    "dark": { "primary": "oklch(0.7 0.14 260)" }
}
```

How the host applies them (`packages/portal-host/src/runtime/theme.js`):

- Each key `K` becomes `--K` on `:host(:not(.rp-no-theme))`, plus an `--rp-K` alias for your own CSS (keys that already start with `rp-` are emitted once).
- Dark tokens go on `:host(.dark:not(.rp-no-theme))`. A theme without a `dark` set gets the framework's default dark colours, so light colours never leak into dark mode; its non-colour tokens (radius, fonts) still apply.
- The token sheet is injected **last** in the shadow root, so tokens win over the framework defaults regardless of order.
- The sidebar tokens default to the base tokens (`--sidebar: var(--background)` and so on) when the theme doesn't set them.

Tailwind maps the colour tokens to utilities (`bg-primary`, `text-muted-foreground`, `border-border`, `bg-sidebar-accent`, `text-chart-3`…) and the radius token to `rounded-sm|md|lg|xl` (`--radius` ± 2–4px). See [Styling](../authoring/styling.md).

## Light, dark and system mode

Mode is a **user** preference, not a theme setting. `useTheme()` exposes the next-themes API (`theme`, `setTheme`, `resolvedTheme`, `systemTheme`, `themes`). The default is `system`, which follows `prefers-color-scheme` live. The choice persists in `localStorage['rp-theme']` and syncs across tabs. The host element gets the `dark` class before first paint, and the renderer mirrors it onto the overlay layer, so menus and dialogs follow. Portals and Studio share one preference. See [Theme](../runtime-api/theme.md).

## The stylesheet

`theme.css` is the first sheet in the shadow root, before the framework CSS and every widget. A theme save "compiles" it as a passthrough: the build holds `theme.css` as written, and the tokens travel in the manifest. Before a theme has a ready build, live mode serves the raw stylesheet text instead.

## Changing a theme

`RP: Normalize theme` checks the key (`^[a-z][a-z0-9-]{0,79}$`) and the shape of `tokens_json` (an object, or `light` / `dark` objects), and advances `source_revision` when the tokens or the stylesheet change. `RP: Compile theme on save` then rebuilds `theme.css`. Saving a theme reprocesses every portal that uses it (`RP: Reprocess release (theme)`). The token sheet updates on the next bootstrap; a theme swap replaces both sheets without a flash when they're cached.

## Related

- [Styling](../authoring/styling.md)
- [Theme hook](../runtime-api/theme.md)
- [Host architecture: style order](../internals/host-architecture.md#styles-in-the-shadow-root)
