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

## l10n options reference
The l10n plugin accepts the following options, defined in `packages/plugins/l10n/src/l10n.ts`:

| Option | Purpose |
| --- | --- |
| `defaultLang` | The language that keeps unprefixed URLs. Required. Must appear in `languages`. |
| `languages` | The recognized languages. Only these are treated as locales. |
| `strict` | Turn language conflicts and duplicate translations into build failures. |
| `ui` | `false` to disable the switcher, or `{ slot, render }` to customize it. |
| `detect` | Custom detection: returns `{ lang, translationId }` or `undefined`. |

```ts
import { l10n } from "@riebeckite/plugin-l10n";
export default defineConfig({
  plugins: [l10n({ defaultLang: "ja", languages: ["ja", "en", "zh-CN"] })],
});
```

The full option list and implementation notes are in the [plugin README](../plugins/l10n.md).

## Head tag generation
The l10n plugin generates `hreflang` link tags for each translated version of a note. These are added to the note's `headTags` during manifest creation, defined in `packages/plugins/l10n/src/l10n.ts` via the `addLocalizationHeadTags` function. Each translated entry receives one `<link rel="alternate" hreflang="…">` per existing translation. The site shell renders those tags and selects `<html lang>` for a request.

This works in combination with the [SEO plugin](./feed.md) to emit language alternates for SEO.
