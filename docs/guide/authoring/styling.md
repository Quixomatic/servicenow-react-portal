---
title: Styling
description: styles.css, server-compiled Tailwind v4, theme tokens, dark mode, cascade layers, the rp-variants layer and the one utilities sheet per portal.
section: Authoring components
order: 2
tags: [css, tailwind, layers, dark-mode]
---

# Styling

Components are styled with any mix of **Tailwind classes** (compiled on the server for exactly the classes you use) and **`styles.css`** (plain CSS). Everything renders in the host's shadow root, so nothing leaks in from the page and nothing leaks out.

## Tailwind

With the component's `tailwind` field on (the default), the compiler scans every reachable client file for class-like strings and compiles **Tailwind v4** utilities for them.

- The theme's shadcn tokens are Tailwind colours: `bg-background`, `text-foreground`, `bg-card`, `bg-primary text-primary-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-destructive`, `bg-sidebar-accent`, `text-chart-1` … `text-chart-5`.
- Radii follow the theme: `rounded-sm` (`--radius` − 4px), `rounded-md` (− 2px), `rounded-lg` (`--radius`), `rounded-xl` (+ 4px).
- `dark:` keys off the host's `.dark` class, so it follows the user's light/dark/system choice.
- Arbitrary values and variants work: `grid-cols-[7rem_minmax(0,1fr)_auto]`, `bg-[rgb(1,2,3)]`, `group-data-[collapsible=icon]:hidden`, `[&>svg]:size-4`, `data-[side=left]:border-r`.

> **Note:** The extractor over-collects on purpose (anything class-shaped in strings, template literals and JSX). Classes built by string concatenation at runtime (`'bg-' + color`) can't be seen: write full class names.

Utilities only: Tailwind's preflight (base reset) isn't included in component builds. The host's framework CSS provides it once.

## `styles.css`

The `css` field (virtual file `styles.css`) is appended **after** the Tailwind output, unlayered:

```css
.rp-orders { display: grid; gap: 1rem; }
.rp-orders__row:hover { background: var(--muted); }
```

- Theme tokens are available as `var(--primary)` and also `var(--rp-primary)`.
- Unlayered CSS beats every layered Tailwind utility, whatever the specificity.
- Prefix your class names (`rp-orders__…`): every component's CSS lands in the same shadow root.
- CSS files imported from code (`import './row.css'`) are appended after `styles.css`, in import order.

Turn `tailwind` off for components that only use `styles.css` (the seed layouts and blocks do). Their CSS is then exactly the author CSS.

## Cascade layers

All Tailwind sheets in the shadow root share one layer order:

```css
@layer theme, base, components, utilities, rp-variants, rp-portal, rp-instance, rp-instance-variants;
```

Every component build has its own Tailwind sheet, and same-named layers **merge** across `<style>` sheets. Inside one sheet Tailwind orders base utilities before variants, but across sheets a later widget's `.hidden` used to beat an earlier widget's `sm:block` at equal specificity.

The compiler (compiler `rp-server-compiler/5`) fixes this by moving **variant rules** (`sm:`, `max-sm:`, `@container`, `hover:`, `focus-visible:`, `group-*`, `peer-*`, `data-[…]:`, `aria-*`, `dark:`, `[&>svg]:`…) out of `utilities` into a later **`rp-variants`** layer. Any variant from any sheet now beats any base utility from any sheet. The same pass runs on the host's framework CSS and on placement classes.

Exceptions and limits of the variant layer alone:

- Rules whose declarations are all `!important` (`max-sm:flex!`) stay in `utilities`, because the layer order flips for important declarations.
- A base utility can still lose to a conflicting base utility in a later sheet (`px-2` versus `ps-4`), and a variant to a conflicting variant (`md:hidden` versus `sm:flex`).
- `styles.css` stays unlayered and beats all of it.

The portal utilities sheet removes those limits on portal pages. **Placement classes** (the classes you set on a placement in the designer) compile into the last two layers, `rp-instance` and `rp-instance-variants`, so they still override the component's own classes on the same element.

## One utilities sheet per portal

On a portal page, the Tailwind utilities of every component come from **one sheet**, compiled at reprocess:

- It holds the union of every build in the portal's manifest (layouts, placements, blocks and their imports) plus the host's own classes.
- It's in Tailwind's own order, so `px-2` sorts before `ps-4`, `flex-col` before `md:flex-row`, and base before variants, exactly as in a single-sheet Tailwind project.
- It sits in the last layer, `rp-portal`, so each class in it beats the same class re-emitted by the host's framework sheet or by a component's fallback sheet.
- You don't need `!` to win a cross-widget tie any more.

A component's own Tailwind sheet (`utilities.css`) is used only as a **fallback**, when the portal sheet doesn't cover the build:

- Studio preview;
- a component you just saved, until its portal reprocess finishes (seconds);
- a model outside the portal's manifest.

Fallback sheets sort before the portal sheet. During that window a brand-new class in the component you're editing can lose a tie against the portal sheet; the next reprocess fixes it. Your `styles.css` is unaffected: it's injected on its own and stays unlayered.

The sheet recompiles only when the portal's set of valid classes changes, i.e. when a component starts or stops using a utility. Editing text or logic never recompiles it. Timings on dev189813 (union of valid classes plus the host's):

| Portal | Raw candidates + variant pass (spike) | Valid candidates + host classes, `rp-portal` (as built) |
|---|---|---|
| sp | 29,108 candidates, 9.98 s, 106 KB | 1,531 classes (962 from the host), 4.27 s, 170 KB |
| app | 45,095 candidates, 15.27 s, 221 KB | 2,431 classes (962 from the host), 5.45 s, 270 KB |

An unchanged union adds about 0.2–0.3 s to a reprocess (reading the candidate lists and hashing them).

## Order of sheets in the shadow root

| Slot | What |
|---|---|
| theme | The theme stylesheet |
| framework | The host's Tailwind + shadcn CSS (a `<style>`, not an adopted sheet); always present |
| fallback | A component's own Tailwind sheet, only when the portal sheet doesn't cover its build |
| utilities | The portal utilities sheet (`@layer rp-portal`) |
| widget | Author CSS (`styles.css`), one sheet per component build (imports' CSS first) |
| instance | One sheet per placement: classes, style tokens, grid layout, `x-css-var` options |
| tokens | Theme token variables (`:host { --primary: … }`), last |

The renderer mirrors every `<style>` into the **overlay layer**, so dropdowns, popovers, dialogs and toasts get the same CSS.

## Overlays

Floating UI (menus, popovers, tooltips, dialogs, sheets, toasts) must render into the host's overlay layer, not `document.body`. The host kit (`components:popover`, `components:dropdown-menu`, `components:dialog`…) already does. If you create your own React portal, target the overlay element:

```tsx
import { createPortal } from 'react-dom'
import { usePortalContainer } from '@portal/runtime'

function Floating({ children }: { children: React.ReactNode }) {
    return createPortal(children, usePortalContainer())
}
```

## Per-instance styling

Admins can style a single placement (padding, background, grid position, extra Tailwind classes, responsive tablet/mobile values) without touching your code. See [Placements and blocks](../concepts/placements-and-blocks.md#instance-styling). Write components so that works: let the root element take the full width of its slot, and don't hard-code outer margins.

## Related

- [Themes](../concepts/themes.md)
- [Compiler pipeline](../internals/compiler.md)
- [Host architecture](../internals/host-architecture.md#styles-in-the-shadow-root)
