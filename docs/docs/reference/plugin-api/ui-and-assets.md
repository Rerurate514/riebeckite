---
date: 2026-10-06
title: UI, assets, and runtime
sidebar:
  label: UI, assets, and runtime
  order: 30
---
# UI, assets, and runtime

## UI components

Plugins may export a `PluginComponent<Props>` and a `PluginDataHelper<Input, Model>` in addition to their factory. Data helpers receive narrow inputs such as `PublicContentView` and return typed models; components accept readonly typed props and return rendered output. The Site composes these components in its own TSX, choosing whether, where, and how often to render each one.

Typical plugin export shape:

```ts
// index.ts
export function example() {
  return definePlugin({
    name: "example",
    // ... factory hooks, assets, clientEntries, etc.
  });
}

export { MyComponent, getMyData };
```

Or more conventionally, a plugin may place its component and helper under `./components/`:

```text
packages/plugins/example/
├─ index.ts
├─ components/
│  ├─ my-component.tsx   // exports <MyComponent /> and getMyData
│  └─ types.ts
├─ style.css
└─ client.ts
```

The Site then imports and renders:

```tsx
import { getMyData } from "@riebeckite/plugin-example";
import { MyComponent } from "@riebeckite/plugin-example/components";

const model = getMyData({ view, frontmatter: entry.frontmatter });
<MyComponent model={model} />
```

Components may also optionally export internal CSS and a client entry, registered through the integration as usual. Existing asset and client-entry registration remains factory-owned; importing a component alone neither registers CSS/client runtime nor enables a plugin capability.

### Placement during SPA navigation

A component renders for the server request; it does not own its placement or
choose when it is replaced in the browser. The Site places it in
`main#main-content` when it belongs to page content. When shell output depends
on the current URL, language, or page data, the Site wraps it in a stable,
unique `data-spa-region` on every route that can navigate between it:

```tsx
<aside data-spa-region="docs-navigation">
  <DocsSidebar />
</aside>
```

Client behavior follows DOM lifetime, not component ownership. A client entry
for content in `main` uses the default `page` scope. A client entry for a
replaceable shell region uses `app` scope and reinitializes after
`spa:navigation`, or uses event delegation. Plugins must not assume that
their component is placed in either location.

HonoX primitives such as `Article`, `ArticleHeader`, `ArticleContent`, `ArticleBody`, `ArticleFooter`, `Sidebar`, and `ThemeRoot` remain as semantic primitives for article structure and layout. Components belong in plugin packages and are exported from their public entry points with their model types and helpers. Site TSX belongs under the application's `app/`. HonoX owns rendering primitives only; it does not collect plugin components or select their order.

```tsx
// Minimal UI composition in a site route
import { getBacklinks } from "@riebeckite/plugin-backlinks";
import { MyComponent } from "@riebeckite/plugin-example";

const view = createPublicContentView(manifest);
const entry = view.findRoutableBySlug(slug);
const backlinks = await getBacklinks({ view, slug });
<article>
  <MyComponent backlinks={backlinks} />
</article>
```

## Markdown components

Use `components` when a plugin renders a self-contained UI from ordinary
Markdown. A component renders during the Markdown AST pass. Its browser module
is loaded only when the rendered page contains that interactive component.

```tsx
import { definePluginComponent } from "@riebeckite/core";
import { renderToString } from "hono/jsx/dom/server";

components: [
  definePluginComponent({
    name: "Counter",
    parseProps: (props) => ({ initial: Number(props.initial ?? 0) }),
    render: (props) => renderToString(<Counter {...props} />),
    client: { moduleSpecifier: "@example/plugin/counter" },
  }),
];
```

Write it in Markdown without enabling MDX:

````md
```riebeckite-component Counter
initial: 3
```
````

Props must be a YAML mapping and are serialized as JSON-safe public data. Give
each component a globally unique name; duplicate names fail during plugin
resolution. Omit `client` for static components. Interactive components must
export the default Hono JSX component (or set `exportName`) and hydrate through
the generated client entry. `clientEntries` remain appropriate for delegated
events, widgets that manage arbitrary DOM, and page-level behavior.

