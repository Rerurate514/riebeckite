# Configuration

Create configuration with `defineConfig` and let the integration resolve it before content or plugins run. The required top-level field is `site`; optional sections are `content`, `markdown`, `theme`, and `plugins`.

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", url: "https://example.com" },
  content: {
    directory: "content",
    exclude: ["drafts/**"],
    filters: { publishStrategy: "published" },
  },
  markdown: { syntaxHighlight: { theme: "github-dark" } },
  theme: { colorMode: "system", articleLayout: "article" },
  plugins: [],
});
```

## Content selection

`content.directory` selects the default filesystem location. Use `content.source` to provide a different `ContentSource`; do not configure two competing readers. `exclude` removes matching material before it becomes content. `filters.publishStrategy` controls publication filtering. `isExcluded` and `isPublished` expose the corresponding policy helpers.

## Plugins and themes

Plugins accept plugin inputs, including `false`, `null`, and `undefined` for conditional configuration. Resolution discards disabled/falsy inputs, orders enabled plugins stably, and checks capabilities. Theme input can be a raw theme config or a declared theme. Keep framework-specific configuration at the integration/application boundary.

Configuration errors are reported as `ConfigValidationError`; do not catch and hide them. Run `riebeckite check` after changes. Continue with [Plugin system](plugin-system.md) or [Theme system](theme-system.md) for their option contracts.
