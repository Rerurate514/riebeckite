---
date: 2026-10-06
title: Installation
sidebar:
  label: Installation
  order: 20
---
# Installation

This page takes you from an empty machine to a running site. It assumes nothing about Riebeckite, and it never asks you to clone the Riebeckite repository.

> **Documentation version:** this site documents the `main` branch. The `latest` npm tag can be older. Run `npm view @riebeckite/cli version` to see which version `npx create-riebeckite` and `npm exec riebeckite` will install. If a feature described here is missing, the published package predates it; use the next release or build from source.

## Requirements

| Item | Why | Where |
| --- | --- | --- |
| Node.js | Runs the Riebeckite commands. Requires `^20.19.0` or `>=22.12.0` | [nodejs.org](https://nodejs.org/) |
| A terminal | Where you type commands | **PowerShell** on Windows, **Terminal** on macOS |
| Git | Optional; used for repository history and GitHub deployment | [git-scm.com](https://git-scm.com/) |
| A GitHub account | Used for automatic deployment with GitHub Actions | [github.com](https://github.com/) |
| A Cloudflare account | Only for the deployment step | [cloudflare.com](https://www.cloudflare.com/) |

`npm` ships with Node.js, so you do not install it separately. Git and a GitHub account are optional; they are used for repository history and automatic deployment. If you publish to Cloudflare directly from your machine, you can add them later. See [Deployment](./deployment.md).

Confirm the tools are available:

```sh
node -v
npm -v
```

`node -v` must report a version matching `^20.19.0` or `>=22.12.0`, such as `v20.19.0`, `v22.12.0`, or `v24`. Update Node.js if yours is older or is an unsupported release such as `v21`. If a command is not found, install that tool and reopen the terminal.

## Create a site

In the folder where you want the site, run the generator:

```sh
npx create-riebeckite
```

`npx` downloads `create-riebeckite` and runs it once; nothing is installed globally. The CLI asks, in order:

1. **Project name** — the folder to create. The default is `my-riebeckite-site`; use `my-site` or another name if you prefer
2. **What would you like to build?** ([[glossary/preset|preset]]) — the site's composition; keep `Starter site` (the `starter` preset) when unsure. See [Presets](./presets.md)
3. **Add optional feature packs?** — choose `Yes` to select feature packs that add extra plugins. The default is `No`. Use `--features <names>` to add them non-interactively. See [Presets](./presets.md) for available packs
4. **Customize extra project files?** — choose `Yes` to change generated editor or tool files. The default is `No`, which still generates the default project files
5. **Where will you write content?** — `This project` keeps `content/` inside the site and is the simplest start. `Separate GitHub repository` is an advanced setup for an existing vault. See [Content Repositories](../guides/content-repositories.md)
6. **Set up deployment?** — `Cloudflare Workers`, `GitHub Actions`, or `Not now`. `Cloudflare Workers` asks `Deploy now?` after installation, so you can publish your first version right away. `GitHub Actions` deploys on every push. `Not now` skips deployment setup; see [Deployment](./deployment.md)
7. **Install dependencies now?** — defaults to `Yes`. Choose `No` when you need to inspect or install the generated project later.

To script the same setup instead of answering prompts, pass arguments, for example:

```sh
npx create-riebeckite my-site --preset starter
```

- If a generated top-level name conflicts with an existing entry, the command stops. Add `--force` only when you really want to overwrite.
- Unrelated files in the target folder are allowed without `--force`.
- List the available presets with `npx create-riebeckite --list-presets`.
- Passing a directory makes the command non-interactive: it skips the preset, content, deployment, and install prompts, and it does not install dependencies. Run `npm install` in the folder before `dev` (see below).

When you choose not to install dependencies in the prompt, move into the folder and install the packages:

```sh
cd my-site
npm install
```

The `@riebeckite/*` packages are published to npm, so this is all it takes. The first install can take a minute. If npm reports vulnerabilities, review them with `npm audit`; many come from transitive build dependencies. Avoid `npm audit fix --force` unless you have checked the version changes it would make.

These instructions use npm. If you use pnpm 10 or later, `pnpm install` can report ignored build scripts. Run `pnpm approve-builds`, review the packages, and approve the ones you trust before starting `dev`. Strict package managers do not expose transitive dependencies, so sites scaffolded before `@riebeckite/node`, `@riebeckite/runtime`, and `@riebeckite/spa` were declared in the site manifest need those packages added explicitly.

Recent npm 11 releases can also skip dependency install scripts. If `npm install` reports `Ignored build scripts: esbuild`, approve it with `npm approve-scripts esbuild`, then rerun `npm install`.

## What gets generated

| File or folder | Role |
| --- | --- |
| `riebeckite.config.ts` | Site name, URL, language, theme, and plugins. The first file to edit |
| `content/` | Where your Markdown pages live |
| `app/` | The site's appearance and routing. `routes/` and `components/` do most of the work |
| `public/` | Static assets copied as-is: `favicon.ico` and `riebeckite-logo.png`. The bundled favicon is a placeholder; replace it when you brand the site. A header logo or link-preview image is not generated by default; see [Branding your site](../guides/branding.md) to add them |
| `vite.config.ts` | Build settings. You normally leave this alone |
| `package.json` | The packages and the `riebeckite` commands |
| `README.md` | A short note specific to the generated site |
| `.gitignore`, `.editorconfig`, `.gitattributes`, `biome.json` | Default project files. Choose the `Customize extra project files?` prompt or `--utilities` to change them |

The exact files depend on the preset: `empty` generates a bare application shell, `starter` generates a practical site with connected sample notes, and `showcase` adds references, rendered examples, and local fixtures. See [Presets](./presets.md).

## Directory structure

The generated site folder looks like this:

```text
my-site/
├─ content/               Your Markdown files
├─ public/                Static files
├─ app/                   Generated app code (rarely edited)
├─ riebeckite.config.ts   Site configuration
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ biome.json             Default project files
├─ .editorconfig
├─ .gitattributes
├─ .gitignore
├─ README.md
└─ dist/                  Production build output (after build)
```

## Point the settings at your site

Open `riebeckite.config.ts` and edit the `site` block:

```ts
site: {
  title: "My Blog",
  description: "Notes from my days",
  baseUrl: "https://example.com",
  locale: "en",
},
```

| Field | Meaning |
| --- | --- |
| `title` | The site name |
| `description` | The summary used by SEO and feeds |
| `baseUrl` | The address the site will be published at. It ends up in the sitemap and feeds, so set the real URL after you deploy |
| `locale` | The site language (`"ja"` for Japanese, `"en"` for English) |

The rest of the generated config (`content`, `theme`, `plugins`) already matches the preset. Full field documentation is in [Configuration](../reference/configuration.md).

## Start the development server

```sh
npm exec riebeckite dev
```

The terminal prints a URL such as `http://localhost:5173`. If port 5173 is already in use, Vite chooses the next free port; open the URL that was printed. Markdown and application edits are picked up while the server runs. The dev server reads `content/` and does not create `dist/`; the build output appears only after `build`. Press `Ctrl + C` to stop. If the server fails to start, run `npm exec riebeckite doctor` and see the [CLI reference](../reference/cli.md).

## Everyday commands

Run these from inside the site folder:

```sh
npm exec riebeckite check         # validate the configuration
npm exec riebeckite dev           # start the development server
npm exec riebeckite build         # write the publishable files to dist/
npm exec -- riebeckite build --full  # rebuild without incremental reuse
```

For the first successful run, `check`, `dev`, and `build` are enough. If something looks wrong later, the CLI also has read-only diagnostic commands such as `check`, `doctor`, and `inspect`; see the [CLI reference](../reference/cli.md).

## Next

- [First Content →](./first-content.md)
