# Your First Plugin

A plugin adds **features** — Markdown/HTML transformation, client behavior, SEO, diagnostics, and more. For appearance, use a theme ([Your first theme](../themes/writing-a-theme.md)); for site-specific routes, use the app (`app/`).

Go in this order: create a minimal plugin → add CSS → transform Markdown.

## 1. Create a minimal plugin

A plugin is made with `definePlugin` (from `@riebeckite/core`). It does **not** need to be a published package — define it inside the site.

```ts
// extensions/local-plugin.ts
import { definePlugin } from "@riebeckite/core";

export function localPlugin() {
  return definePlugin({
    name: "local",
  });
}
```

Add it to the `plugins` array in `riebeckite.config.ts`.

```ts
// riebeckite.config.ts
import { localPlugin } from "./extensions/local-plugin";

export default defineConfig({
  plugins: [localPlugin()],
  // ...
});
```

A plugin with only `name` does nothing — it is the minimal shape. To accept options, give the factory typed arguments:

```ts
type LocalOptions = { enabled?: boolean };

export function localPlugin(options: LocalOptions = {}) {
  return definePlugin({ name: "local", options });
}
```

## 2. Add CSS

Declare plugin stylesheets with `assets`. Do not copy CSS into the site or reference `/node_modules` directly from the browser.

```ts
// extensions/local-plugin.ts
import { definePlugin } from "@riebeckite/core";

export function localPlugin() {
  return definePlugin({
    name: "local",
    assets: [
      {
        pluginName: "local",
        kind: "style",
        moduleSpecifier: "/extensions/plugin.css",
      },
    ],
  });
}
```

- `moduleSpecifier` is something the host bundler resolves; for an in-site plugin, use `/extensions/plugin.css`.
- Put a stable root hook (`rr-<feature>`) on the outermost rendered element. See [Plugin System](../reference/plugin-api.md) for the CSS conventions.

## 3. Transform Markdown / HTML

Semantic Markdown transformation is the plugin's job. A simple remark plugin is declared as an array:

```ts
// extensions/local-plugin.ts
import { definePlugin } from "@riebeckite/core";

function remarkLocal() {
  return (tree: unknown) => {
    // manipulate the Markdown AST
    return tree;
  };
}

export function localPlugin() {
  return definePlugin({ name: "local", remarkPlugins: [remarkLocal] });
}
```

Use `extendMarkdownPipeline` / `extendHtmlPipeline` when you need finer control. Other extension points (dependencies, lifecycle, renderers, endpoints, …) are in [Plugin System](../reference/plugin-api.md).

## 4. Package it for distribution (optional)

Once it works in a site, you can package it. Use `packages/plugins/backlinks` as a template.

```text
packages/plugins/backlinks/
├─ index.ts              ← factory calling definePlugin, re-exports public parts
├─ components/           ← components (if any)
├─ src/                  ← implementation (types, helpers)
├─ styles/style.css      ← plugin CSS
├─ package.json          ← exports "." / "./components" / "./style.css"
├─ README_ja.md
└─ README.md
```

A distributed plugin depends only on `@riebeckite/core` and declares its own subpaths in `exports`. Never import `@riebeckite/core/src/**` or reference monorepo paths.

## 5. Verify

```sh
npm exec riebeckite check              # validate config and plugin resolution
npm exec riebeckite doctor             # health check
npm exec riebeckite inspect plugins# list resolved plugins
npm exec riebeckite build              # confirm it appears in the output
```

`check` / `doctor` / `inspect` are read-only. If a plugin does not resolve, start with `check` for capability or import errors. Before writing a plugin, also ask whether you really need one — maybe configuration or an app implementation suffices.

## Further reading

- [Plugins in depth](../framework/plugin-system.md) — the in-depth companion (extension points, capabilities, lifecycle, packaging)
- [Plugin System](../reference/plugin-api.md) — all extension points in detail
- [Architecture](../framework/architecture.md) — responsibilities of Core / Plugin / Integration / Theme / App
- [Framework Reference](../reference/README.md) — public APIs like `definePlugin`

