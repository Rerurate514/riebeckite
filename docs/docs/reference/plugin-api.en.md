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

The base context contains resolved config when available, `contentIndex`,
diagnostics, plugin-scoped cache, generated-output sink, Logger, Tracer, and
the content source when Core owns one.
Specialized hooks add post, manifest, graph, location, or render data.

``` ts
type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
  cache: PluginCache;
  output: GeneratedOutputSink;
  logger: Logger;
  tracer: Tracer;
  contentSource?: ContentSource;
};
```

Prefer injected context services over plugin-owned global singletons.

## Lifecycle

Framework lifecycle hooks run once per `ContentManager` in this order:
`setup`, `buildStart`, `onConfigResolved`, content processing, and `buildEnd`.
`dispose` runs in reverse resolved order when the manager is disposed.
`buildEnd` receives the completed manifest after diagnostics have been
collected and is the only terminal build hook.

Named lifecycle and content hooks run in resolved plugin order. Core reports a
hook failure with the plugin name, hook name, and original cause.

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

## Processed-content build dependencies

Core owns incremental invalidation. A plugin declares its cache contract with
`processedContentCache`; it must not implement its own affected-content logic.

```ts
definePlugin({
  name: "citations",
  processedContentCache: {
    version: "citations-v1",
    dependencyMode: "tracked",
  },
  extendMarkdownPipeline(pipeline, context) {
    pipeline.use(remarkCitations, { contentSource: context.contentSource });
  },
});
```

- `none` means processing depends only on the content source, frontmatter,
  options, and the declared version.
- `tracked` means the pipeline reads other content or files. Read them through
  `context.contentSource` so Core records the dependency and selectively
  rebuilds its consumers. For example, a citations plugin reads its BibTeX file
  with `readContentSourceEntry(context.contentSource, path)`.
- `unsafe` opts out of persistent processed-content reuse. A content-affecting
  plugin without a contract receives the same safe full-content fallback.

Tracked dependencies are captured while processing content. Core persists their
content/file identities, builds a reverse index, and computes affected content
on the next incremental build. Do not scan the vault independently or persist a
plugin-specific incremental state for this purpose. If a dependency cannot be
observed through the framework API, use `unsafe`; a broad rebuild is correct,
where a stale result is not.

This is separate from output dependencies. `pageTypes[].outputDependencies`
and `context.output.emit(..., { dependencies })` declare which rendered pages
or generated files require regeneration. Use `content`, `tag`, `folder`,
`global`, or `unknown` there; `unknown` safely requests full output
regeneration.

Generated output paths are physical output paths. A generated output must not
collide with a content, redirect, or plugin page route; Core fails the build
instead of overwriting the route.

## Content Hooks

Content hooks join named phases of content processing:

``` text
setup → buildStart → config resolved → public locations resolved
→ content loaded → Markdown/HTML pipeline → post parsed → post processed
→ content graph → manifest created → diagnostics → build end
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

## Body slots

A plugin can contribute an HTML fragment to a named position in the
Site-owned article layout without adding a route or touching the document
shell. Core defines the slot names as `ContentBodySlot`; the Site decides
which slots to render and where.

The standard article layout recognizes:

  Slot                     Position
  ------------------------ -----------------------------------------------
  article.header     directly after the article header
  article.metadata       after the title and meta block
  article.aside            in the article aside
  article.before-content   before the note body
  article.after-content    after the note body
  article.footer           in the article footer

`ContentBodySlot` also accepts any other string, so a custom Site can define
additional slot names.

Publish a fragment with `appendContentBodySlot` from `@riebeckite/core`,
typically from a manifest hook such as `onManifestCreated`:

```ts
import { appendContentBodySlot } from "@riebeckite/core";

