<!-- Generated from packages/plugins/backlinks/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Backlinks

現在の記事を参照している公開済みノートを、記事末尾に表示するためのプラグインです。

[English](./backlinks.md)

## 推奨配置

`backlinksPlugin()` はコンテンツマニフェストから被リンクを集め、公開対象のノートだけをマニフェスト順で `article.footer` body slot に自動追加します。物理的な配置は Site が所有し、通常は記事本文の後でこの slot を一度描画します。`Backlinks` コンポーネントはその結果をリンク一覧として描画します。表示対象がなければ何も出力しません。

## クイックスタート

```ts
import { defineConfig } from "@riebeckite/core";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";

export default defineConfig({
  // ...
  plugins: [backlinksPlugin()],
});
```

プラグインは公開済みの被リンクがある記事へ自動的に出力を追加します。記事レイアウトで `<ContentSlot slots={bodySlots} name="article.footer" />` を一度描画してください。公式 Starter はこの slot をすでに描画しています。

## 高度なカスタマイズ

アプリ側で表示位置を決める場合は、`render: false` で自動 slot 追加を止めます。データの生成と公開境界のフィルタリングは維持されます。記事ルートなどでマニフェストを取得し、現在の `slug` に対する被リンクを渡してください。

```tsx
import Backlinks, { getPublishedBacklinks } from "@riebeckite/plugin-backlinks";

const manifest = await content.getManifest();
const items = getPublishedBacklinks({ manifest, config, slug, resolveTitle });

return <Article footerContent={<Backlinks backlinks={items} />} />;
```

```ts
plugins: [backlinksPlugin({ render: false })];
```

手動配置を消すにはコンポーネントを消します。自動描画を有効にしたまま同じコンポーネントを描画すると重複します。

## 設定

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `render` | `boolean` | `true` | `article.footer` への自動追加。手動配置では `false`。 |

## 公開 API

- `backlinksPlugin()` — プラグインファクトリ
- `Backlinks` — 被リンク一覧コンポーネント
- `getPublishedBacklinks({ manifest, config, slug, resolveTitle })` — 公開済みの被リンクを解決する関数
- `ArticleBacklink` — `{ slug, permalink, title }` の型。`permalink` は解決済みの canonical URL

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
- [`@riebeckite/plugin-local-graph`](./local-graph.ja.md)
- [`@riebeckite/plugin-garden-explorer`](./garden-explorer.ja.md)
