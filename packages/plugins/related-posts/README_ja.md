# @riebeckite/plugin-related-posts

<!-- Generated from docs/docs/plugins/related-posts.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

ビルド時に「関連ノート」ナビゲーションを生成するプラグインです。公開対象の
各エントリについて、コンテンツマニフェスト上の他のエントリをスコア順に並べ、
関連ノートのセクションを `article.footer` Slot に追加します。クライアント側 JavaScript は
不要です。

[English](./README.md)

## 推奨配置

`relatedPosts()` はマニフェストのコンテンツグラフを読み、現在のエントリと
他の公開エントリを次のシグナルで採点します。

| シグナル | 重み | 意味 |
| -------- | ---- | ---- |
| 直接リンク | 3 | 現在のエントリが候補へ、または候補が現在のエントリへリンクしている |
| タグの共有 | 共通タグ 1 件につき 2 | 現在のエントリと候補が同じタグを持つ |
| 共引用 | 共通リンク先 1 件につき 1 | 両方のエントリが同じノートへリンクしている |

候補はスコアの降順、同点ならタイトル、さらに同点ならスラッグの順に並べ、
`limit` 件に絞ります。`minScore` 未満の候補は除外します。条件を満たす候補が
1 件もない場合、そのエントリの HTML は変更しません。

各マニフェストエントリの `article.footer` Slot にセクションを追加します。標準の
記事フッターでこの Slot を描画している場合、生成ページとフィードの両方に
セクションが反映されます。

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

Site のレイアウト内で任意の位置に配置できるサーバー描画の Hono JSX Component を公開しています。`render: false` で自動の `article.footer` Slot 追加を止め、既存の helper で entries を計算して解決済み options を渡してください。採点と公開境界のフィルタリングは維持されます。

```tsx
import { buildRelatedPosts, RelatedPosts, resolveRelatedPostsOptions } from "@riebeckite/plugin-related-posts";

const options = resolveRelatedPostsOptions({ render: false });
const entries = buildRelatedPosts({ manifest, entry, options, config });
return <aside><RelatedPosts entries={entries} options={options} /></aside>;
```

公式 Starter は `article.footer` を一度描画します。手動配置を消すにはコンポーネントを消します。自動描画を有効にしたまま同じ記事へ手動描画しないでください。

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `render` | `boolean` | `true` | `article.footer` への自動追加。手動配置では `false` |
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

## 出力

```html
<nav class="rb-related-posts" data-related-posts>
  <h2 class="rb-related-posts__heading">Related</h2>
  <ul>
    <li class="rb-related-posts__item">
      <a class="rb-related-posts__link" href="/notes/example" data-related-score="5">Example Note</a>
    </li>
  </ul>
</nav>
```

## スタイル

パッケージに `style.css` が含まれます。他のプラグインと同じように読み込みます。

```ts
import "@riebeckite/plugin-related-posts/style.css";
```

## エクスポート

- `relatedPosts(options?)` — プラグインファクトリ
- `relatedPostsPlugin` — `relatedPosts` のエイリアス
- `resolveRelatedPostsOptions(options?)` — オプションの既定値を適用する
- `buildRelatedPosts({ manifest, entry, options, config? })` — 関連エントリを採点・整列する
- `renderRelatedPosts(entries, options)` — ナビゲーション HTML を生成する
- `RelatedPosts` と `@riebeckite/plugin-related-posts/components` — Hono JSX Component
- 型: `RelatedPostsOptions`, `ResolvedRelatedPostsOptions`, `RelatedPostsEntry`

## 制約

- 並び順はビルド時に確定します。再ビルドすれば常に正しく再計算されます。
- 判定材料はタグ・直接リンク・共引用のみです。読了時間や新しさ、フォルダは
  順位を決定的に保つため意図的に使いません。

## 関連リンク

- [プラグイン API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
