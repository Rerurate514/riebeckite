---
date: 2026-10-06
title: Guides
sidebar.label: Guides
sidebar.order: 30
---
# Guides

Guides start from a task: "I want to publish an Obsidian vault", "I want a multilingual site", "I want to deploy automatically". If you are new, finish [Getting Started](../getting-started/README.md) first.

```mermaid
flowchart TD
    Q{"What do you want to know?"}

    Q -->|"A concrete procedure"| Guides["Guides"]
    Q -->|"Configuration, CLI, API"| Reference["Reference"]
    Q -->|"Internal mechanics"| Framework["Framework"]
```

If you are new to Riebeckite, start with [Getting Started](../getting-started/README.md) before Guides.

## By task

Guides only. For the full documentation map, see [Documentation](../README.md).

| I want to… | Guide |
| --- | --- |
| Write and organize articles | [Writing content](./writing-content.md) |
| Change many notes or frontmatter fields safely | [Content mutation](../framework/content-mutation.md) and [Content migration](../framework/content-migration.md) |
| Customize the site UI with HonoX | [Customizing your site](./customizing-your-site.md) |
| Keep the shell while navigating between pages | [SPA Navigation](./spa-navigation.md) |
| Choose how client code mounts interactive UI | [Interactive Roots](./interactive-roots.md) |
| Build a homepage and browse routes | [Discovery recipes](./discovery-recipes.md) |
| Publish an Obsidian vault | [Obsidian](./obsidian.md) |
| Keep content and the site in separate repositories | [Content repositories](./deployment/separate-content-repository.md) |
| Build a multilingual site | [Localization](./localization.md) |
| Develop a local Plugin | [Local Plugin Development](./local-plugin-development.md) |
| Connect a local editor tool | [Editor integration](./editor-integration.md) |
| Connect AI tools safely | [AI integration](./ai/README.md) |
| Collect page views | [Analytics](./analytics.md) |
| Replace the icon, logo, or link preview image | [Branding your site](./branding.md) |
| Deploy | [Deployment](./deployment/README.md) |
| Upgrade Riebeckite or read migration notes | [Upgrading](./upgrading.md) |

Bulk content changes have two entry points. Use [Content mutation](../framework/content-mutation.md) for individual create, edit, move, and delete operations with link rewriting and recovery. Use [Content migration](../framework/content-migration.md) for versioned rules that transform many files. If you only need to normalize frontmatter, the [frontmatter-transformer](../plugins/frontmatter-transformer.md) Plugin ships ready-made presets.

## What each guide covers

- [Writing content](./writing-content.md) — the basics of writing articles in Riebeckite, including Markdown and frontmatter.
- [Obsidian](./obsidian.md) — using an existing Obsidian vault as Riebeckite content.
- [Content repositories](./deployment/separate-content-repository.md) — managing the site application and Markdown content in separate repositories.
- [Localization](./localization.md) — multiple languages, URLs, and language switching.
- [Local Plugin Development](./local-plugin-development.md) — previewing a local Plugin with the real HonoX/Vite development server.
- [Editor integration](./editor-integration.md) — connecting a local editor tool to the read-only development Bridge.
- [AI integration](./ai/README.md) — connecting MCP and managing generated AI guidance.
- [Analytics](./analytics.md) — adding analytics to a Riebeckite site.
- [Branding your site](./branding.md) — replacing the site favicon, header logo, and link preview image.
- [Customizing your site](./customizing-your-site.md) — editing routes, components, islands, and CSS in `app/` as a normal HonoX application.
- [SPA Navigation](./spa-navigation.md) — enabling client-side page transitions, supported links, and the renderer contract.
- [Interactive Roots](./interactive-roots.md) — choosing between `hydrateRoot` and `createRoot` for interactive components, and the page and app mount scopes.
- [Discovery recipes](./discovery-recipes.md) — building a homepage and browse routes.
- [Upgrading](./upgrading.md) — updating Riebeckite packages and reviewing changes.

## Deployment guides

Deployment has its own section because the choices multiply once automation is involved.

```mermaid
flowchart TD
    Deploy["I want to publish a site"]

    Deploy --> Overview["Deployment"]

    Overview --> Workers["Cloudflare Workers"]
    Overview --> Actions["GitHub Actions"]
    Overview --> Separate["Separate Content Repository"]
```

| I want to… | Guide |
| --- | --- |
| Deploy to Cloudflare Workers | [Cloudflare Workers](./deployment/cloudflare-workers.md) |
| Understand the generated GitHub Actions workflow | [GitHub Actions](./deployment/github-actions.md) |
| Read articles from a separate repository in CI | [Separate content repository](./deployment/separate-content-repository.md) |

## Where to look next

- The **exact** configuration fields, CLI commands, and API contracts live in [Reference](../reference/README.md).
- How the content, plugin, and theme systems are built lives in [Framework](../framework/README.md).

## Guides and the other chapters

The documentation is divided by role:

```text
Build a site for the first time
  → Getting Started

Learn the procedure for a task
  → Guides

Find a plugin
  → Plugins

Find a theme
  → Themes

Look up configuration, CLI, and APIs
  → Reference

Understand the internal structure
  → Framework
```

Guides focus on **what you need to do to accomplish a goal**, rather than on internal implementation details.
