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

## Build a directive Plugin end to end

This walkthrough builds a site-local Plugin that turns a `:::tip[Title]` container directive into an `<aside>`, adds a stylesheet, and tests the result. It uses only public APIs: `definePlugin` and the Markdown pipeline from `@riebeckite/core`, `unist-util-visit`, and the `remark-directive` nodes the pipeline already produces.

### Step 1: Create the Plugin

Create `extensions/tip-plugin.ts`:

```ts
import { definePlugin } from "@riebeckite/core";
import type { Parent, Root } from "mdast";
import { visit } from "unist-util-visit";

type ContainerDirective = {
  type: "containerDirective";
  name: string;
  children: Parent["children"];
  data?: Record<string, unknown>;
};

function remarkTip() {
  return (tree: Root) => {
    visit(tree, "containerDirective", (node, index, parent) => {
      const directive = node as unknown as ContainerDirective;
      if (directive.name !== "tip") return;
      if (parent === undefined || index === undefined) return;

      const [first, ...rest] = directive.children;
      const hasLabel =
        first?.type === "paragraph" &&
        (first as { data?: { directiveLabel?: boolean } }).data
          ?.directiveLabel === true;
      const titleChildren = hasLabel ? (first as Parent).children : [];
      const bodyChildren = hasLabel ? rest : directive.children;

      directive.data = {
        ...directive.data,
        hName: "aside",
        hProperties: { className: ["rr-tip"] },
      };
      directive.children = [
        {
          type: "paragraph",
          data: {
            hName: "p",
            hProperties: { className: ["rr-tip__title"] },
          },
          children: titleChildren,
        },
        ...bodyChildren,
      ];
    });
  };
}

export function tipPlugin() {
  return definePlugin({
    name: "tip",
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkTip);
    },
    assets: [
      {
        pluginName: "tip",
        kind: "style",
        moduleSpecifier: "/extensions/plugin.css",
      },
    ],
  });
}
```

The Markdown pipeline runs `remark-directive` before Plugin transformers, so `:::tip` arrives as a `containerDirective` node. Setting `data.hName` and `data.hProperties` makes the HTML step emit `<aside class="rr-tip">` instead of a generic wrapper, and the directive label becomes the title paragraph.

### Step 2: Add the stylesheet

Create `extensions/plugin.css`:

```css
.rr-tip {
  border-left: 2px solid var(--rb-color-accent);
  padding: 0.75rem 1rem;
}

.rr-tip__title {
  margin-block: 0 0.25rem;
  font-weight: 600;
}
```

`rr-tip` is the stable root hook a Theme can target. Use the `--rb-*` tokens rather than hard-coded colors so Theme switching keeps working.

### Step 3: Register the Plugin

```ts
// riebeckite.config.ts
import { defineConfig } from "@riebeckite/core";
import { tipPlugin } from "./extensions/tip-plugin";

export default defineConfig({
  plugins: [tipPlugin()],
});
```

### Step 4: Test the output

Run the Markdown pipeline directly, without building the site:

```ts
// extensions/tip-plugin.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { tipPlugin } from "./tip-plugin.ts";

test("renders :::tip as an aside with a title", async () => {
  const pipeline = new Pipeline(new Map(), new Map(), undefined, {
    plugins: [tipPlugin()],
  });

  const { html } = await pipeline.execute(
    ":::tip[Heads up]\nSave often.\n:::",
  );

  assert.match(html, /<aside class="rr-tip">/);
  assert.match(html, /<p class="rr-tip__title">Heads up<\/p>/);
  assert.match(html, /Save often\./);
});
```

Run it with `node --test`. Because the Plugin only extends the Markdown pipeline, the test needs no filesystem access and no site build.

## 4. Add a standalone page when needed

Use `pageTypes` for standalone pages. A Page Type returns the HTML body, while the site's shared catch-all route applies the document frame and Theme. When a page lists entries, read `manifest.discoverableEntries`; reserve `manifest.publicEntries` (which includes `unlisted`) and `manifest.entries` (which includes `draft` and `scheduled`) for the cases that genuinely need them. See [Manifest collections and publication safety](../reference/plugin-api.en.md#manifest-collections-and-publication-safety).

Do not add Plugin-specific HonoX routes. Content embeds such as Canvas, Bases, and Excalidraw remain `renderers`.

See [Page System](../framework/page-system.en.md) for ownership, path resolution, and SSG behavior.

## 5. Package it when needed

Once a site-local Plugin works, it can be turned into a package. External Plugins should depend only on `@riebeckite/core`, declare their own subpaths through `exports`, and must not import `@riebeckite/core/src/**` or monorepo-internal paths. For the package shape and a build that ships ESM plus type declarations, see [Distributing a Plugin outside this repository](../reference/plugin-api.en.md#distributing-a-plugin-outside-this-repository). Because `createStyleAsset()` and `createClientEntry()` build `@riebeckite/plugin-<name>/...` specifiers, a package under any other name declares `assets` and `clientEntries` with explicit `moduleSpecifier` values.

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
