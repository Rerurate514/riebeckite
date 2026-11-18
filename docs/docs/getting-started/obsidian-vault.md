---
date: 2026-10-06
title: Use Your Obsidian Vault
sidebar.order: 50
---
# Use Your Obsidian Vault

Already have an [[glossary/obsidian-vault|Obsidian Vault]]? Riebeckite can read that Vault as the site's content directory. Start locally first, publish one note, check links and images, then build `dist/`.

For publication rules and day-to-day operation, see [Publishing Obsidian notes](../guides/obsidian.md).

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
- Missing `publish` falls back to the default `content.filters.publishStrategy: explicit`, so the note is treated as a draft in the default `starter` setup (see [Publication rules](../guides/deployment/separate-content-repository/publishing.md#publication-rules)).

If a published note links to an unpublished note, the target page is not generated, and links to unpublished notes are not published as working site links — they render like broken links.

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

While the development server is running, saving a note in Obsidian is reflected on the next page view. Changing the `publish` setting is reflected the same way.

---

For the full feature guide, including WikiLink and image checking, troubleshooting, and advanced setup, see [Publishing Obsidian notes](../guides/obsidian.md).

## Next steps

- Edit more notes and add `publish: true` only where needed
- Run `npm exec riebeckite check` after config changes
- Run `npm exec riebeckite build` before deployment