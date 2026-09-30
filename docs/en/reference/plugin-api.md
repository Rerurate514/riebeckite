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
application routes or to hide framework-specific routing. Use `pageTypes` for
a reusable, framework-independent page; the integration owns the one generic
route that renders it.

## Minimal plugin

``` ts
import { definePlugin } from "@riebeckite/core";

export function examplePlugin() {
  return definePlugin({ name: "example" });
}
```

A plugin factory may expose typed options and retain the resolved
options on the plugin object:

``` ts
type ExampleOptions = {
  enabled?: boolean;
};

export function examplePlugin(options: ExampleOptions = {}) {
  return definePlugin({
    name: "example",
    options,
  });
}
```

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
   Pages                 `pageTypes`
  Browser integration   `assets`, `clientEntries`
  HTTP integration      `endpoints`
  SEO                   `seo`

Use only the extension points a plugin actually needs.

## Ordering and capabilities

Disabled/false/null inputs are removed, and `enabled: false` is never
executed. `order` provides a basic ordering before dependency resolution,
while capability dependencies express real requirements:

``` ts
plugins: [
  condition && myPlugin(),
]
```

``` ts
definePlugin({
  name: "consumer",
  provides: ["example.output"],
  requires: ["content.graph"],
  optional: ["example.optional"],
});
```

- `provides`: capabilities this plugin provides.
- `requires`: capabilities that must exist.
- `optional`: capabilities used when present.

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

``` ts
type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
  cache: PluginCache;
  logger: Logger;
  tracer: Tracer;
};
```

Prefer injected context services over plugin-owned global singletons.

## Lifecycle

Framework lifecycle hooks include `setup`, `buildStart`, `buildEnd`, and
`dispose`. Content hooks cover config resolution, content loading,
parsed/processed posts, graph extension, and manifest creation.

Execution follows resolved plugin order. Errors should retain the
plugin/hook identity and original cause.

## Markdown and HTML pipelines

Plugins can declare remark/rehype plugins directly:

``` ts
definePlugin({
  name: "example",
  remarkPlugins: [remarkExample],
  rehypePlugins: [rehypeExample],
});
```

Or compose the framework pipelines themselves:

``` ts
definePlugin({
  name: "example",
  extendMarkdownPipeline(pipeline, context) {
    pipeline.use(remarkExample);
  },
  extendHtmlPipeline(pipeline) {
    pipeline.use(rehypeExample);
  },
});
```

Semantic Markdown/HTML transformation belongs here, not in application
components.

## Content Hooks

Content hooks join named phases of content processing:

``` text
config resolved
-> content loaded
-> public location resolved
-> post parsed
-> post processed
-> content graph
-> manifest created
```

Use only the hooks a phase genuinely requires, and do not rebuild later-phase
information in an earlier hook.

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

## Pages

`pageTypes` supplies standalone pages without adding application routes. A page
type declares its stable ID, SSG paths, optional priority, and a resolver. The
resolver receives the public manifest and a normalized request path, then
returns HTML for the page body or `null`. The site still owns its document frame
and theme. A page may also return `title`, `description`, and `headTags`; the
document frame decides how to render that metadata.

```ts
definePlugin({
  name: "example-pages",
  pageTypes: [{
    id: "example.report",
    paths: ["/report"],
    resolve: ({ pathname, manifest }) => pathname === "/report"
      ? { type: "example.report", pathname, body: `<p>${manifest.publicEntries.length}</p>` }
      : null,
  }],
});
```

Use `resolveRiebeckiteRoute(content, c.req.path)` and
`pluginPageSsgParams(content)` from `@riebeckite/honox/server` in a catch-all
route. Duplicate IDs fail at plugin resolution. When multiple types match, the
highest `priority` wins; ties fail explicitly.

## Assets and client entries

Plugin CSS remains in the plugin package and is declared through
`assets`. Browser initialization is declared through `clientEntries`
only when browser JavaScript is genuinely required. Do not copy plugin
CSS into `apps/web` or expose `/node_modules` directly.

For a package named `@riebeckite/plugin-example`, use the Core helpers. They
declare the package's conventional `./style.css` and `./client` exports while
keeping the integration-facing values consistent:

```ts
import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";

export function examplePlugin() {
  return definePlugin({
    name: "example",
    assets: [createStyleAsset("example")],
    clientEntries: [
      createClientEntry("example", "initExample", { selector: ".example" }),
    ],
  });
}
```

Omit `assets` or `clientEntries` when the plugin does not need them. The client
entry's export name is optional and defaults to the module default export. Its
third argument is an optional JSON value passed to that initializer. It is the
only plugin configuration exposed to browser code (and recorded in the
manifest for static hosts); `options` are never copied to the client. Register
only deliberately public values—never tokens, credentials, or private service
URLs. An initializer without public config continues to receive no arguments.

