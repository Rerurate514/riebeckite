# Presets

`create-riebeckite` writes a complete site from a **preset**. A preset decides four things:

- which plugins are registered in `riebeckite.config.ts`
- which theme is applied
- which content pages are generated
- which `app/` shell files are written

You choose one with `--preset <name>`. The default is `starter`.

```sh
npx create-riebeckite my-site --preset starter
npx create-riebeckite --list-presets   # print the names and descriptions
```

Presets are defined explicitly, so each tier is self-contained. `full` and above include the plugins of the tiers below them, plus more.

## Which preset should I choose?

Start from your goal, not from the feature count.

| Goal | Preset |
| --- | --- |
| I want an empty HonoX shell and will assemble everything myself | `empty` |
| I want the smallest possible publishable site | `minimal` |
| I want the normal starting point for a real site | `starter` (default) |
| I want a starter that shows off what the ecosystem can do, so I can copy from it | `rich` |
| I want a blog with discovery, media, and reading features out of the box | `full` |
| I want diagrams, charts, and knowledge tools (Mermaid, Dataview, Kanban, …) | `max` |
| I want to browse the whole plugin catalog and theme reference in a running site | `ultra` |

If you are unsure, keep `starter`. You can add plugins later by editing `riebeckite.config.ts`.

## The presets

| Preset | Plugins | Languages | Theme | Representative features |
| --- | --- | --- | --- | --- |
| `empty` | 0 | — | none | Bare application shell |
| `minimal` | 1 | English | `minimal` | Obsidian Markdown, one page |
| `starter` | 3 | 7 | `default` | Obsidian Markdown, color mode, l10n, site header |
| `rich` | 8 | 7 | `default` | SEO, TOC, properties, aliases, code enhancement, tour pages |
| `full` | 29 | 7 | `default` | Search, backlinks, media, lightbox, tabs, taxonomy, gallery, … |
| `max` | 53 | 7 | `default` | Mermaid, Graphviz, D2, PlantUML, charts, Dataview, Kanban, flashcards, … |
| `ultra` | 59 | 7 | `default` | Daily notes, rename, text fragments, quality, deploy, diagnostics |

The seven languages are English, Japanese, Simplified Chinese, Spanish, German, French, and Korean. `minimal` uses English only and does not register the l10n plugin; `empty` has no content at all.

### `empty`

A blank application shell: no plugins, no theme, no content, no components. Choose it when you want to build the site structure yourself and add plugins one at a time.

### `minimal`

The smallest useful site: Obsidian Markdown, the `minimal` theme, and one page, in English only. Choose it for a tiny personal page or when you want to start lean and grow.

### `starter`

The default starter: Obsidian Markdown, color mode, seven languages, and a site header, on the `default` theme. This is the normal starting point for a public site.

### `rich`

A showcasing starter: publishing and reading plugins (SEO, TOC, properties, aliases, code enhancement) plus guided ecosystem tour pages in seven languages. Choose it when you want working examples to copy from.

### `full`

A ready blog: discovery, media, and reading plugins on top of `rich` — search, backlinks, related posts, share, changelog, webmentions, recent posts, attachments, PDF, media, responsive images, lightbox, highlighting, code tabs, code annotations, shortcodes, series, taxonomy, auto card links, rich embeds, and a gallery — plus a build guide page.

### `max`

Diagram and knowledge plugins on top of `full`, with showcase example pages: Mermaid, Graphviz, D2, PlantUML, Chart.js, Vega-Lite, WaveDrom, Markmap, maps, Marp slides, QR codes, Discord embeds, Excalidraw, ExcaliBrain, Canvas, Bases, Dataview, flashcards, Kanban, queries, local graph, hover previews, the garden explorer, and reading UX.

### `ultra`

The full plugin catalog and theme reference pages — everything the ecosystem offers. On top of `max` it adds daily notes, rename redirects, text fragments, quality inspection, deployment output, and content diagnostics.

## How presets affect the generated config

The preset writes a `riebeckite.config.ts` whose plugin calls already carry sensible options. Higher tiers show more of each plugin's option surface:

- `rich` sets the essential options.
- `full` and `max` set the standard options.
- `ultra` sets every option.

The generated file is therefore also a settings reference. To change a plugin's behavior, edit its call; see [Configuration](../reference/configuration.md) and the individual package README under [`packages/plugins`](../../../packages/plugins).

## What to do after generating

Continue to [First content](./first-content.md) to write and preview an article, or [Deployment](./deployment.md) to publish it.

## See also

- [Installation](./installation.md) — generate a site
- [Configuration](../reference/configuration.md) — the full `riebeckite.config.ts` reference
- [Plugins](../plugins/README.md) — what each generated plugin does
