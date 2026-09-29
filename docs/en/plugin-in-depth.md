# Plugins in Depth

[Your First Plugin](./plugin-tutorial.md) is a short walkthrough that gets a plugin running. This page is its "in depth" companion: it collects everything you refer to while building a plugin — extension points, capabilities, lifecycle, pipelines, and packaging.

If you are new, read [your first plugin](./plugin-tutorial.md) first, and use this page when you want more detail. For the common contracts, see [Plugin System](./plugin-system.md).

## 1. What a plugin does

A plugin adds **features**: Markdown/HTML interpretation, reusable content transformation, plugin-specific renderers, reusable browser behavior, plugin-specific diagnostics, and endpoint/SEO extensions.

**What does not go in a plugin:**

- framework-wide content model → Core
- the HonoX/Vite connection → Integration
- application-specific routes / layout → App
- appearance-only changes → Theme ([Theme System](./theme-system.md))

## 2. A minimal plugin and options

```ts
import { definePlugin } from "@riebeckite/core";

export function examplePlugin() {
  return definePlugin({
    name: "example",
  });
}
```

Give the factory typed options and keep the resolved options in `options`.

```ts
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

Register it in `riebeckite.config.ts`:

```ts
export default defineConfig({
  plugins: [examplePlugin({ enabled: true })],
});
```

`false | null | undefined` entries are dropped from the plugin input, and `enabled: false` is never executed.

```ts
plugins: [
  condition && myPlugin(),
]
```

## 3. The extension points

The current Core contract covers the following areas. **You do not implement all of them — use the smallest extension point your plugin needs.**

| Area | API |
| --- | --- |
| Identity | `name`, `enabled`, `order`, `options` |
| Dependency | `provides`, `requires`, `optional` |
| Validation | `validateOptions` |
| Cache | `cacheVersion`, `context.cache` |
| Lifecycle | `setup`, `buildStart`, `buildEnd`, `dispose` |
| Content hooks | `onConfigResolved`, `onContentLoaded`, `onPostParsed`, `onPostProcessed`, `onManifestCreated` |
| Public Location | `resolveContentLocations` |
| Legacy/compat build hooks | `onBuildStart`, `onBuildEnd` |
| Pipeline | `remarkPlugins`, `rehypePlugins`, `extendMarkdownPipeline`, `extendHtmlPipeline` |
| Graph | `extendContentGraph` |
| Diagnostics | `addDiagnostics` |
| Rendering | `renderers` |
| Browser integration | `assets`, `clientEntries` |
| HTTP integration | `endpoints` |
| SEO | `seo` |

### 3-1. Dependency / capability

```ts
definePlugin({
  name: "consumer",
  provides: ["example.output"],
  requires: ["content.graph"],
  optional: ["example.optional"],
});
```

- `provides`: capabilities this plugin offers
- `requires`: mandatory capabilities
- `optional`: capabilities used when present

The resolver places providers before consumers. Missing requirements, duplicate providers, and cycles are configuration errors. Unrelated plugins keep their input order as much as possible. `order` only sets a base ordering before dependency resolution; prefer the capability contract over raw `order` when dependencies exist.

### 3-2. validateOptions

TypeScript types do not fully guarantee runtime values after the config file executes. Plugins that need it provide `validateOptions`. A validator must **have no side effects** — no filesystem scanning, no builds, no cache writes. Return problems as structured issues so config validation can display them together.

### 3-3. Plugin context

```ts
type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
  cache: PluginCache;
  logger: Logger;
  tracer: Tracer;
};
```

Depending on the hook, `slug`, `markdown`, `content`, `manifest`, `entries`, and location input are added. Prefer receiving framework services from the context over creating global singletons.

### 3-4. Lifecycle

`setup`, `buildStart`, `buildEnd`, `dispose`, plus content-pipeline hooks. `dispose` frees acquired resources. Hook errors propagate in a way that identifies the plugin name and hook without losing the original cause. Execution follows the resolved plugin order.

### 3-5. Content pipeline stages

```text
config resolved
→ content loaded
→ public location resolved
→ post parsed
→ post processed
→ content graph
→ manifest created
```

Use only the hooks you actually need. Do not reconstruct later-stage information in earlier stages.

### 3-6. Markdown / HTML pipeline

Simple remark/rehype plugins are declared as arrays.

```ts
definePlugin({
  name: "example",
  remarkPlugins: [remarkExample],
  rehypePlugins: [rehypeExample],
});
```

To compose the pipeline itself:

```ts
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

Semantic Markdown/HTML transformation belongs in the plugin; do not bring AST processing into application components.

### 3-7. Content graph and public locations

`extendContentGraph` extends the graph before or after construction within the framework contract. For backlinks or graph features, do not rescan the filesystem yourself — use the existing Content Graph / Manifest contract.

`resolveContentLocations` replaces the public location of content entries. Core first applies the default resolver (`resolveDefaultContentLocation`: `index` → `/`, otherwise `/{slug}`), then runs each plugin hook in resolved plugin order, and keeps the result as `ContentPublicLocation` in the manifest / graph / pipeline. URL strategy is the plugin's responsibility. An unresolved location is an **explicit error**, not a slug fallback.

### 3-8. Renderers

`renderers` transform a content target into plugin-specific HTML. The context includes `kind`, `path`, `raw`, `label`, `url`, `embed`, plus the usual `PluginContext`. Return `null` when the target is not yours so other renderers are tried.

