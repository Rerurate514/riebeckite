---
date: 2026-10-06
title: Boundaries
sidebar:
  label: Boundaries
  order: 30
---
# Boundaries

## Build-time and runtime boundary

Riebeckite separates what is only needed at build time from what the public
site needs at runtime.

```mermaid
flowchart LR
    subgraph Build["Build-time / Node.js"]
        CLI2["CLI"]
        Doctor["Doctor"]
        Inspector["Inspector"]
        State["Incremental State"]
        Cache["Plugin Cache"]
        Profile["Profile / Trace"]
    end

    Build --> Output["Generated Application<br/>Stable Content Data"]

    Output --> Runtime["Runtime<br/>Cloudflare Workers"]
```

The following belong to build time:

- `.riebeckite/build/content-state.json`
- plugin caches
- CLI
- [[glossary/doctor|Doctor]]
- [[framework/inspector|Inspector]]
- profile / trace

The Cloudflare Workers request runtime does not read or write these. Runtime
code consumes generated application output and stable content data, not a
writable `.riebeckite` directory.

The CLI, Inspector, Doctor, profiler traces, incremental state at `.riebeckite/build/content-state.json`, and filesystem plugin caches belong to Node/build time. They are not mutable dependencies of the Cloudflare Workers request runtime.

This boundary keeps deployments reproducible: a failed build does not mutate the previous valid state, and a request cannot depend on local files that do not exist in a Worker.

## Choosing a location

When adding a feature, first decide which package should own it.

```mermaid
flowchart TD
    Q{"What are you adding?"}

    Q -->|"Shared types / contracts / lifecycle"| Core["Core"]
    Q -->|"Reusable content behavior"| Plugin["Plugin"]
    Q -->|"HonoX / Vite / platform glue"| Integration["Integration"]
    Q -->|"Route / page / island"| App["Site Application"]
    Q -->|"Appearance / CSS / tokens"| Theme["Theme"]
```

The rule of thumb is:

| What you are adding | Where it goes |
| --- | --- |
| A portable type or lifecycle contract | **Core** |
| Reusable content behavior | **Plugin** |
| Vite / HonoX / platform glue | **Integration** |
| A route, page composition, or island | **Site Application** |
| Visual tokens and CSS | **Theme** |

- Add a portable type or lifecycle contract to **Core**.
- Add reusable content behavior to a **plugin**.
- Add Vite, HonoX, or platform glue to an **integration**.
- Add a route, page composition, or island to **`apps/web`**.
- Add visual tokens and CSS only to a **theme**.

If you are unsure, put the feature in **the innermost package that can support
it** — but an inner package must never depend on an outer one. For example,
"I want to display a Plugin Page with HonoX" does not justify adding HonoX code
to Core. Instead, split the responsibilities:

```text
Core
  → a framework-independent Page contract

Plugin
  → provides the Page

HonoX Integration
  → connects the Page to a route

Site
  → renders the final document
```

Keeping this boundary lets Core and plugins be reused without being tied to a
specific site, framework, or platform.

See [Content system](../content-system.md), [Plugin system](../plugin-system.md), [Theme system](../theme-system.md), and [HonoX integration](../honox-integration.md) before changing a boundary.
