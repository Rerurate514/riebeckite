---
date: 2026-10-06
title: Localization
---
# Localization

Riebeckite localizes **content**. With `@riebeckite/plugin-l10n` it can keep several language versions of the same note side by side, prefix non-default languages in the URL, add a language switcher, and emit `hreflang` links. It does not translate Riebeckite's own interface strings.

```mermaid
flowchart LR
    Content["Markdown"]
    L10n["l10n Plugin"]
    EN["English"]
    JA["Japanese"]

    Content --> L10n
    L10n --> EN
    L10n --> JA
```

The plugin handles per-content language detection, language-specific URLs, translations of the same content, in-site links, the language switcher, and `hreflang` for SEO.

The `showcase` preset registers it with seven languages:

```text
en
ja
zh-CN
es
de
fr
ko
```

`starter` uses a single page language selected from the site locale; `minimal` is English-only. Add l10n only when the site needs translated routes. You do not need articles in every language; configure only the languages you actually use.

## In this section

- [Setup](./localization/setup.md)
- [Translations](./localization/translations.md)

## Introduction flow

When building a multilingual site, it helps to decide things in this order:

```mermaid
flowchart TD
    Lang["1. Decide the languages you use"]
    Config["2. Configure l10n"]
    Detection["3. Decide how language is detected"]
    Content["4. Write articles in each language"]
    Translation["5. Pair them with translation"]
    Link["6. Check URLs and links"]
    SEO["7. Combine with SEO if needed"]

    Lang --> Config
    Config --> Detection
    Detection --> Content
    Content --> Translation
    Translation --> Link
    Link --> SEO
```

## Summary

Riebeckite localization is easier to reason about when you separate three things:

```text
lang
  → what language this content is in

translation
  → which content is a translation of which

Public Location
  → at which URL that language's content is published
```

The language is decided in this precedence order:

```text
frontmatter
    ↓
custom detector
    ↓
filename
    ↓
defaultLang
```

Translation relationships are stated with `translation`, and only translations that actually exist are used. Riebeckite never generates a missing translation automatically.

## Options reference

| Option | Purpose |
| --- | --- |
| `defaultLang` | The language that keeps unprefixed URLs. Required |
| `languages` | The recognized languages. Only these are treated as locales |
| `translationKey` | Frontmatter property that holds the translation identity. Defaults to `translation` |
| `strict` | Turn language conflicts and duplicate translations into build failures |
| `detect` | Custom detection: returns `{ lang, translationId }` or `undefined` |

The full option list and implementation notes are in the plugin README.

## See also

- [Configuration](../reference/configuration.md) — `plugins` and `content`
- [Plugin API](../reference/plugin-api.md) — public-location resolution
- [Content System](../framework/content-system.md) — how resolved locations reach pages
