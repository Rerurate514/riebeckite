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
| `starter` | `default` | site locale | index, guide, examples, connected notes | Markdown publishing, search, content-derived navigation, breadcrumbs, backlinks, related and recent posts, taxonomy, folder landings, link previews |
| `minimal` | `minimal` | English | one index page | Obsidian Markdown only |
| `showcase` | `default` | 7 | tour, guide, examples, plugin/theme references, local fixtures | Complete plugin catalog, diagrams, charts, daily notes, knowledge tools, diagnostics, deployment |
| `empty` | none | — | none | Blank application shell |

The seven showcase languages are English, Japanese, Simplified Chinese, Spanish, German, French, and Korean. `starter` uses one page language selected from the site locale; add l10n when the site needs translated routes. `minimal` is English-only, and `empty` has no theme, plugins, or content.

### `starter`

The practical default. It includes Obsidian Markdown, color mode, SEO, table of contents, properties and aliases, code enhancement, search and discovery, breadcrumbs, responsive images and lightbox, taxonomy, folder landing pages, and link previews. Navigation is derived from published content rather than sample URLs. Its connected sample notes exercise backlinks, related posts, search, recent posts, and tags without adding niche integrations.

### `minimal`

Obsidian Markdown, the `minimal` theme, and one English page. Choose it for a small site or a deliberately lean starting point.

### `showcase`

The self-contained reference site. It enables the complete plugin catalog, renders diagram/chart/code examples, supplies plugin and theme references, and includes local SVG, PDF, Excalidraw, and Canvas fixtures. Its `content/Daily/` notes feed a Daily Notes widget on the home page. It is intended for exploration and copying configuration, rather than as the recommended production baseline.

### `empty`

A blank application shell with no plugins, theme, content, or components. Choose it to establish the site structure and add each part yourself.

## Generated configuration

`starter` writes practical plugin options. `showcase` writes the complete option surface as a configuration reference. `empty` and `minimal` deliberately keep configuration small. See [Configuration](../reference/configuration.md) and each package README under `packages/plugins` for details.

## Project files

Presets do not control project files. `create-riebeckite` writes an independent set selected with `--utilities <names>`: `gitignore`, `editorconfig`, `gitattributes`, `biome`, `npmrc`, and `vscode`. The default is `gitignore,editorconfig,gitattributes,biome`, and `none` writes none. In interactive mode the `Extra project files` prompt lets you toggle each one. See the [CLI reference](../reference/cli.md) for the files each name writes.

## Next

- [Deployment →](./deployment.md)
