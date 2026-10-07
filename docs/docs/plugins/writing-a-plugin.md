# Writing Your First Plugin

Plugins add **functionality** to Riebeckite: Markdown or HTML transformation, client-side behavior, standalone pages, SEO, diagnostics, and more. Use a Theme when you only want to change appearance.

Plugins are trusted application code. When a Plugin emits HTML, page bodies, head tags, client entries, endpoints, or generated files, it is responsible for escaping untrusted text and validating URLs for the exact context. Riebeckite preserves raw Markdown HTML and does not sanitize Plugin-generated HTML. See [Security model](../security.md).

When a Plugin generates UI, follow the [accessibility contract](../accessibility.md): prefer semantic HTML, use real links and buttons, keep keyboard operation and focus management working, and synchronize ARIA state only when ARIA is needed.

A Plugin can live directly inside a site; it does not have to be published as a package.

## The path

This page follows one continuous path, from an empty folder to a distributable Plugin:

```text
Create a minimal Plugin (1-2)
   ↓
Transform Markdown or HTML (3, Hands-on)
   ↓
Test the output (Testing a plugin)
   ↓
Package it (5)
   ↓
Verify it as an external package (tests/plugin-dx / test:plugin-dx:external)
```

If the Plugin only runs inside one site, you can stop before packaging. Only distributed Plugin packages need the packaging and external-verification steps. For the exact contract of each extension point, see the [Plugin API](../reference/plugin-api.md).

## 1. Create a minimal Plugin

Create Plugins with `definePlugin` from `@riebeckite/core`. A Plugin with only a `name` is the smallest valid form. Plugin factories can accept typed options when configuration is needed.

## 2. Add CSS

Declare Plugin-specific stylesheets through `assets`. Do not copy CSS into the site manually or reference `/node_modules` directly from the browser.

Use a stable root hook such as `rr-<feature>` on rendered output. See [Plugin API](../reference/plugin-api.md) for the CSS contract.

## 3. Transform Markdown or HTML

Semantic Markdown transformation belongs to Plugins. Simple remark Plugins can be declared as an array. Use `extendMarkdownPipeline` / `extendHtmlPipeline` when you need finer control of the processing pipeline.

`remarkPlugins`, `rehypePlugins`, and `extendMarkdownPipeline` all join the same pipeline. Riebeckite runs `remark-parse`, `remark-directive`, `remark-gfm`, and the other base plugins before your Plugin, so directive syntax such as `:::tip` and GFM already arrive as AST nodes. You do not install or register those yourself.

For dependencies, lifecycle hooks, renderers, endpoints, and other extension points, see [Plugin API](../reference/plugin-api.md).

Plugins that participate in content transformation should also declare `processedContentCache`. Without it a plugin still works, but it disables the site's processed-content cache so Markdown is reprocessed on every build. Use `{ version: "1", dependencyMode: "none" }` for a standalone transform and `tracked` when the output depends on other plugins (reserve `unsafe` for what cannot be tracked accurately).

## Hands-on: Build a directive plugin from start to finish

In this section, you will build a small plugin that turns the following Markdown into a custom Tip block:

```md id="bq0v5x"
:::tip[Heads up]
Save often.
:::
```

The generated HTML will look like this:

```html id="xmx7yi"
<aside class="rr-tip">
  <p class="rr-tip__title">Heads up</p>
  <p>Save often.</p>
</aside>
```

We will build it in four steps:

1. Create a plugin that transforms the Markdown
2. Add CSS for the Tip block
3. Register the plugin in `riebeckite.config.ts`
4. Test the generated HTML

### Step 1: Create the plugin

Create `extensions/tip-plugin.ts`.

First, let's look at the entry point of the plugin:

```ts id="szeg4x"
import { definePlugin } from "@riebeckite/core";

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

This plugin does two things:

- adds a Markdown transformation called `remarkTip`
- loads `/extensions/plugin.css` as a stylesheet

`remarkTip` is the part that actually turns `:::tip` into an `<aside>` element.

#### Find `:::tip`

Add the imports and a small type for the directive node:

```ts id="nv29am"
import { definePlugin } from "@riebeckite/core";
import type { Parent, Root } from "mdast";
import { visit } from "unist-util-visit";

