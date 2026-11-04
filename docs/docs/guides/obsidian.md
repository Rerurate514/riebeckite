---
date: 2026-10-06
title: Publishing Obsidian notes
---
# Publishing Obsidian notes

Riebeckite can use your everyday Obsidian vault as the place where articles
live. You do not have to rebuild an existing vault for Riebeckite, or convert
your Markdown into another format.

To connect a vault and publish your first note, start with [Use Your Obsidian Vault](../getting-started/obsidian-vault.md).

The basic flow is:

```mermaid
flowchart LR
    Obsidian["Write in Obsidian"]
    Publish["publish: true"]
    Riebeckite["Riebeckite"]
    Preview["Preview in the browser"]
    Site["Public site"]

    Obsidian --> Publish
    Publish --> Riebeckite
    Riebeckite --> Preview
    Preview --> Site
```

Point Riebeckite at the vault and add `publish: true` only to the notes you
want to make public.

## In this section

- [Setup](./obsidian/setup.md)
- [Where to put the vault](./obsidian/placement.md)
- [Writing notes](./obsidian/writing.md)
- [Troubleshooting](./obsidian/troubleshooting.md)

## Compatibility at a glance

Riebeckite reads the vault's Markdown instead of asking you to convert it. The
supported range is:

| Area | Support | Details |
| --- | --- | --- |
| Markdown | Full | GFM, frontmatter, tables, math, footnotes |
| WikiLinks | Full | Notes, aliases, folders, headings, block ids, and same-page links. See [Wikilinks](../plugins/obsidian-markdown.md). |
| Note embeds | Partial | Whole notes, headings, and block ids; nested embeds stop at depth 3. |
| Images | Full | `![[image.png]]`, `![[image.png|300]]`, `![[image.png|300x200]]`, and `![[image.png|Alt text]]`. |
| PDF and media | Partial | PDF page/height fragments and video/audio start times. Browser codec support determines playback. |
| Callouts | Full | Standard and nested callouts, custom titles, and folding via native `<details>` with no client script. |
| Comments | Full | `%% ... %%` spans are removed; code spans and fences are preserved. |
| Dataview | Partial | DQL `LIST`, `TABLE`, `TASK`, `CALENDAR`, inline fields, `FLATTEN`, and per-task filtering. No DataviewJS. See [Dataview](../plugins/dataview.md). |
| Bases | Partial | Table, cards, and list views with filters, formulas, summaries, and grouping. Kanban and map render a notice. See [Bases](../plugins/bases.md). |

These tables describe the verified behavior, not an aspiration. Each plugin page
lists its own compatibility matrix and the limits that remain.

## Check before publishing

```sh
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite build
```

`check` validates configuration, `doctor` inspects content and links, and `build` writes the publishable files.

## Summary

The relationship between Obsidian and Riebeckite is simple.

```text
Obsidian vault
      |
Markdown
      |
Riebeckite
      |
Notes with publish: true
      |
Public site
```

You do not have to rebuild an existing vault for Riebeckite. If you are
starting fresh, you can use:

```text
my-site/content/
  -> Obsidian vault
```

If you already have a vault:

```text
notes/
  -> existing vault

my-site/
  -> Riebeckite site
```

**Keep the vault location and the publication scope separate.**

- `content.directory` -> which vault to read
- `exclude` -> what not to read as content
- `publish: true` -> what to publish to the site

By setting these three separately, you can keep private notes in your everyday
Obsidian vault while publishing only the articles you want with Riebeckite.

### Next steps

- [Writing content](./writing-content.md)
- [Separating content from the site](./content-repositories.md)
- [Riebeckite for Obsidian](../obsidian-plugin/README.md) (currently settings only)
- [Content System](../framework/content-system.md)
