---
title: Locale
sidebar:
  hidden: true
---

# Locale

The language and region identifier a site or page is written for, such as en or ja. The default locale decides which language is served without a URL prefix.

## Default locale and prefixes

| Setting | Effect |
| --- | --- |
| `defaultLang: en` | English is served unprefixed |
| `languages: [en, ja]` | Japanese is served under `/ja/` |

## Per-page language

A page's locale comes from the `lang` frontmatter field or the filename suffix. It determines which URL prefix the page gets.

## Locale and URL generation
The locale determines the URL prefix for each page. The default language (configured via `l10n.defaultLang`) keeps its URL unprefixed (`/`about`), while other languages get prefixed with their language code (`/en/about`, `/ja/about`). This prefix is added by the l10n plugin during public location resolution, not by rewriting filenames on the filesystem.

The language detection precedence, defined in `packages/plugins/l10n/src/l10n.ts`, is:

1. **Frontmatter** — `lang:` anywhere in the file's frontmatter
2. **Custom detector** — if `detect` option is provided
3. **Filename suffix** — `.ja.md`, `-en.md`, `_en-US.md`, etc.
4. **`defaultLang`** — used when no other signal resolves the language

```ts
// Example: language detection precedence
l10n({
  defaultLang: "ja",
  languages: ["ja", "en"],
  detect: ({ path }) => path.startsWith("French/") ? { lang: "fr" } : undefined,
});
```

The resolved locale is stored in the manifest's `publicLocation.language` and used by the integration to render the correct `<html lang>` attribute and URL prefix.

## Related terms
