---
title: Localization
sidebar:
  hidden: true
---

# Localization

The l10n plugin that lets one site serve content in several languages. It detects a note's language, groups translations, and publishes a language switcher.

## How language is detected

1. The `lang` frontmatter field.
2. A custom detect function, if configured.
3. The filename suffix, such as `.ja.md`.
4. The configured default language.

## What it adds

- Groups a note's language versions as [translations](./translation.md).
- Publishes a [language switcher](./language-switcher.md).
- Prefixes non-default languages in the URL, such as `/ja/`.