type ContainerDirective = {
  type: "containerDirective";
  name: string;
  children: Parent["children"];
  data?: Record<string, unknown>;
};
```

This example uses the `mdast` types for AST nodes and `unist-util-visit` to walk the tree. Add them to your own package's dependencies (they are not imported from `@riebeckite/core`).

In Riebeckite's Markdown pipeline, syntax such as `:::tip` has already been parsed by `remark-directive` before your plugin runs.

That means your plugin does not need to parse the Markdown text itself. It receives a `containerDirective` node instead.

Use `unist-util-visit` to find those nodes:

```ts id="tvvs30"
function remarkTip() {
  return (tree: Root) => {
    visit(tree, "containerDirective", (node) => {
      const directive = node as unknown as ContainerDirective;

      if (directive.name !== "tip") return;

      // Transform :::tip here.
    });
  };
}
```

A `containerDirective` can represent directives other than `tip`, so:

```ts id="4svv7a"
if (directive.name !== "tip") return;
```

makes sure that this plugin only handles `:::tip`.

#### Turn it into an `<aside>`

Next, tell the Markdown renderer which HTML element to generate:

```ts id="ap4hjz"
directive.data = {
  ...directive.data,
  hName: "aside",
  hProperties: {
    className: ["rr-tip"],
  },
};
```

Here:

```ts id="l7dbze"
hName: "aside"
```

selects the HTML element, while:

```ts id="nupj0v"
className: ["rr-tip"]
```

adds its CSS class.

As a result:

```md id="nkrh1g"
:::tip
Save often.
:::
```

will produce HTML similar to:

```html id="zvbjza"
<aside class="rr-tip">
  <p>Save often.</p>
</aside>
```

#### Turn `[Heads up]` into the title

Now let's handle the label in:

```md id="u0ykxd"
:::tip[Heads up]
Save often.
:::
```

`remark-directive` provides this label as the first child of the directive.

First, check whether the first child is a directive label:

```ts id="3q5kbw"
const [first, ...rest] = directive.children;

const hasLabel =
  first?.type === "paragraph" &&
  (first as { data?: { directiveLabel?: boolean } }).data
    ?.directiveLabel === true;
```

If a label exists, split the directive into:

- the first child → title
- the remaining children → body

```ts id="s5d3wu"
const titleChildren = hasLabel
  ? (first as Parent).children
  : [];

const bodyChildren = hasLabel
  ? rest
  : directive.children;
```

Then add the title as:

```html id="blz7w7"
<p class="rr-tip__title">
```

by replacing the directive's children:

```ts id="uknv3s"
directive.children = [
  {
    type: "paragraph",
    data: {
      hName: "p",
      hProperties: {
        className: ["rr-tip__title"],
      },
    },
    children: titleChildren,
  },
  ...bodyChildren,
];
```

Now:

```md id="ez1dfb"
:::tip[Heads up]
Save often.
:::
```

produces:

```html id="4jgvpj"
<aside class="rr-tip">
  <p class="rr-tip__title">Heads up</p>
  <p>Save often.</p>
