---
title: Content width
description: How pages cap the width of their main content, and how layouts use --rp-content-max.
section: Concepts
order: 9
tags: [layout, width]
---

# Content width

Pages don't stretch edge to edge by default. Each page picks a maximum width for its main content, or full bleed, with a portal-wide default.

## Settings

| Where | Value |
|---|---|
| Page `content_width` | `inherit` (Portal default, the default), `full` (Full bleed), `7xl` (80rem), `6xl` (72rem), `5xl` (64rem), `4xl` (56rem), `3xl` (48rem) |
| Portal `settings.contentWidth` | The default for `inherit` pages: one of `full`, `7xl` … `3xl` |

The effective width is the page's own value, else the portal default, else **`7xl`**. `POST /pages/resolve` returns it as `page.contentWidth`.

The page form and the page designer's page panel both edit `content_width`; the designer's portal settings edit "Default content width".

## How layouts use it

The host exposes the effective width as the CSS custom property **`--rp-content-max`** on a `display: contents` wrapper around the layout. Because the wrapper has no box, changing pages never remounts the layout. Any layout can use it:

```css
.main-inner {
    width: 100%;
    max-width: var(--rp-content-max, 80rem);
    margin-inline: auto;
}
```

- `app/standard-layout` and `app/app-shell` centre their main content and cap it at `--rp-content-max`.
- `app/centered-layout` uses it as its column width (`min(var(--rp-content-max, 760px), 100%)`). The 760px fallback only applies where the property isn't set, such as outside the host.
- `app/app-subheader` caps its banner content at the same width, so the banner title lines up with the page content.
- For `full`, the property is set to `none`.

The page designer's canvas applies the same wrapper, so pages preview at their real width.

## Related

- [Layouts](layouts.md)
- [Pages and routes](pages-and-routes.md)
- [Portals](portals.md#settings-settings_json)
