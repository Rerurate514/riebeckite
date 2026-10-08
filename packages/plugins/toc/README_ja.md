# @riebeckite/plugin-toc

記事の見出しから目次を作り、現在読んでいる節を強調表示するプラグインです。長い記事のサイドバーやモバイル用の折りたたみ目次に使えます。

[English](./README.md)

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { tocPlugin } from "@riebeckite/plugin-toc";

export default defineConfig({
  // ...
  plugins: [tocPlugin()],
});
```

`tocPlugin()` はスタイルと `initTableOfContents` を登録します。初期化処理はスクロール位置を追跡し、読んだ節と現在の節を目次に反映します。

## 目次を置く

記事 HTML から項目を取り出し、`TableOfContents` に渡します。

```tsx
import TableOfContents, {
  extractTableOfContents,
} from "@riebeckite/plugin-toc";

const items = extractTableOfContents(post.html ?? "");

return (
  <Article
    asideContent={
      <TableOfContents className="rr-table-of-contents--desktop" items={items} />
    }
  />
);
```

抽出対象は `id` を持つ `h2` から `h4` です。項目が 2 件未満ならコンポーネントは何も表示しません。見出しに ID が付かない構成では目次にも現れないため、見出し ID を生成する Markdown 処理と組み合わせてください。

## スクロール連動の仕組み

リンクの `data-toc-target` 属性を使って対象の見出しを見つけます。同じページにデスクトップ用とモバイル用の二つの目次を置いても、それぞれのリンクを正しく更新できます。現在の節のリンクには `aria-current` が付き、読了済みの節も区別されます。

## 主なエクスポート

- `tocPlugin()`: プラグインを作成する
- `TableOfContents`: 目次のコンポーネント
- `extractTableOfContents(html)`: ID 付き見出しから `TableOfContentsItem[]` を作る
- `initTableOfContents`: ブラウザ側のスクロール連動を初期化する。`@riebeckite/plugin-toc/client` からも読み込める
- `TableOfContentsItem`: `{ id, level, title }`

## 関連資料

- [プラグインシステム](../../../docs/docs/reference/plugin-api.ja.md)
