---
title: Limits
description: Every size, count, depth and time limit in React Portal, with where it's enforced.
section: Reference
order: 2
tags: [reference, limits]
---

# Limits

| Limit | Value | Where |
|---|---|---|
| Source file size | 1 MiB | property `x_312987_portal.source.max_file_bytes` |
| Files in one save | 200 | property `x_312987_portal.max_files_per_owner` |
| One build's assets | 5 MiB | property `x_312987_portal.build.max_bytes` |
| Build asset content | 5,000,000 characters | `build_asset.content` |
| Theme stylesheet / component CSS | 1,000,000 characters | field length |
| Manifest | 4,000,000 characters | `release.manifest_json` |
| JSON fields (options, schema, regions, settings) | 65,000 characters | field length |
| Page `access_config_json`, `layout_options_json`; placement `layout_json` | 4,000 characters | field length |
| Placement style tokens / visibility | 8,000 characters | field length |
| Placement classes | 1,000 characters | field length |
| Portal slug | 63 characters | business rule |
| Component namespace / key | 40 / 80 characters | business rule |
| Block nesting depth | 6 | placement validation |
| Drop zones per block instance | 24 | region resolution |
| Grid span / start values | 1–48 | instance CSS |
| Menu nesting depth | 4 | menu resolution |
| Embed depth below a placement | 4 | host and server |
| Embed descriptors per initialize | 50 | executor |
| Instances per initialize | 100 | executor |
| `$sp.getWidget` calls per run | 20 | executor |
| Embed options | 16 KB JSON | executor |
| Embed key | `[A-Za-z0-9_-]{1,64}` | host and server |
| Embed token lifetime | 12 hours | `embed-token.ts` |
| Request context (URL params) | 50 keys, 4,000 characters a value, 20 values a list, 16 KB | executor |
| Property names per `/properties` call | 100 | runtime API |
| Message keys per `/messages` call | 300 | runtime API |
| Correlation id | 64 characters | REST adapter |
| Sanitized error message | 500 characters | REST adapter |
| Import-graph walk depth | 12 | registry, release service |
| Pending compile considered abandoned | 60 minutes | property `x_312987_portal.build.abandon_minutes` |
| Execution log retention | 14 days | property `x_312987_portal.execution_log.retention_days` |
| Sidebar mobile breakpoint | 768px frame width | host |
| Instance CSS breakpoints | tablet ≤ 1023px, mobile ≤ 639px (container `rp-page`) | instance CSS |
| Designer canvas widths | tablet 820px, mobile 390px | designer |
| Query cache stale time | 30 s default; bootstrap 5 min; page 60 s; properties 5 min; metadata 10 min | host |
| AMB channel release delay | 1 s after the last hook unmounts | host |
| AMB subscribe retries | 2 s, 8 s, 32 s (non-403) | host |
| Record watch throttle | `useRecord` 250 ms, `useTableQuery` 1000 ms (default) | host |
