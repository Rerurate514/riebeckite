---
title: Backlinks
---
# Backlinks

現在の記事を参照している公開済みノートを、記事末尾に表示するためのプラグインです。

[English](./backlinks.md)

## 推奨配置

`backlinksPlugin()` はコンテンツマニフェストから被リンクを集め、公開対象のノートだけをマニフェスト順で `<Backlinks backlinks={getBacklinks({ view, slug })} />` へ渡します。物理的な配置は Site が所有し、通常は記事本文の後でこのコンポーネントを一度描画します。`Backlinks` コンポーネントはその結果をリンク一覧として描画します。表示対象がなければ何も出力しません。

## クイックスタート

```ts
import { defineConfig } from "@riebeckite/core";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";

export default defineConfig({
  // ...
  plugins: [backlinksPlugin()],
});
```

プラグインは公開済みの被リンクがある記事へ自動的に出力を追加します。記事レイアウトで `<Backlinks backlinks={getBacklinks({ view, slug })} />` を一度描画してください。公式 Starter はこのコンポーネントをすでに描画しています。

## 高度なカスタマイズ

アプリ側で表示位置を決める場合は、`getBacklinks({ view, slug })` を呼び出してデータを取得し、 `<Backlinks backlinks={...} />` コンポーネントを一度だけ描画してください。データの生成と公開境界のフィルタリングは維持されます。

```tsx
import Backlinks, { getBacklinks } from "@riebeckite/plugin-backlinks";

const manifest = await content.getManifest();
const items = getBacklinks({ manifest, config, slug, resolveTitle });

return <Article footerContent={<Backlinks backlinks={items} />} />;
```

手動配置を消すにはコンポーネントを消します。自動描画を有効にしたまま同じコンポーネントを描画すると重複します。

## 設定

`backlinksPlugin()` にはプラグイン用のオプションがありません。`Backlinks` コンポーネントは `backlinks` 必須プロップを受け取ります。

## 公開 API

- `backlinksPlugin()`：プラグインファクトリ
- `Backlinks`：被リンク一覧コンポーネント
- `getBacklinks({ view, slug })`：公開済みの被リンクを解決する関数
- `ArticleBacklink`：`{ slug, permalink, title }` の型。`permalink` は解決済みの canonical URL

## 関連資料

- [[plugin-api|プラグインシステム]]
- [`@riebeckite/plugin-local-graph`](./local-graph.ja.md)
- [`@riebeckite/plugin-garden-explorer`](./garden-explorer.ja.md)