appendContentBodySlot(entry, "article.after-content", "<section>...</section>");
```

Empty fragments are ignored, and fragments accumulate in resolved plugin
order: contributions from earlier plugins are preserved and the new fragment
is appended.

Use `article.footer` for article-end sections such as related content,
history, navigation, and backlinks. Set each plugin's `order` to establish a
stable sequence; do not reorder these sections in routes or with CSS.

The Site reads `entry.bodySlots` and chooses whether and where to render each
value. It can delegate the rendering mechanics to the public `ContentSlot`
primitive from `@riebeckite/honox/ui`:

```tsx
// app/components/article/article.tsx
import { ContentSlot } from "@riebeckite/honox/ui";

<ContentSlot slots={props.bodySlots} name="article.after-content" />
```

`ContentSlot` is public API. It owns the slot lookup, missing and empty
handling, HTML fragment rendering, and the `data-slot` attribute; site classes
are added with `class`/`className`. A slot is rendered only because the Site's
own renderer chooses to render it, and a custom slot name does nothing until the
Site renders it. The escape hatches remain: read `slots` directly, wrap a slot
in any element, and render the same slot more than once. A plugin can
alternatively export a Hono JSX component for the Site to place; see
[Providing UI or output](../plugins/writing-a-plugin.en.md#providing-ui-or-output).

The reference app and the scaffolded starter consume the standard slots. A
plugin publishes; the Site renders. A plugin never changes a route, the shell,
or the render order. See
[Body slot handoff](../framework/honox-integration.en.md#body-slot-handoff) for
the route-level contract.

## Manifest collections and publication safety

Hooks that receive the manifest (`onManifestCreated`, page resolvers, renderers)
choose between three entry collections:

- `manifest.entries` — every entry, including `draft` and `scheduled`. Never
  render these into a public page or a discovery UI.
- `manifest.publicEntries` — routable entries: `public` and `unlisted`. Use for
  output that must cover every reachable URL, such as a sitemap. It still
  includes `unlisted` content.
- `manifest.discoverableEntries` — entries allowed in discovery surfaces:
  `public` only. Use this for related posts, recent lists, tag pages, search
  indexes, and any list a reader browses.

Do not re-derive visibility from `frontmatter` or reimplement `publishAt`. When a
hook genuinely needs to branch, read the resolved `entry.publishing`
(`visibility`, `routable`, `discoverable`); otherwise pick the collection that
already encodes the decision. The publish strategy is configured in
[Configuration](./configuration.en.md).

## Pages

`pageTypes` supplies standalone pages without adding application routes. A page
type declares its stable ID, SSG paths, optional priority, and a resolver. The
resolver receives the resolved manifest and a normalized request path, then
returns HTML for the page body or `null`. The site still owns its document frame
and theme. A page may also return `title`, `description`, `headTags`, and the
`language` it resolved; the document frame decides how to render that metadata.

```ts
definePlugin({
  name: "example-pages",
  pageTypes: [{
    id: "example.report",
    paths: ["/report"],
    resolve: ({ pathname, manifest }) => pathname === "/report"
      ? { type: "example.report", pathname, body: `<p>${manifest.discoverableEntries.length}</p>` }
      : null,
  }],
});
```

Use `resolveRiebeckiteRoute(content, c.req.path)` and
`pluginPageSsgParams(content)` from `@riebeckite/honox/server` in a catch-all
route. Duplicate IDs fail at plugin resolution. When multiple types match, the
highest `priority` wins; ties fail explicitly.

## Build dependencies

`processedContentCache` declares whether Core may reuse a plugin's processed
content between builds. This is separate from `cacheVersion` and
`context.cache`.

```ts
processedContentCache: {
  version: "example-v1",
  dependencyMode: "tracked",
}
```

- `none` is for transforms that depend only on the source content, frontmatter,
  options, and the declared version.
- `tracked` is for transforms that read other content or files through Core.
  Use `context.contentSource`, `readContentSourceEntry`, `renderContent`, or
  `renderNoteEmbed`; Core owns `ContentDependencyTracker` and records those
  content and file reads automatically. Do not read the filesystem directly.
- `unsafe` is for inputs Core cannot track, such as Git, network, time, or
  process state. It safely bypasses persistent processed-content reuse.

Content dependencies decide which source content must be processed again.
Output dependencies decide which emitted files must be written again. They are
separate contracts. Page types declare `outputDependencies`; a plugin that
updates existing manifest entry HTML in `onManifestCreated` declares root
`outputDependencies`, which are added to those content outputs.

```ts
outputDependencies: [{ type: "global" }]

