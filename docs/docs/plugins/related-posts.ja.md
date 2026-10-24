---
date: 2026-10-08
title: Related Posts
---
# Related Posts

ビルド時に「関連ノート」ナビゲーションのデータを生成するプラグインです。公開対象の各エントリについて、コンテンツマニフェスト上の他のエントリをスコア順に並べます。サイトが `<RelatedPosts />` コンポーネントを記事の後などに配置します。クライアント側 JavaScript は不要です。

[English](./related-posts.md)

## 推奨配置

`relatedPosts()` はマニフェストのコンテンツグラフを読み、現在のエントリと他の公開エントリを次のシグナルで採点します。

| シグナル | 重み | 意味 |
| -------- | ---- | ---- |
| 直接リンク | 3 | 現在のエントリが候補へ、または候補が現在のエントリへリンクしている |
| タグの共有 | 共通タグ 1 件につき 2 | 現在のエントリと候補が同じタグを持つ |
| 共引用 | 共通リンク先 1 件につき 1 | 両方のエントリが同じノートへリンクしている |

候補はスコアの降順、同点ならタイトル、さらに同点ならスラッグの順に並べ、`limit` 件に絞ります。`minScore` 未満の候補は除外します。条件を満たす候補が 1 件もない場合、そのエントリの HTML は変更しません。

サイトは `<RelatedPosts entries={...} options={...} />` コンポーネントを記事の後などに配置します。条件を満たす関連エントリがない場合、コンポーネントは何も描画しません。

## クイックスタート

```ts
import { defineConfig } from "@riebeckite/core";
import { relatedPosts } from "@riebeckite/plugin-related-posts";

export default defineConfig({
  // ...
  plugins: [relatedPosts()],
});
```

## 高度なカスタマイズ

サイトのレイアウト内で任意の位置に配置できる、サーバー描画の Hono JSX コンポーネントを公開しています。ヘルパーで `entries` を計算し、解決済みの `options` を渡してください。採点と公開境界のフィルタリングは維持されます。

```tsx
import { buildRelatedPosts, RelatedPosts, resolveRelatedPostsOptions } from "@riebeckite/plugin-related-posts";

const options = resolveRelatedPostsOptions({});
const entries = buildRelatedPosts({ manifest, entry, options, config });

<nav rb-related-posts><RelatedPosts entries={entries} options={options} /></nav>;
```

1 つの記事につき 1 回だけ描画してください。UI を外すにはコンポーネントを取り除きます。

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `limit` | `number` | `5` | 表示する関連エントリの最大件数 |
| `minScore` | `number` | `1` | 表示に必要な最小スコア |
| `heading` | `boolean` | `true` | `<h2>` 見出しを出力する |
| `headingText` | `string` | `"Related"` | 見出しの文言 |
| `className` | `string` | `"rb-related-posts"` | ルート要素の CSS クラス |
| `useTags` | `boolean` | `true` | タグ共有のシグナルを使う |
| `useBacklinks` | `boolean` | `true` | 直接リンクのシグナルを使う |

```ts
relatedPosts({
  limit: 8,
  minScore: 2,
  headingText: "関連ノート",
});
```

## 記事下に表示されるナビゲーション

このサイトでは、条件に合う公開エントリがあれば、記事の下に実際のナビゲーションを表示します。

## スタイル

パッケージに `style.css` が含まれます。他のプラグインと同じように読み込みます。

```ts
import "@riebeckite/plugin-related-posts/style.css";
```

## エクスポート

- `relatedPosts(options?)`：プラグインファクトリ
- `relatedPosts`：`relatedPosts` のエイリアス
- `resolveRelatedPostsOptions(options?)`：オプションの既定値を適用する
- `buildRelatedPosts({ manifest, entry, options, config? })`：関連エントリを採点・整列する
- `renderRelatedPosts(entries, options)`：ナビゲーション HTML を生成する
- `RelatedPosts` と `@riebeckite/plugin-related-posts/components`：Hono JSX コンポーネント
- 型: `RelatedPostsOptions`, `ResolvedRelatedPostsOptions`, `RelatedPostsEntry`

## 制約

- 並び順はビルド時に確定します。再ビルドすれば常に正しく再計算されます。
- 判定材料はタグ・直接リンク・共引用のみです。読了時間や新しさ、フォルダは
  順位を決定的に保つため意図的に使いません。

## 関連リンク

- [[plugin-api|プラグイン API]]