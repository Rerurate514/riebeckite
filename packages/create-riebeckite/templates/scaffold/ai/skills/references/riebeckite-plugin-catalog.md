# Official Plugin catalog guide

Use the catalog to avoid reimplementing a capability that Riebeckite already packages and documents.

## Sources

- Official catalog: <https://riebeckite.dev/docs/plugins/>
- Showcase: <https://riebeckite.dev/docs/plugins/showcase>
- Published packages: `@riebeckite/plugin-*` on npm
- MCP tool: `riebeckite_plugin_catalog` with an optional capability query

The MCP result lists published packages; it does not prove that a package fits the current project. Read the package documentation before installing.

## Capability map

Use this as a starting point, not a fixed package list:

| Need | Look for |
| --- | --- |
| Obsidian-style links, embeds, callouts | WikiLink, embed, callout, or Obsidian compatibility Plugins |
| Search | Client-side search, index, or command-palette Plugins |
| Taxonomies and listings | Tag, folder, series, or query Plugins |
| Diagrams and math | Mermaid, math, or diagram Plugins |
| Media and embeds | Image, video, audio, or external embed Plugins |
| SEO and feeds | Sitemap, RSS, metadata, or social-card Plugins |
| Localization and docs | i18n, versioned docs, or documentation Plugins |
| Content quality | Link checking, frontmatter validation, or lint Plugins |

## Selection rules

1. Prefer an official Plugin over local code for a reusable feature.
2. Prefer the narrowest Plugin over a bundle that adds unrelated routes or runtime code.
3. Check whether a Plugin requires a companion Theme, content format, or peer package.
4. Check the supported input format and output stage: Markdown AST, HTML AST, rendered content, build output, client runtime, or server endpoint.
5. Check route, asset, cache, and locale impact before enabling it.
6. Check the package's supported Riebeckite version and release date.
7. Do not add a runtime dependency for a build-time-only feature.
8. Do not copy a Plugin's internal CSS or bypass its public configuration.

## Install and register

Use the project's package manager and existing configuration style. A typical registration is:

```ts
import { defineConfig } from "@riebeckite/core";
import { example } from "@riebeckite/plugin-example";

export default defineConfig({
  plugins: [example({ enabled: true })],
});
```

Keep the actual option names and defaults from the package documentation. Do not invent options.

## Verification

```sh
npm run check
npm run build
npm exec riebeckite inspect content --list
```

Inspect the affected page, route, feed, or asset. For a development issue, run `npm exec riebeckite plugin dev <path>` only when working on a local Plugin.

## When nothing fits

Report:

- The capability and why the catalog candidates do not match.
- Whether the need is presentation, content semantics, application behavior, or build tooling.
- The recommended next boundary: Theme, local Plugin, application component, or configuration change.

Do not install an unrelated Plugin as a placeholder.

## Report

State the capability, candidates considered, chosen package and version, configuration changes, commands run, and any remaining route, cache, or compatibility risk.
