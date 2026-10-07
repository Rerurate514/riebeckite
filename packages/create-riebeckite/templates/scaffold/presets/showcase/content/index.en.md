---
publish: true
---

# {{title}}

Welcome to your Riebeckite site. This preset is a tour: it registers the complete Riebeckite plugin catalog and ships content that puts each capability on screen.

## Explore

- [Plugins — representative packages grouped by capability](/framework/plugins)
- [Themes — built-in design packages and how to switch](/framework/themes)
- [Working examples](/examples/)
- [Plugin reference](/reference/plugins/)

## What is Riebeckite?

Riebeckite is an extensible, content-first framework that builds fast static sites from plain Markdown — the same notes you keep in Obsidian. It ships 50+ plugins and six themes, and this site demonstrates both.

## Edit this site

Content lives in `content/` as plain Markdown. Add a file, give it `publish: true` in the frontmatter, and it appears in the built site. The notes under `content/Daily/` feed the Daily Notes widget on this page.

This site is available in seven languages: the home page, examples, and framework pages are translated, while the guide and plugin/theme reference pages stay in English. Switch with the selector below the page title.

Localized pages use the `<base>.<lang>.md` convention next to the default file — for example `about.ja.md`. The l10n plugin serves them under `/lang/` paths and links them automatically.

Open `riebeckite.config.ts` to see every registered plugin and its options.
