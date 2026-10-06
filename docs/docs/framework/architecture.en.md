# Architecture

## Package ownership

Riebeckite is a pnpm workspace with intentionally one-way dependencies.

| Area | Owns | Must not own |
| --- | --- | --- |
| `packages/core` | portable contracts, configuration, content orchestration, manifests, graphs, pipelines, plugin runtime, observability, and theme contracts | HonoX/Vite APIs, a named plugin, or application UI |
| `packages/plugins/*` | reusable Markdown, HTML, metadata, asset, diagnostic, browser, and Page Type capabilities | application routes or framework-specific routing |
| `packages/integrations/*` | framework, bundler, and platform adapters | reusable domain policy already represented by Core |
| `packages/themes/*` | presentation configuration and CSS | components, routes, plugins, or content loading |
| `apps/web` | the concrete routes, islands, application components, and Worker deployment | reusable framework contracts |
| `packages/cli` | Node-oriented commands and build tooling | request-time application behavior |

```text
Application -> Integration -> Core
Plugin --------------------> Core contracts
Theme ---------------------> Core theme contract
CLI -----------------------> Core and integration APIs
```

Core must never gain a reverse dependency on HonoX, a theme, a plugin, or the application. Put a concern at the first layer that can own it without importing an outer layer.

## Content and rendering flow

`ContentSource` discovers and reads source material and supplies source metadata. `ContentManager` interprets that material, resolves each entry's public location, runs the pipeline and plugin hooks, creates the manifest and graph, and coordinates content-related work. Public URLs come from the resolved location (`ContentManager.getContentLocations()`: the Core default resolver, then `resolveContentLocations` plugin hooks); consumers read the resolved `permalink` and never derive a URL from a slug or filesystem path. A feature that needs files should use the source contract rather than adding a second filesystem scanner.

```text
ContentSource -> ContentManager -> resolve public locations
                                      |-> parse/process pipeline
                                      |-> plugin hooks
                                      |-> manifest and content graph
                                      `-> integration/application rendering
```

Plugins may extend the process through published contracts; they do not become a hidden second application layer. A Page Type contributes a framework-independent body and public paths, while the integration resolves it through a generic route and the application retains the document frame. Themes only style the rendered result through theme configuration, CSS tokens, stable hooks, and `data-*` attributes; they do not branch on Page Type IDs. See [Page system](./page-system.en.md).

## Build-time and runtime boundary

The CLI, Inspector, Doctor, profiler traces, incremental state at `.riebeckite/build/content-state.json`, and filesystem plugin caches belong to Node/build time. They are not mutable dependencies of the Cloudflare Workers request runtime. Runtime code consumes generated application output and stable content data, not a writable `.riebeckite` directory.

This boundary keeps deployments reproducible: a failed build does not mutate the previous valid state, and a request cannot depend on local files that do not exist in a Worker.

## Choosing a location

- Add a portable type or lifecycle contract to **Core**.
- Add reusable content behavior to a **plugin**.
- Add Vite, HonoX, or platform glue to an **integration**.
- Add a route, page composition, or island to **`apps/web`**.
- Add visual tokens and CSS only to a **theme**.

See [Content system](content-system.en.md), [Plugin system](plugin-system.en.md), [Theme system](theme-system.en.md), and [HonoX integration](honox-integration.en.md) before changing a boundary.
