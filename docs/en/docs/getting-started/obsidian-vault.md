# Use Your Obsidian Vault

Already have an Obsidian Vault? Riebeckite can read that Vault as the site's content directory. Start locally first, publish one note, check links and images, then build `dist/`.

## Before you start

You need:

- Node.js installed
- An existing Obsidian Vault
- At least one note you are comfortable publishing

Riebeckite does not need your Obsidian workspace settings. `.obsidian/` is ignored automatically, so you do not need to delete it from your Vault.

## 1. Create a Riebeckite site

Create a site next to your Vault:

```sh
npx create-riebeckite my-site --preset starter
cd my-site
```

The `starter` preset already includes the Obsidian Markdown plugin used for WikiLinks, embeds, callouts, and tags.

## 2. Connect your Vault

Open `riebeckite.config.ts` and point `content.directory` at your Vault:

```ts
content: {
  directory: "../my-vault",
},
```

Change `../my-vault` to the relative path from `my-site` to your Vault.

## 3. Choose what to publish

Riebeckite uses explicit publishing by default.

Add this frontmatter to a note you want to publish:

```yaml
---
title: Hello
publish: true
tags:
  - example
aliases:
  - Hello note
---
```

What this means:

- `publish: true` makes the note routable and buildable.
- `publish: false` keeps the note out of the built site.
- Missing `publish` is treated as a draft in the default `starter` setup.

If a published note links to a draft, the draft page is not generated. Before publishing, check public pages for links you do not want to expose.

## 4. Start Riebeckite

Install dependencies and run the check command:

```sh
npm install
npm exec riebeckite check
```

Then start the local preview:

```sh
npm exec riebeckite dev
```

Open the local URL printed in the terminal.

## 5. Check WikiLinks and images

These examples were verified with a fresh `starter` site and a small test Vault.

WikiLinks:

```md
[[hello]]
[[hello|custom hello label]]
[[hello#Details|hello details]]
[[Hello note]]
```

Images in your Vault can be embedded with Obsidian syntax:

```md
![[sample.png]]
```

Riebeckite resolves the image from the Vault and copies public referenced images into `dist/` during build. You do not need to move images to a Riebeckite-only folder for this basic case.

Note embeds also work for published notes:

```md
![[embedded]]
```

## 6. Build the site

When the local preview looks right, build the static site:

```sh
npm exec riebeckite build
```

The output is written to `dist/`.

## What works from Obsidian?

| Obsidian feature | Riebeckite |
| --- | --- |
| Markdown | Supported as core Markdown |
| WikiLinks | Supported by the starter Obsidian Markdown plugin |
| WikiLink aliases | Supported, including `[[note|label]]` |
| Heading links | Supported, for example `[[note#Heading]]` |
| Images | Supported for public referenced images such as `![[sample.png]]` |
| Note embeds | Supported for published Markdown notes |
| Callouts | Supported, for example `> [!NOTE]` |
| Tags | Supported by the Obsidian Markdown plugin; tag pages are provided by the starter taxonomy plugin |
| Frontmatter | Supported |
| Obsidian aliases | Supported for WikiLink resolution through `aliases:` |
| `publish` | Supported; `publish: true` is public, drafts are not built |
| Canvas | Requires `@riebeckite/plugin-canvas` |
| Excalidraw | Requires `@riebeckite/plugin-excalidraw` |
| Bases | Requires `@riebeckite/plugin-bases` |
| Mermaid | Requires `@riebeckite/plugin-mermaid` for rendered diagrams; otherwise Mermaid fences are code blocks |
| `.obsidian/` | Not required by Riebeckite; ignored automatically |

## Keep the Vault in another repository

The shortest path is to point `content.directory` at a local Vault folder. If you want to keep your Vault and site in separate GitHub repositories, use the separate content repository workflow instead.

See [Content Repositories](../guides/content-repositories.md) for the GitHub Actions setup.

## Next steps

- Edit more notes and add `publish: true` only where needed
- Run `npm exec riebeckite check` after config changes
- Run `npm exec riebeckite build` before deployment
- Try [Add Your First Plugin](./first-plugin.md) when you want more features
