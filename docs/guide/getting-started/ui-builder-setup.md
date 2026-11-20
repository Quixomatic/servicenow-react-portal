---
title: UI Builder setup
description: The site and studio pages that host React Portal, their URL parameters, and the URL format.
section: Getting started
order: 1
tags: [ui-builder, setup, urls]
---

# UI Builder setup

React Portal renders inside one Next Experience component, **React Portal Host** (`x-312987-portal-host`). It's placed on two UI Builder pages of an experience: `site` renders portals and `studio` renders Portal Studio.

> **Note:** The experience and its two pages are configured in UI Builder on the instance. They aren't part of the Fluent source (`now.config.json` lists the UX tables in `ignoreTransformTableList`, so a sync never pulls them in). On a new instance you create them by hand as described here.

## The host component

`packages/portal-host/now-ui.json` declares the component, its properties and its one action.

| Property | Default | Bound to |
|---|---|---|
| `mode` | `portal` | static: `portal` on `site`, `studio` on `studio` |
| `portalSlug` | `''` | `site`: the required `portalSlug` param |
| `page` | `''` | `site`: the optional `pageId` param (portal-relative page path) |
| `recordId` | `''` | `site`: optional `id`; `studio`: optional `id` (the record to open) |
| `q` | `''` | optional `q` (a query string) |
| `view` | `''` | portal: the record view (`view` param); Studio: the activity (`code`, `pages`, `menus`) |
| `table` | `''` | optional `table` |
| `sysId` | `''` | optional `sys_id` (see the warning below) |
| `query` | `''` | optional `query` (an encoded query) |

The action **`PORTAL_NAVIGATE`** carries `portalSlug`, `page`, `recordId`, `q`, `view`, `table`, `sysId` and `query`, all strings, with `''` meaning absent. The host dispatches it for every user-initiated navigation and never touches `window.history` itself.

> **Warning:** Never add a host property named `id`: it collides with the element's HTML `id` attribute. The record id is `recordId`.

## The `site` page

| Setting | Value |
|---|---|
| Required URL params | `portalSlug` |
| Optional URL params | `pageId`, `id`, `table`, `sys_id`, `view`, `query`, `q` |
| Host properties | Mode = `portal`; Portal slug ← `@context.props.portalSlug`; Page ← `pageId`; Record id ← `id`; Query ← `q`; Table, Sys ID, View, Encoded query ← their params |
| Event handler | **Portal navigate** → **Link to destination** → page `site`, mapping payload `portalSlug` → `portalSlug`, `page` → `pageId`, `recordId` → `id`, `q` → `q`, `table` → `table`, `sysId` → `sys_id`, `view` → `view`, `query` → `query` |

> **Warning:** Keep `pageId` (and every other param except `portalSlug`) **optional**. In Next Experience each distinct combination of *required* params is a separate screen: a new host instance, with the shell keeping the old ones hidden. Optional params keep one host instance alive across navigation. The Link to destination handler must put `pageId` under optional params, or the shell throws `Cannot read properties of undefined (reading '0')`.

## The `studio` page

| Setting | Value |
|---|---|
| Required URL params | none |
| Optional URL params | `view`, `id`, `q` |
| Host properties | Mode = `studio` (static); Record id ← `@context.props.id`; View ← `@context.props.view`; Query ← `@context.props.q` |
| Event handler | **Portal navigate** → **Link to destination** in **script** mode → route `studio`; params `view`, `id` (payload `recordId`), `q` (empty values left out); redirect = payload `replace` |

Studio reads `view`, `id` and `q` from the URL itself and writes what's open back to it (see [Studio overview](../studio/overview.md#deep-links)). `id` is what to open (a component, theme, page, portal, menu or menu item), and `q` packs everything else (file, line, placement, device, …).

### Setting up the studio page's params and handler

In UI Builder, open the **Service Portal** experience, then the **Studio** page (variant *Studio default*):

1. **Page parameters.** In the page's settings, under *Optional parameters*, keep `view` and `id` and add **`q`** (type string). Don't add required parameters: each required value would be a separate screen.
2. **Host properties.** Select the **React Portal Host** component and bind:
   - *Mode* = `studio` (static);
   - *Record id* ← `@context.props.id`;
   - *View* ← `@context.props.view`;
   - *Query* (`q`) ← `@context.props.q`.
3. **Event handler.** Still on the host component, open *Events* → **Portal navigate** → *Add handler* → **Link to destination**, and switch it to **script** mode. The form's declarative mode doesn't offer *Redirect*, and in testing a declarative mapping never navigated for Studio. The script returns:
   - route `studio`;
   - params `{ view: payload.view, id: payload.recordId, q: payload.q }`, leaving out empty values;
   - redirect `payload.replace === true || payload.replace === 'true'` (replace the current history entry instead of pushing one);
   - everything else (fields, title, passive navigation, external, navigation options) `null`.
4. **Save.** Hard-reload `/x/312987/portal/studio`. Open a component, then a file: the URL follows (`…/params/view/code/id/app%2Fform/q/file%3Drecord-form.tsx`). The file change replaces the entry (`history.length` unchanged), and Back steps through components.

> **Note:** Studio works without the handler too. If its first navigation of a page load doesn't move the URL within about half a second, it writes the history entries itself for the rest of that load, following the shell's `history.state.position` convention. With the handler in place it's used automatically, and nothing needs to be switched. (`WRITER` in `studio/deep-link/controller.js` can force either way.)

## URL format

UI Builder writes optional params after **one** `params` segment, as name/value pairs, and **dash-cases** their names:

```text
/x/312987/portal/site/sp                                         sp portal, home page
/x/312987/portal/site/sp/params/page-id/incidents                the "incidents" page
/x/312987/portal/site/sp/params/page-id/form/table/incident/sys-id/<sys_id>
/x/312987/portal/site/sp/params/page-id/list/table/incident/query/active%3Dtrue
/x/312987/portal/studio/params/view/pages/id/sp%3A%2Fhome
/x/312987/portal/studio/params/view/code/id/app%2Fform/q/file%3Dserver.js%26line%3D42
```

- `pageId` appears as `page-id` and `sys_id` as `sys-id`.
- A URL with repeated `params` segments (`/params/a/1/params/b/2`) is ignored by UI Builder.
- The `/x/312987/portal/` prefix is the experience's path on the instance it was built on. Yours may differ.

> **Warning:** A UIB param named `sys_id` shows in the URL as `sys-id`, and its binding never delivers a value. UI Builder also doesn't deliver an *absent* optional param: going Back from a URL with `q` to the same page without `q` leaves the old property value in place. The host works around both by reading the URL's `/params/` pairs itself (dash-case aware) on every property change, on `popstate` and after its own navigations. An optional param the URL lacks is treated as `''`, unless its property changed in the last 1.5 s. See [URL parameters](../runtime-api/portal-and-location.md#url-parameters).

## Deploying the host

```bash
cd packages/portal-host
pnpm run deploy        # build:css (Tailwind + variant layer), babel patch check, snc ui-component deploy
```

Studio ships as its own chunk (`portal-studio.jsdbx`), so portal pages never download the editor. For local development, see [Host architecture](../internals/host-architecture.md#local-development).

## Related

- [Demo portals](demo-portals.md)
- [Your first widget](first-widget.md)
- [Instance gotchas](../internals/instance-gotchas.md)
