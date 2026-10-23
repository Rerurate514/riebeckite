---
date: 2026-10-14
title: Translation
sidebar:
  hidden: true
---

# Translation

The link between versions of the same content in different languages, set through frontmatter. Translations let links and the graph follow the reader's language.

## Setting it

```yaml
---
translation: getting-started
lang: ja
---
```

## Link rewriting
When a note has a translation in the reader's language, links and [WikiLinks](./wikilink.md) to it resolve to that version. Without a translation, the original target stays.

## Translation and public location
Each content entry's language and permalink are resolved through the l10n plugin's public location system, defined in `packages/plugins/l10n/src/l10n.ts`. The `publicLocation` of a manifest entry includes the resolved `permalink` and `language` for that entry's language. When a translation is configured with the same `translation` value, the plugin groups entries together and assigns each its language-specific URL.

The `getLocalization` function (`packages/plugins/l10n/src/l10n.ts`) resolves all language versions for a given translation group, returning `availableLanguages` and the `permalink` for each language. The `getLocalizedContent` function resolves a specific language version of a content entry, returning the manifest entry or `null` if the translation does not exist.

```ts
import { getLocalizedContent } from "@riebeckite/plugin-l10n";
const entry = getLocalizedContent(manifest, "getting-started", "ja");
```

This ensures that links, the content graph, and the language switcher all respect the established translation relationships.
