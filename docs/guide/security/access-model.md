---
title: Access model
description: Roles and capabilities, table and REST ACLs, portal and page audience checks, and how consumers reach data.
section: Security
order: 1
tags: [security, roles, acl, access]
---

# Access model

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

`admin` (the platform role) and `x_312987_portal.admin` pass every check.

## Table ACLs

Fluent declares 60 explicit table ACLs (`src/fluent/security/table-acls.now.ts`; admin overrides on all):

| Table | Read | Write / create | Delete |
|---|---|---|---|
| portal | dev, designer, publisher | designer | admin |
| theme | dev, designer, publisher | dev, designer | admin |
| component | dev, designer, publisher | developer | admin |
| source_file | dev, designer | dev, designer | dev, designer |
| page, placement, menu, menu_item | dev, designer, publisher | designer | designer |
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

Studio users bypass portal and page audience checks, so authors can see inactive and restricted content. They are applied per request in bootstrap, resolve, initialize, execute, properties and asset delivery.

> **Note:** **In progress:** [user criteria](../concepts/user-criteria.md) as a second layer ANDed with roles on portals, pages and menu items.

## Server-side error detail

Error responses are sanitized. In the browser, detailed error toasts (message, script line, code) are shown only to `admin`, `x_312987_portal.admin`, `.developer` and `.designer`; everyone else sees a generic message and a reference id.

## Related

- [Server scripts](server-scripts.md)
- [Embeds](embeds.md)
- [Data access](data-access.md)
