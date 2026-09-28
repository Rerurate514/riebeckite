# Plugin System

Riebeckite Plugins extend content interpretation, transformation,
rendering, diagnostics, build-time processing, browser behavior,
endpoints, and SEO. This document describes the shared plugin contract
rather than individual plugins.

## Start with the smallest contract

Choose a remark/rehype or pipeline extension for semantic source transforms;
use a content hook only when a named content phase is required. Use assets for
CSS, client entries only for necessary browser code, endpoints for reusable
HTTP behavior, and renderers for a specific target. Do not use a plugin to add
application routes or to hide framework-specific routing. The application or
integration owns that work.

## Minimal plugin

``` ts
import { definePlugin } from "@riebeckite/core";

export function examplePlugin() {
  return definePlugin({ name: "example" });
}
```

A plugin factory may expose typed options and retain the resolved
options on the plugin object.

## Contract overview

  Area                  API
  --------------------- ------------------------------------------------
  Identity              `name`, `enabled`, `order`, `options`
  Dependencies          `provides`, `requires`, `optional`
  Validation            `validateOptions`
  Cache                 `cacheVersion`, `context.cache`
  Lifecycle             `setup`, `buildStart`, `buildEnd`, `dispose`
  Content hooks         config/content/post/manifest hooks
  Public location       `resolveContentLocations`
  Pipeline              remark/rehype declarations and extension hooks
  Graph                 `extendContentGraph`
  Diagnostics           `addDiagnostics`
  Rendering             `renderers`
  Browser integration   `assets`, `clientEntries`
  HTTP integration      `endpoints`
  SEO                   `seo`

Use only the extension points a plugin actually needs.

## Ordering and capabilities

Disabled/false/null inputs are removed. `order` provides a basic
ordering, while capability dependencies express real requirements.

``` ts
definePlugin({
  name: "consumer",
  provides: ["example.output"],
  requires: ["content.graph"],
  optional: ["example.optional"],
});
```

The resolver places providers before consumers and detects missing
requirements, duplicate providers, and cycles while preserving unrelated
input order where possible.

## Option validation

Runtime option validation complements TypeScript factory types.
Validators should be pure and must not scan content, build the site, or
mutate cache/state.

## Plugin Context

The base context contains resolved config when available,
`contentIndex`, diagnostics, plugin-scoped cache, Logger, and Tracer.
Specialized hooks add post, manifest, graph, location, or render data.

Prefer injected context services over plugin-owned global singletons.

## Lifecycle

Framework lifecycle hooks include `setup`, `buildStart`, `buildEnd`, and
`dispose`. Content hooks cover config resolution, content loading,
parsed/processed posts, graph extension, and manifest creation.

Execution follows resolved plugin order. Errors should retain the
plugin/hook identity and original cause.

## Markdown and HTML pipelines

Plugins can declare remark/rehype plugins directly or extend the
framework pipelines. Semantic Markdown/HTML transformation belongs here
rather than in application components.

## Content Graph

Use the existing Manifest/Content Graph contracts instead of rescanning
the filesystem inside graph-oriented plugins.

## Public location

`resolveContentLocations` lets a plugin replace the public location of content
entries. Core first applies its default resolver
(`resolveDefaultContentLocation`: `index` -> `/`, otherwise `/{slug}`), then runs
each plugin's hook in resolved plugin order and stores the results as
`ContentPublicLocation` values on the manifest, graph, and Markdown pipeline.

Plugins own their URL strategy: identity fields, hash or frontmatter IDs, path
shapes, redirect rules, and their own validation. Core does not know any of
that; it knows only `ContentLocationInput`, `ContentPublicLocation`,
`resolveDefaultContentLocation`, and the `resolveContentLocations` hook.
Consumers read the resolved `entry.permalink`, never branch on a specific plugin,
and never rebuild a URL from a slug. An entry without a resolved location is an
explicit error, not a slug fallback.

## Renderers

Renderers receive a target (`kind`, `path`, `raw`, `label`, `url`,
`embed`) plus normal plugin context. Return `null` when the renderer
does not handle a target so another renderer can participate.

## Assets and client entries

Plugin CSS remains in the plugin package and is declared through
`assets`. Browser initialization is declared through `clientEntries`
only when browser JavaScript is genuinely required. Do not copy plugin
CSS into `apps/web` or expose `/node_modules` directly.

## Endpoints and SEO

`endpoints` lets an Integration connect reusable plugin HTTP behavior to
the host router without embedding HonoX-specific routing in Core. `seo`
lets plugins participate in metadata/feed-related behavior through the
framework contract.

## Diagnostics

Return structured diagnostics rather than printing ad-hoc CLI messages.
Use the injected Logger for operational logging.

## Plugin Cache

`context.cache` is a plugin-scoped, regenerable **build-time** cache.
Store only JSON-serializable values, respect plugin namespaces, and use
`cacheVersion` when compatibility changes. It is not a database or
Cloudflare Workers runtime storage.

## Observability

Use `context.logger` and `context.tracer`. The Profiler consumes
structured tracing, so plugins do not need their own timing/reporting
system.

## Suggested package layout

``` text
packages/plugins/example/
├─ index.ts
├─ client.ts          # only when needed
├─ style.css          # only when needed
├─ package.json
└─ src/
   ├─ remark.ts
   ├─ rehype.ts
   ├─ renderer.ts
   └─ types.ts
```

## Distributing a Plugin outside this repository

An external Plugin package depends only on `@riebeckite/core` and declares the
subpaths it owns (`./client`, `./components`, `./style.css`) in its own `exports`
map. Do not import `@riebeckite/core/src/**` or reference monorepo paths. See
[Public packages and import paths](./framework-reference.md#public-packages-and-import-paths)
for the supported package surface and current constraints.

## Responsibility boundary

Use a Plugin for reusable content/browser extensions. Put framework-wide
contracts in Core, HonoX/Vite connections in Integration,
application-specific routes/layouts in App, and appearance-only changes
in Themes.

For NodeNext/ESM packages, ensure built JavaScript uses import paths
Node can actually resolve; do not depend on a TypeScript loader
repairing runtime resolution.
