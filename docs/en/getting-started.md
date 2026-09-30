# Getting Started

The shortest route from nothing to a running site: **create the site → configure → write an article → run it**.

If you want to go step by step from environment setup all the way to publishing, start with the [Setup Guide](./setup.md) instead.

## Prerequisites

- **Node.js (LTS)**: `node -v` should print `v20` or later. If not, install it from [nodejs.org](https://nodejs.org/).
- npm ships with Node.js, so no separate install is needed.

> **npm availability**: The Riebeckite packages (`@riebeckite/*`) are published to npm, so the commands on this page work as written.

## 1. Create the site

```sh
npx create-riebeckite my-site
cd my-site
npm install
npm run check
npm run doctor
```

- You get a config file (`riebeckite.config.ts`), a HonoX application shell (`app/`), routes, a stylesheet, and starter content (`content/`).
- `create-riebeckite` refuses directories that already have files unless you pass `--force`.
- Choose the composition with `--preset <name>` (default `starter`). List them with `npx create-riebeckite --list-presets`.

`check` validates config and plugin resolution; `doctor` reports broader health including content loading. Neither writes anything. A successful check prints:

```text
Riebeckite configuration is valid.
```

## 2. Configure

Start with the smallest useful `riebeckite.config.ts`:

```ts
// riebeckite.config.ts
import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  site: {
    title: "My site",
    description: "Daily notes",
    baseUrl: "https://example.com",
    locale: "ja",
  },
  content: {
    directory: "content",
  },
  theme: defaultTheme(),
  plugins: [obsidianMarkdown()],
});
```

| Field | Role |
| --- | --- |
| `site` | Title, URL, language, and other metadata (used for SEO and feeds) |
| `content.directory` | Where articles live; default `content/`. For an external vault, see [Separating content from the site](./content-and-site-repos.md) |
| `theme` | The appearance; start with `defaultTheme()` |
| `plugins` | Features; the example registers only `obsidianMarkdown()` |

By default, only content marked `publish: true` is published (the **explicit** strategy). Full details are in [Configuration](./configuration.md).

## 3. Write an article

Put a Markdown file in `content/`:

```md
---
title: Hello
publish: true
---

My first article. A WikiLink like [[another-note]] works too.
```

Without `publish: true`, the page does not appear under the explicit strategy. Verify what loaded with the read-only Inspector:

```sh
npm run inspect -- config
npm run inspect -- content --list
npm run inspect -- graph
```

- `inspect config` … resolved config and content location
- `inspect content --list` … loaded content
- `inspect graph` … WikiLink relationships

Fix the files based on what it shows (the Inspector does not generate state).

## 4. Run it

```sh
npm run dev
```

Open `http://localhost:5173` in a browser to see the articles. Edits apply immediately; stop with `Ctrl + C`.

Generate publishable files under `dist/` with:

```sh
npm run build
```

Build is normally an **incremental build** that reuses unchanged content. Use `build --full` only when you want to skip that reuse.

```sh
npm run build -- --full
```

Where to add things when extending: features go to a plugin ([Your first plugin](./plugin-tutorial.md)), appearance to a theme ([Your first theme](./theme-tutorial.md)), and site-specific routes to the app (`app/`). See [Architecture](./architecture.md) for the overall picture.

## Suggested reading

- [Setup Guide](./setup.md) — environment setup through publishing
- [Usage Guide](./guide.md) — step-by-step from install to deploy
- [Separating content from the site](./content-and-site-repos.md) — managing articles (a vault) separately from the site
- [Configuration](./configuration.md) / [Content System](./content-system.md) / [Plugin System](./plugin-system.md) / [Theme System](./theme-system.md)