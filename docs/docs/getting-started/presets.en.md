---
title: Presets
sidebar:
  label: Presets
  order: 40
---
# Presets

`create-riebeckite` writes a complete site from a **preset**. A preset chooses the registered plugins, theme, generated content, and HonoX application files.

The interactive CLI asks you to choose a preset while it runs; `starter` is the recommendation when you are unsure. To choose one from the command line instead, use `--preset <name>` (default `starter`).

```sh
npx create-riebeckite my-site --preset starter
npx create-riebeckite --list-presets
```

## Which preset should I choose?

| Goal | Preset |
| --- | --- |
| I will assemble the application myself | `empty` |
| I want the smallest publishable Markdown site | `minimal` |
| I want the recommended starting point for a real garden or blog | `starter` (default) |
| I want to explore the complete plugin catalog, rendered examples, and references | `showcase` |

If you are unsure, choose `starter`. Add plugins later in `riebeckite.config.ts`.

## The presets

| Preset | Theme | Languages | Contents | Representative features |
| --- | --- | --- | --- | --- |
| `starter` | `default` | 7 | index, guide, examples, connected notes | Markdown publishing, search, breadcrumbs, backlinks, related and recent posts, taxonomy, series |
| `minimal` | `minimal` | English | one index page | Obsidian Markdown only |
| `showcase` | `default` | 7 | tour, guide, examples, plugin/theme references, local fixtures | Complete plugin catalog, diagrams, charts, knowledge tools, diagnostics, deployment |
| `empty` | none | — | none | Blank application shell |

The seven languages are English, Japanese, Simplified Chinese, Spanish, German, French, and Korean. `minimal` does not register l10n; `empty` has no theme, plugins, or content.

### `starter`

The practical default. It includes Obsidian Markdown, color mode, l10n, SEO, table of contents, properties and aliases, code enhancement, search and discovery, breadcrumbs, responsive images and lightbox, series, and taxonomy. Its connected sample notes exercise backlinks, related posts, search, recent posts, series, and tags without adding niche integrations.

### `minimal`

Obsidian Markdown, the `minimal` theme, and one English page. Choose it for a small site or a deliberately lean starting point.

### `showcase`

The self-contained reference site. It enables the complete plugin catalog, renders diagram/chart/code examples, supplies plugin and theme references, and includes local SVG, PDF, Excalidraw, and Canvas fixtures. It is intended for exploration and copying configuration, rather than as the recommended production baseline.

### `empty`

A blank application shell with no plugins, theme, content, or components. Choose it to establish the site structure and add each part yourself.

## Generated configuration

`starter` writes practical plugin options. `showcase` writes the complete option surface as a configuration reference. `empty` and `minimal` deliberately keep configuration small. See [Configuration](../reference/configuration.en.md) and each package README under `packages/plugins` for details.

## Next

- [Deployment →](./deployment.en.md)

