---
title: Installation
sidebar:
  label: Installation
  order: 20
---
# Installation

This page takes you from an empty machine to a running site. It assumes nothing about Riebeckite, and it never asks you to clone the Riebeckite repository.

## Requirements

| Item | Why | Where |
| --- | --- | --- |
| Node.js (LTS) | Runs the Riebeckite commands | [nodejs.org](https://nodejs.org/) |
| A terminal | Where you type commands | **PowerShell** on Windows, **Terminal** on macOS |
| Git | Manages the site as a repository | [git-scm.com](https://git-scm.com/) |
| A GitHub account | Used for automatic deployment with GitHub Actions | [github.com](https://github.com/) |
| A Cloudflare account | Only for the deployment step | [cloudflare.com](https://www.cloudflare.com/) |

`npm` ships with Node.js, so you do not install it separately. Git and a GitHub account are only needed for automatic deployment; if you publish to Cloudflare directly from your machine, you can add them later. They are used in [Deployment](./deployment.md).

Confirm the tools are available:

```sh
node -v
npm -v
git --version
```

Each should print a version such as `v22.0.0`. If a command is not found, install that tool and reopen the terminal.

## Create a site

In the folder where you want the site, run the generator:

```sh
npx create-riebeckite
```

`npx` downloads `create-riebeckite` and runs it once; nothing is installed globally. The CLI asks, in order:

1. **Project name** — the folder to create, for example `my-site`
2. **Preset** — the site's composition; keep `starter` when unsure. See [Presets](./presets.md)
3. **Content source** — `This project` keeps `content/` inside the site and is the simplest start. `Separate GitHub repository` is an advanced setup for an existing vault: it asks for the content and site repositories and configures GitHub Actions deployment automatically. See [Content Repositories](../guides/content-repositories.md)
4. **Deployment** — `Cloudflare Workers`, `GitHub Actions`, or `Not now`. `Cloudflare Workers` installs dependencies and then asks `Deploy now?`, so you can publish your first version right away. `GitHub Actions` deploys on every push. `Not now` skips deployment setup; see [Deployment](./deployment.md)

To script the same setup instead of answering prompts, pass arguments, for example:

```sh
npx create-riebeckite my-site --preset starter
```

- If the target folder already has files, the command stops instead of overwriting. Add `--force` only when you really want to overwrite.
- List the available presets with `npx create-riebeckite --list-presets`.

Then move into the folder and install the packages:

```sh
cd my-site
npm install
```

The `@riebeckite/*` packages are published to npm, so this is all it takes. The first install can take a minute.

## What gets generated

| File or folder | Role |
| --- | --- |
| `riebeckite.config.ts` | Site name, URL, language, theme, and plugins. The first file to edit |
| `content/` | Where your Markdown pages live |
| `app/` | The site's appearance and routing. `routes/` and `components/` do most of the work |
| `public/` | Static assets copied as-is: the favicon, header logo, and link preview image. See [Branding your site](../guides/branding.md) |
| `vite.config.ts` | Build settings. You normally leave this alone |
| `package.json` | The packages and the `riebeckite` commands |
| `README.md` | A short note specific to the generated site |

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

The terminal prints a URL such as `http://localhost:5173`. Open it in a browser; Markdown and application edits are picked up while the server runs. Press `Ctrl + C` to stop.

## Everyday commands

Run these from inside the site folder:

```sh
npm exec riebeckite dev           # start the development server
npm exec riebeckite build         # write the publishable files to dist/
npm exec -- riebeckite build --full  # rebuild without incremental reuse
```

For the first successful run, `dev` and `build` are enough. If something looks wrong later, the CLI also has read-only diagnostic commands such as `check`, `doctor`, and `inspect`; see the [CLI reference](../reference/cli.md).

## Next

- [First Content →](./first-content.md)