## CSS hooks

Plugin CSS stays in the plugin package and reaches the browser through
`assets`. When a plugin renders a distinct, reusable feature, put a stable
root hook on its outermost element:

- Name plugin/feature hooks `rr-<feature>` (`rr-search`, `rr-callout`,
  `rr-query`, `rr-code`, ...). Use BEM structure under the root:
  `rr-<feature>`, `rr-<feature>__element`, `rr-<feature>--modifier`.
- Keep the historical class on the same element when one already exists. The
  `rr-` hook is additive, so existing selectors and site overrides keep
  working; new plugin CSS should target the `rr-` hook.
- Do not put plugin output in the `rb-` namespace. `rb-*` classes and
  `--rb-*` tokens belong to framework structural hooks and semantic design
  tokens. Plugin-local tokens use `--rr-*` and may fall back to `--rb-*`.
- `rr-<feature>__*` and `rr-<feature>--*` are internal implementation
  details. Document any descendant a theme is expected to target.

Themes target these root hooks. Plugin default CSS loads before theme CSS, so
a theme restyles a feature without editing the plugin. See
[Theme System](./theme-api.md#stable-css-hooks).

## Endpoints and SEO

`endpoints` lets an Integration connect reusable plugin HTTP behavior to
the host router without embedding HonoX-specific routing in Core. `seo`
lets plugins participate in metadata/feed-related behavior through the
framework contract.

Use `defineEndpoint` to declare an endpoint. Pass `cacheControl` only when the
response is safe to cache; the helper applies the header without duplicating
response plumbing.

```ts
import { defineEndpoint } from "@riebeckite/core";

const searchEndpoint = defineEndpoint(
  "/search-data.json",
  ({ config, manifest }) => ({ json: buildSearchItems({ config, manifest }) }),
  { cacheControl: "public, max-age=300" },
);
```

## Diagnostics

Return structured diagnostics rather than printing ad-hoc CLI messages.
Use the injected Logger for operational logging.

## Plugin Cache

`context.cache` is a plugin-scoped, regenerable **build-time** cache.

- Store only regenerable, JSON-serializable values.
- Reference only your own plugin namespace.
- Use `cacheVersion` when compatibility changes.
- Treat a corrupt cache as a safe miss.
- Writes are atomic.

It is not a database or Cloudflare Workers runtime storage.

## Observability (Logger / Tracer)

Use `context.logger` and `context.tracer`:

``` ts
context.logger.info("...");
await context.tracer.span("plugin.example.work", { plugin: "example" }, async () => {
  // work
});
```

The Profiler consumes structured tracing, so plugins do not need their own
timing/reporting system.

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
[Public packages and import paths](./README.md#public-packages-and-import-paths)
for the supported package surface and current constraints.

### Site-local plugins

A plugin does not have to be published. Define it inside the site with
`definePlugin` and pass it to `plugins` in `riebeckite.config.ts`; resolution,
dependency handling, pipeline hooks, and diagnostics are the same contract as a
packaged plugin.

``` ts
// site/extensions/local-plugin.ts
import { definePlugin } from "@riebeckite/core";

export function localPlugin() {
  return definePlugin({
    name: "site-local",
    // Hooks (remarkPlugins, extendHtmlPipeline, endpoints, ...) are the same
    // contract as a packaged plugin.
    assets: [
      {
        pluginName: "site-local",
        kind: "style",
        moduleSpecifier: "/extensions/plugin.css",
      },
    ],
  });
}
```

Because the plugin is not published, `createStyleAsset()` (which builds
`@riebeckite/plugin-<name>/style.css`) cannot apply. Declare `assets` with a
module specifier the host bundler can resolve instead — a package subpath or a
path relative to the Vite root. The External Site Build E2E
(`tests/external-site`) exercises a site-local plugin and theme alongside the
published packages.

## Responsibility boundary

Put in a plugin:

- Markdown/HTML interpretation and reusable content transformation.
- Plugin-specific renderers, reusable browser behavior, and diagnostics.
- Plugin-specific endpoint/SEO extensions.

Do not put in a plugin:

- Framework-wide content model — belongs in Core.
- HonoX/Vite connections — belong in the Integration.
- Application-specific routes/layouts — belong in the App.
- Appearance-only changes — belong in Themes.

## ESM

For NodeNext/ESM packages, ensure built JavaScript uses import paths
Node can actually resolve; do not depend on a TypeScript loader
repairing runtime resolution.

## Related

- [Architecture](../framework/architecture.md)
- [Content System](../framework/content-system.md)
- [Observability](../framework/observability.md)
- [Theme System](./theme-api.md)
- [Framework Reference](./README.md)
