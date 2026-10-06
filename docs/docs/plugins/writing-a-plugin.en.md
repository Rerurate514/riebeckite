# Writing Your First Plugin

Plugins add **functionality** to Riebeckite: Markdown or HTML transformation, client-side behavior, standalone pages, SEO, diagnostics, and more. Use a Theme when you only want to change appearance.

Plugins are trusted application code. When a Plugin emits HTML, page bodies, head tags, client entries, endpoints, or generated files, it is responsible for escaping untrusted text and validating URLs for the exact context. Riebeckite preserves raw Markdown HTML and does not sanitize Plugin-generated HTML. See [Security model](../security.en.md).

When a Plugin generates UI, follow the [accessibility contract](../accessibility.en.md): prefer semantic HTML, use real links and buttons, keep keyboard operation and focus management working, and synchronize ARIA state only when ARIA is needed.

A Plugin can live directly inside a site; it does not have to be published as a package.

## 1. Create a minimal Plugin

Create Plugins with `definePlugin` from `@riebeckite/core`. A Plugin with only a `name` is the smallest valid form. Plugin factories can accept typed options when configuration is needed.

## 2. Add CSS

Declare Plugin-specific stylesheets through `assets`. Do not copy CSS into the site manually or reference `/node_modules` directly from the browser.

Use a stable root hook such as `rr-<feature>` on rendered output. See [Plugin API](../reference/plugin-api.en.md) for the CSS contract.

## 3. Transform Markdown or HTML

Semantic Markdown transformation belongs to Plugins. Simple remark Plugins can be declared as an array. Use `extendMarkdownPipeline` / `extendHtmlPipeline` when you need finer control of the processing pipeline.

For dependencies, lifecycle hooks, renderers, endpoints, and other extension points, see [Plugin API](../reference/plugin-api.en.md).

## 4. Add a standalone page when needed

Use `pageTypes` for standalone pages. A Page Type returns the HTML body, while the site's shared catch-all route applies the document frame and Theme.

Do not add Plugin-specific HonoX routes. Content embeds such as Canvas, Bases, and Excalidraw remain `renderers`.

See [Page System](../framework/page-system.en.md) for ownership, path resolution, and SSG behavior.

## 5. Package it when needed

Once a site-local Plugin works, it can be turned into a package. External Plugins should depend only on `@riebeckite/core`, declare their own subpaths through `exports`, and must not import `@riebeckite/core/src/**` or monorepo-internal paths.

## 6. Validate it

Use the repository's checks and tests relevant to the Plugin. `check`, `doctor`, and `inspect` are read-only diagnostics. Before creating a Plugin, also confirm that the requirement cannot be handled more simply by configuration or app-level code.

## Providing UI or output

A Plugin can add UI in several ways. Pick the smallest one that fits; these are alternatives, not a progression, and a Plugin may combine them.

```text
Want to add UI or output?
│
├─ Change the Markdown or HTML itself
│    └─ remark / rehype pipeline
│
├─ Render an embedded content target
│    └─ renderers
│
├─ Add a standalone page
│    └─ pageTypes
│
├─ Appear in the article layout automatically
│    └─ HTML fragment + body Slot
│
├─ Let the site author place it
│    └─ Hono JSX component export
│
└─ Enhance the page in the browser
     └─ clientEntries (plus a site-owned Island when needed)
```

### Automatic placement with a body Slot

Use a body Slot when the output belongs at a standard position and should appear as soon as the Plugin is enabled. Publish an HTML fragment; the Site decides whether and where to render the slot.

```ts
import { appendContentBodySlot } from "@riebeckite/core";

appendContentBodySlot(entry, "article.footer", "<section>...</section>");
```

A Plugin author picks a standard slot such as `article.footer`, or asks the Site to render a custom name. A custom slot renders nothing until the Site renders it. See [Body slots](../reference/plugin-api.en.md#body-slots) for the slot list and ordering.

### Manual placement with a Hono JSX component

Export an ordinary Hono JSX component when the Site author should choose where the UI goes. There is no component registry and no Plugin-specific component API: the component is imported and composed like any other.

Declare a `./components` subpath in the package `exports` and keep the component module's default export, then optionally re-export it by name from the package root. Existing Plugins follow this shape:

```ts
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { SearchBar } from "@riebeckite/plugin-search";
import BacklinksDefault from "@riebeckite/plugin-backlinks/components";
```

`color-mode` fits the root-only shape: it exports `ColorModeScript` and `ColorModeToggle` from the package root and has no `./components` subpath. Use the names each package README documents.

### HTML fragment or component?

The deciding question is **who places it**:

- **HTML fragment + Slot** — the Plugin writes to a known standard position, and the Site opts into rendering that slot.
- **Hono JSX component** — the Site author places it anywhere in the component tree.

Neither is newer or better. A string is natural when the Plugin already produces HTML (for example from a HAST transform); a component is natural when the Site should control props and placement. `backlinks` and `local-graph` use both: they export a component and also append their rendered output to `article.footer` in `onManifestCreated`. That is a common pattern, not a requirement.

### Browser enhancement and Islands

Plugins do not own `app/islands/`, and Riebeckite has no Plugin Island registry. For browser behavior, either contribute a `clientEntries` initializer that enhances the server-rendered DOM, or let the Site wrap the Plugin's component in its own HonoX Island when component state is needed. `garden-explorer` is a specific case that combines a Page Type with a client entry; do not treat it as a required pattern. See [Client entries](../reference/plugin-api.en.md#assets-and-client-entries).

## Related

- [Plugin API](../reference/plugin-api.en.md)
- [Plugin System](../framework/plugin-system.en.md)
- [Customizing Your Site](./../guides/customizing-your-site.en.md)
- [Architecture](../framework/architecture.en.md)
- [Writing Your First Theme](../themes/writing-a-theme.en.md)
