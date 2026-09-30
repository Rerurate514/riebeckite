> English documentation · [日本語](../ja/README.md) · [Agent documentation](../agents/README.md)

<p align="center">
  <img src="../../assets/logos/riebeckite-logo-horizontal.png" alt="Riebeckite" width="360" />
</p>

# Riebeckite Documentation

Riebeckite is an extensible, HonoX-based content framework for publishing Markdown and Obsidian-oriented notes on the web. Content loading, interpretation, extension, presentation, and builds are separate, replaceable responsibilities — not one Markdown-to-HTML step.

New here? Start with **[Getting Started](./getting-started/README.md)**. It takes you from `create-riebeckite` to a running site and a first deployment.

## What do you want to do?

| I want to… | Go to |
| --- | --- |
| Use Riebeckite for the first time | [Getting Started](./getting-started/README.md) |
| Create a site and deploy it today | [Getting Started](./getting-started/README.md) → [Deployment](./getting-started/deployment.md) |
| Choose which `create-riebeckite` preset to use | [Presets](./getting-started/presets.md) |
| Write and organize articles | [Guides / Writing content](./guides/writing-content.md) |
| Publish an Obsidian vault | [Guides / Obsidian](./guides/obsidian.md) |
| Keep content and site in separate repositories | [Guides / Content repositories](./guides/content-repositories.md) |
| Build a multilingual site | [Guides / Localization](./guides/localization.md) |
| Deploy to Cloudflare Workers / GitHub Actions | [Guides / Deployment](./guides/deployment/README.md) |
| Find and install a Plugin | [Plugins](./plugins/README.md) |
| See Plugins in action | [Plugin Showcase](./plugins/showcase.md) |
| Change the look of my site | [Themes](./themes/README.md) |
| Look up configuration, CLI, or an API | [Reference](./reference/README.md) |
| Understand how Riebeckite works inside | [Framework](./framework/README.md) |
| Contribute to Riebeckite itself | [Framework / Development](./framework/development.md) |

## Where to go next

- **Getting Started** — install, presets, first content, deployment. Nothing about the framework internals.
- **Guides** — task-oriented: writing content, Obsidian, content repositories, localization, deployment, analytics.
- **Plugins** — the catalog, the showcase, and how to write your own.
- **Themes** — the catalog and how to write your own.
- **Reference** — configuration fields, the CLI, the Plugin API, and the Theme API.
- **Framework** — architecture, the content system, the plugin and theme systems, the build system, the HonoX integration, diagnostics, testing, and repository development.

## The shape of a Riebeckite project

```text
Markdown / assets
       │
       ▼
ContentSource ── scanning, reading, source metadata
       │
       ▼
ContentManager ── content interpretation and orchestration
       ├── Manifest       page and metadata index
       ├── Content Graph  relationships such as WikiLinks
       └── Pipeline       Markdown / HTML / metadata transforms
                    │
                    ▼
                 Plugins ── capability extensions
                    │
                    ▼
       HonoX / Vite integration ── framework connection
                    │
                    ▼
            Application / Cloudflare Workers
```

Everything from `ContentSource` down is explained in [Framework](./framework/README.md). A site author only needs `riebeckite.config.ts`, `content/`, and the occasional plugin or theme.

For coding agents and automation, use the concise, rule-oriented [Agent documentation](../agents/README.md).
