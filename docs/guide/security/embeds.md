---
title: Embeds
description: How embedded widgets are authorized step by step, how client options are filtered, and how server options are signed.
section: Security
order: 3
tags: [security, embeds, tokens, hmac]
---

# Embeds

An embedded widget has no placement record, so every request for one must prove it's allowed. Three mechanisms do that.

## 1. Import-chain authorization

A request names a **root placement** and an **embed path** (component unique ids, outermost first). The server walks the path against the sealed manifest: each step must be a **widget** that the previous component's build imports **directly** (a `build_dep` edge, recorded in the manifest as `ComponentImport.importers`), with a usable build.

- A request can't skip an intermediate component or reach a widget that's merely somewhere in the tree.
- Anything else answers `404` (`embed_not_imported` internally, logged as `denied`), indistinguishable from a missing placement.
- Depth is capped at 4 below a placement, enforced by host and server independently.

## 2. Client option filtering

Options from the client (`<X options>`, `useEmbeddedWidget`, `getWidget()`) are configuration, not authority. The server computes `{ ...childDefaults, ...filtered }` against the **child build's** options snapshot:

- with a schema: known keys only, type-checked (`type`, `enum`, `minimum` / `maximum`, `maxLength`); invalid values fall back to the default;
- properties annotated `"x-embed": "server"` are always dropped;
- without a schema: any JSON value (scripts should treat them like `input`);
- at most 16 KB of JSON.

Dropped keys are reported in `meta.embed.dropped`.

## 3. Signed server options

`$sp.getWidget(id, options)` runs in a trusted server script, so its options are used **unfiltered** and returned with a token. Later calls from that embed send the options back with the token; a valid token means the options are used exactly as signed (`x-embed: server` keys included).

| Property | Value |
|---|---|
| Bound to | root placement, embed path, canonical options JSON, user sys_id, expiry |
| Lifetime | 12 hours |
| Format | `v2.<exp>.<sig>` |
| Construction | HMAC-style nesting with SHA-256 (`inner = sha256('i:' + secret + '\n' + payload)`, `sig = sha256('o:' + secret + '\n' + inner)`, `payload = 'rp-embed/2|' + root + '|' + path.join('>') + '|' + canonicalJson(options) + '|' + userId + '|' + exp`); the outer hash over a fixed-length digest rules out length extension. Scoped code has no HMAC primitive (`GlideCertificateEncryption` is blocked in scope) |
| Verification | Constant-time comparison |
| Failure | An expired, tampered or foreign token silently falls back to filtering: a stale tab degrades instead of erroring |

### The secret

The signing secret is the system property **`x_312987_portal.embed_secret`**:

- created on first use from `GlideSecureRandomUtil` (64 characters), type `password2`, read/write roles `admin`, `is_private` (not carried by update sets);
- deliberately **not declared in Fluent**, so an install never resets it;
- never readable by component scripts (`$sp.getProperty` refuses it) or the properties endpoint;
- **rotate** it by changing or clearing the value: every token becomes invalid and embeds fall back to filtered options.

If the secret can't be read or created, signing is off (`token: null`) and every embed uses filtered options.

## Related

- [Embedded widgets](../authoring/embedded-widgets.md)
- [Options: `x-embed`](../authoring/options.md#x-embed-server-options-only-the-server-can-set)
