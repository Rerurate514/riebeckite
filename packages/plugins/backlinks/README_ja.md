# @riebeckite/plugin-backlinks

<!-- Generated from docs/docs/plugins/backlinks.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

現在の記事を参照している公開済みノートを一覧表示するプラグインです。

[English](./README.md)

## 実行例

[Backlink](/ja/docs/glossary/backlink) を開くと、他のページからリンクされている記事の末尾に、Backlinks セクションが描画されています。

## 推奨配置

`backlinks()` はコンテンツマニフェストから被リンクを解決する `getBacklinks({ view, slug })` と、その結果を描画する `<Backlinks backlinks={...} />` コンポーネントを提供します。`getBacklinks()` は公開対象のノートだけを残し、マニフェスト順で返します。被リンクはノートの言語に合わせて絞り込まれ、翻訳版のノートが別言語の被リンクを並べることはありません。`Backlinks` は受け取った一覧をリンク集として描画し、表示対象がなければ何も出力しません。配置はサイト側が担当し、通常は記事本文の後でこのコンポーネントを一度描画します。

## インストール

```sh
npm install @riebeckite/plugin-backlinks
```

## クイックスタート

```ts
import { defineConfig } from "@riebeckite/core";
import { backlinks } from "@riebeckite/plugin-backlinks";

export default defineConfig({
  // ...
  plugins: [backlinks()],
});
```

プラグインを有効にすると、`<Backlinks />` コンポーネントと `getBacklinks()` ヘルパーが使えるようになります。記事レイアウトで `<Backlinks />` を一度描画してください。`backlinks` プロップを省略すると、Site と Article のコンテキストから一覧を解決します。公式 Starter はこのコンポーネントをすでに描画しています。

## 高度なカスタマイズ

アプリ側で表示位置を決める場合は、その場所で `<Backlinks />` を描画するか、非同期コンポーネントで `getBacklinks({ view, slug })` を await し、結果を省略可能な `backlinks` プロップとして一度だけ渡してください。被リンクのデータと公開範囲のフィルタリングは変わりません。

```tsx
import { Backlinks, getBacklinks } from "@riebeckite/plugin-backlinks";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";

async function ArticleFooter() {
  const site = useSiteContext();
  const article = useArticleContext();
  if (!site || !article?.entry) return null;
  const items = await getBacklinks({
    view: site.view,
    slug: article.entry.slug,
  });
  return <Backlinks backlinks={items} />;
}
```

`<Backlinks />` を複数回描画すると、同じ一覧が重複して表示されます。

## 設定

`backlinks()` にはプラグイン用のオプションがありません。`Backlinks` コンポーネントの `backlinks` プロップは省略可能で、省略時はコンテキストから一覧を解決します。`borders={{ items: false }}` を渡すと、項目間の区切り線を消せます。

## 公開 API

- `backlinks()`：プラグインファクトリ
- `Backlinks`：被リンク一覧コンポーネント（名前付きエクスポート）
- `getBacklinks({ view, slug })`：公開済みの被リンクを解決する関数。Promise を返す場合があります
- `ArticleBacklink`：`{ slug, permalink, title }` の型。`permalink` は解決済みの正規 URL

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [`@riebeckite/plugin-local-graph`](../local-graph/README_ja.md)
- [`@riebeckite/plugin-garden-explorer`](../garden-explorer/README_ja.md)
