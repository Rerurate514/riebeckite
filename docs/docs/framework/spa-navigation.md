---
title: SPA Navigation Design
---

# SPA Navigation Design

This is the implementation design for the opt-in SPA runtime, not a user configuration guide.

## Ownership

`@riebeckite/spa` is a separate browser runtime, not a plugin.

```text
Application -> @riebeckite/honox -> Core
Application -> @riebeckite/spa
Plugins ------------------------> Core client lifecycle contract
```

Core owns a portable client-lifecycle contract but imports neither the SPA package, HonoX, nor DOM implementation details. It preserves the `spa` config value opaquely; the SPA package provides its concrete type. The HonoX integration conditionally imports the runtime only when the resolved value is present. SPA-off sites therefore retain their current bundle and navigation.

The integration generates the client entry and connects it to HonoX. The runtime owns same-origin GET navigation, history, replacement, head reconciliation, scroll/focus restoration, and prefetching. Forms are excluded.

## Island constraint and commit order

The application calls HonoX `createClient()` before `initRiebeckiteClient()`. In HonoX 0.1.56, `createClient()` selects only roots without `data-hono-hydrated`, sets that attribute before loading their module, then hydrates them. Recalling it can hydrate newly inserted islands, but does not unmount old islands and is not a general remount API.

The SPA transaction must fetch and validate first, unmount page behavior, replace the owned page root and owned non-script head nodes, hydrate new islands, mount page behavior, then update history/scroll/focus/announcement/analytics. A superseding navigation aborts its fetch and stale async work. Failure before a successful commit uses document-navigation fallback to retain URL/DOM consistency.

## Core lifecycle contract

| Scope | Owner | Lifetime |
| --- | --- | --- |
| `app` | persistent application shell | bootstrap to application disposal |
| `page` | replaceable page root | each document page |

An initializer receives a scope root, `AbortSignal`, and public configuration and may return cleanup, synchronously or asynchronously. Unmount aborts first, calls cleanup once, isolates/reports errors, and prevents a late initializer from becoming active. The lifecycle coordinator owns only lifecycle state; plugins retain DOM policy.

## Client-entry audit

There are 28 registered `createClientEntry` calls, not 27. “Cleanup” is an audit finding, not a target state. Heavy renderers need abort-safe writes before page replacement.

| Entry | Proposed scope | Async/heavy | Cleanup or re-entry finding |
| --- | --- | --- | --- |
| analytics | page event | network | document one-shot guard; no SPA event hook |
| autocardlink, canvas, code-enhance, code-tabs, diff, excalibrain, flashcards, lightbox, share, sidenotes, text-fragment | page | sync | document-scoped; cleanup required |
| chartjs | page | async/heavy | Chart instances are not destroyed |
| color-mode | app | sync | module guard and listeners lack cleanup |
| d2, graphviz, markmap | page | async/heavy | require abort-safe rendering |
| docs | page | sync | resize listener lacks cleanup |
| excalidraw | page | async/heavy | observer is not disconnected |
| garden-explorer | page | hydration | `hydrateRoot` entry has no disposal path |
| hover-preview | page | fetch | cleanup exists; fetch is not aborted |
| map | page | async/heavy | Leaflet maps are not removed |
| mermaid | page | async/heavy | script/rendering is not abortable |
| search | app | index fetch | global listeners and pending fetch lack cleanup |
| toc | page | sync | scroll/resize/rAF lack cleanup |
| ux | split app/page | sync | guard, listeners, observer, timers lack cleanup |
| vega-lite | page | async/heavy | embeds can write after replacement |
| wavedrom | page | async/heavy | global renderer state; no cleanup |

`@riebeckite/plugin-navigation` has no registered client entry in this revision and is not a lifecycle migration target yet. All existing entries run after bootstrap/`DOMContentLoaded` or query the global document. Page entries must instead query their supplied root; any document listener must be owned by scope cleanup.

## Page, head, and build ownership

Replacement requires one stable `<main id="main-content">` and explicit shell ownership. Generated starter/showcase already meet this contract, while `apps/web` has route-owned mains and must be aligned before enabling SPA. Header, footer, persistent search, and color mode are app scope; route content is page scope.

The server renderer must mark page-owned head nodes. Global styles and bootstrap scripts persist. The runtime reconciles title, metadata, canonical/OG data, JSON-LD, and marked plugin nodes by ownership key. It must never clone or execute arbitrary scripts from a fetched document.

The generated virtual client module is the sole bundle edge to `@riebeckite/spa`. With SPA disabled it imports nothing, preserving current SSG artifact preservation, output plans, dependency fingerprints, caches, and asset inventory. SPA-on production and SSG tests must verify that claim.

## Required verification

Test SPA off/on initial loads; internal, external, modifier, and hash links; history and scroll; 404/redirect/network failure; cancellation; cleanup/remount; islands; head ownership; analytics de-duplication; HMR; direct URL; JavaScript-off output; listener/observer leaks; and bounded prefetch cache/cancellation. Report performance only from measurements.