</aside>
```

#### Complete plugin

Putting everything together, `extensions/tip-plugin.ts` looks like this:

```ts id="7q1nxh"
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
    visit(tree, "containerDirective", (node) => {
      const directive = node as unknown as ContainerDirective;

      if (directive.name !== "tip") return;

      const [first, ...rest] = directive.children;

      const hasLabel =
        first?.type === "paragraph" &&
        (first as { data?: { directiveLabel?: boolean } }).data
          ?.directiveLabel === true;

      const titleChildren = hasLabel
        ? (first as Parent).children
        : [];

      const bodyChildren = hasLabel
        ? rest
        : directive.children;

      directive.data = {
        ...directive.data,
        hName: "aside",
        hProperties: {
          className: ["rr-tip"],
        },
      };

      directive.children = [
        {
          type: "paragraph",
          data: {
            hName: "p",
            hProperties: {
              className: ["rr-tip__title"],
            },
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

    processedContentCache: {
      version: "1",
      dependencyMode: "none",
    },
  });
}
```

> `extendMarkdownPipeline` is a low-level extension point that gives you direct access to the Markdown AST. We use it here because the plugin needs to change the HTML structure generated for the directive.

### Step 2: Add the stylesheet

Create `extensions/plugin.css`:

```css id="nw1i6n"
.rr-tip {
  border-left: 2px solid var(--rb-color-accent);
  padding: 0.75rem 1rem;
}

.rr-tip__title {
  margin-block: 0 0.25rem;
  font-weight: 600;
}
```

These styles target the elements we generated earlier:

```html id="0v5gb7"
<aside class="rr-tip">
```

and:

```html id="3qnpq7"
<p class="rr-tip__title">
```

The border color uses the Riebeckite theme token:

```css id="r3pgla"
var(--rb-color-accent)
```

instead of a hard-coded color.

This allows the Tip block to follow the active theme's accent color automatically.

This is the Theme Extension Contract in practice. Put a stable root hook (`rr-<feature>`; here `rr-tip`) on the outermost element, and use `--rb-*` semantic tokens for color and spacing. `--rb-*` tokens resolve in light, explicit dark, and system dark, so you normally do not branch on `prefers-color-scheme` or `[data-theme]` yourself, and you must not depend on a `.dark` class. See the [Theme API](../reference/theme-api.md) for details, including how to scope a dark-only branch when one is genuinely necessary.

### Step 3: Register the plugin

Register the plugin in `riebeckite.config.ts`:

```ts id="b49mge"
import { defineConfig } from "@riebeckite/core";
import { tipPlugin } from "./extensions/tip-plugin";

export default defineConfig({
  plugins: [
    tipPlugin(),
  ],
});
```

You can now use:

```md id="cpz5r3"
:::tip[Heads up]
Save often.
:::
```

in your Markdown content.

### Step 4: Test the output

Finally, let's verify that the plugin generates the expected HTML.

You do not need to build the entire site for this test. You can run the Markdown `Pipeline` directly and inspect its output.

Create `extensions/tip-plugin.test.ts`:

```ts id="5rs1cq"
import assert from "node:assert/strict";
import { test } from "node:test";
import { Pipeline } from "@riebeckite/core";
import { tipPlugin } from "./tip-plugin.ts";

test("renders :::tip as an aside with a title", async () => {
  const pipeline = new Pipeline(
    new Map(),
    new Map(),
    undefined,
    {
      plugins: [tipPlugin()],
    },
  );

  const { html } = await pipeline.execute(
    ":::tip[Heads up]\nSave often.\n:::",
  );

  assert.match(
    html,
    /<aside class="rr-tip">/,
  );

  assert.match(
    html,
    /<p class="rr-tip__title">Heads up<\/p>/,
  );

  assert.match(
    html,
    /Save often\./,
  );
});
```

This test checks three things:

```text id="6w7im3"
:::tip
   ↓
<aside class="rr-tip">

[Heads up]
   ↓
<p class="rr-tip__title">Heads up</p>

Save often.
   ↓
Rendered as the body
```

At this point, you have a complete site-local plugin that transforms Markdown, loads its own stylesheet, can be registered through Riebeckite's configuration, and has a test for its generated output.

### What to remember from this example

You do not need to memorize every AST operation used in this example.

The important part is that a Riebeckite plugin can group Markdown transformations and assets into a single plugin:

```ts id="d6q7mf"
definePlugin({
  name: "...",

  extendMarkdownPipeline: (pipeline) => {
    pipeline.use(...);
  },

  assets: [...],
});
```

`extendMarkdownPipeline` is a low-level API for working directly with remark and mdast. Use it when you need custom Markdown syntax or more advanced transformations.

This example also declares `processedContentCache`. Without it the plugin still works, but it disables the site's processed-content cache so Markdown is reprocessed on every build. Use `dependencyMode: "none"` for a standalone transform that depends only on the current content, and `tracked` when the output depends on other plugins (reserve `unsafe` for what cannot be tracked accurately). Bump `version` when the transform's meaning changes; the plugin's `options` and transform function are part of the pipeline fingerprint, so option changes alone do not require a `version` bump.

## Testing a plugin

A plugin can be tested at four levels. You do not need all of them; start from the smallest level that proves the behavior you changed.

```text
Level 1  Pure logic               A normal test runner is enough (AST helpers, string transforms).
Level 2  Markdown / HTML          Pass the plugin to a Pipeline and assert the transformed output.
Level 3  Content / lifecycle      Use ContentManager with an in-memory ContentSource to assert manifests and hooks.
Level 4  Public package boundary  Pack the package and install it into an isolated project.
```

### Level 1: Pure logic

Option resolution and AST or string helpers that do not depend on Riebeckite can be tested with any runner such as `node:test`. No Riebeckite test infrastructure is needed at this level.

### Level 2: Markdown / HTML transformation

Pass the plugin to a `Pipeline`, run representative Markdown through `execute()`, and assert the semantic output. This is the test from Step 4 above.

```ts
const pipeline = new Pipeline(new Map(), new Map(), undefined, {
  plugins: [tipPlugin()],
});

const { html } = await pipeline.execute(
  ":::tip[Heads up]\nSave often.\n:::",
);
```

The first two `Pipeline` arguments are the content index and permalink maps. Empty `Map`s are enough to transform a single document. The third argument (`getMarkdownBySlug`) is only needed when the plugin resolves embeds or other content.

### Level 3: Content / lifecycle

To test content loading, hooks, manifests, body slots, or Page Types, use `ContentManager` with a small in-memory `ContentSource` instead of a filesystem fixture.

```ts
const source = {
  async scan() {
    return [{ path: "notes/index.md" }];
  },
  async read(entry) {
    return `# ${entry.path}`;
  },
};

const manager = new ContentManager(source, [], { config });
const manifest = await manager.getManifest();
```

See [Testing](../framework/testing.md) for the deeper patterns.

### Level 4: Public package boundary

A package you distribute should be verified by packing its tarball and installing it into an isolated project outside the monorepo. This catches missing public exports, accidental `@riebeckite/core/src/**` imports, undeclared dependencies, and missing declarations. In this repository, `tests/plugin-dx` is the working example and runs with `pnpm test:plugin-dx` and `pnpm test:plugin-dx:external`.

## 4. Add a standalone page when needed

Use `pageTypes` for standalone pages. A Page Type returns the HTML body, while the site's shared catch-all route applies the document frame and Theme. When a page lists entries, read `manifest.discoverableEntries`; reserve `manifest.publicEntries` (which includes `unlisted`) and `manifest.entries` (which includes `draft` and `scheduled`) for the cases that genuinely need them. See [Manifest collections and publication safety](../reference/plugin-api.md#manifest-collections-and-publication-safety).

Do not add Plugin-specific HonoX routes. Content embeds such as Canvas, Bases, and Excalidraw remain `renderers`.

See [Page System](../framework/page-system.md) for ownership, path resolution, and SSG behavior.

## 5. Package it when needed

Once a site-local Plugin works, it can be turned into a package. External Plugins should depend only on `@riebeckite/core`, declare their own subpaths through `exports`, and must not import `@riebeckite/core/src/**` or monorepo-internal paths. For the package shape and a build that ships ESM plus type declarations, see [Distributing a Plugin outside this repository](../reference/plugin-api.md#distributing-a-plugin-outside-this-repository). Because `createStyleAsset()` and `createClientEntry()` build `@riebeckite/plugin-<name>/...` specifiers, a package under any other name declares `assets` and `clientEntries` with explicit `moduleSpecifier` values.

For the directive plugin above, declare `@riebeckite/core` and `unist-util-visit` in `dependencies` and the `mdast` types (`@types/mdast`) in `devDependencies`. The complete `package.json` and a build script using esbuild plus `tsc` are in [Distributing a Plugin outside this repository](../reference/plugin-api.md#distributing-a-plugin-outside-this-repository).

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

A Plugin author picks a standard slot such as `article.footer`, or asks the Site to render a custom name. A custom slot renders nothing until the Site renders it. See [Body slots](../reference/plugin-api.md#body-slots) for the slot list and ordering.

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

Plugins do not own `app/islands/`, and Riebeckite has no Plugin Island registry. For browser behavior, either contribute a `clientEntries` initializer that enhances the server-rendered DOM, or let the Site wrap the Plugin's component in its own HonoX Island when component state is needed. `garden-explorer` is a specific case that combines a Page Type with a client entry; do not treat it as a required pattern. See [Client entries](../reference/plugin-api.md#assets-and-client-entries).

## Related

- [Plugin API](../reference/plugin-api.md)
- [Plugin System](../framework/plugin-system.md)
- [Testing](../framework/testing.md)
- [Theme API](../reference/theme-api.md)
- [Customizing Your Site](../guides/customizing-your-site.md)
- [Architecture](../framework/architecture.md)
- [Writing Your First Theme](../themes/writing-a-theme.md)