pageTypes: [{
  id: "example.report",
  paths: ["/report"],
  outputDependencies: [{ type: "tag", tag: "release" }],
  resolve: () => null,
}]
```

Use `content`, `tag`, or `folder` when the exact scope is known; use `global`
for a manifest-wide collection transform. Use `unknown` only when the input
cannot be represented: it regenerates safely and requests full output
regeneration. Generated outputs without declared dependencies are `unknown`.

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

The helpers build the specifier from the package name: `createStyleAsset("example")`
produces `@riebeckite/plugin-example/style.css` and
`createClientEntry("example", ...)` produces `@riebeckite/plugin-example/client`.
They therefore fit only a package literally named `@riebeckite/plugin-<name>`. A
package published under any other name — including a site-local plugin — must
declare `assets` and `clientEntries` explicitly with specifiers its own `exports`
map exposes. See
[Distributing a Plugin outside this repository](#distributing-a-plugin-outside-this-repository).

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
[Theme System](./theme-api.en.md#stable-css-hooks).

For dark mode, consume the semantic `--rb-*` tokens: they resolve correctly in
light, explicit dark, and system dark. Only when a plugin must branch on the
mode itself (for example to invert a build-time asset) should it scope the
override to the theme root so it works both at the document root and inside an
embedded `.rb-theme-root`:
`:is(:root, .rb-theme-root)[data-theme="dark"] <hook>` and, for system dark,
`@media (prefers-color-scheme: dark) { :is(:root, .rb-theme-root):not([data-theme]) <hook> { ... } }`.
Do not key a dark override on `html[data-theme="dark"]` or
`:root:not([data-theme])` alone; those miss embedded theme roots. The
framework never adds a `.dark` class, so do not depend on one.

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
├─ components/        # only when you export components
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
[Public packages and import paths](./README.en.md#public-packages-and-import-paths)
for the supported package surface and current constraints.

### Package shape

Publish built ESM plus type declarations and point `exports` at the built files.
A minimal manifest:

```json
{
  "name": "my-riebeckite-plugin",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./client": {
      "types": "./dist/client.d.ts",
      "import": "./dist/client.js",
      "default": "./dist/client.js"
    },
    "./style.css": "./style.css"
  },
  "files": ["dist", "style.css"],
  "dependencies": { "@riebeckite/core": "^0.0.18" }
}
```

Build the JavaScript entry points and emit declarations in a `prepack` script so
`npm pack` / `npm publish` always ship fresh output. The repository's own build
script is not published: a small `esbuild` bundle (`format: "esm"`,
`packages: "external"`, `external: ["@riebeckite/*"]`) plus
`tsc --emitDeclarationOnly` is enough. Declare each transform dependency you
import (`unist-util-visit`, `unified`, remark/rehype packages) in
`dependencies`, and never point a published `exports` entry at TypeScript source.

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

`createStyleAsset()` and `createClientEntry()` only build
`@riebeckite/plugin-<name>/...` specifiers, so any package not named that way —
a site-local plugin, or a third-party package under a different name — must
declare `moduleSpecifier` explicitly: a package subpath or a path relative to
the Vite root that the host bundler can resolve. The External Site Build E2E
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

- [Architecture](../framework/architecture.en.md)
- [Content System](../framework/content-system.en.md)
- [Observability](../framework/observability.en.md)
- [Theme System](./theme-api.en.md)
- [Framework Reference](./README.en.md)