The fence is an ordinary fenced code block handled before Markdown is converted
to HTML, so it works with plain Markdown and does not require MDX. MDX remains a
separate content format for pages that need full JSX. These components are not
HonoX islands: HonoX scans only `app/islands`, while Riebeckite's generated
client finds component markers and loads the declared module through Vite. Keep
`__importing_islands = true` in the renderer so HonoX emits its client bundle,
and export the client build from the plugin package manifest as you would for a
`clientEntries` module. The fence stays deliberately small instead of turning
every Markdown page into MDX.

MDX pages use the same registry rather than a second component implementation.
The registered components are passed into the MDX renderer as JSX components:

```mdx
<Counter initial={3} />
```

A `components` option passed to `mdx({ components })` overrides a Plugin
component with the same name for those pages. Props cross the hydration
boundary, so they must be JSON-safe; pass content through an explicit string
prop instead of JSX children. `parseProps` still validates the values, and
only interactive components hydrate. MDX renders the component directly, so
its `render` output is trusted plugin code and does not pass through the
Markdown sanitizer; keep untrusted content in props and escape it in the
component.

`parseProps` is the validation boundary for values that come from content. The
component's server output passes through the normal Markdown sanitizer, and
props are escaped and validated before they reach an attribute. Components
change processed Markdown, so include them in the plugin's
`processedContentCache` contract when persistent caching is enabled; otherwise
caching is bypassed for that plugin instead of serving stale HTML. Bump the
contract's `version` when component rendering changes.

## Assets and client entries

[[glossary/plugin|Plugin]] CSS remains in the plugin package and is declared through
`assets`. Browser initialization is declared through `clientEntries`
only when browser JavaScript is genuinely required. Do not copy plugin
CSS into `website` or expose `/node_modules` directly.

Use the Core helpers to register the plugin name and the package exports
together. The module specifier is explicit, so the same API works for official,
third-party, and site-local packages:

``` ts
import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";

export function example() {
  return definePlugin({
    name: "example",
    assets: [createStyleAsset("example", "@riebeckite/plugin-example/style.css")],
    clientEntries: [
      createClientEntry(
        "example",
        "@riebeckite/plugin-example/client",
        "initExample",
        { selector: ".example" },
      ),
    ],
  });
}
```

The same declarations written out explicitly:

``` ts
assets: [
  {
    pluginName: "example",
    kind: "style",
    moduleSpecifier: "@riebeckite/plugin-example/style.css",
  },
]
```

```mermaid
flowchart LR
    Plugin["Plugin package"]
    CSS["style.css"]
    Asset["assets"]
    Integration["Integration"]
    Browser["Browser"]

    Plugin --> CSS
    CSS --> Asset
    Asset --> Integration
    Integration --> Browser
```

The module specifier is resolved by the host bundler. It can be a subpath exposed
by the plugin package's `exports` map, a site-local absolute path (e.g.
`/extensions/plugin.css`), or a path the bundler can resolve. For example, a
third-party package can use `createStyleAsset("example", "@example/plugin/style.css")`
and `createClientEntry("example", "@example/plugin/client", ...)`.

Omit `assets` or `clientEntries` when the plugin does not need them. The client
entry's export name is optional and defaults to the module default export. Its
third argument is an optional export name passed to that initializer. Its
fourth argument is an optional JSON value passed to that initializer. It is the
only plugin configuration exposed to browser code (and recorded in the
manifest for static hosts); `options` are never copied to the client. Register
only deliberately public values—never tokens, credentials, or private service
URLs. An initializer without public config continues to receive no arguments.

Client-owned UI should be written in Hono JSX and mounted into its host with
`createRoot()` from `hono/jsx/dom/client`. Keep browser-only work such as focus,
measurement, pointer capture, and media playback in the initializer. When an
entry is needed only on pages that contain a marker, pass a presence selector as
the seventh argument to `createClientEntry()` so the chunk is not loaded on
other pages.

A client entry can also be declared explicitly:

``` ts
clientEntries: [
  {
    pluginName: "example",
    moduleSpecifier: "@riebeckite/plugin-example/client",
    exportName: "initExample",
    publicConfig: { selector: ".example" },
  },
]
```

```mermaid
flowchart LR
    Plugin["Plugin"]
    Entry["Client entry"]
    Build["Integration"]
    Browser["Browser initializer"]

    Plugin --> Entry
    Entry --> Build
    Build --> Browser
```

Do not add client JavaScript to a plugin that completes entirely at SSR or
build time.

