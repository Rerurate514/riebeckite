# Localization

Riebeckite localizes **content**. It can keep several language versions of the same note side by side, prefix non-default languages in the URL, add a language switcher, and emit `hreflang` links. It does not translate Riebeckite's own interface strings.

Localization is provided by [`@riebeckite/plugin-l10n`](../../../packages/plugins/l10n/README.md). The `starter` preset and above register it with seven languages; `minimal` does not.

## Basic setup

```ts
import { defineConfig } from "@riebeckite/core";
import { l10n } from "@riebeckite/plugin-l10n";

export default defineConfig({
  plugins: [l10n({ defaultLang: "ja", languages: ["ja", "en", "zh-CN"] })],
});
```

`defaultLang` must appear in `languages`.

## How a note's language is detected

The plugin looks for four signals, in this precedence order:

1. **Frontmatter** — `lang:` anywhere in the file.
2. **Custom detector** — if you provide `detect`.
3. **Filename** — `note_ja.md` (recommended), and also `note.en.md`, `note-en.md`, or BCP 47 tags such as `note.en-US.md`, `note.zh-CN.md`.
4. **Directory** — `content/en/note.md`, `content/ja/note.md`.

A directory is treated as a locale only when it matches a configured `languages` entry. Signals can be mixed; a conflict emits `L10N_LANGUAGE_CONFLICT`, which becomes a build failure with `strict: true`.

## Grouping translations

Translation identity is independent of the file's path or name. Give the same `translation` value to every language version:

```md
---
lang: en
translation: getting-started
---
```

```text
日本語/はじめに.md            lang: ja, translation: getting-started
English/getting-started.md   lang: en, translation: getting-started
```

A duplicate `translation + lang` pair emits `L10N_DUPLICATE_TRANSLATION` (again a build failure under `strict: true`). Use `translation` when the files have unrelated paths or names.

For a convention the plugin does not know, supply `detect`. Its language is considered after frontmatter and before filename/directory, and its `translationId` is explicit:

```ts
l10n({
  defaultLang: "ja",
  languages: ["ja", "en", "fr"],
  detect: ({ path }) =>
    path.startsWith("French/") ? { lang: "fr", translationId: "hello" } : undefined,
});
```

## URLs and missing translations

The default language keeps Core's resolved URL (`/about`); other languages are prefixed (`/en/about`). The plugin augments the existing content-location resolver rather than adding a router, so it composes with URL plugins such as `@riebeckite/plugin-permalink`.

No fallback pages are generated. If a translation is missing, the original target stays linked and internal helpers report the absence:

- `getLocalization(manifest, slug)` returns `availableLanguages` and language-to-href `translations` only for notes that exist.
- `getLocalizedContent(manifest, slug, lang)` returns `null` for a missing translation.

## Language switcher

`l10n(...)` publishes a built-in, styled `LanguageSwitcher` in the standard `article.after-meta` layout slot. A standard site renders that slot, so no l10n-specific integration is needed. The switcher is omitted on a page with fewer than two real translations.

```ts
// Keep URLs and metadata but do not render UI.
l10n({ defaultLang: "ja", languages: ["ja", "en"], ui: false });

// Use another standard slot, or replace the component.
l10n({
  defaultLang: "ja",
  languages: ["ja", "en"],
  ui: {
    slot: "article.footer",
    render: ({ localization }) => `<p>${localization.lang}</p>`,
  },
});
```

Themes can restyle the default component through its `.l10n-switcher` classes. `ui.render` is framework-neutral HTML, so a custom site can supply its own server-rendered component.

## Links and SEO

Before the content graph is built, WikiLink targets are switched to the source note's language when that translation exists; otherwise the original target remains. The rendered article rewrites both Obsidian WikiLinks (after `@riebeckite/plugin-obsidian-markdown` resolves them) and Markdown links to an existing translation in the current page's language, preserving query strings and fragments. External, fragment-only, unknown, and asset URLs are left unchanged.

Each translated entry receives one `<link rel="alternate" hreflang="…">` per existing translation through Core's head-tag extension point. The site shell renders those tags and selects `<html lang>` for a request.

## Options reference

| Option | Purpose |
| --- | --- |
| `defaultLang` | The language that keeps unprefixed URLs. Required |
| `languages` | The recognized languages. Only these are treated as locales |
| `strict` | Turn language conflicts and duplicate translations into build failures |
| `ui` | `false` to disable the switcher, or `{ slot, render }` to customize it |
| `detect` | Custom detection: returns `{ lang, translationId }` or `undefined` |

The full option list and implementation notes are in the [plugin README](../../../packages/plugins/l10n/README.md).

## See also

- [Configuration](../reference/configuration.md) — `plugins` and `content`
- [Plugin API](../reference/plugin-api.md) — public-location resolution
- [Content System](../framework/content-system.md) — how resolved locations reach pages


