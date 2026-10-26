---
date: 2026-10-08
title: Table of Contents
---
# Table of Contents

記事の見出しから目次を作り、現在読んでいる節を強調表示するプラグインです。長い記事のサイドバーやモバイル用の折りたたみ目次に使えます。

[English](./toc.md)

## 実行例

この記事の横にある **Contents** が、このプラグインが生成した目次です。レベル2の見出しを列挙し、現在読んでいるセクションを強調します。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { toc } from "@riebeckite/plugin-toc";

export default defineConfig({
  // ...
  plugins: [toc()],
});
```

`toc()` はスタイルと `initTableOfContents` を登録します。初期化処理はスクロール位置を追跡し、読んだ節と現在の節を目次に反映します。

UI は自動配置されません。サイトが見出しを抽出してコンポーネントを描画し、通常は記事の `aside` に置きます。記事の横にレールを置ける幅では、サイトが安定した目次ルートをそのレールに配置し、sticky のオフセット・高さの上限・範囲内の縦スクロールを担当します。プラグインは目次のリスト、リンク、スクロール連動の状態を担当します。

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

リンクの `data-toc-target` 属性を使って対象の見出しを見つけます。同じページにデスクトップ用とモバイル用の二つの目次を置いても、それぞれのリンクを正しく更新できます。現在の節のリンクには `aria-current` が付き、読了済みの節も区別されます。サイトは記事レール内でデスクトップ用のルートを sticky にし、高さを制限した縦スクロール領域を与えます。プラグインは見出しを折り返して横スクロールを防ぎます。

テーマは目次のルートに `--rr-table-of-contents-eyebrow-font-size`、
`--rr-table-of-contents-eyebrow-margin-block-end`、
`--rr-table-of-contents-item-line-height` を指定でき、リストの子要素を選択せずに調整できます。

## 主なエクスポート

- `toc()`: プラグインを作成する
- `TableOfContents`: 目次のコンポーネント
- `extractTableOfContents(html)`: ID 付き見出しから `TableOfContentsItem[]` を作る
- `initTableOfContents`: ブラウザ側のスクロール連動を初期化する。`@riebeckite/plugin-toc/client` からも読み込める
- `TableOfContentsItem`: `{ id, level, title }`

## 関連資料

- [[plugin-api|プラグインシステム]]
