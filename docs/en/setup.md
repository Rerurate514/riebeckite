# Setup Guide

This guide walks a first-time user through Riebeckite from preparing a machine to publishing a blog. It is written so that you can follow it from top to bottom even if you are not comfortable with a terminal yet.

It covers three things.

1. Run this repository on your own machine
2. Create a new site with riebeckite
3. Publish it to Cloudflare Workers

> **Publication status**
> The core Riebeckite packages (`@riebeckite/*`) are published to npm. Use `npx create-riebeckite` to create a new site (section 2). Section 1 runs this repository itself.

## How to use this guide

You do not have to do everything at once. Start from the section that matches your goal.

|Goal|Read|
|---|---|
|Publish one working blog quickly|[1. Run this repository](#1-run-this-repository-on-your-machine) then [3. Publish to Cloudflare Workers](#3-publish-to-cloudflare-workers)|
|Build your own site from scratch|[1. Run this repository](#1-run-this-repository-on-your-machine) then [2. Create a new site](#2-create-a-new-site-with-riebeckite)|
|Contribute to development|[1. Run this repository](#1-run-this-repository-on-your-machine) then [Repository Development](./development.md)|

## What you need

|Item|What it is for|Where to get it|
|---|---|---|
|Node.js (LTS)|The runtime that executes the commands|[nodejs.org](https://nodejs.org/)|
|pnpm|The tool that installs packages|[`npm install -g pnpm`](https://pnpm.io/) after installing Node.js|
|Git|Cloning the repository|[git-scm.com](https://git-scm.com/)|
|A Cloudflare account|Where the site is published|[cloudflare.com](https://www.cloudflare.com/) (used in section 3)|
|A GitHub account|Only for automated deploys|[github.com](https://github.com/) (used in section 3, method B)|

Confirm that all three command-line tools are available. Open a terminal (PowerShell on Windows, Terminal on macOS) and run each line.

```sh
node -v
pnpm -v
git --version
```

Success looks like a version string such as `v24.11.1`. If a command is not found, that tool is not installed yet.

## 1. Run this repository on your machine

### 1-1. Clone the repository

In any folder you like, run:

```sh
git clone https://github.com/Rerurate514/riebeckite.git
cd riebeckite
```

You should now have a `riebeckite` folder and be inside it.

### 1-2. Install the dependencies

```sh
pnpm install
```

The first run takes a few minutes. If it looks stalled, wait; it is still working.

### 1-3. Build the commands (the first trap)

The `riebeckite` command does not work until the programs in this repository are built. If you skip this and continue, you will hit the following error.

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\packages\cli\dist\cli.js'
```

When you see it, run this. It is the correct fix.

```sh
pnpm build
```

This builds both the CLI and the reference site. To build only the CLI, run:

```sh
pnpm --filter @riebeckite/cli build
```

### 1-4. Start the reference site

```sh
pnpm dev
```

After a moment, the terminal prints a URL such as `http://localhost:5173`. Open it in a browser to see the reference site. To stop, press `Ctrl + C` in that terminal.

### 1-5. Give the site a page

A fresh clone has no content, so the site shows nothing. Create a `content` folder at the repository root and add `index.md`:

```md
---
title: Hello
publish: true
---

# Hello

My first page.
```

`title` (the page title) and `publish: true` (the publish flag) are both required. Without them the page will not appear. Add more Markdown files with the same two lines to grow the site.

### 1-6. Check the state

When something looks wrong, two commands tell you why.

```sh
pnpm exec riebeckite check
```

This validates the configuration. On success it prints `Riebeckite configuration is valid.`

```sh
pnpm exec riebeckite doctor
```

This is a fuller health check. Entries marked `✗` point at a problem, such as a missing frontmatter field. Fixing what the message describes clears it. With no content yet, doctor reports content issues; the page from 1-5 reduces them.

## 2. Create a new site with riebeckite

This section creates a site separate from this repository. It assumes Node.js is installed.

### 2-1. Generate the starter

From the folder where you want the site, run the following. Replace `my-site` with any name you like.

```sh
npx create-riebeckite my-site
```

This creates a `my-site` folder containing the whole site. Omit the name to generate into the current folder. If the target folder already has content, the command stops instead of overwriting it. Add `--force` only when you mean to overwrite, and choose a composition with `--preset` (`starter`, `rich`, and so on).

### 2-2. What gets generated

The important pieces are:

|File or folder|Role|
|---|---|
|`riebeckite.config.ts`|Site name, URL, and which features to use. This is the first file to edit|
|`content/`|Where your Markdown pages live|
|`app/`|The site's appearance and routing. `routes/` and `components/` do most of the work|
|`vite.config.ts`|Build settings. You normally leave this alone|
|`package.json`|The list of packages and commands|
|`README.md`|A short note specific to this site|

### 2-3. Point the settings at your site

Open `riebeckite.config.ts` and edit the `site` block with your own details.

```ts
site: {
  title: "My Blog",
  description: "Notes from my days",
  baseUrl: "https://example.com",
  locale: "en",
},
```

`title` is the site name, `description` is the summary, and `baseUrl` is the address the site will be published at. `baseUrl` ends up in the sitemap and feeds, so it is worth setting it to the real URL after you publish in section 3. `locale` is the language (`"ja"` for Japanese, `"en"` for English).

### 2-4. Write a page

Add a `.md` file under `content/`. The format is the same as in 1-5: start with these two lines.

```md
---
title: My first post
publish: true
---
```

The file name becomes part of the URL. `content/first-post.md` is served at `/first-post`.

### 2-5. Install the packages

Move into the site folder and run `npm install` to add the packages such as `@riebeckite/*`.

```sh
cd my-site
npm install
```

The packages are published to npm, so this is all it takes. Wait for it to finish; if no error appears, you are done.

### 2-6. Everyday commands for a new site

Once the install succeeds, use these from inside the site folder.

```sh
npm run dev           # start the development server
npm run check         # validate the configuration
npm run doctor        # fuller health check
npm run build         # write the publishable files to dist/
```

## 3. Publish to Cloudflare Workers

### 3-1. How publishing works

During a build, Riebeckite renders every page to a static file (this approach is called SSG). Publishing means placing the contents of the `dist/` folder on Cloudflare Workers as static assets. No server-side program is required, which keeps both the cost and the setup simple. (Optional: page-view tracking is a separate Worker; see [Analytics](./analytics.md) when you want it.)

### 3-2. Method A: publish from your machine (recommended)

This avoids fiddling with Cloudflare's dashboard and is the easiest route.

1. Create an account at [Cloudflare](https://www.cloudflare.com/).
2. In the site folder, install wrangler (Cloudflare's publishing command).

   ```sh
   npm install -D wrangler
   ```

3. Copy `templates/cloudflare/wrangler.jsonc` into the site root and change `name` to a Worker name unique to you. Confirm that `assets.directory` is `./dist`.
4. Build, log in to Cloudflare, and publish.

   ```sh
   npm run build
   npx wrangler login
   npx wrangler deploy
   ```

5. Open the URL printed at the end (`https://<name>.<account>.workers.dev`). If the site appears, you are done. Put that URL into `baseUrl` in `riebeckite.config.ts`, then rebuild and redeploy so the sitemap and feeds use the correct address.

You can verify everything without uploading:

```sh
npx wrangler deploy --dry-run   # validate the config and files only
npx wrangler dev                # serve the same output locally
```

**To publish the reference site in this repository**, wrangler and `wrangler.jsonc` are already in place. Run this from the repository root. You can change the Worker name via `name` in `apps/web/wrangler.jsonc`.

```sh
pnpm build
pnpm --filter @riebeckite/web exec wrangler login
pnpm --filter @riebeckite/web exec wrangler deploy
```

### 3-3. Method B: publish automatically on every push

If running the publish command by hand gets tedious, automate it with GitHub Actions using the [Cloudflare deployment template](../../templates/cloudflare/README_en.md).

1. Copy `templates/cloudflare/wrangler.jsonc` into the site root and change `name`.
2. Copy `templates/cloudflare/.github/workflows/deploy.yml` into the site repository at the same path.
3. In Cloudflare, create an API token with the **Workers Scripts: Edit** permission, then add these under Settings → Secrets and variables → Actions in the GitHub repository:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Push to `main`, or run the workflow manually from the Actions tab.

This method uses `npm ci` for installation, so commit the `package-lock.json` that your first `npm install` creates. The template README lists the full prerequisites and flow.

## When something goes wrong

|Symptom|Cause|Fix|
|---|---|---|
|`Cannot find module ... cli.js`|The CLI is not built yet|Run `pnpm build`|
|The `riebeckite` command is not found|Same as above, or you are in the wrong folder|Run `pnpm build`, then confirm you are at the repository root|
|A page does not appear|`content/` is empty, or `publish: true` / `title` is missing|Check the two frontmatter lines|
|`npm install` returns 404 for `@riebeckite/*`|A transient registry problem, or a version mismatch|Wait a moment and retry; if it persists, try `npm cache clean --force`|
|A page returns 404|The file name and URL do not match|Check the file name and its location under `content/`|
|The published site returns 404|The build output is not in `dist/`|Run `npm run build` and check `directory` in `wrangler.jsonc`|
|`doctor` marks Content with `✗`|A page has a problem|Fix it as the printed message describes|
|Old content keeps appearing|The incremental build holds stale state|Rebuild with `npm run build -- --full`|

## A plain-language glossary

- **Repository**: a single home for a program and its files. Here it means Riebeckite itself.
- **Dependency**: a package a program needs in order to run. `npm install` fetches them all.
- **Build**: converting source files into a form that can actually run.
- **Dev server**: a way to show the site on your own machine only. Start it with `npm run dev`.
- **SSG / static assets**: rendering every page to a file ahead of time and serving those files directly.
- **Cloudflare Workers**: where the site is published. Here it only stores static files.
- **wrangler**: the command that publishes to Cloudflare.
- **frontmatter**: the settings between `---` markers at the top of a Markdown file (`title`, `publish`, and so on).
- **npm / npx**: the tools that install packages and run commands.

## See also

- [Getting Started](./getting-started.md) — the shortest path to running and building
- [Usage Guide](./guide.md) — configuration through deployment, end to end
- [CLI](./cli.md) — detailed descriptions of each command
- [Repository Development](./development.md) — for contributing to this repository itself
- [Cloudflare deployment template](../../templates/cloudflare/README_en.md) — details of automated deploys