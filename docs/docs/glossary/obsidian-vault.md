---
date: 2026-10-14
title: Obsidian Vault
sidebar:
  hidden: true
---

# Obsidian Vault

Riebeckite can read an existing Obsidian vault as its content directory, allowing you to publish selected notes without reorganizing the vault.

## Connecting your vault

Open `riebeckite.config.ts` and point `content.directory` at your vault path:

```ts
content: {
  directory: "../my-vault",
}
```

Change `../my-vault` to the relative path from your site to the vault.

The `starter` preset already includes the Obsidian Markdown plugin for WikiLinks, embeds, callouts, and tags.

## Explicit publishing

Add `publish: true` frontmatter to notes you want to make public:

```md
---
title: Hello
publish: true
tags:
  - example
aliases:
  - Hello note
---
```

Notes without `publish: true` are treated as drafts and not built.

Run `riebeckite check` and `riebeckite doctor` to validate links and content state.

## WikiLinks and embeds

WikiLinks are supported: `[[note]]`, `[[note|label]]`, `[[note#Heading]]`.

Image embeds work too: `![[sample.png]]`.

Callouts are supported: `> [!NOTE]`

Tags are supported and tag pages are provided by the starter taxonomy plugin.

## Obsidian Markdown Plugin
The `starter` preset includes the `@riebeckite/plugin-obsidian-markdown` plugin, which provides:
- WikiLink resolution (`[[note]]`, `[[note|label]]`, `[[note#Heading]]`)
- Image embeds (`![[sample.png]]`)
- Callout parsing (`> [!WARNING]` etc.)
- Tag `#hashtag` conversion to taxonomy tag links

## Related terms

- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## Learn more

- [Obsidian Vault](../getting-started/obsidian-vault.md)
