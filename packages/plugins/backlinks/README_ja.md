# @riebeckite/plugin-backlinks

<!-- Generated from docs/docs/plugins/backlinks.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

現在の記事を参照している公開済みノートを一覧表示するプラグインです。

[English](./README.md)

## 推奨配置

`backlinks()` はコンテンツマニフェストから被リンクを解決する `getBacklinks({ view, slug })` と、その結果を描画する `<Backlinks backlinks={...} />` コンポーネントを提供します。`getBacklinks()` は公開対象のノートだけを残し、マニフェスト順で返します。`Backlinks` は受け取った一覧をリンク集として描画し、表示対象がなければ何も出力しません。配置はサイト側が担当し、通常は記事本文の後でこのコンポーネントを一度描画します。

## クイックスタート

```ts
import { defineConfig } from "@riebeckite/core";
import { backlinks } from "@riebeckite/plugin-backlinks";

export default defineConfig({
  // ...
  plugins: [backlinks()],
});
```

プラグインを有効にすると、公開済みの被リンクがある記事で `getBacklinks()` が一覧を返すようになります。記事レイアウトで `<Backlinks backlinks={getBacklinks({ view, slug })} />` を一度描画してください。公式 Starter はこのコンポーネントをすでに描画しています。

## 高度なカスタマイズ

アプリ側で表示位置を決める場合は、`getBacklinks({ view, slug })` を呼び出してデータを取得し、`<Backlinks backlinks={...} />` コンポーネントを一度だけ描画してください。被リンクのデータと公開範囲のフィルタリングは変わりません。

```tsx
import Backlinks, { getBacklinks } from "@riebeckite/plugin-backlinks";

const manifest = await content.getManifest();
const items = getBacklinks({ manifest, config, slug, resolveTitle });

return <Article footerContent={<Backlinks backlinks={items} />} />;
```

`<Backlinks />` を複数回描画すると、同じ一覧が重複して表示されます。

## 設定

`backlinks()` にはプラグイン用のオプションがありません。`Backlinks` コンポーネントは `backlinks` 必須プロップを受け取ります。

## 公開 API

- `backlinks()`：プラグインファクトリ
- `Backlinks`：被リンク一覧コンポーネント
- `getBacklinks({ view, slug })`：公開済みの被リンクを解決する関数
- `ArticleBacklink`：`{ slug, permalink, title }` の型。`permalink` は解決済みの正規 URL

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [`@riebeckite/plugin-local-graph`](../local-graph/README_ja.md)
- [`@riebeckite/plugin-garden-explorer`](../garden-explorer/README_ja.md)