## CSS hooks

Plugin CSS stays in the plugin package and reaches the browser through
`assets`. When a plugin renders a distinct, reusable feature, put a stable
root hook on its outermost element:

- Name plugin/feature hooks `rr-<feature>` (`rr-search`, `rr-callout`,
  `rr-query`, `rr-code`, ...). Use BEM structure under the root:
  `rr-<feature>`, `rr-<feature>__element`, `rr-<feature>--modifier`.
- New plugins emit only `rr-*` hooks; plugin CSS and site themes should target
  the `rr-` hook. Some built-in plugins still expose documented `rb-*` roots
  for compatibility, so target the root each plugin documents.
- Do not put new plugin output in the `rb-` namespace. `rb-*` classes and
  `--rb-*` tokens belong to framework structural hooks and semantic design
  tokens. Plugin-local tokens use `--rr-*` and may fall back to `--rb-*`.
- `rr-<feature>__*` and `rr-<feature>--*` are internal implementation
  details. Document any descendant a theme is expected to target.

| Namespace | Use |
| --- | --- |
| `rb-*` | Framework structural hooks |
| `--rb-*` | Framework semantic design tokens |
| `rr-*` | Plugin / feature hooks |
| `--rr-*` | Plugin-local tokens |

Themes target these root hooks. Plugin default CSS loads before theme CSS, so
a theme restyles a feature without editing the plugin. See
[Stable CSS hooks](../../framework/theme-system/css.md#stable-css-hooks-and-the-cascade).

For dark mode, consume the semantic `--rb-*` tokens: they resolve correctly in
light, explicit dark, and system dark. Only when a plugin must branch on the
mode itself (for example to invert a build-time asset) should it scope the
override to the theme root so it works both at the document root and inside an
embedded `.rb-theme-root`:
`:is(:root, .rb-theme-root)[data-rb-mode="dark"] <hook>` and, for system dark,
`@media (prefers-color-scheme: dark) { :is(:root, .rb-theme-root):not([data-rb-mode]) <hook> { ... } }`.
Do not key a dark override on `html[data-rb-mode="dark"]` or
`:root:not([data-rb-mode])` alone; those miss embedded theme roots. The
framework never adds a `.dark` class, so do not depend on one.

## Endpoints and SEO

`endpoints` lets an Integration connect reusable plugin HTTP behavior to
the host router without embedding HonoX-specific routing in Core. `seo`
lets plugins participate in metadata/feed-related behavior through the
framework contract.

```mermaid
flowchart LR
    Plugin["Plugin"]
    Contract["Endpoint contract"]
    Integration["Integration"]
    Router["Host router"]

    Plugin --> Contract
    Contract --> Integration
    Integration --> Router
```

Do not embed a specific router implementation (such as HonoX) in the plugin
itself; the integration connects the endpoint contract to the host router.
Do not reimplement plugin-specific SEO logic in application routes.

Use `defineEndpoint` to declare an endpoint. Pass `cacheControl` only when the
response is safe to cache; the helper applies the header without duplicating
response plumbing.

``` ts
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

``` ts
addDiagnostics(context) {
  return [
    {
      // Diagnostic contract
    },
  ];
}
```

Return diagnostics as structured data rather than calling `console.log(...)`
for CLI messages; use diagnostics or the logger.

## Plugin Cache

`context.cache` is a plugin-scoped, regenerable **build-time** cache.

- Store only regenerable, JSON-serializable values.
- Reference only your own plugin namespace.
- Use `cacheVersion` when compatibility changes.
- Treat a corrupt cache as a safe miss.
- Writes are atomic.

```mermaid
flowchart TD
    Plugin["Plugin"]
    Cache["Plugin cache"]
    Valid{"Usable?"}
    Plugin --> Cache
    Cache --> Valid
    Valid -->|"yes"| Reuse["Reuse"]
    Valid -->|"no"| Generate["Regenerate"]
```

It is not a database or Cloudflare Workers runtime storage.

## Observability (Logger / Tracer)

Use `context.logger` and `context.tracer`:

``` ts
context.logger.info("...");
await context.tracer.span("plugin.example.work", { plugin: "example" }, async () => {
  // work
});
```

The [[glossary/profiler|Profiler]] consumes structured tracing, so plugins do not need their own
timing/reporting system.
