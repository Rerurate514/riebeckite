# Architecture Rules for Agents

## Ownership and direction

| Area | Owns |
| --- | --- |
| `packages/core` | portable contracts and content/plugin/theme orchestration |
| `packages/plugins/*` | reusable content, HTML, assets, diagnostics, and browser behavior |
| `packages/integrations/*` | framework/bundler/platform glue; HonoX/Vite is here |
| `packages/themes/*` | presentation-only CSS/configuration |
| `apps/web` | concrete routes, islands, components, and deployment integration |
| `packages/cli` | Node/build-time commands |

```text
App -> Integration -> Core
Plugin -> Core contracts
Theme -> Core theme contract
CLI -> Core / Integration
```

Never add a Core dependency on HonoX, a named plugin, a theme, the CLI, or the application. Put behavior in the innermost package that can own it.

## Content and runtime invariants

`ContentSource` owns scan/read/source metadata. `ContentManager` owns interpretation, pipeline execution, manifest, graph, plugin orchestration, and public-location resolution. Do not add direct filesystem scans to ContentManager behavior that can use a source contract.

Public content URLs come from the resolved `ContentPublicLocation` (`resolveDefaultContentLocation`, then `resolveContentLocations` plugin hooks). Consumers and routing MUST read the resolved `permalink` and MUST NOT construct a public content URL from a slug or filesystem path. `slug` is an internal lookup key; `permalink` is the public URL. Treat them as separate concepts.

`.riebeckite/build` and filesystem plugin caches are build-time state. Cloudflare Workers request code must not read or write them. A missing or unsafe incremental state chooses a full path; a failed build must retain the prior valid state.

## Tool semantics

- `check`: config/plugin/capability validity.
- `doctor`: read-only health diagnostics.
- `inspect`: factual, read-only resolved state.
- `profile`: tracing-based performance reporting.
- `build`: intentional output/state mutation.

Do not merge these command semantics or make an inspection auto-fix data.
