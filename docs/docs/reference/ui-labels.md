---
date: 2026-11-25
title: UI labels
---
# UI labels

UI labels are the short strings a plugin renders around its content: button text, headings, placeholders, `aria-label` values, and status messages. This page is for plugin authors who add or change those strings. Site authors who only want to translate an existing interface can start with [Localization setup](../guides/localization/setup.md#ui-strings).

## Label definitions

Each plugin declares its labels in a `labels.ts` file next to the code that renders them. `defineUiLabels` takes a namespace and a dictionary per language. `en` is required and defines the key set; other languages, including `ja`, ship in the same plugin package.

```ts
// packages/plugins/search/src/labels.ts
import { defineUiLabels } from "@riebeckite/ui";

export const searchLabels = defineUiLabels("search", {
  en: {
    search: "Search",
    searchPlaceholder: "Search notes or use tag:, lang:, path:...",
    result: "{count} result",
    results: "{count} results",
  },
  ja: {
    search: "検索",
    searchPlaceholder: "ノートを検索 (tag:, lang:, path: ...)",
    result: "{count} 件",
    results: "{count} 件",
  },
});
```

The namespace is the package name without `@riebeckite/plugin-`, for example `search`, `local-graph`, or `image-compare`. Site overrides and the `ui.labels` config use this exact namespace, so keep it stable after release. Keys are identifiers, not English sentences; changing a key breaks site overrides, while changing a value does not.

## Read labels in a component

Call `useUiLabels` with the definition. The returned object is typed from the `en` dictionary, so a missing or misspelled key fails at type check time.

```tsx
import { useUiLabels } from "@riebeckite/ui";
import { searchLabels } from "../src/labels.js";

export function SearchBar() {
  const labels = useUiLabels(searchLabels);
  return <input placeholder={labels.searchPlaceholder} />;
}
```

`useUiLabels` reads the site context and resolves in this order:

1. the plugin's `en` dictionary;
2. the plugin's dictionary for the active language;
3. site overrides from `ui.labels[namespace][language][key]`.

The active language is `ui.locale` when set, otherwise the language of the rendered content. Language codes are compared case-insensitively; empty strings and non-string values are ignored. A key that exists only in a non-English dictionary does not appear in the resolved type.

## Read labels without a component

Server code, string renderers, and client scripts use `resolveUiLabels` instead. Pass the language the output belongs to and, when available, the site's `ui.labels` value.

```ts
import { resolveUiLabels } from "@riebeckite/ui";
import { seriesLabels } from "./labels.js";

export function renderSeries(index: SeriesIndex, language?: string): string {
  const labels = resolveUiLabels(seriesLabels, language);
  return `<nav aria-label="${labels.seriesNavigation}">...</nav>`;
}
```

A `language` of `undefined` resolves the English defaults. When a renderer already receives a language (a page locale, `entry.publicLocation.language`, the resolved `htmlLanguage`, or a function argument), pass it rather than hardcoding `"en"`.

Client entries should import from the `@riebeckite/ui/labels` subpath so the browser bundle does not pull in the JSX component entry.

```ts
import { resolveUiLabels } from "@riebeckite/ui/labels";
import { codeEnhanceLabels } from "./labels.js";

const labels = resolveUiLabels(
  codeEnhanceLabels,
  document.documentElement.lang,
);
```

If a client script needs a string that was already localized on the server, write it into a data attribute or JSON island and read it at init. Do not import the server config into the client entry.

## Type the labels of a component

Components that accept labels as a prop can use `ResolvedUiLabels` with the definition type.

```ts
import type { ResolvedUiLabels } from "@riebeckite/ui";
import { diffLabels } from "../../src/labels.js";

type DiffLabels = ResolvedUiLabels<typeof diffLabels>;

export function DiffHistory(props: { labels?: DiffLabels }) {
  // ...
}
```

The same pattern applies to helpers shared by several components. Export the type from `labels.ts` when more than one file needs it.

## Label types

| Type | Meaning |
| --- | --- |
| `UiLabelDictionary` | One language: `Readonly<Record<string, string>>` |
| `UiLabelDictionaries` | Languages: `Readonly<Record<string, UiLabelDictionary>>` |
| `UiLabelsDefinition<D>` | A namespace plus its dictionaries, as returned by `defineUiLabels` |
| `ResolvedUiLabels<T>` | The flat label object for the `en` keys of a definition |

`defineUiLabels` and the types are exported from `@riebeckite/ui`. `resolveUiLabels` is also available from `@riebeckite/ui/labels`, which is safe to import from client entries.

## Authoring rules

- Cover every user-visible string the plugin renders, including `aria-label`, `title`, and placeholder text, not only visible text.
- Keep templates such as `{count}`, `{index}`, `{total}`, `{language}`, and `{type}` in every translation. Replace them after resolution.
- Keep the English values identical to the strings that were rendered before the migration. Changing them is a user-visible change.
- Put Japanese in the same `labels.ts` file instead of a separate locale directory. The dictionary ships with the plugin either way.
- Do not duplicate an existing plugin option. When a plugin already exposes a label option, use the option first and the shared label as the default.
- When a renderer has no language source, resolve English and accept an optional `language` argument so a caller that knows the page language can pass it. Do not add a new config field for this.
- Add a small test that resolves the definition for `en` and `ja`, including a template value. Do not assert against a hardcoded English string elsewhere in the plugin.

## Overrides

Site authors override a label without touching the plugin:

```ts
export default defineConfig({
  ui: {
    labels: {
      search: {
        ja: { searchPlaceholder: "ノートを検索" },
      },
    },
  },
});
```

Overrides only need the keys they change. The full key list per namespace is in [Localization setup](../guides/localization/setup.md#ui-strings).

## Related

- [Localization setup](../guides/localization/setup.md)
- [Configuration reference](./configuration-reference.md)
- [Plugin API](./plugin-api.md)
