# Search

Client-side full-text search: a weighted, fuzzy search engine plus a keyboard
driven search modal — no external search service required.

[日本語](./search.ja.md)

## Overview

`search()` adds a `SearchBar` component and a browser entry point that opens a
modal search dialog (`Ctrl+K`/`Cmd+K` or `/`). The engine `searchItems()`
matches on title, slug, tags, headings, and body with weighted scoring:

| Field | Weight |
| ----- | ------ |
| `slug` | 64 |
| `title` | 56 |
| `tags` | 44 |
| `headings` | 32 |
| `body` | 10 |

Exact matches score 3×, prefix matches 2×, and substrings 1×. When a query has
2+ characters and no substring match, a fuzzy subsequence match is used. Query
text is normalized (lowercase, NFKC, and katakana full-width → half-width)
before searching.

Each `SearchItem` also carries the resolved canonical `permalink`. It is not a
scored field: `slug` remains the searchable identity key, while the modal
navigates to `permalink`.

`searchItems()` is pure and exported, so it can be used server-side too — for
example to generate a `search-data.json` index the modal fetches at runtime.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { searchPlugin } from "@riebeckite/plugin-search";

export default defineConfig({
  // ...
  plugins: [searchPlugin()],
});
```

`searchPlugin()` registers the plugin, bundles `style.css`, and declares
`initSearch` as a client entry that wires up the modal on page load.

Search functionality and `SearchBar` placement are separate: registration does
not add a visible trigger. Render one `SearchBar` in the global Site shell,
normally the header, and move or remove that element to change the UI.

### Render the component

```tsx
import { SearchBar } from "@riebeckite/plugin-search";

// ...in your layout / renderer
return (
  <>
    <header>
      <SearchBar />
    </header>
    {/* ... */}
  </>
);
```

The modal fetches `/search-data.json` (an array of `SearchItem`) on first open
and shows up to 8 results.

## Search API

```ts
import { searchItems, normalizeSearchQuery } from "@riebeckite/plugin-search";

const results = searchItems(items, "#obsidian");
```

- `searchItems(items, query)` — returns results sorted by score, then title
- `normalizeSearchQuery(value)` — normalizes and strips a leading `#` so tag
  searches match bare tag names
- `normalizeSearchText(value)` — lowercase + NFKC + katakana fold

## Exports

- `searchPlugin()` — plugin factory
- `SearchBar` — modal component (default export of `components/search-bar.tsx`)
- `initSearch` — browser init (also via `@riebeckite/plugin-search/client`)
- `searchItems`, `normalizeSearchQuery`, `normalizeSearchText` — search engine
- Types: `SearchItem`, `SearchField`, `SearchMatch`, `SearchResult`

## See also

- [Plugin guide](../reference/plugin-api.md)
- [`@riebeckite/plugin-garden-explorer`](./garden-explorer.md)
