# @riebeckite/plugin-l10n

Content localization for Riebeckite Markdown. It detects a locale and a separate translation identity for every note, prefixes non-default URLs, exposes real translation variants to themes, and contributes `hreflang` links. It does not translate Riebeckite UI or render a language switcher.

[日本語](./README_ja.md)

## Basic setup

```ts
import { defineConfig } from "@riebeckite/core";
import { l10n } from "@riebeckite/plugin-l10n";

export default defineConfig({
  plugins: [l10n({ defaultLang: "ja", languages: ["ja", "en", "zh-CN"] })],
});
```

## Locale detection

Use `README.en.md` as the recommended filename form. The plugin also accepts `README-en.md`, `README_en.md`, and configured BCP 47-style tags such as `README.en-US.md` and `README.zh-CN.md`.

Directory detection is also supported:

```text
content/en/README.md
content/ja/README.md
```

Only directories matching configured `languages` are treated as locales. Frontmatter works anywhere:

```md
---
lang: en
translation: getting-started
---
```

Conventions may be mixed. Built-in precedence is **frontmatter > filename > directory > default language**. Conflicts emit `L10N_LANGUAGE_CONFLICT`; use `strict: true` to fail the build instead. A duplicate `translation + lang` emits `L10N_DUPLICATE_TRANSLATION` (and also fails in strict mode).

`translation` is independent of locale and filename. Use it to group files with unrelated paths or names:

```text
日本語/はじめに.md       lang: ja, translation: getting-started
English/getting-started.md lang: en, translation: getting-started
```

## URLs and missing translations

The default language keeps Core's resolved URL (`/about`); other languages are prefixed (`/en/about`). The plugin augments the existing content-location resolver, so it works with other URL plugins rather than creating a router. Different source paths or a permalink plugin can provide different resolved URLs for translations.

No fallback pages are generated. `getLocalization(manifest, slug)` returns `availableLanguages` and language-to-href `translations` only for notes that exist; themes own the switcher UI. `getLocalizedContent(manifest, slug, lang)` returns `null` for a missing translation.

## Custom detector

For another convention, provide `detect`. Its language is considered after frontmatter and before filename/directory; its `translationId` is explicit.

```ts
l10n({
  defaultLang: "ja",
  languages: ["ja", "en", "fr"],
  detect: ({ path }) =>
    path.startsWith("French/") ? { lang: "fr", translationId: "hello" } : undefined,
});
```

## Links and SEO

Before the existing Content Graph is built, WikiLink graph targets are switched to the source note's language when that translation exists; otherwise their original target remains. No second graph is created. Normal Markdown links retain their authored destination.

Each translated entry receives one `<link rel="alternate" hreflang="…">` per existing translation through Core's `headTags` extension point. The site shell remains responsible for rendering those tags and for selecting `<html lang>` for a request.
