# First content

A Riebeckite site is only as real as its first article. This page writes one, previews it, and builds the publishable output.

## Where articles live

Markdown files go under the content directory from `riebeckite.config.ts` — `content/` in a generated site:

```text
my-site/
├─ content/
│  ├─ index.md
│  └─ first-post.md
├─ dist/               ← created by build
├─ riebeckite.config.ts
└─ package.json
```

The default publish strategy is **explicit**: a page appears only when its frontmatter has `publish: true`.

## Write the smallest article

Create `content/first-post.md`:

```md
---
title: First post
publish: true
---

# First post

This is my first Riebeckite article.
```

`title` is the page title and `publish: true` is the publish flag. Both are required for a page to appear under the explicit strategy. The file name becomes part of the URL: `content/first-post.md` is served at `/first-post`, and `content/index.md` is served at `/`.

You can use regular Markdown, and — because `starter` and above register Obsidian Markdown — Obsidian syntax such as WikiLinks:

```md
Link with [[Another note]] and embed an image with ![[attachments/diagram.png]].
```

See [Writing content](../guides/writing-content.md) for frontmatter fields, drafts, images, and internal links.

## Preview locally

```sh
npm exec riebeckite dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`). Markdown and application edits are picked up while the server runs. Press `Ctrl + C` to stop it.

If a page does not appear, confirm the two frontmatter lines and check what actually loaded:

```sh
npm exec riebeckite inspect content --list   # logical paths that were loaded
npm exec riebeckite inspect graph            # WikiLink relationships
```

## Check before building

```sh
npm exec riebeckite check     # configuration and plugin resolution
npm exec riebeckite doctor     # broader health check, including content
```

Both are read-only. `doctor` marks content problems with `✗`; fix what the message describes.

## Build

```sh
npm exec riebeckite build
```

A successful build writes the publishable files to `dist/`. The build is normally **incremental** and reuses unchanged content.

```sh
npm exec riebeckite build --full   # skip incremental reuse
```

Use `--full` when something looks stale, for example after you change how attachments are copied. See [Build system](../framework/build-system.md) for the incremental model.

## Next

- [Deployment →](./deployment.md)
