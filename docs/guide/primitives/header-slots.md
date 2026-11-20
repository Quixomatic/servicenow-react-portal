---
title: Header slots
description: utilities:app/header-slots — named slots inside a header widget that page widgets portal their titles and toolbars into.
section: Primitives and utilities
order: 11
tags: [header-slots, layout, toolbar]
---

# Header slots

`utilities:app/header-slots` lets a page widget put content (a title, a count, toolbar buttons) into named slots **inside a header widget's own markup**, such as the left, center and right of `app/app-subheader`'s bar.

```tsx
// In the header widget (e.g. app/app-subheader):
import { HeaderSlotOutlet } from 'utilities:app/header-slots'

<div className="flex items-center gap-2">
    <HeaderSlotOutlet name="left" className="flex min-w-0 items-center gap-2" />
    <HeaderSlotOutlet name="center" />
    <HeaderSlotOutlet name="right" className="ml-auto flex gap-2" />
</div>

// In any page widget:
import { HeaderSlot, useHeaderSlot } from 'utilities:app/header-slots'

<HeaderSlot name="right">
    <Button size="sm" onClick={create}>New</Button>
</HeaderSlot>
```

| Export | Signature |
|---|---|
| `HeaderSlotOutlet` | `<HeaderSlotOutlet name className? as? />`: renders a slot (any name; `as` defaults to `div`) |
| `HeaderSlot` | `<HeaderSlot name fallback?>`: renders its children into the outlet. `fallback` is `'inline'` (default) or `'none'` |
| `useHeaderSlot(name)` | The outlet element or `null` (re-renders when outlets appear or go), to choose a layout up front |

- A contribution is a **React portal**: state, context and events stay with the contributing widget.
- With no outlet on the current layout, the content renders **inline** where it stands (`fallback="inline"`, the default) or not at all (`"none"`). In `app/app-shell` with `subheader: hidden`, contributions fall back inline.
- Outlets are scoped per portal host (keyed by its overlay container), so two portals on one page never share slots.
- Several contributions to one slot render in mount order.
- An outlet with contributions gets `data-filled`, so the header can hide its default content with CSS: `[data-rp-hslot=left][data-filled] ~ .default { display: none }`.

## Built-in outlets

| Widget | Outlets |
|---|---|
| `app/app-subheader` | `left`, `center`, `right`; with `subheader: banner`, also `below`, a full-width row under the title (`app/hero-search` renders there) |
| `app/app-header` | `header-actions`, beside the theme toggle (`app/cart-button` renders there) |

A bar sub-header has no `below` outlet, so contributions to it fall back inline.

## Header slots versus `RegionPortal`

`RegionPortal` targets a **layout region's** outlet (a whole region such as `header`). Header slots target places **inside a header widget**. The list view (`toolbarPlacement`) and record form (`headerSlots`, `headerPlacement`) use header slots.

## Related

- [Layouts](../concepts/layouts.md)
- [Lists](lists.md)
- [Forms](forms.md)
- [Cart and checkout](cart.md)
- [Home page and search](home-and-search.md)
