# Search

外部サービスなしで全文検索を提供するプラグインです。検索モーダルと検索バーを追加し、タイトルや本文を重み付きであいまいに検索します。

[English](./search.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { searchPlugin } from "@riebeckite/plugin-search";

export default defineConfig({
  // ...
  plugins: [searchPlugin()],
});
```

`searchPlugin()` はスタイルとクライアント初期化処理を登録します。検索ダイアログは `Ctrl+K`、`Cmd+K`、または `/` で開けます。

検索機能の登録と `SearchBar` の配置は別です。登録だけでは表示されないため、global Site shell（通常は header）に `SearchBar` を一つ描画します。位置を変える・消すときはその要素を移動・削除します。

## 検索バーを置く

レイアウトなど、検索を開く導線を出したい場所で `SearchBar` を描画します。

```tsx
import { SearchBar } from "@riebeckite/plugin-search";

return (
  <header>
    <SearchBar />
  </header>
);
```

モーダルは初めて開かれたときに `/search-data.json` を取得し、結果を最大 8 件表示します。検索用データを事前に配信できる構成で使ってください。

## 検索の対象と順位

`searchItems()` は次の項目を検索し、重みの高い項目を優先します。

| 項目 | 重み |
| --- | ---: |
| `slug` | 64 |
| `title` | 56 |
| `tags` | 44 |
| `headings` | 32 |
| `body` | 10 |

完全一致は 3 倍、前方一致は 2 倍、部分一致は 1 倍として採点します。2 文字以上の問い合わせで部分一致が見つからない場合は、文字が順に現れる候補も探します。入力は小文字化、NFKC 正規化、カタカナの表記ゆれ吸収を経て比較されます。

各 `SearchItem` は解決済みの canonical `permalink` も持ちます。これはスコア対象ではありません。`slug` は検索用の identity で、モーダルの遷移先は `permalink` です。

## 検索エンジンだけを使う

検索関数は副作用のない関数として公開されています。独自の検索ページやサーバー側のインデックス生成にも利用できます。

```ts
import { searchItems, normalizeSearchQuery } from "@riebeckite/plugin-search";

const results = searchItems(items, "#obsidian");
```

`normalizeSearchQuery()` は先頭の `#` を外すため、タグ名だけを指定する検索に使えます。

## 主なエクスポート

- `searchPlugin()`: プラグインを作成する
- `SearchBar`: 検索モーダルの導線となるコンポーネント
- `initSearch`: ブラウザ側の初期化。`@riebeckite/plugin-search/client` からも読み込める
- `searchItems`、`normalizeSearchQuery`、`normalizeSearchText`: 検索エンジン
- 型: `SearchItem`、`SearchField`、`SearchMatch`、`SearchResult`

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
- [`@riebeckite/plugin-garden-explorer`](./garden-explorer.ja.md)
