---
date: 2026-10-06
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
| I want an Obsidian-style network of notes | `digital-garden` |
| I want a publication with posts, tags, and series | `blog` |
| I want product or project documentation | `docs` |
| I want to present selected work and contact details | `portfolio` |
| I will assemble the application myself | `empty` |
| I want the smallest publishable Markdown site | `minimal` |
| I want the recommended starting point for a real garden or blog | `starter` (default) |
| I want to explore the complete plugin catalog, rendered examples, and references | `showcase` |

If you are unsure, choose `starter`. Add plugins later in `riebeckite.config.ts`.

## The presets

| Preset | Theme | Languages | Contents | Representative features |
| --- | --- | --- | --- | --- |
| `starter` | `default` | site locale | index, guide, examples, connected notes | Markdown publishing, search, content-derived navigation, breadcrumbs, backlinks, related and recent posts, taxonomy, folder landings, link previews |
| `digital-garden` | `default` | English | index and connected notes | Obsidian Markdown, frontmatter, wiki links and embeds, backlinks, local graph, properties, search, breadcrumbs, taxonomy |
| `blog` | `default` | English | index, posts, series | Posts, tags, series navigation, related and recent posts, sharing controls, RSS/Atom/JSON feeds, SEO, search, table of contents |
| `docs` | `default` | English | documentation sections | Documentation sidebar, responsive table of contents, previous/next links, searchable code examples |
| `portfolio` | `default` | English | home, about, projects, contact | Project-focused content, responsive images, lightbox, media embeds, gallery support, SEO, navigation, properties, color mode |
| `minimal` | `minimal` | English | one index page | Obsidian Markdown only |
| `showcase` | `default` | 7 | tour, guide, examples, plugin/theme references, local fixtures | Complete plugin catalog, diagrams, charts, daily notes, knowledge tools, diagnostics, deployment |
| `empty` | none | — | none | Blank application shell |

The seven showcase languages are English, Japanese, Simplified Chinese, Spanish, German, French, and Korean. `starter` uses one page language selected from the site locale; add l10n when the site needs translated routes. `minimal` is English-only, and `empty` has no theme, plugins, or content.

### `starter`

The practical default. It includes Obsidian Markdown, color mode, SEO, table of contents, properties and aliases, code enhancement, search and discovery, breadcrumbs, responsive images and lightbox, taxonomy, folder landing pages, and link previews. Navigation is derived from published content rather than sample URLs. Its connected sample notes exercise backlinks, related posts, search, recent posts, and tags without adding niche integrations.

### `digital-garden`

An Obsidian-oriented site for linked notes. The generated content demonstrates frontmatter, wiki links, embeds, properties, backlinks, and the local graph. Navigation, breadcrumbs, taxonomy, search, and link previews make the note network usable without extra setup.

### `blog`

A publication-focused starting point with posts, tags, series, related and recent posts, sharing controls, search, and a table of contents. Its generated configuration explicitly enables RSS, Atom, and JSON feeds, while the sample articles demonstrate series navigation and taxonomy.

### `docs`

A documentation site with a generated sidebar, responsive table of contents, and previous/next navigation. It starts with a small documentation tree and code examples, while keeping the reading layout focused on the current page.

### `portfolio`

A restrained starting point for selected projects, an introduction, and contact details. Project pages stay useful without images, while responsive images, lightbox, embedded media, and Markdown galleries are ready when visual material helps explain the work. It makes no claims about your experience, clients, or results.

## Optional feature packs

Feature packs add explicit plugins to a selected preset. Use `--features <names>` with a comma-separated list, or choose them from the interactive prompt.

```sh
npx create-riebeckite my-site --preset portfolio --features diagrams,i18n
```

| Pack | Adds |
| --- | --- |
| `knowledge` | Link previews and a local graph |
| `diagrams` | Mermaid and Graphviz Markdown diagrams |
| `media` | Embedded audio/video, responsive images, and lightbox |
| `i18n` | English and Japanese localized routes |

Packs that repeat a preset's plugin are rejected rather than silently generating duplicate imports. Use `none` to make `--features` explicit without adding a pack.

### `minimal`

Obsidian Markdown, the `minimal` theme, and one English page. Choose it for a small site or a deliberately lean starting point.

### `showcase`

The self-contained reference site. It enables the complete plugin catalog, renders diagram/chart/code examples, supplies plugin and theme references, and includes local SVG, PDF, Excalidraw, and Canvas fixtures. Its `content/Daily/` notes feed a Daily Notes widget on the home page. It is intended for exploration and copying configuration, rather than as the recommended production baseline.

### `empty`

A blank application shell with no plugins, theme, content, or components. Its first route is an ordinary HonoX `createRoute` page, so add pages, HTML, JSX components, and CSS directly in `app/` before opting into Riebeckite content features.

### Editing generated UI

Generated application files use normal TypeScript, JSX, and HonoX routes. Edit `app/routes/` to add pages or API routes, `app/components/article.tsx` to arrange article UI, `app/components/site-header.tsx` to change the header and footer, and `app/style.css` for site CSS. `SiteNav` and other plugin UI components resolve their configured data themselves; place them where needed instead of resolving manifests in site components.

## Generated configuration

`starter` writes practical plugin options. `showcase` writes the complete option surface as a configuration reference. `empty` and `minimal` deliberately keep configuration small. See [Configuration](../reference/configuration.md) and each package README under `packages/plugins` for details.

## Project files

Presets do not control project files. `create-riebeckite` writes an independent set selected with `--utilities <names>`: `gitignore`, `editorconfig`, `gitattributes`, `biome`, `npmrc`, and `vscode`. The default is `gitignore,editorconfig,gitattributes,biome`, and `none` writes none. In interactive mode the `Extra project files` prompt lets you toggle each one. See the [CLI reference](../reference/cli.md) for the files each name writes.

## Next

- [Deployment →](./deployment.md)
