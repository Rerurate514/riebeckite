<p align="center">
  <img src="./assets/logos/riebeckite-logo-horizontal.png" alt="Riebeckite" width="360" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@riebeckite/cli"><img src="https://img.shields.io/npm/v/%40riebeckite%2Fcli?label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@riebeckite/cli"><img src="https://img.shields.io/npm/dm/%40riebeckite%2Fcli" alt="npm downloads" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/Rerurate514/riebeckite" alt="License" /></a>
</p>

# Riebeckite

**Your content. Your code. Your framework.**

Publish your Obsidian notes and Markdown as a fully customizable website, built with TypeScript and an extensible plugin ecosystem.

[Get Started](https://riebeckite.dev/docs/getting-started/) · [Documentation](https://riebeckite.dev/docs/) · [Showcase](https://riebeckite.dev/docs/plugins/showcase) · [GitHub](https://github.com/Rerurate514/riebeckite)

English | [日本語](./README_ja.md)

## Why Riebeckite?

Riebeckite started with friction I hit while publishing my own notes with Quartz 4. Quartz handled the basic exchange well: write Markdown, get a site. But building client-side UI meant working through Hooks and DOM manipulation instead of the component model I use every day, with Quartz-specific conventions layered on top. Keeping my vault separate from the site code was awkward, and moving from Quartz 4 to 5 meant setting up much of the site again.

Riebeckite changes the starting point. A generated site is an ordinary HonoX application that you shape with TypeScript and JSX. Markdown is the input, not the architecture. You can build the header, search, interactions, or page types you want the same way you would in any modern web project.

It's for people who write in Obsidian or Markdown and are comfortable owning a little code. If you want a site that feels like yours instead of a preset you can only adjust, Riebeckite is designed to stay out of the way.

## What you get

### Build with familiar tools

TypeScript, JSX, and HonoX. Use components, routes, interactive islands, CSS, and the npm ecosystem you already know. There is no separate templating language to learn.

### Own your content

Point Riebeckite at a folder or an existing Obsidian vault. Keep it in the site repository, next to it, or in a repository of its own.

### Extend with npm

Plugins and themes are normal npm packages. Install the official ones, or publish your own. See the [plugin catalog](https://riebeckite.dev/docs/plugins/) and [themes](https://riebeckite.dev/docs/themes/).

### Publish your knowledge

Obsidian-flavored Markdown becomes pages, navigation, search, and backlinks. WikiLinks, embeds, callouts, properties, and tags come along with it.

### Fast by design

Pages are generated as static HTML, so they render without JavaScript. Add browser-side behavior only where you need it, using HonoX islands or plugins.

## Quick Start

Create a site:

```bash
npx create-riebeckite
```

For a first try, accept the defaults: `starter`, `This project`, and `Not now`. Then:

```bash
cd my-site
npm install
npm exec riebeckite dev
```

Open the URL printed in the terminal. Edit `content/index.md` and the page updates as you save. When you are ready to publish:

```bash
npm exec riebeckite build
```

The static site is written to `dist/`. New notes appear once they have `publish: true` in their frontmatter. If you chose another folder name, use it instead of `my-site`; you can also skip the prompts with `npx create-riebeckite my-site`.

Riebeckite needs Node.js LTS and npm (npm ships with Node.js). Git is only needed for deployment.

See [Getting Started](https://riebeckite.dev/docs/getting-started/) for requirements, deployment, and the generated project layout.

## Your site shouldn't be your framework

Riebeckite is a set of npm packages. A generated site is a normal HonoX app with `@riebeckite/*` dependencies, a `riebeckite.config.ts`, and an `app/` directory that belongs to you. Updating Riebeckite is a dependency update, not a rewrite, so you can pin versions and upgrade on your own schedule. Major versions may still require changes; review the [upgrade guide](https://riebeckite.dev/docs/guides/upgrading) before upgrading.

Content can live outside `app/`, and outside the repository. Set `content.directory` to a sibling vault such as `../vault`, or check out a content repository during CI. The [content repository guide](https://riebeckite.dev/docs/guides/content-repositories) walks through the split setup.

## Extensible by design

Add a plugin and a theme:

```bash
npm install @riebeckite/plugin-highlight @riebeckite/theme-minimal
```

Add the imports and entries to your generated config. A minimal setup looks like this:

```ts
import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { highlight } from "@riebeckite/plugin-highlight";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  site: {
    title: "My notes",
    baseUrl: "https://example.com",
  },
  theme: minimalTheme(),
  plugins: [obsidianMarkdown(), highlight()],
});
```

Plugins are functions in the `plugins` array. Themes are values passed to `theme`. Plugins can contribute Markdown transforms, pages, components, CSS, browser-side code, HTTP endpoints, and generated files. See the [Plugin API](https://riebeckite.dev/docs/reference/plugin-api) and [Theme API](https://riebeckite.dev/docs/reference/theme-api).

## Showcase

[riebeckite.dev](https://riebeckite.dev/) is built with Riebeckite. The [Plugin Showcase](https://riebeckite.dev/docs/plugins/showcase) pairs Markdown sources with their rendered output, so you can see what each plugin does before adding it.

## Documentation and community

- [Documentation](https://riebeckite.dev/docs/) — guides, reference, and framework internals
- [Getting Started](https://riebeckite.dev/docs/getting-started/) — from an empty folder to a published site
- [Plugin catalog](https://riebeckite.dev/docs/plugins/) and [themes](https://riebeckite.dev/docs/themes/)
- [Configuration](https://riebeckite.dev/docs/reference/configuration) and [CLI reference](https://riebeckite.dev/docs/reference/cli)
- [GitHub Issues](https://github.com/Rerurate514/riebeckite/issues) for bugs and feature requests
- [GitHub Discussions](https://github.com/Rerurate514/riebeckite/discussions) for questions and ideas
- [Security policy](./SECURITY.md)

For larger changes, open an issue or start a discussion before you begin.

## Developing Riebeckite itself

Clone the monorepo when you are working on the framework, integrations, plugins, themes, or the reference site. [Framework Development](./docs/docs/framework/development.md) covers setup and commands.

<p align="center"><strong>Publish your knowledge. Build without limits.</strong></p>
