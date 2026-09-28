# Usage Guide

This guide walks through publishing a site with Riebeckite, from installation to deployment. It uses the reference application in [`apps/web`](../../apps/web) as the working example. Each step links to the system documentation when you need the underlying model.

## What you will do

1. [Install dependencies](#1-install-dependencies)
2. [Configure the site](#2-configure-the-site)
3. [Add content](#3-add-content)
4. [Start the development server](#4-start-the-development-server)
5. [Inspect and validate](#5-inspect-and-validate)
6. [Build](#6-build)
7. [Preview and deploy](#7-preview-and-deploy)
8. [Extend the site](#8-extend-the-site)
9. [Use your own project](#use-your-own-project)

## Before you start

- Node.js (LTS) and pnpm are installed.
- You run commands from the repository root. Content and the application are separate: Markdown lives under `content/`, and the HonoX application lives in `apps/web`.
- Riebeckite ships an `init` command: `pnpm exec riebeckite init my-site` (or `npm create riebeckite my-site`) generates a standalone site you can install and build. The reference application and the E2E fixture remain useful examples for a fully customized site.

## 1. Install dependencies

```bash
pnpm install
```

This installs the workspace packages and links them together. The CLI becomes available as `pnpm exec riebeckite`.

## 2. Configure the site

Site behavior comes from `riebeckite.config.ts` at the repository root. These are the fields you will edit first:

| Field | Purpose |
| --- | --- |
| `site.title`, `site.description`, `site.author`, `site.baseUrl`, `site.locale` | Metadata used by pages, SEO, and feeds |
| `content.directory` | Markdown root. It is resolved relative to `appRoot` (`apps/web`), so `../../content` points at the repository's `content/` |
| `content.exclude` | Glob patterns to skip, such as templates or private folders |
| `content.filters.publishStrategy` | `"explicit"` publishes only entries with `publish: true`; `"selective"` publishes unless `private: true` or `draft: true` |
| `theme` | Presentation. `defaultTheme({...})` accepts color mode, typography, and layout settings |
| `plugins` | Capabilities such as Obsidian Markdown, WikiLinks, search, and SEO |

To publish your own notes, change `content.directory` and keep the rest of the configuration only as far as you need it:

```ts
// riebeckite.config.ts
export default defineConfig({
  site: { title: "My notes", baseUrl: "https://example.com" },
  content: {
    directory: "../../content",
    filters: { publishStrategy: "explicit" },
  },
  theme: defaultTheme(),
  plugins: [obsidianMarkdown(), media(), attachment()],
});
```

See [Configuration](./configuration.md) for the full field list, filesystem-root rules, and how to keep an Obsidian vault outside the site.

## 3. Add content

Place Markdown files under the configured content directory. The reference configuration requires a `title`, and the explicit publish strategy requires `publish: true`:

```md
---
title: My first note
publish: true
tags:
  - notes
created: 2026-09-28
modified: 2026-09-28
---

Body text. Link with [[Another note]] and embed images with ![[attachments/diagram.png]].
```

Frontmatter the reference application reads:

| Key | Effect |
| --- | --- |
| `title` | Page title. Required by the reference diagnostics configuration |
| `publish` | Publishes the entry under the explicit strategy |
| `private`, `draft` | Excludes the entry under the selective strategy |
| `noindex` | Keeps the entry out of listings and the sites index |
| `tags` | Feeds tag pages and listings |
| `created`, `modified`, `published`, `date` | Ordering and SEO timestamps |

WikiLinks, embeds, Mermaid, Excalidraw, and code blocks are handled by the configured plugins. Binary attachments are not copied into the deployment automatically: add a site-owned prebuild step that copies only the files you intend to publish, as `obsidianMarkdown()`, `attachment()`, and `media()` do not copy arbitrary vault files.

## 4. Start the development server

```bash
pnpm dev
```

This prepares the attachment assets for `apps/web` and starts the Vite/HonoX development server. Open the URL printed in the terminal. Markdown and application edits are picked up while the server runs.

## 5. Inspect and validate

These commands are read-only and safe to run at any time. Use them to confirm the resolved state before a build:

```bash
pnpm exec riebeckite check                  # validate configuration and plugin resolution
pnpm exec riebeckite doctor                 # health checks across environment, config, plugins, and content
pnpm exec riebeckite inspect config         # resolved roots, including the content directory
pnpm exec riebeckite inspect content --list # logical paths of loaded content
pnpm exec riebeckite inspect graph          # WikiLink relationships
pnpm exec riebeckite inspect plugins        # resolved plugins
pnpm exec riebeckite inspect build          # build state
```

`check`, `doctor`, and `inspect` answer different questions and do not replace one another. When a path looks wrong, `doctor` reports the content inspection failure, `inspect config` shows the resolved directory, and `inspect content --list` shows the logical paths that were actually loaded. See [Diagnostics](./diagnostics.md) and [Framework Inspector](./inspector.md).

## 6. Build

```bash
pnpm build
```

This builds `packages/cli` first, then builds `apps/web` for Cloudflare Workers into `apps/web/dist`. The build is incremental and reuses unchanged content:

```bash
pnpm exec riebeckite build          # incremental build
pnpm exec riebeckite build --full   # rebuild without incremental reuse
pnpm exec riebeckite profile        # trace-based performance report
```

Use `--full` when you deliberately want to bypass incremental reuse, for example after changing an attachment-copy step. See [Build system](./build-system.md).

## 7. Preview and deploy

```bash
pnpm --filter @riebeckite/web preview   # serve the built output locally with wrangler dev
pnpm --filter @riebeckite/web deploy    # build and deploy to Cloudflare Workers
```

Deployment settings live in `apps/web/wrangler.jsonc`; `assets.directory` points at `./dist`. Adjust the worker name, compatibility flags, and bindings there before your first deploy.

## 8. Extend the site

- **Add a plugin.** Install or reference the package, then register it in the `plugins` array. Read the package README under `packages/plugins/*/README_en.md` for its options. Plugins can add Markdown transforms, HTML transforms, assets, browser behavior, endpoints, SEO, and diagnostics.
- **Change presentation.** Swap the `theme` value or edit the theme options. See [Theme system](./theme-system.md).
- **Add routes and islands.** Site-specific pages belong in the application (`apps/web/app/routes`, `app/islands`). Keep HonoX and Vite APIs in the application or the integration, not in plugins.

## Use your own project

Generate a standalone site with the CLI or the scaffolder package, then install and build it:

```bash
pnpm exec riebeckite init my-site
# or: npm create riebeckite my-site
cd my-site
pnpm install
pnpm exec riebeckite check
pnpm exec riebeckite build
```

`init` writes a self-contained site that passes `check` and `build` as generated. It refuses to overwrite an existing non-empty target unless `--force` is passed.

The generated site follows the same site-application contract as the E2E fixture at [`tests/external-site/fixture/site`](../../tests/external-site/fixture/site). The fixture adds site-local extensions and an external vault, so it remains the reference when you need those. The essential files are:

| File | Role |
| --- | --- |
| `package.json` | Declares `honox`, `hono`, `vite`, and the `@riebeckite/*` packages |
| `riebeckite.config.ts` | Site, content, theme, and plugin configuration |
| `app/config.ts` | Resolves `content.directory` once against the application root |
| `app/content.ts` | Constructs `ContentManager` from the resolved config |
| `app/server.ts` | Mounts Riebeckite endpoints on the HonoX application via `mountRiebeckiteEndpoints` |
| `vite.config.ts` | Registers `riebeckite()`, `riebeckiteSsg()`, and the HonoX Vite plugin |

The fixture keeps its Obsidian vault in a sibling `vault/` directory and points `content.directory` at it, which is the recommended layout when the vault is also used by the Obsidian desktop application. See the external-vault section of [Configuration](./configuration.md) and [HonoX Integration](./honox-integration.md) for the resolution rules and boundary responsibilities.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Content does not appear | `publish: true` (explicit strategy), `content.exclude` patterns, and `inspect content --list` |
| A page 404s despite an existing file | The resolved permalink from `inspect graph` or `inspect content --list` |
| Attachments 404 after deployment | The site-owned copy step ran before the build and targeted `public/assets/attachments/` |
| `doctor` reports a content failure | `inspect config` for the resolved content directory and its existence |
| Build output is stale | Rerun without incremental reuse: `riebeckite build --full` |

## Next steps

For concepts and extension APIs, continue with [Content system](./content-system.md), [Plugin system](./plugin-system.md), and [Theme system](./theme-system.md). For the repository's own development workflow, see [Repository Development](./development.md).
