---
title: Access model
description: Roles and capabilities, table and REST ACLs, portal and page audience checks, and how consumers reach data.
section: Security
order: 1
tags: [security, roles, acl, access]
---

# Access model

Who can author, design and publish React Portal content, which ACLs guard its tables and REST APIs, and how each request decides whether a user may see a portal, page or menu item.

## Principles

- **Consumers never read React Portal tables directly.** Table ACLs admit only studio roles. The runtime REST API checks portal and page access itself, then reads with `GlideRecord`.
- **Business data goes through the platform's own APIs** (Table API, GraphQL, UI APIs, `GlideRecordSecure` in server scripts), so the platform's ACLs, data policies and business rules apply.
- **Inaccessible means not found.** A portal, page or instance the user can't reach answers `404`, so probes can't learn what exists.

## Roles

| Role | Duty |
|---|---|
| `x_312987_portal.developer` | Author component and theme source code |
| `x_312987_portal.designer` | Design portals, pages, placements, options, themes and menus |
| `x_312987_portal.publisher` | Reprocess (publish) portal releases |
| `x_312987_portal.admin` | Full administration; contains the three roles above |

Capabilities checked by the Studio API (`requireStudio`):

| Capability | Who |
|---|---|
| `author` | developer |
| `design` | designer or developer |
| `publish` | publisher |
| `any` | any of developer, designer, publisher |
| `admin` | `x_312987_portal.admin` only |

`admin` (the platform role) and `x_312987_portal.admin` pass every check.

## Table ACLs

Fluent declares 84 explicit table ACLs (`src/fluent/security/table-acls.now.ts`; admin overrides on all): 60 on the core tables and 24 on the six user-criteria tables.

| Table | Read | Write / create | Delete |
|---|---|---|---|
| portal | dev, designer, publisher | designer | admin |
| theme | dev, designer, publisher | dev, designer | admin |
| component | dev, designer, publisher | developer | admin |
| source_file | dev, designer | dev, designer | dev, designer |
| page, placement, menu, menu_item | dev, designer, publisher | designer | designer |
| portal_uc, portal_uc_no, page_uc, page_uc_no, item_uc, item_uc_no | dev, designer, publisher | designer | designer |
| build, build_dep, release, release_entry | dev, designer, publisher | admin | admin |
| build_asset | dev, publisher | admin | admin |
| execution_log | dev, publisher | admin | admin |

Builds, assets, releases and logs are written only by server services (or admins).

## REST ACLs

| API | ACL | Requirement |
|---|---|---|
| `rp` (runtime) | `x_312987_portal.rp_runtime` | `user_is_authenticated` |
| `rp_studio` | `x_312987_portal.rp_studio` | developer, designer or publisher (admin overrides) |

## Portal and page audience

| Check | Rule |
|---|---|
| Portal | Logged in, `active`, and one of the portal's `roles` (empty = every authenticated user) |
| Page | `active`, and one of `access_config_json.roles` (empty = the portal's audience) |
| Menu item | One of its `roles`, its `condition` true, and (page items) the page accessible |
| User criteria | On portals, pages and menu items: no "Available for" rows or a match, and no "Not available for" match. ANDed with the role checks above |

Studio users (any React Portal role) and admins bypass portal, page and user-criteria checks, so authors can see inactive and restricted content. The checks are applied per request in bootstrap, resolve, initialize, execute, properties and asset delivery. A page hidden by criteria answers the usual page-not-found, and placements, embeds and layout roots on it are refused.

See [User criteria](../concepts/user-criteria.md) for how criteria are evaluated (one loader call per request, never stored in the manifest).

## Server-side error detail

Error responses are sanitized. Script failures (`script_error`, and any 5xx from a server script) carry the thrown message, line and component only for `admin`, `x_312987_portal.admin`, `.developer` and `.designer`: for everyone else the server itself returns "The server script failed" with the response's correlation id as the reference (the execution log keeps the full message). In the browser, detailed error toasts, widget crash placeholders, the page error view and the Diagnostics pill are shown to the same roles only; everyone else sees a generic message and a reference id.

## Related

- [Server scripts](server-scripts.md)
- [Embeds](embeds.md)
- [Data access](data-access.md)
