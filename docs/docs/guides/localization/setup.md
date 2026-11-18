---
date: 2026-10-06
title: Setup
sidebar.label: Setup
sidebar.order: 10
---
# Setup

## Basic setup

Add the `l10n` plugin to `riebeckite.config.ts`:

```ts
import { l10n } from "@riebeckite/plugin-l10n";

export default defineConfig({
  plugins: [l10n({ defaultLang: "ja", languages: ["ja", "en", "zh-CN"] })],
});
```

`defaultLang` must appear in `languages`. In this example the default is `ja` and the recognized languages are `ja`, `en`, and `zh-CN`.

`defaultLang` is also used when a content's language cannot be determined by any other method.

### Fallback for listing pages

Generated listings default to the current page language. If a note exists only in another language, set `fallbackLocale` to let those listings use it:

```ts
l10n({
  defaultLang: "ja",
  languages: ["ja", "en"],
  fallbackLocale: "en",
});
```

The fallback is applied per translation group, never by matching titles or dates. The fallback note keeps its own language and URL.

## How a note's language is detected

The plugin looks for four signals, in this precedence order:

1. **[[glossary/frontmatter|Frontmatter]]** — `lang:` anywhere in the frontmatter block.
2. **Custom detector** — if you provide `detect`.
3. **Filename** — `note.ja.md` (recommended), and also `note-en.md` / `note_ja.md`, or BCP 47 tags such as `note.en-US.md`, `note.zh-CN.md`.
4. **`defaultLang`** — used when nothing above matched.

```mermaid
flowchart TD
    Start["Content"]
    FM{"Language in<br/>frontmatter?"}
    Detector{"Resolved by<br/>custom detector?"}
    File{"Resolved by<br/>filename?"}
    Default["defaultLang"]

    Start --> FM
    FM -->|Yes| Result["Language decided"]
    FM -->|No| Detector
    Detector -->|Yes| Result
    Detector -->|No| File
    File -->|Yes| Result
    File -->|No| Default
```

The first method that resolves the content decides its language.

The filename suffix is the only implicit signal the plugin infers from the path; a language directory such as `content/en/note.md` is not treated as a locale. Signals can be mixed; a conflict emits `L10N_LANGUAGE_CONFLICT`, which becomes a build failure with `strict: true`.

## Setting the language in frontmatter

The most explicit signal is the frontmatter `lang`:

```md
---
title: Hello
lang: ja
publish: true
---

This is a Japanese article.
```

This content is treated as Japanese. Use it when you want to state the language independently of the file's location or name.

## Splitting by filename

When several languages live in the same directory, split them by filename suffix:

```text
README.md
README.ja.md
```

The `.ja` in `README.ja.md` marks the content as Japanese. The `defaultLang` language does not get a suffix.

`.lang` is recommended, but `-lang` and `_lang` are treated the same way. This keeps the original and its translation close together:

```text
docs/
├─ README.md
├─ README.ja.md
├─ installation.md
└─ installation.ja.md
```

## Directories are not used

A layout that separates languages by directory (`en/note.md`, `ja/note.md`) is **not** used for language detection. Restricting the implicit rule to the filename suffix lets a [[glossary/wikilink|WikiLink]] resolve uniquely even when the same-named article exists in several languages. Specify the language through the filename suffix or the frontmatter `lang`.

## UI strings

The l10n plugin localizes content URLs, in-body links, and head tags; it does not translate the UI strings that the framework and its plugins render. Supply those with `ui`:

```ts
export default defineConfig({
  ui: {
    locale: "ja",
    labels: {
      ja: {
        contents: "目次",
        searchPlaceholder: "ノートを検索 (tag:, lang:, path: ...)",
      },
    },
  },
});
```

`ui.locale` pins the UI language independently of the content language, so a Japanese site can keep English UI strings. `ui.labels` maps a language code to a dictionary, and codes match case-insensitively. A missing key, or a language without a dictionary, falls back to the built-in English labels. The core keys are `contents`, `contentsHeading`, `filter`, `filterNavigation`, `collapse`, `expand`, `searchNotes`, `searchPlaceholder`, `searchNotesPlaceholder`, `nearbyNotes`, `seriesNavigation`, and `language`. Plugin chrome adds `sidebarNavigation`, `localGraph`, `openInExplorer`, `localGraphTruncated`, `localGraphTruncatedExplorer`, `explorer`, `explorerPanels`, `clearFilters`, `tags`, `folders`, `notes`, `showingNotes`, `noteGraph`, `localGraphMode`, `globalGraphMode`, `localMode`, `globalMode`, `selectNoteHint`, `history`, `historyChanges`, `historyToggle`, `commitHistory`, `untitledChange`, `search`, `closeSearch`, `searchQuery`, `searchFilterHint`, `searchResults`, and `seriesPosition`. The garden explorer detail panel adds `selectedNote`, `outgoingLinks`, `backlinks`, `relatedNotes`, and `noNotes`. `showingNotes`, `globalGraphMode`, `historyChanges`, and `seriesPosition` are templates: keep their `{...}` placeholders in a translation. Plugin components pick these up through `useUiLabels()`, so no plugin code changes.

A dictionary can also carry keys for your own shell code. This site reads `documentation`, `tableOfContents`, `menu`, `navigation`, `primaryNavigation`, `secondaryNavigation`, and `footerNavigation` from `config.ui.labels` in `website/app/lib/ui-labels.ts`, because those labels belong to the shell rather than the framework contract. `<html lang>` and the article date locale still follow the content language and are set in `website/app/components/article/article.tsx`.