### 3-9. Assets

Put plugin stylesheets inside the plugin package and declare the module specifier in `assets`.

```ts
assets: [{
  pluginName: "example",
  kind: "style",
  moduleSpecifier: "@riebeckite/plugin-example/style.css",
}]
```

Do not copy plugin CSS into `apps/web`, and never reference `/node_modules` directly from the browser.

**In-site plugins**: a plugin does not have to be published. Define it inside the site with `definePlugin` and pass it to `plugins`. Resolution order, dependency resolution, pipeline hooks, and diagnostics use the same contract as a package.

```ts
// site/extensions/local-plugin.ts
return definePlugin({
  name: "site-local",
  assets: [{
    pluginName: "site-local",
    kind: "style",
    moduleSpecifier: "/extensions/plugin.css",
  }],
});
```

For unpublished plugins, `createStyleAsset()` (which generates `@riebeckite/plugin-<name>/style.css`) is not available. Explicitly provide a module specifier the host bundler can resolve.

### 3-10. CSS hooks

Plugin CSS lives in the plugin package and reaches the browser through `assets`. When a plugin renders an independent, reusable feature, put a stable root hook on the outermost element.

- Name plugin/feature hooks `rr-<feature>` (`rr-search`, `rr-callout`, `rr-query`, `rr-code`, …). Below the root, use the BEM shape `rr-<feature>`, `rr-<feature>__element`, `rr-<feature>--modifier`.
- Keep existing classes on the same element. `rr-` hooks are additions, so existing selectors and site overrides keep working.
- Do not put plugin output in the `rb-` namespace. `rb-*` classes and `--rb-*` tokens belong to the framework's structural hooks and semantic design tokens. Plugin-specific tokens are `--rr-*`, with `--rb-*` as fallback.
- `rr-<feature>__*` and `rr-<feature>--*` are internal implementation details. Document only the descendants you want themes to style.

### 3-11. Client entries

Use `clientEntries` only when browser initialization is required.

```ts
clientEntries: [{
  pluginName: "example",
  moduleSpecifier: "@riebeckite/plugin-example/client",
  exportName: "initExample",
  publicConfig: { selector: ".example" },
}]
```

Do not add client JavaScript to plugins that work purely at SSR/build time. `publicConfig` is passed to the client initializer and recorded in the manifest so static hosts can use it. Plugin `options` are not passed to the client automatically. Never register tokens, credentials, or private service URLs as public config.

### 3-12. Endpoints and SEO

HTTP endpoints use the `endpoints` contract. Do not embed route-framework implementations in the plugin itself; the integration connects the endpoint contract to the host router. `seo` lets a plugin participate in SEO processing (metadata/feeds). Do not reimplement plugin-specific SEO logic in application routes.

### 3-13. Diagnostics

```ts
addDiagnostics(context) {
  return [{
    // follows the Diagnostic contract
  }];
}
```

Return diagnostics as structured data whenever possible. Use Diagnostics / Logger instead of `console.log` from the plugin.

### 3-14. Plugin cache

`context.cache` is a **build-time cache** isolated per plugin.

- Store only regenerable values
- JSON-serializable values
- Do not reference across plugin namespaces
- Switch compatibility with `cacheVersion`
- Treat corrupt caches as safe misses
- Writes are atomic
- Do not use it as a runtime database

It is not Cloudflare Workers persistent storage.

### 3-15. Logger / tracer

```ts
context.logger.info("...");
await context.tracer.span("plugin.example.work", { plugin: "example" }, async () => {
  // work
});
```

The profiler uses structured traces; plugins do not need their own stopwatch/reporting system.

## 4. Packaging for distribution

Use `packages/plugins/backlinks` as a template. Recommended layout:

```text
packages/plugins/example/
├─ index.ts          ← factory calling definePlugin, re-exports public parts
├─ components/       ← components (if any)
├─ client.ts         ← only when needed
├─ src/
│  ├─ remark.ts
│  ├─ rehype.ts
│  ├─ renderer.ts
│  └─ types.ts
├─ style.css         ← only when needed
├─ package.json
├─ README_ja.md
└─ README.md
```

A distributed plugin depends only on `@riebeckite/core` and declares its own subpaths (`./client`, `./components`, `./style.css`) in `exports`. Never import `@riebeckite/core/src/**` or reference monorepo paths. For the package surface and current constraints, see "Public packages and import paths" in [Framework Reference](./framework-reference.md).

In NodeNext/ESM packages, keep imports resolvable by Node after the build. Do not rely on the development TypeScript loader accidentally resolving extensionless imports.

## 5. Verify

```sh
npx riebeckite check           # validate config and plugin resolution
npx riebeckite doctor          # health check
npx riebeckite inspect plugins # list resolved plugins
npx riebeckite build           # confirm it appears in the output
```

If a plugin does not resolve, start with `check` for capability or import errors. Also ask whether you really need a plugin — perhaps configuration or an app implementation suffices.

## Further reading

- [Your First Plugin](./plugin-tutorial.md) — a step-by-step introduction
- [Plugin System](./plugin-system.md) — all extension points in detail
- [Content System](./content-system.md) — Manifest / Graph / pipeline contracts
- [Architecture](./architecture.md) — responsibilities of Core / Plugin / Integration / Theme / App
- [Framework Reference](./framework-reference.md) — public APIs like `definePlugin`