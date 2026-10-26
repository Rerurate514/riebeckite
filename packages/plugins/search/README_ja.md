# @riebeckite/plugin-search

<!-- Generated from docs/docs/plugins/search.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

外部サービスなしで全文検索を提供するプラグインです。検索モーダルと検索バーを追加し、タイトルや本文を重み付きであいまいに検索します。

[English](./README.md)

## 実行例

ヘッダーの **Search** を開くと、サイト内検索のダイアログが表示されます。`mermaid` と入力すると、ページを離れずに生成済みのインデックスを検索できます。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { search } from "@riebeckite/plugin-search";

export default defineConfig({
  // ...
  plugins: [search()],
});
```

`search()` はスタイルとクライアント初期化処理を登録します。検索ダイアログは `Ctrl+K`、`Cmd+K`、または `/` で開けます。

検索機能の登録と `SearchBar` の配置は別です。登録だけでは表示されないため、サイト全体のシェル（通常はヘッダー）に `SearchBar` を 1 つ描画します。位置を変える・消すときはその要素を移動・削除します。

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

各 `SearchItem` は解決済みの canonical `permalink` も持ちます。これはスコア対象ではありません。`slug` は検索用の識別子で、モーダルの遷移先は `permalink` です。

テーマはどちらの `rr-search` ルートにも `--rr-search-modal-panel-border-radius` と `--rr-search-modal-panel-shadow` を指定でき、子要素を選択せずにモーダルパネルを調整できます。

## CSS フック

検索結果には `rr-search-result`、`rr-search-result__title`、
`rr-search-result__meta`、`rr-search-result__excerpt`、
`rr-search-result__tags`、`rr-search-result__tag`、
`rr-search-result__mark` を使用します。既定の CSS はこれらのフックを対象にします。

## 検索エンジンだけを使う

検索関数は副作用のない関数として公開されています。独自の検索ページやサーバー側のインデックス生成にも利用できます。

```ts
import { searchItems, normalizeSearchQuery } from "@riebeckite/plugin-search";

const results = searchItems(items, "#obsidian");
```

`normalizeSearchQuery()` は先頭の `#` を外すため、タグ名だけを指定する検索に使えます。

## 主なエクスポート

- `search()`: プラグインを作成する
- `SearchBar`: 検索モーダルの導線となるコンポーネント
- `initSearch`: ブラウザ側の初期化。`@riebeckite/plugin-search/client` からも読み込める
- `searchItems`、`normalizeSearchQuery`、`normalizeSearchText`: 検索エンジン
- 型: `SearchItem`、`SearchField`、`SearchMatch`、`SearchResult`

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [`@riebeckite/plugin-garden-explorer`](../garden-explorer/README_ja.md)
