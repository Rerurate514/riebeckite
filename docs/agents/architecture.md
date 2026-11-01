---
title: Architecture Rules for Agents
---
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

Never add a Core dependency on HonoX, a named plugin, a theme, the CLI, the
application, or another Riebeckite package. Put behavior in the innermost
package that can own it.

Themes may depend only on `@riebeckite/core`. Plugins must not depend on the
CLI, HonoX, Preview, or Themes. Plugin-to-Plugin dependencies are limited to
the edges in `scripts/check_dependencies.mjs` (`article-metadata -> taxonomy`,
`docs -> navigation`); add a new edge there with a reason instead of hiding it
in a manifest. Integrations must not depend on the CLI or the application.

Type-only imports do not create a runtime edge, so a package may use a
type from a package that it declares as a dev dependency. Runtime imports,
including `await import("...")` and `require("...")`, must be declared as a
runtime dependency and are the edges used for cycle and direction checks.
Test files may use root-level dev tooling without redeclaring it per package.

## Content and runtime invariants

`ContentSource` owns scan/read/source metadata. `ContentManager` owns interpretation, pipeline execution, manifest, graph, plugin orchestration, and public-location resolution. Do not add direct filesystem scans to ContentManager behavior that can use a source contract.

Create filesystem content sources through `createContentSource` from
`@riebeckite/node`. It applies the shared rule: a configured
`config.content.source` wins; otherwise the filesystem source uses the
resolved content directory and excludes. Callers keep their own directory
override (project root, HonoX app root, or a build script override).

Public content URLs come from the resolved `ContentPublicLocation` (`resolveDefaultContentLocation`, then `resolveContentLocations` plugin hooks). Consumers and routing MUST read the resolved `permalink` and MUST NOT construct a public content URL from a slug or filesystem path. `slug` is an internal lookup key; `permalink` is the public URL. Treat them as separate concepts.

`.riebeckite/build` and filesystem plugin caches are build-time state. Cloudflare Workers request code must not read or write them. A missing or unsafe incremental state chooses a full path; a failed build must retain the prior valid state.

## Public API boundaries

`@riebeckite/core` is the plugin, content, migration, publication, derived
data, provenance, and host contract. Its root barrel is explicit; new public
symbols must be added there deliberately, and `packages/core/api.json` records
the reviewed surface (533 symbols after the 2026-11 review; the 550-symbol
pre-review surface included 17 internal CLI helpers now available only from
`@riebeckite/core/cli`).

`@riebeckite/core/cli` is the CLI extension API used by Plugin CLI extensions
and by the CLI itself. `@riebeckite/core/client` is the browser/runtime-safe
client contract. Internal CLI parser helpers (argument keys, help formatting,
completion internals) are available from `@riebeckite/core/cli` but are not
re-exported from the root barrel.

The type-only exports in the root barrel remain public contracts even when no
workspace package currently imports them. Do not remove an export only because
a workspace search finds no consumer; check examples, Scaffold templates,
Framework and Plugin documentation, and release history first.

## Publication and Migration

Publication contracts (`src/publication`) stay in Core. They define
`ResolvedRiebeckiteConfig`, the content manifest projection, markers, and
history, so extracting them would make Core depend on the extracted package
and would pull a new release unit into every site and plugin author.

Migration contracts (`src/migration`) stay in Core as well. The Node
implementation (`FileSystemContentMigration`) is the filesystem adapter over
those contracts and is already split from Mutation. A separate package would
not remove a dependency, because Migration must consume Content and
Publication types that live in Core.

The two areas keep their own directories and node-side adapters. Revisit the
split only if Publication or Migration gains an independent runtime (for
example a hosted service) that justifies its own release cadence.

## Source structure and growth

Split code by change reason and responsibility, not by line count. A long file can
stay cohesive; a short file with unrelated responsibilities is still a split
candidate. Move related data and behavior together, keep the existing public
surface, and do not replace one large file with several equally mixed files.

`pnpm check:source-health` reports files and functions that need review and fails
only on mechanically verifiable architecture violations such as runtime import
cycles or a Core dependency on an outer layer. Size findings are advisory; do not
fail CI only because a file crossed a line threshold.

Directory-level dependency cycles are advisory. A cycle between two
collaborating directories is not a runtime import cycle when the module graph
stays acyclic; record it and remove the edge only when the contract placement
actually causes coupling.

## Checks

```sh
pnpm check:dependencies    # declared/exported imports, cycles, layer direction
pnpm check:source-health   # module cycles, cross-layer imports, browser boundary
pnpm test:checks           # regression fixtures for both checkers
pnpm check:core-api        # reviewed Core public surface
```

`check:dependencies` covers every workspace package, not only `apps/web`.
`check:core-api` also verifies runtime value exports from `dist` when the
package has been built.

## Tool semantics

- `check`: config/plugin/capability validity.
- `doctor`: read-only health diagnostics.
- `inspect`: factual, read-only resolved state.
- `profile`: tracing-based performance reporting.
- `build`: intentional output/state mutation.

Do not merge these command semantics or make an inspection auto-fix data.
