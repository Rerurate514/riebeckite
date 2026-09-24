# @riebeckite/plugin-search

Client 側の full-text search: 重み付き・fuzzy な検索 engine と、keyboard
対応の検索 modal を提供します。外部の search service は不要です。

[English](./README_en.md)

## 概要

`search()` は `SearchBar` component と、modal search dialog を開く
browser entry point を追加します（`Ctrl+K`/`Cmd+K` または `/`）。
engine の `searchItems()` は title・slug・tags・headings・body を
重み付き scoring で検索します。

| フィールド | 重み |
| ---------- | ---- |
| `slug` | 64 |
| `title` | 56 |
| `tags` | 44 |
| `headings` | 32 |
| `body` | 10 |

完全一致は 3×、前方一致は 2×、部分一致は 1× で scoring されます。query が
2 文字以上で部分一致が無い場合は fuzzy な subsequence match を使います。
検索前に query は正規化されます（lowercase・NFKC・全角カタカナ → 半角）。

`searchItems()` は純粋関数で export されているため、server 側でも利用できます。
例えば runtime で modal が fetch する `search-data.json` index の生成にも
使えます。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { searchPlugin } from "@riebeckite/plugin-search";

export default defineConfig({
  // ...
  plugins: [searchPlugin()],
});
```

`searchPlugin()` は plugin を登録し、`style.css` を bundle し、page load 時に
modal を初期化する client entry として `initSearch` を宣言します。

### Component の描画

```tsx
import { SearchBar } from "@riebeckite/plugin-search";

// layout / renderer で
return (
  <>
    <header>
      <SearchBar />
    </header>
    {/* ... */}
  </>
);
```

modal は初回 open 時に `/search-data.json`（`SearchItem` の配列）を fetch し、
最大 8 件を表示します。

## Search API

```ts
import { searchItems, normalizeSearchQuery } from "@riebeckite/plugin-search";

const results = searchItems(items, "#obsidian");
```

- `searchItems(items, query)` — score 順、次いで title 順に sort して返す
- `normalizeSearchQuery(value)` — 正規化し、先頭の `#` を取り除く。
  これにより tag 検索は bare な tag name に一致する
- `normalizeSearchText(value)` — lowercase + NFKC + カタカナ fold

## エクスポート

- `searchPlugin()` — plugin factory
- `SearchBar` — modal component（`components/search-bar.tsx` の
  default export）
- `initSearch` — browser 初期化（`@riebeckite/plugin-search/client` 経由でも）
- `searchItems`, `normalizeSearchQuery`, `normalizeSearchText` — search engine
- 型: `SearchItem`, `SearchField`, `SearchMatch`, `SearchResult`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
- [`@riebeckite/plugin-garden-explorer`](../plugin-garden-explorer/README_ja.md)