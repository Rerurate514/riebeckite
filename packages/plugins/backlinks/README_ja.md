# @riebeckite/plugin-backlinks

現在の記事を参照している公開済みノートを、記事末尾に表示するためのプラグインです。

[English](./README.md)

## できること

`getPublishedBacklinks()` はコンテンツマニフェストから被リンクを集め、`isPublished` を通るノートだけをマニフェスト順で返します。`Backlinks` コンポーネントはその結果をフッターのリンク一覧として描画します。表示対象がなければ何も出力しません。

## 設定と配置

```ts
import { defineConfig } from "@riebeckite/core";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";

export default defineConfig({
  // ...
  plugins: [backlinksPlugin()],
});
```

プラグイン登録後も、表示位置はアプリ側で決めます。記事ルートなどでマニフェストを取得し、現在の `slug` に対する被リンクを渡してください。

```tsx
import Backlinks, { getPublishedBacklinks } from "@riebeckite/plugin-backlinks";

const manifest = await content.getManifest();
const items = getPublishedBacklinks({ manifest, config, slug, resolveTitle });

return <Article footerContent={<Backlinks backlinks={items} />} />;
```

## 公開 API

- `backlinksPlugin()` — プラグインファクトリ
- `Backlinks` — 被リンク一覧コンポーネント
- `getPublishedBacklinks({ manifest, config, slug, resolveTitle })` — 公開済みの被リンクを解決する関数
- `ArticleBacklink` — `{ slug, permalink, title }` の型。`permalink` は解決済みの canonical URL

## 関連資料

- [プラグインシステム](../../../docs/ja/reference/plugin-api.md)
- [`@riebeckite/plugin-local-graph`](../local-graph/README_ja.md)
- [`@riebeckite/plugin-garden-explorer`](../garden-explorer/README_ja.md)
