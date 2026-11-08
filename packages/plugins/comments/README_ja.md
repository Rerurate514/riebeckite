# @riebeckite/plugin-comments

<!-- Generated from docs/docs/plugins/comments.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

公開ノートにコメントスレッドを表示するプラグインです。[Reactions](../reactions/README_ja.md) と組み合わせると、Zenn/Qiita風に軽いリアクションと本格コメントを分けられます。

[English](./README.md)

## できること

- ノートごとに著者・投稿日時・本文つきのコメント一覧を表示
- ローカルプレビュー用の `MemoryCommentsProvider` を同梱
- `CommentsProvider` インターフェースで GitHub Discussions（Giscus経由）などに接続

## クイックスタート

```sh
npm install @riebeckite/plugin-comments
```

```ts
import { defineConfig } from "@riebeckite/core";
import { comments } from "@riebeckite/plugin-comments";

export default defineConfig({
  plugins: [comments()],
});
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `provider` | `CommentsProvider` | `MemoryCommentsProvider` | コメントの保存・実行層。 |
| `headingText` | `string` | `"Comments"` | セクションの見出し。 |
| `className` | `string` | `"rr-comments"` | ルート要素に付く追加CSSクラス。 |
| `limit` | `number` | `20` | 1ノートに表示するコメントの上限。 |
| `emptyText` | `string` | `"No comments yet."` | コメントがないときの文言。 |

## 関連

- [Reactions](../reactions/README_ja.md) — 軽い絵文字リアクション
- [Webmention](../webmention/README_ja.md) — サイトをまたいだメンション
- [プラグインカタログ](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/README.ja.md)
